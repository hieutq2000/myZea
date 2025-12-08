import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import {
    View, Text, FlatList, TouchableOpacity, StyleSheet,
    TextInput, StatusBar, SafeAreaView, Platform, ActivityIndicator,
    RefreshControl, Alert
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { getSocket } from '../utils/socket';
import { getConversations, Conversation, getCurrentUser, pinConversation, muteConversation, deleteConversation } from '../utils/api';
import SwipeableConversationItem from '../components/Chat/SwipeableConversationItem';

// Zalo Colors
const ZALO_BLUE = '#0068FF';

export default function ChatListScreen() {
    const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
    const [conversations, setConversations] = useState<any[]>([]);
    const [searchText, setSearchText] = useState('');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
    const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});

    // Refs for swipeable items
    const swipeableRefs = useRef<{ [key: string]: any }>({});
    const currentOpenSwipeable = useRef<string | null>(null);

    // Format time like Zalo: HH:mm for today, "Th X" for this week, DD/MM for older
    const formatMessageTime = useCallback((dateString: string | null | undefined): string => {
        if (!dateString) return '';

        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return '';

            const now = new Date();
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
            const messageDateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
            const diffInDays = Math.floor((todayStart.getTime() - messageDateStart.getTime()) / (1000 * 60 * 60 * 24));

            if (diffInDays === 0) {
                const hours = date.getHours().toString().padStart(2, '0');
                const minutes = date.getMinutes().toString().padStart(2, '0');
                return `${hours}:${minutes}`;
            } else if (diffInDays > 0 && diffInDays < 7) {
                const daysOfWeek = ['CN', 'Th 2', 'Th 3', 'Th 4', 'Th 5', 'Th 6', 'Th 7'];
                return daysOfWeek[date.getDay()];
            } else {
                const day = date.getDate().toString().padStart(2, '0');
                const month = (date.getMonth() + 1).toString().padStart(2, '0');
                return `${day}/${month}`;
            }
        } catch (error) {
            return '';
        }
    }, []);

    const loadConversations = async () => {
        try {
            const data = await getConversations();
            const mapped = data.map((c: Conversation) => ({
                id: c.conversation_id,
                partnerId: c.partner_id,
                name: c.name,
                lastMessage: c.last_message || '',
                lastMessageTime: c.last_message_time,
                lastMessageSenderId: c.last_message_sender_id,
                time: formatMessageTime(c.last_message_time),
                avatar: c.avatar,
                unread: c.unread_count || 0,
                isOnline: c.status === 'online' || onlineUsers.has(c.partner_id),
                lastSeen: c.last_seen,
                isPinned: !!c.is_pinned,
                isMuted: !!c.is_muted,
            }));

            // Sort: pinned first, then by time
            mapped.sort((a: any, b: any) => {
                if (a.isPinned && !b.isPinned) return -1;
                if (!a.isPinned && b.isPinned) return 1;
                return 0;
            });

            setConversations(mapped);
        } catch (error) {
            console.log('Load conversations error:', error);
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadConversations().then(() => setRefreshing(false));
    }, []);

    // Load current user ID
    useEffect(() => {
        const fetchUser = async () => {
            const user = await getCurrentUser();
            if (user) setCurrentUserId(user.id);
        };
        fetchUser();
    }, []);

    // Load conversations and setup socket listeners
    useEffect(() => {
        loadConversations();

        const socket = getSocket();
        if (socket) {
            socket.on('receiveMessage', () => loadConversations());
            socket.on('messageSent', () => loadConversations());

            socket.on('userStatusChanged', (data: any) => {
                if (data.userId && data.status) {
                    setOnlineUsers(prev => {
                        const newSet = new Set(prev);
                        if (data.status === 'online') {
                            newSet.add(String(data.userId));
                        } else {
                            newSet.delete(String(data.userId));
                        }
                        return newSet;
                    });
                    setConversations(prev => prev.map(conv => {
                        if (conv.partnerId === String(data.userId)) {
                            return { ...conv, isOnline: data.status === 'online' };
                        }
                        return conv;
                    }));
                }
            });

            socket.on('userTyping', (data: any) => {
                if (data.conversationId) {
                    setTypingUsers(prev => ({ ...prev, [data.conversationId]: true }));
                    setTimeout(() => {
                        setTypingUsers(prev => ({ ...prev, [data.conversationId]: false }));
                    }, 5000);
                }
            });

            socket.on('userStoppedTyping', (data: any) => {
                if (data.conversationId) {
                    setTypingUsers(prev => ({ ...prev, [data.conversationId]: false }));
                }
            });
        }

        return () => {
            if (socket) {
                socket.off('receiveMessage');
                socket.off('messageSent');
                socket.off('userStatusChanged');
                socket.off('userTyping');
                socket.off('userStoppedTyping');
            }
        };
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadConversations();
        }, [])
    );

    // Filter conversations by search
    const filteredConversations = useMemo(() => {
        if (!searchText.trim()) return conversations;
        const query = searchText.toLowerCase();
        return conversations.filter(conv =>
            conv.name?.toLowerCase().includes(query) ||
            conv.lastMessage?.toLowerCase().includes(query)
        );
    }, [conversations, searchText]);

    // Close other swipeables when one opens
    const handleSwipeableWillOpen = (itemId: string) => {
        if (currentOpenSwipeable.current && currentOpenSwipeable.current !== itemId) {
            swipeableRefs.current[currentOpenSwipeable.current]?.close();
        }
        currentOpenSwipeable.current = itemId;
    };

    // Handlers for swipe actions
    const handleMute = async (conversationId: string) => {
        const conv = conversations.find(c => c.id === conversationId);
        if (!conv) return;

        const newMuteState = !conv.isMuted;

        // Optimistic update
        setConversations(prev => prev.map(c =>
            c.id === conversationId ? { ...c, isMuted: newMuteState } : c
        ));

        try {
            await muteConversation(conversationId, newMuteState);
        } catch (error) {
            // Rollback on error
            setConversations(prev => prev.map(c =>
                c.id === conversationId ? { ...c, isMuted: !newMuteState } : c
            ));
            Alert.alert('Lỗi', 'Không thể cập nhật trạng thái thông báo');
        }
    };

    const handleDelete = async (conversationId: string) => {
        Alert.alert(
            'Xóa cuộc trò chuyện',
            'Bạn có chắc chắn muốn xóa cuộc trò chuyện này?',
            [
                { text: 'Hủy', style: 'cancel' },
                {
                    text: 'Xóa',
                    style: 'destructive',
                    onPress: async () => {
                        // Optimistic update
                        setConversations(prev => prev.filter(conv => conv.id !== conversationId));

                        try {
                            await deleteConversation(conversationId);
                        } catch (error) {
                            // Reload on error
                            loadConversations();
                            Alert.alert('Lỗi', 'Không thể xóa cuộc trò chuyện');
                        }
                    }
                },
            ]
        );
    };

    const handlePin = async (conversationId: string) => {
        const conv = conversations.find(c => c.id === conversationId);
        if (!conv) return;

        const newPinState = !conv.isPinned;

        // Optimistic update with re-sort
        setConversations(prev => {
            const updated = prev.map(c =>
                c.id === conversationId ? { ...c, isPinned: newPinState } : c
            );
            updated.sort((a, b) => {
                if (a.isPinned && !b.isPinned) return -1;
                if (!a.isPinned && b.isPinned) return 1;
                return 0;
            });
            return updated;
        });

        try {
            await pinConversation(conversationId, newPinState);
        } catch (error) {
            // Reload on error
            loadConversations();
            Alert.alert('Lỗi', 'Không thể ghim cuộc trò chuyện');
        }
    };

    const renderItem = ({ item }: { item: any }) => (
        <SwipeableConversationItem
            ref={(ref: any) => { swipeableRefs.current[item.id] = ref; }}
            conversation={item}
            currentUserId={currentUserId || undefined}
            isTyping={typingUsers[item.id]}
            onPress={() => navigation.navigate('ChatDetail', {
                conversationId: item.id,
                partnerId: item.partnerId,
                userName: item.name,
                avatar: item.avatar
            })}
            onMute={handleMute}
            onDelete={handleDelete}
            onPin={handlePin}
            onSwipeableWillOpen={() => handleSwipeableWillOpen(item.id)}
        />
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={ZALO_BLUE} />

            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="white" />
                    </TouchableOpacity>
                    <View style={styles.searchBar}>
                        <Ionicons name="search" size={20} color="white" style={{ opacity: 0.7 }} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Tìm kiếm"
                            placeholderTextColor="rgba(255,255,255,0.7)"
                            value={searchText}
                            onChangeText={setSearchText}
                        />
                    </View>
                    <TouchableOpacity style={styles.addButton}>
                        <Ionicons name="add" size={28} color="white" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Content */}
            {loading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={ZALO_BLUE} />
                    <Text style={styles.loadingText}>Đang tải tin nhắn...</Text>
                </View>
            ) : filteredConversations.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <MaterialIcons name="chat-bubble-outline" size={80} color="#E5E7EB" />
                    <Text style={styles.emptyTitle}>
                        {searchText ? 'Không tìm thấy kết quả' : 'Chưa có cuộc trò chuyện nào'}
                    </Text>
                    <Text style={styles.emptySubtitle}>
                        {searchText ? 'Thử từ khóa khác' : 'Hãy bắt đầu kết nối với mọi người ngay thôi!'}
                    </Text>
                    {!searchText && (
                        <TouchableOpacity style={styles.startChatBtn}>
                            <Text style={styles.startChatText}>Tìm bạn bè</Text>
                        </TouchableOpacity>
                    )}
                </View>
            ) : (
                <FlatList
                    data={filteredConversations}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    ItemSeparatorComponent={() => <View style={styles.separator} />}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[ZALO_BLUE]} />
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'white' },
    header: {
        backgroundColor: ZALO_BLUE,
        paddingTop: Platform.OS === 'android' ? 40 : 0,
        paddingBottom: 12,
        paddingHorizontal: 16,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 44,
    },
    backButton: { marginRight: 12 },
    searchBar: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 8,
        paddingHorizontal: 10,
        height: 36,
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        color: 'white',
        fontSize: 15,
        height: '100%',
    },
    addButton: { marginLeft: 12 },
    listContent: { paddingBottom: 20 },
    separator: {
        height: 0.5,
        backgroundColor: '#E5E7EB',
        marginLeft: 84,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        color: '#6B7280',
        fontSize: 14,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
        paddingBottom: 100,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#374151',
        marginTop: 16,
        textAlign: 'center',
    },
    emptySubtitle: {
        fontSize: 14,
        color: '#9CA3AF',
        marginTop: 8,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 24,
    },
    startChatBtn: {
        backgroundColor: '#E5F3FF',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 20,
    },
    startChatText: {
        color: ZALO_BLUE,
        fontWeight: '600',
        fontSize: 15,
    },
});

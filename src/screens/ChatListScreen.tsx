import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import {
    View, Text, FlatList, TouchableOpacity, StyleSheet,
    TextInput, StatusBar, Platform, ActivityIndicator,
    RefreshControl, Alert, Image, Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Swipeable } from 'react-native-gesture-handler';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import { getSocket } from '../utils/socket';
import { getConversations, Conversation, getCurrentUser, pinConversation, muteConversation, deleteConversation, apiRequest } from '../utils/api';
import { LinearGradient } from 'expo-linear-gradient';
import { getAvatarUri } from '../utils/media';
import GroupAvatar from '../components/GroupAvatar';
import { useTheme } from '../context/ThemeContext';

// Light Theme Colors (Deprecated - keeping for legacy ref if needed, but unused)
const ZALO_BLUE = '#0068FF';
const DARK_BG = '#121212';
const DARK_TEXT = '#E5E7EB';
const DARK_TEXT_SECONDARY = '#9CA3AF';
const ONLINE_GREEN = '#22C55E';

type TabType = 'all' | 'unread' | 'muted';

export default function ChatListScreen() {
    const { colors, isDark } = useTheme();
    const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
    const [conversations, setConversations] = useState<any[]>([]);
    const [searchText, setSearchText] = useState('');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
    const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});
    const [activeTab, setActiveTab] = useState<TabType>('all');

    // Format time like Zalo
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
            // Load individual conversations
            const data = await getConversations();
            const mappedConversations = data.map((c: Conversation) => ({
                id: c.conversation_id,
                partnerId: c.partner_id,
                name: c.name,
                lastMessage: c.last_message || '',
                lastMessageTime: c.last_message_time,
                lastMessageSenderId: c.last_message_sender_id,
                lastMessageDeletedBy: c.last_message_deleted_by,
                time: formatMessageTime(c.last_message_time),
                avatar: c.avatar,
                unread: c.unread_count || 0,
                isOnline: c.status === 'online' || onlineUsers.has(c.partner_id),
                lastSeen: c.last_seen,
                isPinned: !!c.is_pinned,
                isMuted: !!c.is_muted,
                isGroup: false,
            }));

            // Load group conversations
            let mappedGroups: any[] = [];
            try {
                const groups = await apiRequest<any[]>('/api/groups');
                mappedGroups = (groups || []).map((g: any) => ({
                    id: g.id,
                    groupId: g.id,
                    name: g.name,
                    // Backend returns 'content' not 'text', and 'created_at' not 'createdAt'
                    lastMessage: g.lastMessage?.content || g.lastMessage?.text || 'Nhóm mới được tạo',
                    lastMessageTime: g.lastMessage?.created_at || g.lastMessage?.createdAt || g.created_at,
                    lastMessageSenderId: g.lastMessage?.sender_id,
                    lastMessageSenderName: g.lastMessage?.sender_name,
                    lastMessageType: g.lastMessage?.type,
                    time: formatMessageTime(g.lastMessage?.created_at || g.lastMessage?.createdAt || g.created_at),
                    avatar: g.avatar,
                    unread: g.unreadCount || 0,
                    isOnline: false,
                    isPinned: g.is_pinned || false,
                    isMuted: g.is_muted || false,
                    isGroup: true,
                    memberCount: g.memberCount || g.members?.length || 0,
                    members: g.members,
                }));
            } catch (e) {
                console.log('❌ Load groups error:', e);
            }

            // Merge and sort by last message time
            const allConversations = [...mappedConversations, ...mappedGroups];
            allConversations.sort((a, b) => {
                const timeA = new Date(a.lastMessageTime || 0).getTime();
                const timeB = new Date(b.lastMessageTime || 0).getTime();
                return timeB - timeA;
            });

            setConversations(allConversations);
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

    useEffect(() => {
        const fetchUser = async () => {
            const user = await getCurrentUser();
            if (user) {
                setCurrentUserId(user.id);
                setCurrentUser(user);
            }
        };
        fetchUser();
    }, []);

    useEffect(() => {
        loadConversations();

        // Function to setup socket listeners
        const setupSocketListeners = (socket: any) => {
            socket.off('receiveMessage'); // Remove old listener first
            socket.off('messageSent');

            socket.on('receiveMessage', () => {
                console.log('📩 ChatList: New message received via socket');
                loadConversations();
            });
            socket.on('messageSent', () => {
                console.log('📤 ChatList: Message sent confirmed');
                loadConversations();
            });

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
        };

        const socket = getSocket();
        if (socket) {
            if (socket.connected) {
                setupSocketListeners(socket);
            }
            // Listen for connect event to setup listeners when socket connects
            socket.on('connect', () => {
                console.log('🔌 ChatList: Socket connected, setting up listeners');
                setupSocketListeners(socket);
            });
        }

        // Backup polling every 5 seconds in case socket misses events
        const pollInterval = setInterval(() => {
            loadConversations();
        }, 5000);

        return () => {
            clearInterval(pollInterval);
            if (socket) {
                socket.off('receiveMessage');
                socket.off('messageSent');
                socket.off('userStatusChanged');
                socket.off('userTyping');
                socket.off('userStoppedTyping');
                socket.off('connect');
            }
        };
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadConversations();
        }, [])
    );

    // Filter conversations by search and tab
    const filteredConversations = useMemo(() => {
        let result = conversations;

        // Filter by tab
        if (activeTab === 'unread') {
            result = result.filter(conv => conv.unread > 0);
        } else if (activeTab === 'muted') {
            result = result.filter(conv => conv.isMuted);
        }

        // Filter by search
        if (searchText.trim()) {
            const query = searchText.toLowerCase();
            result = result.filter(conv =>
                conv.name?.toLowerCase().includes(query) ||
                conv.lastMessage?.toLowerCase().includes(query)
            );
        }

        // Sort: pinned first
        result.sort((a, b) => {
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
            return 0;
        });

        return result;
    }, [conversations, searchText, activeTab]);

    // Format last message
    const formatLastMessage = (item: any): string => {
        if (!item.lastMessage) return 'Bắt đầu cuộc trò chuyện';
        if (item.lastMessage === 'Nhóm mới được tạo') return 'Nhóm mới được tạo';

        const msg = item.lastMessage;
        const isFromMe = item.lastMessageSenderId === currentUserId;

        // Check for system message first - show simplified version
        if (item.lastMessageType === 'system' || !item.lastMessageSenderId) {
            // System message - show simplified version without full content
            if (msg.includes('đã tạo nhóm')) {
                return '📢 Nhóm mới được tạo';
            }
            if (msg.includes('đã thêm')) {
                return '👥 Có thành viên mới';
            }
            if (msg.includes('đã xóa') || msg.includes('đã rời nhóm')) {
                return '👋 Có thành viên rời nhóm';
            }
            // Other system messages - truncate
            if (msg.length > 25) {
                return msg.substring(0, 25) + '...';
            }
            return msg;
        }

        // Determine prefix based on sender
        let prefix = '';
        if (item.isGroup) {
            // Group chat: Show "Bạn:" or sender full name
            if (isFromMe) {
                prefix = 'Bạn: ';
            } else if (item.lastMessageSenderName) {
                // Use full name
                prefix = `${item.lastMessageSenderName}: `;
            }
        } else {
            // Individual chat: Only show "Bạn:" for messages from me
            prefix = isFromMe ? 'Bạn: ' : '';
        }

        // Check for deleted message (from backend or local check)
        const deletedBy = item.lastMessageDeletedBy;
        const isDeleted =
            msg === '[Tin nhắn đã bị xóa]' ||
            msg === 'Tin nhắn đã bị xóa' ||
            msg === 'Bạn đã xóa tin nhắn' ||
            (deletedBy && (Array.isArray(deletedBy) ? deletedBy.length > 0 : JSON.parse(deletedBy || '[]').length > 0));

        if (isDeleted) {
            return `${prefix}đã xóa một tin nhắn`;
        }

        // Check for sticker - multiple detection methods
        if (
            msg.includes('/sticker/') ||  // Sticker URL path
            msg.includes('/stickers/') || // Alternative sticker path
            msg.endsWith('.webp') ||       // Sticker file format
            (msg.toLowerCase && msg.toLowerCase().includes('sticker')) ||     // Contains 'sticker' keyword
            msg.startsWith('{') ||         // JSON object (might be sticker data)
            msg.startsWith('http') && (msg.includes('.webp') || msg.includes('.gif')) // Sticker image URL
        ) {
            return `${prefix}đã gửi một sticker 🎉`;
        }

        // Check for image
        if (
            msg.startsWith('http') && (msg.includes('.jpg') || msg.includes('.jpeg') || msg.includes('.png')) ||
            msg.includes('/upload/') ||
            msg.includes('/images/')
        ) {
            return `${prefix}đã gửi một hình ảnh 📷`;
        }

        // Check for video
        if (msg.startsWith('http') && (msg.includes('.mp4') || msg.includes('.mov') || msg.includes('.avi'))) {
            return `${prefix}đã gửi một video 🎬`;
        }

        return `${prefix}${msg}`;
    };

    const handleMute = async (conversationId: string) => {
        const conv = conversations.find(c => c.id === conversationId);
        if (!conv) return;

        const newMuteState = !conv.isMuted;
        setConversations(prev => prev.map(c =>
            c.id === conversationId ? { ...c, isMuted: newMuteState } : c
        ));

        try {
            await muteConversation(conversationId, newMuteState);
        } catch (error) {
            setConversations(prev => prev.map(c =>
                c.id === conversationId ? { ...c, isMuted: !newMuteState } : c
            ));
        }
    };

    const handleDelete = async (conversationId: string) => {
        Alert.alert('Xóa cuộc trò chuyện', 'Bạn có chắc chắn muốn xóa?', [
            { text: 'Hủy', style: 'cancel' },
            {
                text: 'Xóa', style: 'destructive',
                onPress: async () => {
                    setConversations(prev => prev.filter(conv => conv.id !== conversationId));
                    try {
                        await deleteConversation(conversationId);
                    } catch (error) {
                        loadConversations();
                    }
                }
            },
        ]);
    };

    // Render right swipe actions (Mute, Delete)
    const renderRightActions = (item: any) => {
        return (
            <View style={styles.swipeActionsRight}>
                <TouchableOpacity
                    style={[styles.swipeAction, styles.muteAction]}
                    onPress={() => handleMute(item.id)}
                >
                    <Ionicons
                        name={item.isMuted ? "notifications" : "notifications-off"}
                        size={22}
                        color="#fff"
                    />
                    <Text style={styles.swipeActionText}>
                        {item.isMuted ? 'Bật' : 'Tắt'}
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.swipeAction, styles.deleteAction]}
                    onPress={() => handleDelete(item.id)}
                >
                    <Ionicons name="trash-outline" size={22} color="#fff" />
                    <Text style={styles.swipeActionText}>Xóa</Text>
                </TouchableOpacity>
            </View>
        );
    };

    // Render left swipe actions (Pin)
    const renderLeftActions = (item: any) => {
        return (
            <View style={styles.swipeActionsLeft}>
                <TouchableOpacity
                    style={[styles.swipeAction, styles.pinAction]}
                    onPress={() => handlePin(item.id)}
                >
                    <Ionicons
                        name={item.isPinned ? "pin-outline" : "pin"}
                        size={22}
                        color="#fff"
                    />
                    <Text style={styles.swipeActionText}>
                        {item.isPinned ? 'Bỏ ghim' : 'Ghim'}
                    </Text>
                </TouchableOpacity>
            </View>
        );
    };

    // Handle pin
    const handlePin = async (conversationId: string) => {
        const conv = conversations.find(c => c.id === conversationId);
        if (!conv) return;

        const newPinState = !conv.isPinned;
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
            loadConversations();
        }
    };

    const renderItem = ({ item }: { item: any }) => {
        const isTyping = typingUsers[item.id];

        // Conditional Styles for items
        const itemBg = item.isPinned ? (isDark ? '#2D2D2D' : '#F0F9FF') : 'transparent';

        return (
            <Swipeable
                renderRightActions={() => renderRightActions(item)}
                renderLeftActions={() => renderLeftActions(item)}
                overshootRight={false}
                overshootLeft={false}
                friction={2}
            >
                <TouchableOpacity
                    style={[styles.itemContainer, { backgroundColor: itemBg }]}
                    onPress={() => navigation.navigate('ChatDetail', item.isGroup ? {
                        conversationId: undefined,
                        partnerId: undefined,
                        groupId: item.groupId || item.id,
                        userName: item.name,
                        avatar: item.avatar,
                        isGroup: true,
                        members: item.members
                    } : {
                        conversationId: item.id,
                        partnerId: item.partnerId,
                        userName: item.name,
                        avatar: getAvatarUri(item.avatar, item.name)
                    })}
                    activeOpacity={0.7}
                >
                    {/* Avatar */}
                    <View style={styles.avatarContainer}>
                        {item.isGroup ? (
                            // Group avatar with member grid
                            <GroupAvatar
                                members={item.members}
                                groupAvatar={item.avatar}
                                groupName={item.name}
                                size={52}
                            />
                        ) : (
                            // Individual avatar
                            item.avatar ? (
                                <Image source={{ uri: getAvatarUri(item.avatar, item.name) }} style={styles.avatar} />
                            ) : (
                                <LinearGradient
                                    colors={['#667eea', '#764ba2']}
                                    style={styles.avatar}
                                >
                                    <Text style={styles.avatarText}>{item.name?.[0]?.toUpperCase()}</Text>
                                </LinearGradient>
                            )
                        )}
                        {!item.isGroup && item.isOnline && <View style={[styles.onlineDot, { borderColor: colors.card }]} />}
                        {item.isGroup && item.memberCount > 0 && (
                            <View style={[styles.onlineDot, { backgroundColor: '#667eea', width: 18, height: 18, borderRadius: 9, borderColor: colors.card }]}>
                                <Text style={{ fontSize: 9, color: '#fff', fontWeight: 'bold' }}>
                                    {item.memberCount}
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Content */}
                    <View style={styles.contentContainer}>
                        <View style={styles.headerRow}>
                            {item.isPinned && (
                                <Ionicons name="pin" size={14} color={ZALO_BLUE} style={{ marginRight: 4 }} />
                            )}
                            {item.isGroup && (
                                <Ionicons name="people" size={14} color={colors.textSecondary} style={{ marginRight: 4 }} />
                            )}
                            <Text style={[styles.name, { color: colors.text }, item.unread > 0 && styles.nameUnread]} numberOfLines={1}>
                                {item.name}
                            </Text>
                            <Text style={[styles.time, { color: colors.textSecondary }]}>{item.time}</Text>
                        </View>

                        <View style={styles.messageRow}>
                            {isTyping ? (
                                <Text style={[styles.typingText, { color: colors.primary }]} numberOfLines={1}>Đang nhập...</Text>
                            ) : (
                                <Text style={[styles.lastMessage, { color: colors.textSecondary }, item.unread > 0 && { color: colors.text, fontWeight: '600' }]} numberOfLines={1}>
                                    {formatLastMessage(item)}
                                </Text>
                            )}
                            {item.isMuted && (
                                <Ionicons name="notifications-off" size={14} color={colors.textSecondary} style={{ marginLeft: 4 }} />
                            )}
                            {item.unread > 0 && (
                                <View style={styles.unreadBadge}>
                                    <Text style={styles.unreadText}>{item.unread > 99 ? '99+' : item.unread}</Text>
                                </View>
                            )}
                        </View>
                    </View>
                </TouchableOpacity>
            </Swipeable>
        );
    };

    const renderTabs = () => (
        <View style={styles.tabContainer}>
            <TouchableOpacity
                style={[styles.tab, { backgroundColor: activeTab === 'all' ? (isDark ? colors.card : '#1F2937') : (isDark ? '#2D2D2D' : '#E5E7EB') }]}
                onPress={() => setActiveTab('all')}
            >
                <Text style={[styles.tabText, { color: activeTab === 'all' ? '#FFFFFF' : colors.textSecondary }]}>Tất cả</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.tab, { backgroundColor: activeTab === 'unread' ? (isDark ? colors.card : '#1F2937') : (isDark ? '#2D2D2D' : '#E5E7EB') }]}
                onPress={() => setActiveTab('unread')}
            >
                <Text style={[styles.tabText, { color: activeTab === 'unread' ? '#FFFFFF' : colors.textSecondary }]}>Chưa đọc</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.tab, { backgroundColor: activeTab === 'muted' ? (isDark ? colors.card : '#1F2937') : (isDark ? '#2D2D2D' : '#E5E7EB') }]}
                onPress={() => setActiveTab('muted')}
            >
                <Text style={[styles.tabText, { color: activeTab === 'muted' ? '#FFFFFF' : colors.textSecondary }]}>Tắt thông báo</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar
                barStyle={isDark ? 'light-content' : 'dark-content'}
                backgroundColor="transparent"
                translucent={true}
            />

            <LinearGradient
                colors={['#ffebd9', '#e0f8ff']}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.headerGradient}
            >
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        {/* Avatar using user data */}
                        <View style={{ marginRight: 10 }}>
                            <Image
                                source={{ uri: getAvatarUri(currentUser?.avatar, currentUser?.name || 'User') }}
                                style={{ width: 38, height: 38, borderRadius: 19 }}
                            />
                            <View style={[styles.onlineDot, { right: 0, bottom: 0, borderColor: '#ffebd9' }]} />
                        </View>
                        <Text style={[styles.headerTitle, { color: colors.text }]}>Chats</Text>
                    </View>
                    <View style={styles.headerRight}>
                        <TouchableOpacity
                            style={styles.headerIcon}
                            onPress={() => navigation.navigate('CreateGroup')}
                        >
                            <Ionicons name="people" size={24} color={colors.text} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.headerIcon}
                            onPress={() => navigation.navigate('NewChat')}
                        >
                            <Ionicons name="add-circle-outline" size={26} color={colors.text} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Search Bar */}
                <View style={styles.searchContainer}>
                    <View style={[styles.searchBar, { backgroundColor: colors.inputBackground }]}>
                        <Ionicons name="search" size={18} color={colors.placeholder || '#9CA3AF'} />
                        <TextInput
                            style={[styles.searchInput, { color: colors.text }]}
                            placeholder="Tìm kiếm"
                            placeholderTextColor={colors.placeholder || "#9CA3AF"}
                            value={searchText}
                            onChangeText={setSearchText}
                        />
                    </View>
                </View>

                {/* Tabs */}
                {renderTabs()}
            </LinearGradient>

            {/* Content */}
            {loading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Đang tải tin nhắn...</Text>
                </View>
            ) : filteredConversations.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <MaterialIcons name="chat-bubble-outline" size={80} color={colors.textSecondary} />
                    <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>
                        {activeTab === 'unread' ? 'Không có tin nhắn chưa đọc' :
                            activeTab === 'muted' ? 'Không có cuộc trò chuyện nào bị tắt thông báo' :
                                searchText ? 'Không tìm thấy kết quả' : 'Chưa có cuộc trò chuyện nào'}
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={filteredConversations}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={[colors.primary]}
                            tintColor={colors.primary}
                        />
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: DARK_BG
    },

    // Header
    // Header Gradient
    headerGradient: {
        width: '100%',
        // Removed border radius to match Apple/Standard flat feel or keep it if desired? 
        // User asked for "white header", image has no radius visible separating it strongly, just looks like a header. 
        // But user previously asked for 'vuong ngan cach' removal. 
        // I will keep radius but small or remove it? The image shows a flat list below.
        // Actually, if background is white/light, radius matters less. I'll keep it for style.
        paddingBottom: 4,
    },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 10 : 50,
        paddingHorizontal: 16,
        paddingBottom: 8,
        backgroundColor: 'transparent',
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButton: {
        marginRight: 8
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#000000',
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerIcon: {
        padding: 8,
        marginLeft: 8,
    },

    // Search
    searchContainer: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: 'transparent',
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6', // Light gray standard
        borderRadius: 10,
        paddingHorizontal: 12,
        height: 36,
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        color: '#000000',
        fontSize: 15,
    },

    // Tabs
    tabContainer: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: 'transparent',
        gap: 8,
    },
    tab: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#E5E7EB', // Gray for inactive
    },
    tabActive: {
        backgroundColor: '#1F2937', // Black/Dark Gray for active
    },
    tabText: {
        color: '#374151',
        fontSize: 13,
        fontWeight: '500',
    },
    tabTextActive: {
        color: '#FFFFFF',
    },

    // List
    listContent: {
        paddingBottom: 20
    },

    // Conversation Item
    itemContainer: {
        flexDirection: 'row',
        padding: 16,
        paddingVertical: 12,
        alignItems: 'center',
        backgroundColor: DARK_BG,
    },
    avatarContainer: {
        position: 'relative',
        marginRight: 12
    },
    avatar: {
        width: 52,
        height: 52,
        borderRadius: 26,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        color: 'white',
        fontSize: 20,
        fontWeight: 'bold'
    },
    onlineDot: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: ONLINE_GREEN,
        borderWidth: 2,
        borderColor: DARK_BG,
    },
    contentContainer: {
        flex: 1
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4
    },
    name: {
        fontSize: 16,
        fontWeight: '500',
        color: DARK_TEXT,
        flex: 1,
        marginRight: 8
    },
    nameUnread: {
        fontWeight: '600'
    },
    time: {
        fontSize: 12,
        color: DARK_TEXT_SECONDARY
    },
    messageRow: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    lastMessage: {
        fontSize: 14,
        color: DARK_TEXT_SECONDARY,
        flex: 1
    },
    lastMessageUnread: {
        color: DARK_TEXT,
        fontWeight: '500'
    },
    typingText: {
        fontSize: 14,
        color: ZALO_BLUE,
        fontStyle: 'italic',
        flex: 1
    },

    // States
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        color: DARK_TEXT_SECONDARY,
        fontSize: 14,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    emptyTitle: {
        fontSize: 16,
        color: DARK_TEXT_SECONDARY,
        marginTop: 16,
        textAlign: 'center',
    },

    // Swipe Actions
    swipeActionsRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    swipeActionsLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    swipeAction: {
        width: 75,
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    muteAction: {
        backgroundColor: '#FF9500',
    },
    deleteAction: {
        backgroundColor: '#FF3B30',
    },
    pinAction: {
        backgroundColor: ZALO_BLUE,
    },
    swipeActionText: {
        color: '#fff',
        fontSize: 12,
        marginTop: 4,
    },
    pinnedItem: {
        backgroundColor: '#1F1F1F',
    },
    unreadBadge: {
        backgroundColor: '#FF3B30',
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
        paddingHorizontal: 6,
    },
    unreadText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: 'bold',
    },
});

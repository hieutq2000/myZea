import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    FlatList,
    TextInput,
    StyleSheet,
    ActivityIndicator,
    Alert
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { getConversations, apiRequest } from '../utils/api';
import { getAvatarUri } from '../utils/media';
import { getSocket } from '../utils/socket';
import * as Haptics from 'expo-haptics';

interface ForwardMessageModalProps {
    visible: boolean;
    onClose: () => void;
    message: any;
    currentUserId: string;
}

export default function ForwardMessageModal({ visible, onClose, message, currentUserId }: ForwardMessageModalProps) {
    const [conversations, setConversations] = useState<any[]>([]);
    const [groups, setGroups] = useState<any[]>([]);
    const [searchText, setSearchText] = useState('');
    const [loading, setLoading] = useState(true);
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const [sending, setSending] = useState(false);

    useEffect(() => {
        if (visible) {
            loadData();
        } else {
            setSelectedItems(new Set());
            setSearchText('');
        }
    }, [visible]);

    const loadData = async () => {
        setLoading(true);
        try {
            // Load conversations
            const convData = await getConversations();
            setConversations(convData.map((c: any) => ({
                id: c.conversation_id,
                name: c.name,
                avatar: c.avatar,
                isGroup: false
            })));

            // Load groups
            try {
                const groupsData = await apiRequest<any[]>('/api/groups');
                setGroups((groupsData || []).map((g: any) => ({
                    id: g.id,
                    name: g.name,
                    avatar: g.avatar,
                    isGroup: true,
                    memberCount: g.memberCount
                })));
            } catch (e) {
                console.log('Load groups error:', e);
            }
        } catch (error) {
            console.log('Load conversations error:', error);
        } finally {
            setLoading(false);
        }
    };

    const allItems = [...conversations, ...groups].filter(item =>
        item.name?.toLowerCase().includes(searchText.toLowerCase())
    );

    const toggleSelection = (id: string) => {
        const newSelection = new Set(selectedItems);
        if (newSelection.has(id)) {
            newSelection.delete(id);
        } else {
            newSelection.add(id);
        }
        setSelectedItems(newSelection);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const handleForward = async () => {
        if (selectedItems.size === 0) {
            Alert.alert('Thông báo', 'Vui lòng chọn ít nhất một cuộc trò chuyện');
            return;
        }

        setSending(true);

        try {
            const socket = getSocket();
            if (!socket) {
                Alert.alert('Lỗi', 'Không thể kết nối socket');
                setSending(false);
                return;
            }

            // Separate conversations and groups
            const targetConversationIds: string[] = [];
            const targetGroupIds: string[] = [];

            selectedItems.forEach(id => {
                const item = allItems.find(i => i.id === id);
                if (item?.isGroup) {
                    targetGroupIds.push(id);
                } else {
                    targetConversationIds.push(id);
                }
            });

            // Prepare message data
            const originalMessage = {
                id: message.id,
                text: message.text,
                type: message.type,
                imageUrl: message.imageUrl
            };

            // Listen for response
            const handleSuccess = (data: any) => {
                setSending(false);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Alert.alert('Thành công', `Đã chuyển tiếp đến ${data.count} cuộc trò chuyện`);
                onClose();
                socket.off('forwardSuccess', handleSuccess);
                socket.off('forwardError', handleError);
            };

            const handleError = (data: any) => {
                setSending(false);
                Alert.alert('Lỗi', data.error || 'Không thể chuyển tiếp tin nhắn');
                socket.off('forwardSuccess', handleSuccess);
                socket.off('forwardError', handleError);
            };

            socket.on('forwardSuccess', handleSuccess);
            socket.on('forwardError', handleError);

            // Emit forward event
            socket.emit('forwardMessage', {
                originalMessage,
                targetConversationIds,
                targetGroupIds,
                senderId: currentUserId
            });

            // Timeout
            setTimeout(() => {
                if (sending) {
                    setSending(false);
                    socket.off('forwardSuccess', handleSuccess);
                    socket.off('forwardError', handleError);
                }
            }, 10000);

        } catch (error) {
            console.error('Forward error:', error);
            setSending(false);
            Alert.alert('Lỗi', 'Không thể chuyển tiếp tin nhắn');
        }
    };

    const renderItem = ({ item }: { item: any }) => {
        const isSelected = selectedItems.has(item.id);

        return (
            <TouchableOpacity
                style={[styles.itemContainer, isSelected && styles.itemSelected]}
                onPress={() => toggleSelection(item.id)}
                activeOpacity={0.7}
            >
                <View style={styles.avatarContainer}>
                    {item.avatar ? (
                        <Image
                            source={{ uri: getAvatarUri(item.avatar, item.name) }}
                            style={styles.avatar}
                        />
                    ) : (
                        <View style={[styles.avatar, styles.avatarPlaceholder]}>
                            <Text style={styles.avatarText}>
                                {item.name?.[0]?.toUpperCase()}
                            </Text>
                        </View>
                    )}
                    {item.isGroup && (
                        <View style={styles.groupBadge}>
                            <Ionicons name="people" size={10} color="#FFF" />
                        </View>
                    )}
                </View>

                <View style={styles.itemInfo}>
                    <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                    {item.isGroup && (
                        <Text style={styles.itemSubtext}>{item.memberCount || 0} thành viên</Text>
                    )}
                </View>

                <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                    {isSelected && <Ionicons name="checkmark" size={16} color="#FFF" />}
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <Ionicons name="close" size={24} color="#333" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Chuyển tiếp</Text>
                    <TouchableOpacity
                        onPress={handleForward}
                        disabled={selectedItems.size === 0 || sending}
                        style={[
                            styles.sendButton,
                            (selectedItems.size === 0 || sending) && styles.sendButtonDisabled
                        ]}
                    >
                        {sending ? (
                            <ActivityIndicator size="small" color="#FFF" />
                        ) : (
                            <Text style={styles.sendButtonText}>
                                Gửi {selectedItems.size > 0 ? `(${selectedItems.size})` : ''}
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Message Preview */}
                <View style={styles.messagePreview}>
                    <View style={styles.previewBubble}>
                        {message?.type === 'image' && message?.imageUrl ? (
                            <Image source={{ uri: message.imageUrl }} style={styles.previewImage} />
                        ) : message?.type === 'sticker' && message?.imageUrl ? (
                            <Image source={{ uri: message.imageUrl }} style={styles.previewSticker} />
                        ) : (
                            <Text style={styles.previewText} numberOfLines={2}>
                                {message?.text || '...'}
                            </Text>
                        )}
                    </View>
                </View>

                {/* Search */}
                <View style={styles.searchContainer}>
                    <Ionicons name="search" size={20} color="#9CA3AF" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Tìm kiếm..."
                        placeholderTextColor="#9CA3AF"
                        value={searchText}
                        onChangeText={setSearchText}
                    />
                </View>

                {/* List */}
                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#0084FF" />
                    </View>
                ) : (
                    <FlatList
                        data={allItems}
                        renderItem={renderItem}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={styles.listContent}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Text style={styles.emptyText}>Không có cuộc trò chuyện nào</Text>
                            </View>
                        }
                    />
                )}
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#FFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    closeButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1F2937',
    },
    sendButton: {
        backgroundColor: '#0084FF',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        minWidth: 70,
        alignItems: 'center',
    },
    sendButtonDisabled: {
        backgroundColor: '#9CA3AF',
    },
    sendButtonText: {
        color: '#FFF',
        fontWeight: '600',
        fontSize: 14,
    },
    messagePreview: {
        backgroundColor: '#FFF',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    previewBubble: {
        backgroundColor: '#E5E7EB',
        borderRadius: 12,
        padding: 12,
        alignSelf: 'flex-start',
        maxWidth: '80%',
    },
    previewText: {
        fontSize: 14,
        color: '#374151',
    },
    previewImage: {
        width: 100,
        height: 100,
        borderRadius: 8,
    },
    previewSticker: {
        width: 60,
        height: 60,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        margin: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        fontSize: 16,
        color: '#1F2937',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        paddingHorizontal: 12,
        paddingBottom: 20,
    },
    itemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        padding: 12,
        borderRadius: 12,
        marginBottom: 8,
    },
    itemSelected: {
        backgroundColor: '#E8F4FD',
        borderWidth: 1,
        borderColor: '#0084FF',
    },
    avatarContainer: {
        position: 'relative',
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
    },
    avatarPlaceholder: {
        backgroundColor: '#9CA3AF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '600',
    },
    groupBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#0084FF',
        width: 18,
        height: 18,
        borderRadius: 9,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#FFF',
    },
    itemInfo: {
        flex: 1,
        marginLeft: 12,
    },
    itemName: {
        fontSize: 16,
        fontWeight: '500',
        color: '#1F2937',
    },
    itemSubtext: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 2,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#D1D5DB',
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxSelected: {
        backgroundColor: '#0084FF',
        borderColor: '#0084FF',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 50,
    },
    emptyText: {
        fontSize: 16,
        color: '#9CA3AF',
    },
});

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Image,
    StatusBar,
    Platform,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { formatTime } from '../utils/formatTime';
import {
    getPlaceNotifications,
    markNotificationAsRead as apiMarkAsRead,
    markAllNotificationsAsRead,
    PlaceNotification
} from '../utils/api';
import { getAvatarUri } from '../utils/media';

// Mock notification data (later replace with API)
interface Notification {
    id: string;
    type: 'like' | 'comment' | 'share' | 'mention' | 'follow';
    user: {
        id: string;
        name: string;
        avatar?: string;
    };
    postId?: string;
    postPreview?: string;
    message: string;
    createdAt: string;
    isRead: boolean;
}

interface PlaceNotificationsScreenProps {
    onBack: () => void;
    onOpenPost?: (postId: string) => void;
}

// Get notification icon and color based on type
const getNotificationStyle = (type: string) => {
    switch (type) {
        case 'like':
            return { icon: 'heart', color: '#E91E63', bgColor: '#FCE4EC' };
        case 'comment':
            return { icon: 'chatbubble', color: '#2196F3', bgColor: '#E3F2FD' };
        case 'share':
            return { icon: 'share-social', color: '#4CAF50', bgColor: '#E8F5E9' };
        case 'mention':
            return { icon: 'at', color: '#FF9800', bgColor: '#FFF3E0' };
        case 'follow':
            return { icon: 'person-add', color: '#9C27B0', bgColor: '#F3E5F5' };
        default:
            return { icon: 'notifications', color: '#607D8B', bgColor: '#ECEFF1' };
    }
};

// Mock notifications
const MOCK_NOTIFICATIONS: Notification[] = [
    {
        id: '1',
        type: 'like',
        user: { id: 'u1', name: 'Nguyễn Văn A', avatar: 'https://ui-avatars.com/api/?name=Nguyen+Van+A&background=667eea&color=fff' },
        postId: 'p1',
        postPreview: 'Bài viết về công nghệ...',
        message: 'đã thích bài viết của bạn',
        createdAt: new Date(Date.now() - 5 * 60000).toISOString(),
        isRead: false,
    },
    {
        id: '2',
        type: 'comment',
        user: { id: 'u2', name: 'Trần Thị B', avatar: 'https://ui-avatars.com/api/?name=Tran+Thi+B&background=f97316&color=fff' },
        postId: 'p1',
        postPreview: 'Bài viết về công nghệ...',
        message: 'đã bình luận: "Bài viết rất hay!"',
        createdAt: new Date(Date.now() - 30 * 60000).toISOString(),
        isRead: false,
    },
    {
        id: '3',
        type: 'like',
        user: { id: 'u3', name: 'Lê Văn C' },
        postId: 'p2',
        message: 'và 5 người khác đã thích bài viết của bạn',
        createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
        isRead: true,
    },
    {
        id: '4',
        type: 'share',
        user: { id: 'u4', name: 'Phạm Thị D', avatar: 'https://ui-avatars.com/api/?name=Pham+Thi+D&background=10b981&color=fff' },
        postId: 'p3',
        message: 'đã chia sẻ bài viết của bạn',
        createdAt: new Date(Date.now() - 24 * 3600000).toISOString(),
        isRead: true,
    },
    {
        id: '5',
        type: 'mention',
        user: { id: 'u5', name: 'Hoàng Văn E' },
        postId: 'p4',
        message: 'đã nhắc đến bạn trong một bình luận',
        createdAt: new Date(Date.now() - 48 * 3600000).toISOString(),
        isRead: true,
    },
];

export default function PlaceNotificationsScreen({ onBack, onOpenPost }: PlaceNotificationsScreenProps) {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    useEffect(() => {
        loadNotifications();
    }, []);

    const loadNotifications = async () => {
        try {
            const data = await getPlaceNotifications(50);
            // Map API response to local type (they should be compatible)
            const mappedData: Notification[] = data.map(n => ({
                id: n.id,
                type: n.type as Notification['type'],
                user: n.user,
                postId: n.postId,
                postPreview: n.postPreview,
                message: n.message,
                createdAt: n.createdAt,
                isRead: n.isRead
            }));

            // If API returns empty, use mock data for demo
            if (mappedData.length === 0) {
                setNotifications(MOCK_NOTIFICATIONS);
            } else {
                setNotifications(mappedData);
            }
        } catch (error) {
            console.error('Load notifications error:', error);
            // Fallback to mock data on error
            setNotifications(MOCK_NOTIFICATIONS);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    const handleRefresh = () => {
        setIsRefreshing(true);
        loadNotifications();
    };

    const markAsRead = async (id: string) => {
        // Optimistic update
        setNotifications(prev =>
            prev.map(n => n.id === id ? { ...n, isRead: true } : n)
        );
        // Call API
        try {
            await apiMarkAsRead(id);
        } catch (error) {
            console.error('Mark as read error:', error);
        }
    };

    const handleMarkAllAsRead = async () => {
        // Optimistic update
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        // Call API
        try {
            await markAllNotificationsAsRead();
        } catch (error) {
            console.error('Mark all as read error:', error);
        }
    };

    const handleNotificationPress = (notification: Notification) => {
        markAsRead(notification.id);
        if (notification.postId && onOpenPost) {
            onOpenPost(notification.postId);
        }
    };

    const renderNotification = ({ item }: { item: Notification }) => {
        const style = getNotificationStyle(item.type);
        const avatarUri = getAvatarUri(item.user.avatar, item.user.name);

        return (
            <TouchableOpacity
                style={[
                    styles.notificationItem,
                    !item.isRead && styles.unreadItem
                ]}
                onPress={() => handleNotificationPress(item)}
                activeOpacity={0.7}
            >
                {/* Avatar with badge */}
                <View style={styles.avatarContainer}>
                    <Image source={{ uri: avatarUri }} style={styles.avatar} />
                    <View style={[styles.typeBadge, { backgroundColor: style.bgColor }]}>
                        <Ionicons name={style.icon as any} size={12} color={style.color} />
                    </View>
                </View>

                {/* Content */}
                <View style={styles.notificationContent}>
                    <Text style={styles.notificationText} numberOfLines={3}>
                        <Text style={styles.userName}>{item.user.name}</Text>
                        {' '}{item.message}
                    </Text>
                    <Text style={styles.timeText}>{formatTime(item.createdAt)}</Text>
                </View>

                {/* Unread indicator */}
                {!item.isRead && <View style={styles.unreadDot} />}
            </TouchableOpacity>
        );
    };

    const unreadCount = notifications.filter(n => !n.isRead).length;

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

            {/* Header */}
            <LinearGradient
                colors={['#ffebd9', '#e0f8ff']}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.header}
            >
                <SafeAreaView>
                    <View style={[styles.headerContent, { paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }]}>
                        <TouchableOpacity onPress={onBack} style={styles.backButton}>
                            <Ionicons name="arrow-back" size={24} color="#333" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Thông báo</Text>
                        <View style={styles.headerRight}>
                            {unreadCount > 0 && (
                                <View style={styles.unreadBadge}>
                                    <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
                                </View>
                            )}
                        </View>
                    </View>
                </SafeAreaView>
            </LinearGradient>

            {/* Notifications List */}
            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#F97316" />
                </View>
            ) : (
                <FlatList
                    data={notifications}
                    keyExtractor={item => item.id}
                    renderItem={renderNotification}
                    refreshControl={
                        <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
                    }
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={() => (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="notifications-off-outline" size={60} color="#CCC" />
                            <Text style={styles.emptyText}>Chưa có thông báo nào</Text>
                        </View>
                    )}
                    ListHeaderComponent={() => (
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Gần đây</Text>
                            {unreadCount > 0 && (
                                <TouchableOpacity onPress={handleMarkAllAsRead}>
                                    <Text style={styles.markAllRead}>Đánh dấu đã đọc</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5',
    },
    header: {
        paddingBottom: 12,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    backButton: {
        padding: 8,
        marginRight: 8,
    },
    headerTitle: {
        flex: 1,
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },
    headerRight: {
        width: 40,
        alignItems: 'flex-end',
    },
    unreadBadge: {
        backgroundColor: '#F97316',
        borderRadius: 10,
        paddingHorizontal: 8,
        paddingVertical: 2,
        minWidth: 20,
        alignItems: 'center',
    },
    unreadBadgeText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: 'bold',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        paddingBottom: 100,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#FFF',
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    markAllRead: {
        fontSize: 14,
        color: '#F97316',
        fontWeight: '600',
    },
    notificationItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    unreadItem: {
        backgroundColor: '#FFF5F0',
    },
    avatarContainer: {
        position: 'relative',
        marginRight: 12,
    },
    avatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
    },
    typeBadge: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#FFF',
    },
    notificationContent: {
        flex: 1,
    },
    notificationText: {
        fontSize: 14,
        color: '#333',
        lineHeight: 20,
    },
    userName: {
        fontWeight: 'bold',
    },
    timeText: {
        fontSize: 12,
        color: '#999',
        marginTop: 4,
    },
    unreadDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#F97316',
        marginLeft: 8,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 100,
    },
    emptyText: {
        fontSize: 16,
        color: '#999',
        marginTop: 16,
    },
});

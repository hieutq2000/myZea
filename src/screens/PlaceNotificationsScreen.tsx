import React, { useState, useEffect, useRef } from 'react';
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
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { formatTime } from '../utils/formatTime';
import {
    getPlaceNotifications,
    markNotificationAsRead as apiMarkAsRead,
    markAllNotificationsAsRead,
    deleteNotification as apiDeleteNotification,
    PlaceNotification
} from '../utils/api';
import { getAvatarUri } from '../utils/media';
import { useNavigation } from '@react-navigation/native';

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
    onBack?: () => void;
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




export default function PlaceNotificationsScreen({ onBack, onOpenPost }: PlaceNotificationsScreenProps) {
    const navigation = useNavigation<any>();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [showSettingsMenu, setShowSettingsMenu] = useState(false);

    // Handle back - use prop or navigation
    const handleBack = () => {
        if (onBack) {
            onBack();
        } else {
            navigation.goBack();
        }
    };

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

            setNotifications(mappedData);
        } catch (error) {
            console.error('Load notifications error:', error);
            setNotifications([]);
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
        setShowSettingsMenu(false);
        // Optimistic update
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        // Call API
        try {
            await markAllNotificationsAsRead();
        } catch (error) {
            console.error('Mark all as read error:', error);
        }
    };

    const handleNotificationSettings = () => {
        setShowSettingsMenu(false);
        // TODO: Navigate to notification settings screen
        // For now, just close the menu
    };

    const handleNotificationPress = (notification: Notification) => {
        markAsRead(notification.id);
        if (notification.postId && onOpenPost) {
            onOpenPost(notification.postId);
        }
    };

    const handleDeleteNotification = async (id: string) => {
        // Remove notification from list (optimistic update)
        setNotifications(prev => prev.filter(n => n.id !== id));

        // Call API to delete notification on server
        try {
            await apiDeleteNotification(id);
        } catch (error) {
            console.error('Delete notification error:', error);
            // Optionally: restore the notification if delete failed
        }
    };

    // Render right actions (delete button)
    const renderRightActions = (notificationId: string) => (
        <TouchableOpacity
            style={styles.deleteAction}
            onPress={() => handleDeleteNotification(notificationId)}
        >
            <Ionicons name="trash-outline" size={24} color="#FFF" />
            <Text style={styles.deleteActionText}>Xóa</Text>
        </TouchableOpacity>
    );

    const renderNotification = ({ item }: { item: Notification }) => {
        const style = getNotificationStyle(item.type);
        const avatarUri = getAvatarUri(item.user.avatar, item.user.name);

        return (
            <Swipeable
                renderRightActions={() => renderRightActions(item.id)}
                overshootRight={false}
                friction={2}
            >
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
            </Swipeable>
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
                        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                            <Ionicons name="arrow-back" size={24} color="#333" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Thông báo</Text>
                        <View style={styles.headerRight}>
                            <TouchableOpacity
                                style={styles.settingsButton}
                                onPress={() => setShowSettingsMenu(!showSettingsMenu)}
                            >
                                <Ionicons name="settings-outline" size={24} color="#333" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </SafeAreaView>
            </LinearGradient>

            {/* Settings Popup Menu */}
            {showSettingsMenu && (
                <View style={styles.settingsMenuOverlay}>
                    <TouchableOpacity
                        style={styles.settingsMenuBackdrop}
                        onPress={() => setShowSettingsMenu(false)}
                        activeOpacity={1}
                    />
                    <View style={styles.settingsMenu}>
                        <TouchableOpacity
                            style={styles.settingsMenuItem}
                            onPress={handleMarkAllAsRead}
                        >
                            <Ionicons name="checkmark-done-outline" size={22} color="#333" />
                            <Text style={styles.settingsMenuText}>Đánh dấu tất cả là đã đọc</Text>
                        </TouchableOpacity>
                        <View style={styles.settingsMenuDivider} />
                        <TouchableOpacity
                            style={styles.settingsMenuItem}
                            onPress={handleNotificationSettings}
                        >
                            <Ionicons name="settings-outline" size={22} color="#333" />
                            <Text style={styles.settingsMenuText}>Cài đặt thông báo</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

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
    settingsButton: {
        padding: 4,
    },
    settingsMenuOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1000,
    },
    settingsMenuBackdrop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    settingsMenu: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 100 : 80,
        right: 16,
        backgroundColor: '#FFF',
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
        minWidth: 250,
    },
    settingsMenuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    settingsMenuText: {
        fontSize: 15,
        color: '#333',
        marginLeft: 12,
    },
    settingsMenuDivider: {
        height: 1,
        backgroundColor: '#F0F0F0',
        marginHorizontal: 16,
    },
    deleteAction: {
        backgroundColor: '#EF4444',
        justifyContent: 'center',
        alignItems: 'center',
        width: 80,
        height: '100%',
    },
    deleteActionText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '600',
        marginTop: 4,
    },
});

import React, { useRef, forwardRef, useImperativeHandle, useCallback, useState } from 'react';
import { View, StyleSheet, Image, Animated, Text } from 'react-native';
import { Swipeable, TouchableOpacity } from 'react-native-gesture-handler';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getAvatarUri } from '../../utils/media';

// Zalo Colors
const ZALO_BLUE = '#0068FF';
const ONLINE_GREEN = '#10b981';

interface SwipeableConversationItemProps {
    conversation: {
        id: string;
        partnerId: string;
        name: string;
        avatar?: string;
        lastMessage?: string;
        lastMessageSenderId?: string;
        time?: string;
        unread?: number;
        isOnline?: boolean;
        isPinned?: boolean;
        isMuted?: boolean;
    };
    currentUserId?: string;
    isTyping?: boolean;
    onPress: () => void;
    onMute?: (conversationId: string) => void;
    onDelete?: (conversationId: string) => void;
    onPin?: (conversationId: string) => void;
    onSwipeableWillOpen?: () => void;
    onSwipeableClose?: () => void;
}

const SwipeableConversationItem = forwardRef<any, SwipeableConversationItemProps>(({
    conversation,
    currentUserId,
    isTyping = false,
    onPress,
    onMute,
    onDelete,
    onPin,
    onSwipeableWillOpen,
    onSwipeableClose,
}, ref) => {
    const swipeableRef = useRef<Swipeable>(null);
    const [isOpen, setIsOpen] = useState(false);
    const hasUnread = (conversation.unread || 0) > 0;
    const isPinned = conversation.isPinned || false;
    const isMuted = conversation.isMuted || false;

    // Expose close method to parent
    useImperativeHandle(ref, () => ({
        close: () => {
            swipeableRef.current?.close();
            setIsOpen(false);
        },
    }));

    // Format last message with "Bạn: " prefix
    const formatLastMessage = useCallback(() => {
        if (!conversation.lastMessage) return 'Bắt đầu cuộc trò chuyện';
        const isFromMe = conversation.lastMessageSenderId &&
            conversation.lastMessageSenderId === currentUserId;
        const prefix = isFromMe ? 'Bạn: ' : '';
        return `${prefix}${conversation.lastMessage}`;
    }, [conversation.lastMessage, conversation.lastMessageSenderId, currentUserId]);

    // Render right actions (swipe left to reveal: Mute and Delete)
    const renderRightActions = useCallback((
        progress: Animated.AnimatedInterpolation<number>,
        dragX: Animated.AnimatedInterpolation<number>
    ) => {
        const opacity = progress.interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: [0, 0.5, 1],
            extrapolate: 'clamp',
        });

        const scale = progress.interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: [0.8, 0.9, 1],
            extrapolate: 'clamp',
        });

        return (
            <View style={styles.rightActions}>
                {/* Mute button */}
                <Animated.View style={{ opacity, transform: [{ scale }] }}>
                    <TouchableOpacity
                        style={[styles.actionButton, styles.muteButton]}
                        onPress={() => {
                            swipeableRef.current?.close();
                            onMute?.(conversation.id);
                        }}
                    >
                        <Ionicons
                            name={isMuted ? "notifications" : "notifications-off"}
                            size={22}
                            color="#fff"
                        />
                        <Text style={styles.actionButtonText}>
                            {isMuted ? 'Bật thông báo' : 'Tắt tiếng'}
                        </Text>
                    </TouchableOpacity>
                </Animated.View>

                {/* Delete button */}
                <Animated.View style={{ opacity, transform: [{ scale }] }}>
                    <TouchableOpacity
                        style={[styles.actionButton, styles.deleteButton]}
                        onPress={() => {
                            swipeableRef.current?.close();
                            onDelete?.(conversation.id);
                        }}
                    >
                        <Ionicons name="trash-outline" size={22} color="#fff" />
                        <Text style={styles.actionButtonText}>Xóa</Text>
                    </TouchableOpacity>
                </Animated.View>
            </View>
        );
    }, [conversation.id, isMuted, onMute, onDelete]);

    // Render left actions (swipe right to reveal: Pin)
    const renderLeftActions = useCallback((
        progress: Animated.AnimatedInterpolation<number>,
        dragX: Animated.AnimatedInterpolation<number>
    ) => {
        const opacity = progress.interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: [0, 0.5, 1],
            extrapolate: 'clamp',
        });

        const scale = progress.interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: [0.8, 0.9, 1],
            extrapolate: 'clamp',
        });

        return (
            <View style={styles.leftActions}>
                {/* Pin button */}
                <Animated.View style={{ opacity, transform: [{ scale }] }}>
                    <TouchableOpacity
                        style={[styles.actionButton, styles.pinButton]}
                        onPress={() => {
                            swipeableRef.current?.close();
                            onPin?.(conversation.id);
                        }}
                    >
                        <MaterialIcons
                            name={isPinned ? "push-pin" : "push-pin"}
                            size={22}
                            color="#fff"
                        />
                        <Text style={styles.actionButtonText}>
                            {isPinned ? 'Bỏ ghim' : 'Ghim'}
                        </Text>
                    </TouchableOpacity>
                </Animated.View>
            </View>
        );
    }, [conversation.id, isPinned, onPin]);

    return (
        <Swipeable
            ref={swipeableRef}
            renderRightActions={renderRightActions}
            renderLeftActions={renderLeftActions}
            rightThreshold={70}
            leftThreshold={70}
            overshootRight={false}
            overshootLeft={false}
            friction={1.5}
            onSwipeableWillOpen={() => {
                onSwipeableWillOpen?.();
                setIsOpen(true);
            }}
            onSwipeableClose={() => {
                setIsOpen(false);
                onSwipeableClose?.();
            }}
        >
            <TouchableOpacity
                style={[
                    styles.container,
                    isPinned && styles.pinnedContainer,
                ]}
                onPress={onPress}
                activeOpacity={0.7}
            >
                {/* Avatar with Online Status */}
                <View style={styles.avatarContainer}>
                    {conversation.avatar ? (
                        <Image source={{ uri: getAvatarUri(conversation.avatar, conversation.name) }} style={styles.avatar} />
                    ) : (
                        <LinearGradient
                            colors={['#A0AEC0', '#718096']}
                            style={styles.avatar}
                        >
                            <Text style={styles.avatarText}>
                                {conversation.name?.[0]?.toUpperCase()}
                            </Text>
                        </LinearGradient>
                    )}
                    {conversation.isOnline && <View style={styles.onlineDot} />}
                    {isMuted && (
                        <View style={styles.mutedBadge}>
                            <Ionicons name="notifications-off" size={10} color="#fff" />
                        </View>
                    )}
                </View>

                {/* Content */}
                <View style={styles.contentContainer}>
                    <View style={styles.headerRow}>
                        <View style={styles.nameRow}>
                            {isPinned && (
                                <MaterialIcons name="push-pin" size={14} color={ZALO_BLUE} style={styles.pinIcon} />
                            )}
                            <Text
                                style={[styles.name, hasUnread && styles.nameUnread]}
                                numberOfLines={1}
                            >
                                {conversation.name}
                            </Text>
                        </View>
                        <Text style={[styles.time, hasUnread && styles.timeUnread]}>
                            {conversation.time}
                        </Text>
                    </View>

                    <View style={styles.messageRow}>
                        {isTyping ? (
                            <Text style={styles.typingText} numberOfLines={1}>
                                Đang nhập...
                            </Text>
                        ) : (
                            <Text
                                style={[styles.lastMessage, hasUnread && styles.lastMessageUnread]}
                                numberOfLines={1}
                            >
                                {formatLastMessage()}
                            </Text>
                        )}
                        {hasUnread && (
                            <View style={styles.badge}>
                                <Text style={styles.badgeText}>
                                    {(conversation.unread || 0) < 100 ? conversation.unread : '99+'}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
            </TouchableOpacity>
        </Swipeable>
    );
});

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        padding: 14,
        alignItems: 'center',
        backgroundColor: 'white',
    },
    pinnedContainer: {
        backgroundColor: '#FFFBEB', // Light yellow for pinned
    },
    avatarContainer: {
        position: 'relative',
        marginRight: 14
    },
    avatar: {
        width: 54,
        height: 54,
        borderRadius: 27,
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
        borderColor: 'white',
    },
    mutedBadge: {
        position: 'absolute',
        top: 0,
        right: 0,
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#9CA3AF',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: 'white',
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
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: 8,
    },
    pinIcon: {
        marginRight: 4,
    },
    name: {
        fontSize: 16,
        fontWeight: '500',
        color: '#111827',
        flex: 1
    },
    nameUnread: {
        fontWeight: '600',
        color: '#000'
    },
    time: {
        fontSize: 12,
        color: '#9CA3AF'
    },
    timeUnread: {
        color: ZALO_BLUE,
        fontWeight: '500'
    },
    messageRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    lastMessage: {
        fontSize: 14,
        color: '#6B7280',
        flex: 1,
        marginRight: 8
    },
    lastMessageUnread: {
        color: '#111827',
        fontWeight: '500'
    },
    typingText: {
        fontSize: 14,
        color: ZALO_BLUE,
        fontStyle: 'italic',
        flex: 1
    },
    badge: {
        backgroundColor: '#EF4444',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 10,
        minWidth: 20,
        alignItems: 'center',
    },
    badgeText: {
        color: 'white',
        fontSize: 11,
        fontWeight: 'bold'
    },

    // Swipe Actions
    rightActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    leftActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    actionButton: {
        width: 70,
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 8,
    },
    muteButton: {
        backgroundColor: '#6B7280',
    },
    deleteButton: {
        backgroundColor: '#EF4444',
    },
    pinButton: {
        backgroundColor: '#F59E0B',
    },
    actionButtonText: {
        color: '#fff',
        fontSize: 11,
        marginTop: 4,
        fontWeight: '500',
    },
});

export default SwipeableConversationItem;

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, Platform, SafeAreaView, StatusBar, Image, Keyboard, Modal, Alert, ActivityIndicator, Dimensions, Animated } from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/types';
import { COLORS, SPACING } from '../utils/theme';
import { Ionicons, Feather, FontAwesome, MaterialIcons } from '@expo/vector-icons';
import { getSocket } from '../utils/socket';
import { getChatHistory, getCurrentUser, markConversationAsRead, API_URL, deleteMessage } from '../utils/api';
import { launchImageLibrary, launchCamera } from '../utils/imagePicker';
import EmojiPicker from '../components/EmojiPicker';
import { getAvatarUri } from '../utils/media';
import { Swipeable, GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';

type ChatDetailRouteProp = RouteProp<RootStackParamList, 'ChatDetail'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ZALO_BLUE = '#0068FF';
const ZALO_BG = '#FFFFFF'; // White background as seen in image
const MY_BUBBLE = '#5C3C5D'; // Dark Purple from image
const OTHER_BUBBLE = '#F2F4F5'; // Very light gray for other
const CALL_PURPLE = '#7C3C6D'; // Purple for call icons like Zalo
const CALL_MISSED_RED = '#E04B4B'; // Red for missed calls

// ... update styles ...
export default function ChatDetailScreen() {
    const navigation = useNavigation<any>(); // Using any to avoid complex typing issues temporarily
    const route = useRoute<ChatDetailRouteProp>();
    const { conversationId, partnerId, userName, avatar } = route.params;

    const [messages, setMessages] = useState<any[]>([]);
    const [inputText, setInputText] = useState('');
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [keyboardHeight, setKeyboardHeight] = useState(0);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showMediaPicker, setShowMediaPicker] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [partnerTyping, setPartnerTyping] = useState(false);
    const [replyingTo, setReplyingTo] = useState<any | null>(null);
    const [lastSeenMessageId, setLastSeenMessageId] = useState<string | null>(null);
    const [selectedMessage, setSelectedMessage] = useState<any | null>(null);
    const [isPartnerOnline, setIsPartnerOnline] = useState(false);
    const [partnerLastSeen, setPartnerLastSeen] = useState<Date | null>(null);
    // Scroll to bottom states
    const [showScrollToBottom, setShowScrollToBottom] = useState(false);
    const [newMessageCount, setNewMessageCount] = useState(0);
    const [isNearBottom, setIsNearBottom] = useState(true);
    const flatListRef = useRef<FlatList>(null);
    const inputRef = useRef<TextInput>(null);
    const socket = getSocket();

    useEffect(() => {
        loadHistory();
        fetchCurrentUser();

        const unsubscribeFocus = navigation.addListener('focus', () => {
            loadHistory();
        });

        const keyboardWillShow = Keyboard.addListener('keyboardWillShow', (e) => {
            setKeyboardHeight(e.endCoordinates.height);
            setShowEmojiPicker(false);
        });
        const keyboardWillHide = Keyboard.addListener('keyboardWillHide', () => {
            setKeyboardHeight(0);
        });

        if (socket) {
            socket.on('receiveMessage', (message) => {
                appendMessage(message);
                if (conversationId) markConversationAsRead(conversationId);
            });
            socket.on('messageSent', (message) => {
                setMessages(prev => prev.map(msg => msg.id === message.tempId ? {
                    ...msg,
                    id: message._id,
                    time: new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                } : msg));
            });
            // Typing listeners
            socket.on('userTyping', (data) => {
                if (data.conversationId === conversationId && data.userId !== currentUserId) {
                    setPartnerTyping(true);
                }
            });
            socket.on('userStoppedTyping', (data) => {
                if (data.conversationId === conversationId && data.userId !== currentUserId) {
                    setPartnerTyping(false);
                }
            });
            // Revoke listener
            socket.on('messageRevoked', (data) => {
                if (data.conversationId === conversationId) {
                    setMessages(prev => prev.filter(m => m.id !== data.messageId));
                }
            });
            // Read status listener
            socket.on('messagesRead', (data) => {
                if (data.conversationId === conversationId) {
                    setLastSeenMessageId(data.lastMessageId); // Update seen status
                }
            });

            // Online status listeners
            socket.on('userOnline', (data) => {
                if (data.userId === partnerId) {
                    setIsPartnerOnline(true);
                }
            });
            socket.on('userOffline', (data) => {
                if (data.userId === partnerId) {
                    setIsPartnerOnline(false);
                    setPartnerLastSeen(new Date());
                }
            });

            // Request partner's online status
            socket.emit('checkUserOnline', { userId: partnerId });
        }

        return () => {
            keyboardWillShow.remove();
            keyboardWillHide.remove();
            if (socket) {
                socket.off('receiveMessage');
                socket.off('messageSent');
            }
        };
    }, [conversationId, partnerId, currentUserId, socket]);

    const fetchCurrentUser = async () => {
        const user = await getCurrentUser();
        if (user) setCurrentUserId(user.id);
    };

    const loadHistory = async () => {
        try {
            const history = await getChatHistory(partnerId);
            const mapped = history.map((m: any) => ({
                id: m._id,
                text: m.text,
                type: m.type || 'text',
                imageUrl: m.imageUrl,
                sender: m.user._id === currentUserId ? 'me' : 'other',
                time: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                createdAt: m.createdAt, // Store full date for date separator
                senderId: m.user._id,
                replyTo: m.replyTo // Map reply info
            }));
            setMessages(mapped);
            scrollToBottom();

            if (conversationId) {
                markConversationAsRead(conversationId).catch(err =>
                    console.log('Mark as read error:', err)
                );
            }
        } catch (error) {
            console.log('Load history error:', error);
        }
    };

    const appendMessage = (msg: any) => {
        const isFromPartner = msg.user._id !== currentUserId;

        setMessages(prev => {
            if (prev.find(m => m.id === msg._id)) return prev;
            return [...prev, {
                id: msg._id,
                text: msg.text,
                type: msg.type || 'text',
                imageUrl: msg.imageUrl,
                createdAt: msg.createdAt,
                sender: msg.user._id === currentUserId ? 'me' : 'other',
                time: new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                senderId: msg.user._id,
                replyTo: msg.replyTo
            }];
        });

        // If user has scrolled up and receives new message from partner, increment counter
        if (!isNearBottom && isFromPartner) {
            setNewMessageCount(prev => prev + 1);
        } else {
            scrollToBottom();
        }
    };

    const scrollToBottom = () => {
        setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
        // Reset new message counter when scrolling to bottom
        setNewMessageCount(0);
        setShowScrollToBottom(false);
    };

    // Handle scroll event to show/hide scroll to bottom button
    const handleScroll = (event: any) => {
        const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
        const paddingToBottom = 100; // Distance from bottom to consider "near bottom"
        const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;

        setIsNearBottom(isCloseToBottom);
        setShowScrollToBottom(!isCloseToBottom);

        // If scrolled back to bottom, reset new message counter
        if (isCloseToBottom) {
            setNewMessageCount(0);
        }
    };

    const sendMessage = async (text?: string, type: string = 'text', imageUrl?: string) => {
        const messageText = text || inputText.trim();
        if (!messageText && type === 'text') return;
        if (!currentUserId) return;

        const tempId = Date.now().toString();
        const newMessage: any = {
            id: tempId,
            text: messageText,
            type: type,
            imageUrl: imageUrl,
            sender: 'me',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            senderId: currentUserId
        };

        setMessages(prev => [...prev, newMessage]);
        scrollToBottom();

        if (socket) {
            socket.emit('sendMessage', {
                conversationId,
                senderId: currentUserId,
                receiverId: partnerId,
                message: messageText,
                type: type,
                imageUrl: imageUrl,
                tempId: tempId,
                replyTo: replyingTo ? { id: replyingTo.id, text: replyingTo.text, type: replyingTo.type } : undefined
            });
            socket.emit('userStoppedTyping', { conversationId, userId: currentUserId });
        }

        setInputText('');
        setReplyingTo(null);
    };

    const handleTextChange = (text: string) => {
        setInputText(text);
        if (socket) {
            if (text.length > 0) {
                socket.emit('userTyping', { conversationId, userId: currentUserId });
            } else {
                socket.emit('userStoppedTyping', { conversationId, userId: currentUserId });
            }
        }
    };

    const handleEmojiSelect = (emoji: string) => {
        setInputText(prev => prev + emoji);
    };

    const toggleEmojiPicker = () => {
        if (showEmojiPicker) {
            setShowEmojiPicker(false);
            inputRef.current?.focus();
        } else {
            Keyboard.dismiss();
            setShowEmojiPicker(true);
        }
    };

    const handlePickImage = async () => {
        setShowMediaPicker(false);
        const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.8 });

        if (result.didCancel || result.error) {
            if (result.error) Alert.alert('Lỗi', result.error);
            return;
        }

        if (result.assets && result.assets[0]) {
            const imageUri = result.assets[0].uri;
            await uploadAndSendImage(imageUri);
        }
    };

    const handleTakePhoto = async () => {
        setShowMediaPicker(false);
        const result = await launchCamera({ mediaType: 'photo', quality: 0.8 });

        if (result.didCancel || result.error) {
            if (result.error) Alert.alert('Lỗi', result.error);
            return;
        }

        if (result.assets && result.assets[0]) {
            const imageUri = result.assets[0].uri;
            await uploadAndSendImage(imageUri);
        }
    };

    const uploadAndSendImage = async (imageUri: string) => {
        setIsUploading(true);
        try {
            // Create FormData for upload
            const formData = new FormData();
            const fileName = imageUri.split('/').pop() || 'image.jpg';
            formData.append('image', {
                uri: imageUri,
                type: 'image/jpeg',
                name: fileName,
            } as any);

            // Upload image to server
            const response = await fetch(`${API_URL}/api/upload/image`, {
                method: 'POST',
                body: formData,
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            if (!response.ok) {
                throw new Error('Upload failed');
            }

            const data = await response.json();
            const imageUrl = data.url || imageUri; // Use uploaded URL or local URI as fallback

            // Send message with image
            sendMessage('[Hình ảnh]', 'image', imageUrl);
        } catch (error) {
            console.error('Upload error:', error);
            // Fallback: send with local URI
            sendMessage('[Hình ảnh]', 'image', imageUri);
        } finally {
            setIsUploading(false);
        }
    };

    // Format last seen time like Facebook
    const formatLastSeen = () => {
        if (isPartnerOnline) return 'Đang hoạt động';
        if (partnerTyping) return 'Đang nhập...';
        if (!partnerLastSeen) return 'Vừa mới truy cập';

        const now = new Date();
        const diff = now.getTime() - partnerLastSeen.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Vừa mới truy cập';
        if (minutes < 60) return `Hoạt động ${minutes} phút trước`;
        if (hours < 24) return `Hoạt động ${hours} giờ trước`;
        if (days < 7) return `Hoạt động ${days} ngày trước`;
        return 'Hoạt động từ lâu';
    };

    // Format date separator like Zalo
    const formatDateSeparator = (dateString: string) => {
        const date = new Date(dateString);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const isToday = date.toDateString() === today.toDateString();
        const isYesterday = date.toDateString() === yesterday.toDateString();

        if (isToday) return 'Hôm nay';
        if (isYesterday) return 'Hôm qua';

        // Format as "16 thg 12, 18:24"
        const day = date.getDate();
        const month = date.getMonth() + 1;
        return `${day} thg ${month}`;
    };

    // Check if should show date separator
    const shouldShowDateSeparator = (currentItem: any, prevItem: any) => {
        if (!currentItem.createdAt) return false;
        if (!prevItem) return true; // First message always shows date

        const currentDate = new Date(currentItem.createdAt).toDateString();
        const prevDate = new Date(prevItem.createdAt).toDateString();

        return currentDate !== prevDate;
    };

    // Format call time with date like Zalo "16 thg 12, 18:24"
    const formatCallTime = (createdAt: string, time: string) => {
        if (!createdAt) return time;
        const date = new Date(createdAt);
        const day = date.getDate();
        const month = date.getMonth() + 1;
        return `${day} thg ${month}, ${time}`;
    };

    const renderHeader = () => (
        <View style={styles.header}>
            <View style={styles.headerLeft}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={28} color="#000000" />
                </TouchableOpacity>
                <View style={styles.headerAvatarContainer}>
                    {avatar ? (
                        <Image source={{ uri: getAvatarUri(avatar, userName) }} style={styles.headerAvatar} />
                    ) : (
                        <View style={[styles.headerAvatar, { backgroundColor: '#A0AEC0', alignItems: 'center', justifyContent: 'center' }]}>
                            <Text style={{ color: 'white', fontSize: 14 }}>{userName?.[0]}</Text>
                        </View>
                    )}
                    {/* Online indicator dot */}
                    {isPartnerOnline && (
                        <View style={styles.onlineIndicator} />
                    )}
                </View>
                <View style={styles.headerInfo}>
                    <Text style={styles.headerTitle} numberOfLines={1}>{userName}</Text>
                    <Text style={styles.headerDepartment} numberOfLines={1}>FRT - FLC - HN</Text>
                </View>
            </View>
            <View style={styles.headerRight}>
                <TouchableOpacity
                    style={styles.headerIcon}
                    onPress={() => (navigation as any).navigate('Call', {
                        partnerId,
                        userName,
                        avatar,
                        isVideo: false,
                        isIncoming: false,
                        conversationId, // Pass conversationId
                    })}
                >
                    <Ionicons name="call-outline" size={24} color="#000000" />
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.headerIcon}
                    onPress={() => (navigation as any).navigate('Call', {
                        partnerId,
                        userName,
                        avatar,
                        isVideo: true,
                        isIncoming: false,
                        conversationId, // Pass conversationId
                    })}
                >
                    <Ionicons name="videocam-outline" size={26} color="#000000" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.headerIcon}>
                    <Ionicons name="ellipsis-vertical" size={24} color="#000000" />
                </TouchableOpacity>
            </View>
        </View>
    );



    const handleCheckSelectMessage = (item: any) => {
        setSelectedMessage(item);
    };

    const handleReplyMessage = () => {
        if (selectedMessage) {
            setReplyingTo(selectedMessage);
            setSelectedMessage(null);
            inputRef.current?.focus();
        }
    };

    const handleDeleteMessageAction = async () => {
        if (!selectedMessage) return;
        const messageId = selectedMessage.id;
        // Optimistic delete
        setMessages(prev => prev.filter(m => m.id !== messageId));
        setSelectedMessage(null);
        try {
            await deleteMessage(messageId);
            if (socket) socket.emit('revokeMessage', { conversationId, messageId });
        } catch (error) {
            console.error('Delete message error', error);
        }
    };

    // Swipe to reply - render left action (reply icon)
    const renderSwipeReplyAction = (
        progress: Animated.AnimatedInterpolation<number>,
        dragX: Animated.AnimatedInterpolation<number>
    ) => {
        const scale = dragX.interpolate({
            inputRange: [0, 50, 100],
            outputRange: [0, 0.8, 1],
            extrapolate: 'clamp',
        });

        const opacity = dragX.interpolate({
            inputRange: [0, 30, 60],
            outputRange: [0, 0.5, 1],
            extrapolate: 'clamp',
        });

        return (
            <Animated.View style={[styles.swipeReplyContainer, { opacity }]}>
                <Animated.View style={[styles.swipeReplyIcon, { transform: [{ scale }] }]}>
                    <Ionicons name="arrow-undo" size={20} color="#666" />
                </Animated.View>
            </Animated.View>
        );
    };

    // Ref to track currently open swipeable
    const swipeableRefs = useRef<{ [key: string]: Swipeable | null }>({});
    const currentlyOpenSwipeable = useRef<Swipeable | null>(null);

    // Handle swipe open to trigger reply
    const handleSwipeOpen = (item: any, swipeableRef: Swipeable | null) => {
        // Close the swipeable immediately after triggering reply
        if (swipeableRef) {
            setTimeout(() => {
                swipeableRef.close();
            }, 100);
        }

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setReplyingTo(item);
        inputRef.current?.focus();
    };


    const renderMessageItem = useCallback(({ item, index }: { item: any, index: number }) => {
        const isMe = item.sender === 'me' || (currentUserId && item.senderId === currentUserId);
        const nextMessage = messages[index + 1];
        const isLast = index === messages.length - 1 || (nextMessage && nextMessage.senderId !== item.senderId);
        const isImage = item.type === 'image' && item.imageUrl;

        // Detect call messages - backward compatibility for 'text' type from DB
        let isCall = item.type === 'call_missed' || item.type === 'call_ended';
        let callType = item.type;

        // If type became 'text' due to DB but content indicates call
        if (!isCall && item.text === 'Cuộc gọi thoại bị nhỡ') {
            isCall = true;
            callType = 'call_missed';
        } else if (!isCall && (item.text?.startsWith('Cuộc gọi thoại') && item.text !== 'Cuộc gọi thoại bị nhỡ')) {
            isCall = true;
            callType = 'call_ended';
        }

        // Check for date separator
        const prevMessage = index > 0 ? messages[index - 1] : null;
        const showDateSeparator = shouldShowDateSeparator(item, prevMessage);

        return (
            <>
                {showDateSeparator && item.createdAt && (
                    <View style={styles.dateSeparator}>
                        <Text style={styles.dateSeparatorText}>
                            {formatDateSeparator(item.createdAt)}
                        </Text>
                    </View>
                )}
                <Swipeable
                    ref={(ref) => { swipeableRefs.current[item.id] = ref; }}
                    renderLeftActions={renderSwipeReplyAction}
                    onSwipeableOpen={() => handleSwipeOpen(item, swipeableRefs.current[item.id])}
                    overshootLeft={false}
                    leftThreshold={60}
                    friction={2}
                    containerStyle={styles.swipeableContainer}
                >
                    <View style={[
                        styles.messageRow,
                        isMe ? styles.messageRowMe : styles.messageRowOther,
                        { marginBottom: isLast ? 8 : 2 }
                    ]}>
                        {!isMe && (
                            <View style={styles.avatarContainer}>
                                {avatar ? (
                                    <Image source={{ uri: getAvatarUri(avatar, userName) }} style={styles.avatarSmall} />
                                ) : (
                                    <View style={[styles.avatarSmall, { backgroundColor: '#A0AEC0', alignItems: 'center', justifyContent: 'center' }]}>
                                        <Text style={{ color: 'white', fontSize: 10 }}>{userName?.[0]?.toUpperCase()}</Text>
                                    </View>
                                )}
                            </View>
                        )}

                        {isImage ? (
                            <TouchableOpacity
                                style={[styles.imageBubble, isMe ? styles.bubbleMe : styles.bubbleOther]}
                                onPress={() => setSelectedImage(item.imageUrl)}
                                onLongPress={() => handleCheckSelectMessage(item)}
                                delayLongPress={500}
                            >
                                <Image
                                    source={{ uri: item.imageUrl }}
                                    style={styles.messageImage}
                                    resizeMode="cover"
                                />
                                <Text style={styles.messageTime}>{item.time}</Text>
                            </TouchableOpacity>
                        ) : isCall ? (
                            <TouchableOpacity
                                style={styles.callBubbleNew}
                                onPress={() => (navigation as any).navigate('Call', {
                                    partnerId,
                                    userName,
                                    avatar,
                                    isVideo: false,
                                    isIncoming: false,
                                    conversationId
                                })}
                            >
                                <View style={[styles.callIconCircle, callType === 'call_missed' ? styles.callIconMissed : styles.callIconEnded]}>
                                    {callType === 'call_missed' ? (
                                        <Ionicons name="call" size={18} color="#E04B4B" style={{ transform: [{ rotate: '135deg' }] }} />
                                    ) : (
                                        <Ionicons name="call" size={18} color={CALL_PURPLE} />
                                    )}
                                </View>
                                <View style={styles.callTextContainer}>
                                    <Text style={[styles.callMainText, callType === 'call_missed' && styles.callMissedText]}>
                                        {callType === 'call_missed'
                                            ? (isMe ? 'Bạn đã hủy' : 'Cuộc gọi nhỡ')
                                            : 'Cuộc gọi thoại'
                                        }
                                    </Text>
                                    <Text style={styles.callTimeText}>
                                        {formatCallTime(item.createdAt, item.time)}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity
                                style={[styles.messageBubble, isMe ? styles.bubbleMe : styles.bubbleOther]}
                                onLongPress={() => handleCheckSelectMessage(item)}
                                delayLongPress={500}
                                activeOpacity={0.8}
                            >
                                {item.replyTo && (
                                    <View style={styles.replyPreview}>
                                        <View style={styles.replyBar} />
                                        <Text style={styles.replyText} numberOfLines={1}>
                                            {item.replyTo.text || (item.replyTo.type === 'image' ? '[Hình ảnh]' : '...')}
                                        </Text>
                                    </View>
                                )}
                                <Text style={[styles.messageText, { color: isMe ? '#FFFFFF' : '#000000' }]}>{item.text}</Text>
                                <Text style={[styles.messageTime, { color: isMe ? 'rgba(255,255,255,0.7)' : '#9CA3AF' }]}>{item.time}</Text>
                                {isMe && isLast && (
                                    <Text style={[styles.seenText, { color: 'rgba(255,255,255,0.7)' }]}>{lastSeenMessageId === item.id ? 'Đã xem' : 'Đã gửi'}</Text>
                                )}
                            </TouchableOpacity>
                        )}
                    </View>
                </Swipeable>
            </>
        );
    }, [messages, currentUserId, avatar, userName, navigation, partnerId, conversationId, lastSeenMessageId]);



    return (
        <View style={styles.container}>
            <SafeAreaView style={styles.safeTop}>
                <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
            </SafeAreaView>
            {renderHeader()}

            <View style={styles.keyboardAvoid}>
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={item => item.id}
                    renderItem={renderMessageItem}
                    contentContainerStyle={styles.listContent}
                    style={styles.listStyle}
                    onContentSizeChange={() => {
                        if (isNearBottom) scrollToBottom();
                    }}
                    onScroll={handleScroll}
                    scrollEventThrottle={16}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="interactive"
                />

                {/* Scroll to bottom button with new message badge */}
                {showScrollToBottom && (
                    <TouchableOpacity
                        style={styles.scrollToBottomButton}
                        onPress={scrollToBottom}
                        activeOpacity={0.8}
                    >
                        <View style={styles.scrollToBottomInner}>
                            <Ionicons name="chevron-down" size={22} color="#FFFFFF" />
                        </View>
                        {newMessageCount > 0 && (
                            <View style={styles.newMessageBadge}>
                                <Text style={styles.newMessageBadgeText}>
                                    {newMessageCount > 99 ? '99+' : newMessageCount}
                                </Text>
                            </View>
                        )}
                    </TouchableOpacity>
                )}

                {partnerTyping && (
                    <View style={styles.typingIndicator}>
                        <Text style={styles.typingText}>Người ấy đang nhập...</Text>
                    </View>
                )}

                {/* Input Container */}
                <View style={[
                    styles.footer,
                    Platform.OS === 'ios'
                        ? { marginBottom: showEmojiPicker ? 0 : (keyboardHeight > 0 ? keyboardHeight : 20) }
                        : {}
                ]}>
                    {replyingTo && (
                        <View style={styles.replyBarContainer}>
                            <View style={styles.replyBarAccent} />
                            <View style={styles.replyBarContent}>
                                <Text style={styles.replyBarTitle}>Đang trả lời</Text>
                                <Text style={styles.replyBarMessage} numberOfLines={1}>{replyingTo.text || '[Phương tiện]'}</Text>
                            </View>
                            <TouchableOpacity onPress={() => setReplyingTo(null)} style={styles.replyBarClose}>
                                <Ionicons name="close" size={20} color="#666" />
                            </TouchableOpacity>
                        </View>
                    )}

                    <View style={styles.inputRow}>
                        {/* Attachment Button (Left) */}
                        <TouchableOpacity style={styles.leftButton} onPress={() => setShowMediaPicker(true)}>
                            <Ionicons name="add" size={24} color="#FFFFFF" />
                        </TouchableOpacity>

                        {/* Text Input Wrapper (Center) */}
                        <View style={styles.inputWrapper}>
                            <TextInput
                                ref={inputRef}
                                style={styles.input}
                                value={inputText}
                                onChangeText={handleTextChange}
                                placeholder="Tin nhắn"
                                placeholderTextColor="#9CA3AF"
                                multiline
                                onFocus={() => {
                                    setShowEmojiPicker(false);
                                    setTimeout(() => scrollToBottom(), 300);
                                }}
                            />
                            {/* Sticker Button (Inside Input) */}
                            <TouchableOpacity style={styles.stickerInnerButton} onPress={toggleEmojiPicker}>
                                <Ionicons
                                    name={showEmojiPicker ? "keypad-outline" : "happy-outline"}
                                    size={24}
                                    color="#6B7280"
                                />
                            </TouchableOpacity>
                        </View>

                        {/* Mic or Send Button (Right) */}
                        {inputText.trim() ? (
                            <TouchableOpacity style={styles.rightButton} onPress={() => sendMessage()}>
                                <Ionicons name="send" size={24} color={ZALO_BLUE} />
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity style={styles.rightButton} onPress={() => Alert.alert('Thông báo', 'Tính năng ghi âm đang phát triển')}>
                                <Ionicons name="mic-outline" size={28} color="#6B7280" />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* Emoji Picker */}
                {showEmojiPicker && (
                    <EmojiPicker onSelectEmoji={handleEmojiSelect} />
                )}

                {/* Upload indicator */}
                {isUploading && (
                    <View style={styles.uploadingOverlay}>
                        <ActivityIndicator size="large" color={ZALO_BLUE} />
                        <Text style={styles.uploadingText}>Đang tải ảnh...</Text>
                    </View>
                )}
            </View>

            {/* Media Picker Modal */}
            <Modal
                visible={showMediaPicker}
                transparent
                animationType="slide"
                onRequestClose={() => setShowMediaPicker(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowMediaPicker(false)}
                >
                    <View style={styles.mediaPickerContainer}>
                        <View style={styles.mediaPickerHandle} />
                        <Text style={styles.mediaPickerTitle}>Chọn phương thức</Text>

                        <View style={styles.mediaPickerOptions}>
                            <TouchableOpacity style={styles.mediaOption} onPress={handleTakePhoto}>
                                <View style={[styles.mediaOptionIcon, { backgroundColor: '#E0F2FE' }]}>
                                    <Ionicons name="camera" size={28} color="#0284C7" />
                                </View>
                                <Text style={styles.mediaOptionText}>Chụp ảnh</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.mediaOption} onPress={handlePickImage}>
                                <View style={[styles.mediaOptionIcon, { backgroundColor: '#DCFCE7' }]}>
                                    <Ionicons name="images" size={28} color="#16A34A" />
                                </View>
                                <Text style={styles.mediaOptionText}>Thư viện</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Image Preview Modal */}
            <Modal
                visible={!!selectedImage}
                transparent
                animationType="fade"
                onRequestClose={() => setSelectedImage(null)}
            >
                <View style={styles.imagePreviewContainer}>
                    <TouchableOpacity
                        style={styles.imagePreviewClose}
                        onPress={() => setSelectedImage(null)}
                    >
                        <Ionicons name="close" size={30} color="white" />
                    </TouchableOpacity>
                    {selectedImage && (
                        <Image
                            source={{ uri: selectedImage }}
                            style={styles.imagePreview}
                            resizeMode="contain"
                        />
                    )}
                </View>
            </Modal>

            {/* Message Options Modal */}
            <Modal
                visible={!!selectedMessage}
                transparent
                animationType="fade"
                onRequestClose={() => setSelectedMessage(null)}
            >
                <TouchableOpacity
                    style={styles.optionsOverlay}
                    activeOpacity={1}
                    onPress={() => setSelectedMessage(null)}
                >
                    <View style={styles.optionsContainer}>
                        {/* Reactions */}
                        <View style={styles.reactionBar}>
                            {['❤️', '👍', '👎', '🔥', '🥰', '👏', '😂', '⬇️'].map((emoji, index) => (
                                <TouchableOpacity key={index} style={styles.reactionButton}>
                                    <Text style={styles.reactionText}>{emoji}</Text>
                                </TouchableOpacity>
                            ))}
                            <TouchableOpacity style={styles.reactionButton}>
                                <Ionicons name="chevron-down" size={20} color="#9CA3AF" />
                            </TouchableOpacity>
                        </View>

                        {/* Menu Items */}
                        <View style={styles.menuContainer}>
                            <TouchableOpacity style={styles.menuItem} onPress={handleReplyMessage}>
                                <Text style={styles.menuItemText}>Trả lời</Text>
                                <Ionicons name="arrow-undo-outline" size={20} color="white" />
                            </TouchableOpacity>
                            <View style={styles.menuDivider} />

                            <TouchableOpacity style={styles.menuItem} onPress={() => { console.log('Copy'); setSelectedMessage(null); }}>
                                <Text style={styles.menuItemText}>Sao chép</Text>
                                <Ionicons name="copy-outline" size={20} color="white" />
                            </TouchableOpacity>
                            <View style={styles.menuDivider} />

                            {selectedMessage?.sender === 'me' && (
                                <>
                                    <TouchableOpacity style={styles.menuItem} onPress={() => { console.log('Edit'); setSelectedMessage(null); }}>
                                        <Text style={styles.menuItemText}>Sửa</Text>
                                        <Ionicons name="create-outline" size={20} color="white" />
                                    </TouchableOpacity>
                                    <View style={styles.menuDivider} />
                                </>
                            )}


                            <TouchableOpacity style={styles.menuItem} onPress={() => setSelectedMessage(null)}>
                                <Text style={styles.menuItemText}>Ghim</Text>
                                <Ionicons name="pin-outline" size={20} color="white" />
                            </TouchableOpacity>
                            <View style={styles.menuDivider} />

                            <TouchableOpacity style={styles.menuItem} onPress={() => setSelectedMessage(null)}>
                                <Text style={styles.menuItemText}>Chuyển tiếp</Text>
                                <Ionicons name="arrow-redo-outline" size={20} color="white" />
                            </TouchableOpacity>
                            <View style={styles.menuDivider} />

                            <TouchableOpacity style={styles.menuItem} onPress={handleDeleteMessageAction}>
                                <Text style={[styles.menuItemText, { color: '#FF3B30' }]}>Xóa</Text>
                                <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                            </TouchableOpacity>
                            <View style={styles.menuDivider} />

                            <TouchableOpacity style={styles.menuItem} onPress={() => setSelectedMessage(null)}>
                                <Text style={styles.menuItemText}>Chọn</Text>
                                <Ionicons name="checkmark-circle-outline" size={20} color="white" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: ZALO_BG,
    },
    safeTop: {
        backgroundColor: '#FFFFFF',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FFFFFF',
        paddingTop: Platform.OS === 'android' ? 40 : 0,
        height: Platform.OS === 'android' ? 90 : 50,
        paddingHorizontal: 12,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    backButton: { padding: 4, marginRight: 4 },
    headerAvatarContainer: { marginRight: 10, position: 'relative' },
    headerAvatar: { width: 36, height: 36, borderRadius: 18 },
    onlineIndicator: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#31A24C', // Facebook green
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    headerInfo: { flex: 1 },
    headerTitle: { color: '#000000', fontSize: 17, fontWeight: '600' },
    headerSubtitle: { color: '#666666', fontSize: 12 },
    headerDepartment: { color: '#9CA3AF', fontSize: 12, marginTop: 1 },
    headerRight: { flexDirection: 'row', width: 100, justifyContent: 'flex-end' },
    headerIcon: { padding: 4, marginLeft: 15 },

    keyboardAvoid: { flex: 1 },
    listStyle: { flex: 1 },
    listContent: { padding: 12, paddingBottom: 10 },

    // Scroll to bottom button styles
    scrollToBottomButton: {
        position: 'absolute',
        right: 16,
        bottom: 16,
        zIndex: 100,
    },
    scrollToBottomInner: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    newMessageBadge: {
        position: 'absolute',
        top: -6,
        right: -6,
        minWidth: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#E04B4B',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 6,
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    newMessageBadgeText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '700',
    },

    messageRow: { flexDirection: 'row', alignItems: 'flex-end', marginVertical: 1 },
    messageRowMe: { justifyContent: 'flex-end' },
    messageRowOther: { justifyContent: 'flex-start' },

    // Swipe to reply styles
    swipeableContainer: {
        backgroundColor: 'transparent',
    },
    swipeReplyContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        width: 60,
        paddingLeft: 10,
    },
    swipeReplyIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#E5E7EB',
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Date separator styles
    dateSeparator: {
        alignItems: 'center',
        marginVertical: 16,
        paddingHorizontal: 20,
    },
    dateSeparatorText: {
        fontSize: 12,
        color: '#9CA3AF',
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 12,
        paddingVertical: 4,
    },

    avatarContainer: { marginRight: 8, width: 28, alignItems: 'center' },
    avatarSmall: { width: 28, height: 28, borderRadius: 14 },

    messageBubble: {
        maxWidth: '80%',
        padding: 10,
        paddingHorizontal: 12,
        borderRadius: 12,
    },
    imageBubble: {
        maxWidth: '70%',
        padding: 4,
        borderRadius: 12,
        overflow: 'hidden',
    },
    // New Zalo-style call bubble
    callBubbleNew: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F2F4F5',
        borderRadius: 20,
        paddingVertical: 10,
        paddingHorizontal: 14,
        maxWidth: '75%',
    },
    callIconCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    callIconEnded: {
        backgroundColor: 'rgba(124, 60, 109, 0.15)', // Light purple background
    },
    callIconMissed: {
        backgroundColor: 'rgba(224, 75, 75, 0.15)', // Light red background
    },
    callTextContainer: {
        flex: 1,
    },
    callMainText: {
        fontSize: 14,
        fontWeight: '500',
        color: CALL_PURPLE,
    },
    callMissedText: {
        color: '#E04B4B',
    },
    callTimeText: {
        fontSize: 12,
        color: '#9CA3AF',
        marginTop: 2,
    },
    // Old styles kept for backward compatibility
    callBubble: {
        maxWidth: '75%',
        padding: 12,
        borderRadius: 16,
        backgroundColor: 'rgba(0,0,0,0.4)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    callContent: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    callIconBubble: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    callInfo: {
        flex: 1,
    },
    callTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#000',
    },
    callSubtitle: {
        fontSize: 12,
        color: '#555',
    },
    callBackButton: {
        backgroundColor: 'rgba(0,0,0,0.05)',
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
    },
    callButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#000',
    },
    bubbleMe: {
        backgroundColor: MY_BUBBLE,
    },
    bubbleOther: {
        backgroundColor: OTHER_BUBBLE,
    },
    messageText: { fontSize: 16, lineHeight: 22 },
    messageTime: { fontSize: 10, color: '#9CA3AF', marginTop: 4, alignSelf: 'flex-end' },
    messageImage: {
        width: SCREEN_WIDTH * 0.6,
        height: SCREEN_WIDTH * 0.6,
        borderRadius: 8,
    },

    footer: {
        backgroundColor: '#FFFFFF',
        // Removed borderTop to make input area cleaner
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        paddingVertical: 10,
        paddingHorizontal: 12,
    },
    replyBarContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: '#FAFAFA',
        borderBottomWidth: 1,
        borderBottomColor: '#F5F5F5',
    },
    replyBarAccent: {
        width: 4,
        height: 36,
        backgroundColor: ZALO_BLUE,
        borderRadius: 2,
        marginRight: 10,
    },
    replyBarContent: {
        flex: 1,
    },
    replyBarTitle: {
        color: ZALO_BLUE,
        fontWeight: '600',
        fontSize: 14,
        marginBottom: 2,
    },
    replyBarMessage: {
        color: '#666',
        fontSize: 14,
    },
    replyBarClose: {
        padding: 4,
    },
    leftButton: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: '#000000', // Black circle
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    inputWrapper: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6', // Light gray input bg
        borderRadius: 20,
        paddingHorizontal: 16,
        height: 40,
        borderWidth: 0, // No border
    },
    input: {
        flex: 1,
        fontSize: 16,
        maxHeight: 100,
        paddingVertical: 8,
        color: '#000000',
        marginRight: 4,
    },
    stickerInnerButton: {
        padding: 4,
    },
    rightButton: {
        padding: 8,
        marginLeft: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    uploadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    uploadingText: {
        color: 'white',
        marginTop: 10,
        fontSize: 16,
    },

    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    mediaPickerContainer: {
        backgroundColor: 'white',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        paddingBottom: 40,
    },
    mediaPickerHandle: {
        width: 40,
        height: 4,
        backgroundColor: '#D1D5DB',
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 20,
    },
    mediaPickerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1F2937',
        textAlign: 'center',
        marginBottom: 20,
    },
    mediaPickerOptions: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    mediaOption: {
        alignItems: 'center',
    },
    mediaOptionIcon: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    mediaOptionText: {
        fontSize: 14,
        color: '#4B5563',
    },

    imagePreviewContainer: {
        flex: 1,
        backgroundColor: 'black',
        justifyContent: 'center',
        alignItems: 'center',
    },
    imagePreviewClose: {
        position: 'absolute',
        top: 50,
        right: 20,
        zIndex: 10,
        padding: 10,
    },
    imagePreview: {
        width: SCREEN_WIDTH,
        height: SCREEN_WIDTH,
    },
    // Reply Styles
    replyPreview: {
        backgroundColor: 'rgba(0,0,0,0.05)',
        borderLeftWidth: 3,
        borderLeftColor: '#666',
        padding: 5,
        borderRadius: 4,
        marginBottom: 4,
    },
    replyBar: {
        // Using borderLeft instead
    },
    replyText: {
        color: '#555',
        fontSize: 12,
    },
    seenText: {
        fontSize: 10,
        color: '#666',
        alignSelf: 'flex-end',
        marginTop: 2,
    },
    typingIndicator: {
        padding: 8,
        marginLeft: 10,
        marginBottom: 5,
    },
    typingText: {
        fontSize: 12,
        color: '#888',
        fontStyle: 'italic',
    },
    replyInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f0f0f0',
        padding: 8,
        paddingHorizontal: 12,
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0',
    },
    replyInputLabel: {
        fontSize: 10,
        color: ZALO_BLUE,
        fontWeight: 'bold',
    },
    replyInputText: {
        fontSize: 12,
        color: '#333',
    },
    // ... (rest of styles)
    optionsOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)', // Dimmed background
        justifyContent: 'center',
        alignItems: 'center',
    },
    optionsContainer: {
        width: '70%',
        alignItems: 'center',
    },
    reactionBar: {
        flexDirection: 'row',
        backgroundColor: '#262626',
        borderRadius: 30,
        padding: 8,
        marginBottom: 10,
        justifyContent: 'space-between',
        width: '100%',
    },
    reactionButton: {
        padding: 4,
    },
    reactionText: {
        fontSize: 20,
    },
    menuContainer: {
        backgroundColor: '#262626', // Dark menu background like screenshot
        borderRadius: 15,
        width: '60%', // Narrower than reaction bar
        overflow: 'hidden',
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    menuItemText: {
        fontSize: 16,
        color: 'white',
        fontWeight: '500',
    },
    menuDivider: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: '#3A3A3A',
        marginLeft: 16,
    },
});

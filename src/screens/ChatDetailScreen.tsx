import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, Platform, StatusBar, Keyboard, Modal, Alert, ActivityIndicator, Dimensions, Animated, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Audio } from 'expo-av';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/types';
import { COLORS, SPACING } from '../utils/theme';
import { Ionicons, Feather, FontAwesome, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as Location from 'expo-location';
import { Linking } from 'react-native';
import { getSocket, handleTypingInput, stopTyping, joinConversation, leaveConversation, markMessageAsSeen } from '../utils/socket';
import { getChatHistory, getCurrentUser, markConversationAsRead, API_URL, deleteMessage, getImageUrl, getUserInfo, apiRequest, getToken, getPinnedMessage, uploadFile } from '../utils/api';
import { launchImageLibrary, launchCamera } from '../utils/imagePicker';
import EmojiPicker from '../components/EmojiPicker';
import StickerPicker from '../components/StickerPicker';
import { getAvatarUri } from '../utils/media';
import ChatMedia from '../components/ChatMedia';
import { Swipeable, GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import GroupAvatar from '../components/GroupAvatar';
import * as Clipboard from 'expo-clipboard';
import ForwardMessageModal from '../components/ForwardMessageModal';
import ChatOptionsModal from '../components/ChatOptionsModal';




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
    const { conversationId, partnerId, userName, avatar, groupId, isGroup, members } = route.params;

    // Header Info State (Fallback if params missing)
    const [headerName, setHeaderName] = useState(userName || (isGroup ? 'Nhóm chat' : 'Người dùng'));
    const [headerAvatar, setHeaderAvatar] = useState(avatar);

    useEffect(() => {
        // Fetch user info if missing from params (only for individual chat)
        if (!isGroup && (!userName || !avatar) && partnerId) {
            getUserInfo(partnerId).then(u => {
                if (u) {
                    if (!userName) setHeaderName(u.name);
                    if (!avatar) setHeaderAvatar(u.avatar);
                }
            }).catch(err => console.log('Fetch header info failed:', err));
        }
    }, [partnerId, isGroup]);

    const [messages, setMessages] = useState<any[]>([]);
    const [inputText, setInputText] = useState('');
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [keyboardHeight, setKeyboardHeight] = useState(0);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [pickerTab, setPickerTab] = useState<'emoji' | 'sticker'>('sticker');
    const [showMediaPicker, setShowMediaPicker] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    // Audio Recording State
    const [recording, setRecording] = useState<Audio.Recording | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
    const [sound, setSound] = useState<Audio.Sound | null>(null);
    const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
    const [pinnedMessage, setPinnedMessage] = useState<any>(null);
    const [showUnpinOption, setShowUnpinOption] = useState(false);
    const [showHeaderOptions, setShowHeaderOptions] = useState(false);

    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [partnerTyping, setPartnerTyping] = useState(false);
    const [replyingTo, setReplyingTo] = useState<any | null>(null);
    const [editingMessage, setEditingMessage] = useState<any | null>(null);
    const [lastSeenMessageId, setLastSeenMessageId] = useState<string | null>(null);
    const [selectedMessage, setSelectedMessage] = useState<any | null>(null);
    const [isPartnerOnline, setIsPartnerOnline] = useState(false);
    const [partnerLastSeen, setPartnerLastSeen] = useState<Date | null>(null);
    // Scroll to bottom states
    const [showScrollToBottom, setShowScrollToBottom] = useState(false);
    const [newMessageCount, setNewMessageCount] = useState(0);
    const [isNearBottom, setIsNearBottom] = useState(true);
    // Image preview with caption states
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [imageCaption, setImageCaption] = useState('');
    const [previewMediaType, setPreviewMediaType] = useState<'image' | 'video'>('image');
    // Read receipts for group chat - maps messageId to array of readers
    const [readReceipts, setReadReceipts] = useState<{ [messageId: string]: Array<{ id: string, name: string, avatar?: string }> }>({});

    // MENTION FEATURE STATES
    const [showMention, setShowMention] = useState(false);
    const [mentionKeyword, setMentionKeyword] = useState('');
    const [groupMembers, setGroupMembers] = useState<any[]>([]);

    // FORWARD MESSAGE STATE
    const [showForwardModal, setShowForwardModal] = useState(false);
    const [forwardMessage, setForwardMessage] = useState<any>(null);

    // SEARCH MESSAGE STATE
    const [isSearching, setIsSearching] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);

    const socket = getSocket();

    useEffect(() => {
        if (isGroup && groupId) {
            // Fetch full members for mention list
            apiRequest<{ members: any[] }>(`/api/groups/${groupId}`)
                .then(res => {
                    if (res && res.members) setGroupMembers(res.members);
                })
                .catch(e => console.log('Fetch mention members err:', e));
        } else if (members) {
            setGroupMembers(members);
        }
    }, [isGroup, groupId]);

    const handleMentionSelect = (item: any) => {
        const lastAt = inputText.lastIndexOf('@');
        if (lastAt !== -1) {
            const prefix = inputText.substring(0, lastAt);
            const nameToInsert = item.id === 'all' ? '@All ' : `@${item.name} `;
            // We replace from the last @ until the end (assuming user is typing at the end)
            // A better way is to splice only the keyword, but appending is safer for simple usage
            // setInputText(prefix + nameToInsert);

            // Correct logic: Replace "@key" with "@Name "
            const newInput = prefix + nameToInsert;
            setInputText(newInput);
        }
    };

    // --- PIN MESSAGE LOGIC START ---
    useEffect(() => {
        if (!conversationId) return;
        getPinnedMessage(conversationId).then(res => {
            if (res && res.pinned) setPinnedMessage(res.pinned);
        }).catch(err => console.log('Get pinned err:', err));

        if (!socket) return;
        const onPinned = (data: any) => {
            if (data.conversationId === conversationId) {
                setPinnedMessage(data.message);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
        };
        const onUnpinned = (data: any) => {
            if (data.conversationId === conversationId) {
                setPinnedMessage(null);
            }
        };

        socket.on('messagePinned', onPinned);
        socket.on('messageUnpinned', onUnpinned);
        return () => { socket.off('messagePinned', onPinned); socket.off('messageUnpinned', onUnpinned); }
    }, [conversationId, socket]);

    const handlePinMessageAction = () => {
        if (!selectedMessage || !socket) return;
        socket.emit('pinMessage', { conversationId, messageId: selectedMessage.id, userId: currentUserId });
        setSelectedMessage(null);
        Alert.alert('Thành công', 'Đã ghim tin nhắn');
    };

    const handleUnpinMessageAction = () => {
        if (!pinnedMessage || !socket) return;
        socket.emit('unpinMessage', { conversationId, messageId: pinnedMessage.id });
        setShowUnpinOption(false);
    };

    const scrollToMessage = (messageId: string) => {
        const index = messages.findIndex(m => m.id === messageId);
        if (index !== -1 && flatListRef.current) {
            flatListRef.current.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
        } else {
            Alert.alert("Thông báo", "Tin nhắn nằm ngoài phạm vi tải hiện tại.");
        }
    };
    // --- PIN MESSAGE LOGIC END ---

    const flatListRef = useRef<FlatList>(null);
    const inputRef = useRef<TextInput>(null);
    const isFirstLoad = useRef(true);

    useEffect(() => {
        const initChat = async () => {
            isFirstLoad.current = true;
            // Fetch current user FIRST to ensure currentUserId is set before loading messages
            const userId = await fetchCurrentUser();
            // Then load history with the userId
            await loadHistory(userId);
        };
        initChat();

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
                if (conversationId || (isGroup && groupId)) markMessagesAsRead();
            });
            socket.on('messageSent', (message) => {
                setMessages(prev => prev.map(msg => msg.id === message.tempId ? {
                    ...msg,
                    id: message._id,
                    time: new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                } : msg));
            });
            // Typing listeners - NEW FORMAT with isTyping flag
            socket.on('userTyping', (data) => {
                if (data.conversationId === conversationId && data.userId !== currentUserId) {
                    setPartnerTyping(data.isTyping ?? true);
                }
            });
            // Revoke listener
            socket.on('messageRevoked', (data) => {
                if (data.conversationId === conversationId) {
                    setMessages(prev => prev.map(m =>
                        m.id === data.messageId
                            ? { ...m, isRevoked: true, text: 'Tin nhắn đã thu hồi', type: 'text', imageUrl: null, videoUrl: null }
                            : m
                    ));
                }
            });
            // Read status listener
            socket.on('messagesRead', (data) => {
                if (data.conversationId === conversationId) {
                    setLastSeenMessageId(data.lastMessageId); // Update seen status
                }
            });

            socket.on('groupMessageRead', (data) => {
                if (data.conversationId === conversationId && isGroup && data.messageIds && data.messageIds.length > 0) {
                    // Reload receipts for these messages
                    apiRequest('/api/messages/readers', {
                        method: 'POST',
                        body: JSON.stringify({ messageIds: data.messageIds })
                    })
                        .then((receipts: any) => {
                            if (receipts) setReadReceipts(prev => ({ ...prev, ...receipts }));
                        })
                        .catch(e => console.log('Group read update error:', e));
                }
            });

            // Online status listener - NEW UNIFIED EVENT
            socket.on('userStatusChange', (data) => {
                if (data.userId === partnerId) {
                    setIsPartnerOnline(data.status === 'online');
                    if (data.status === 'offline' && data.lastSeen) {
                        setPartnerLastSeen(new Date(data.lastSeen));
                    }
                }
            });

            // Message seen acknowledgement listener
            socket.on('messageSeenAck', (data) => {
                if (data.conversationId === conversationId) {
                    setLastSeenMessageId(data.messageId);
                }
            });

            // Edit message listener
            socket.on('messageEdited', (data) => {
                if (data.conversationId === conversationId) {
                    setMessages(prev => prev.map(m =>
                        m.id === data.messageId
                            ? { ...m, text: data.newText, isEdited: true, editedAt: data.editedAt }
                            : m
                    ));
                }
            });

            // Message reaction listener
            socket.on('messageReacted', (data) => {
                const targetConvId = conversationId || groupId;
                const dataConvId = data.conversationId || data.groupId;
                if (dataConvId === targetConvId) {
                    setMessages(prev => prev.map(m =>
                        m.id === data.messageId
                            ? { ...m, reactions: data.reactions }
                            : m
                    ));
                    // Optional: Haptic feedback
                    if (data.changedBy !== currentUserId) {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
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
                socket.off('messageReacted');
            }
        };
    }, [conversationId, partnerId, currentUserId, socket]);

    // Chat Room Socket Join/Leave
    useEffect(() => {
        if (isGroup && groupId) {
            joinConversation(undefined, groupId);
            return () => leaveConversation(undefined, groupId);
        } else if (conversationId) {
            joinConversation(conversationId);
            return () => leaveConversation(conversationId);
        }
    }, [isGroup, groupId, conversationId]);

    // State for empty screen sticker suggestions
    const [suggestedStickers, setSuggestedStickers] = useState<any[]>([]);

    useEffect(() => {
        if (messages.length === 0) {
            // Fetch some stickers for suggestion
            fetch(`${API_URL}/api/app/sticker-packs`)
                .then(res => res.json())
                .then(data => {
                    if (data.packs && data.packs.length > 0 && data.packs[0].stickers) {
                        // Take first 5 stickers from the first pack
                        setSuggestedStickers(data.packs[0].stickers.slice(0, 5));
                    }
                })
                .catch(err => console.log('Error fetching suggestions:', err));
        }
    }, [messages.length]);

    const handleSendSuggestion = (sticker: any) => {
        // Mock the sticker select params. PackId is needed but we might not have it if we flat map.
        // Actually I can store full object or just use 'default' or the pack id from data.
        // Assuming sticker object has pack_id or I can pass it.
        // Let's assume handleStickerSelect expects (packId, index, stickerObject)
        if (handleStickerSelect) {
            handleStickerSelect(sticker.pack_id || 'default', 0, sticker);
        }
    };

    const fetchCurrentUser = async (): Promise<string | null> => {
        const user = await getCurrentUser();
        if (user) {
            setCurrentUserId(user.id);
            return user.id;
        }
        return null;
    };

    const loadHistory = async (userId?: string | null) => {
        try {
            let mapped: any[] = [];
            // Use passed userId or fall back to state
            const myUserId = userId || currentUserId;

            if (isGroup && groupId) {
                // Load group messages
                const groupMessages = await apiRequest<any[]>(`/api/groups/${groupId}/messages`);
                mapped = (groupMessages || []).map((m: any) => ({
                    id: m.id,
                    text: m.text,
                    type: m.type || 'text',
                    imageUrl: m.imageUrl,
                    sender: m.senderId === myUserId ? 'me' : 'other',
                    time: m.time || new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    createdAt: m.createdAt,
                    senderId: m.senderId,
                    senderName: m.senderName,
                    senderAvatar: m.senderAvatar,
                    replyTo: m.replyTo,
                    isDeleted: m.isDeleted || false,
                    deletedBy: m.deletedBy || []
                }));
            } else if (partnerId) {
                // Load individual chat messages
                const history = await getChatHistory(partnerId);
                mapped = history.map((m: any) => ({
                    id: m._id,
                    text: m.text,
                    type: m.type || 'text',
                    imageUrl: m.imageUrl,
                    sender: m.user._id === myUserId ? 'me' : 'other',
                    time: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    createdAt: m.createdAt,
                    senderId: m.user._id,
                    replyTo: m.replyTo,
                    isDeleted: m.isDeleted || false,
                    deletedBy: m.deletedBy || []
                }));
            }

            setMessages(mapped);
            scrollToBottom(false);

            // Mark messages as read
            markMessagesAsRead();

            // Load read receipts for group messages
            if (isGroup && mapped.length > 0) {
                const msgIds = mapped.filter(m => m.sender === 'me').map(m => m.id);
                loadReadReceipts(msgIds);
            }

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
        // Support both individual chat (user._id) and group chat (senderId)
        const messageSenderId = msg.user?._id || msg.senderId;
        const isFromPartner = messageSenderId !== currentUserId;

        // For group chat, check if this message belongs to current group
        if (isGroup && msg.groupId && msg.groupId !== groupId) {
            return; // Skip messages from other groups
        }

        setMessages(prev => {
            if (prev.find(m => m.id === msg._id || m.id === msg.id)) return prev;
            return [...prev, {
                id: msg._id || msg.id,
                text: msg.text,
                type: msg.type || 'text',
                imageUrl: msg.imageUrl,
                createdAt: msg.createdAt,
                sender: messageSenderId === currentUserId ? 'me' : 'other',
                time: new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                senderId: messageSenderId,
                senderName: msg.senderName || msg.user?.name,
                senderAvatar: msg.senderAvatar || msg.user?.avatar,
                replyTo: msg.replyTo,
                groupId: msg.groupId
            }];
        });

        // If user has scrolled up and receives new message from partner, increment counter
        if (!isNearBottom && isFromPartner) {
            setNewMessageCount(prev => prev + 1);
        } else {
            scrollToBottom();
        }
    };

    // Load read receipts for messages (group chat only)
    const loadReadReceipts = async (messageIds: string[]) => {
        if (!isGroup || messageIds.length === 0) return;

        try {
            const receipts = await apiRequest<{ [messageId: string]: Array<{ id: string, name: string, avatar?: string }> }>('/api/messages/readers', {
                method: 'POST',
                body: JSON.stringify({ messageIds })
            });

            if (receipts) {
                setReadReceipts(prev => ({ ...prev, ...receipts }));
            }
        } catch (error) {
            console.log('Load read receipts error:', error);
        }
    };

    // Mark messages as read when opening chat
    const markMessagesAsRead = async () => {
        try {
            if (isGroup && groupId) {
                await apiRequest(`/api/groups/${groupId}/read`, {
                    method: 'POST',
                    body: JSON.stringify({})
                });
            } else if (conversationId) {
                await apiRequest('/api/messages/read', {
                    method: 'POST',
                    body: JSON.stringify({ conversationId })
                });
            }
        } catch (error) {
            console.log('Mark read error:', error);
        }
    };

    const scrollToBottom = (animated: boolean = true, immediate: boolean = false) => {
        if (immediate) {
            flatListRef.current?.scrollToEnd({ animated: animated });
        } else {
            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: animated });
            }, 50);
        }
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

    const sendMessage = async (text?: string, type: string = 'text', imageUrl?: string, imageWidth?: number, imageHeight?: number, videoUrl?: string, audioDuration?: number) => {
        const messageText = text || inputText.trim();
        if (!messageText && type === 'text') return;
        if (!currentUserId) return;

        const tempId = Date.now().toString();
        const newMessage: any = {
            id: tempId,
            text: messageText,
            type: type,
            imageUrl: imageUrl, // Uses imageUrl field for audio URL as well
            imageWidth: imageWidth,
            imageHeight: imageHeight,
            audioDuration: audioDuration,
            sender: 'me',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            senderId: currentUserId,
            groupId: isGroup ? groupId : undefined,
            replyTo: replyingTo ? { id: replyingTo.id, text: replyingTo.text, type: replyingTo.type } : null
        };

        setMessages(prev => [...prev, newMessage]);
        scrollToBottom();

        if (socket) {
            socket.emit('sendMessage', {
                conversationId: isGroup ? undefined : conversationId,
                groupId: isGroup ? groupId : undefined,
                senderId: currentUserId,
                receiverId: isGroup ? undefined : partnerId,
                message: messageText,
                type: type,
                imageUrl: imageUrl,
                imageWidth: imageWidth,
                imageHeight: imageHeight,
                audioDuration: audioDuration,
                tempId: tempId,
                replyTo: replyingTo ? { id: replyingTo.id, text: replyingTo.text, type: replyingTo.type } : undefined
            });

            if (!isGroup && conversationId && partnerId) {
                stopTyping(conversationId, partnerId);
            }
        }

        setInputText('');
        setReplyingTo(null);
    };

    const handleTextChange = (text: string) => {
        setInputText(text);

        // MENTION LOGIC: Check for @ symbol
        if (isGroup) {
            const lastAt = text.lastIndexOf('@');
            if (lastAt !== -1 && lastAt >= text.length - 20) { // Check if @ is recent
                const keyword = text.substring(lastAt + 1);
                // Only show if no spaces in keyword (simple name search)
                if (!keyword.includes(' ')) {
                    setMentionKeyword(keyword);
                    setShowMention(true);
                } else {
                    setShowMention(false);
                }
            } else {
                setShowMention(false);
            }
        }

        // Emit typing indicator using helper (handles auto-stop after 2s)
        if (text.length > 0 && conversationId && partnerId) {
            handleTypingInput(conversationId, partnerId);
        }
    };

    const handleEmojiSelect = (emoji: string) => {
        setInputText(prev => prev + emoji);
    };

    const handleStickerSelect = (packId: string, stickerIndex: number, sticker: any) => {
        const stickerUrl = sticker.image_url;
        sendMessage(undefined, 'sticker', stickerUrl);
    };

    const toggleEmojiPicker = () => {
        if (showEmojiPicker) {
            setShowEmojiPicker(false);
            inputRef.current?.focus();
        } else {
            Keyboard.dismiss();
            setPickerTab('sticker'); // Default to sticker tab when opening
            setShowEmojiPicker(true);
        }
    };

    const handlePickImage = async () => {
        setShowMediaPicker(false);
        const result = await launchImageLibrary({ mediaType: 'mixed', quality: 0.8 });

        if (result.didCancel || result.error) {
            if (result.error) Alert.alert('Lỗi', result.error);
            return;
        }

        if (result.assets && result.assets[0]) {
            const asset = result.assets[0];
            const mediaUri = asset.uri;
            const isVideo = asset.type?.startsWith('video') || mediaUri?.includes('.mp4') || mediaUri?.includes('.mov');
            setPreviewImage(mediaUri);
            setPreviewMediaType(isVideo ? 'video' : 'image');
            setImageCaption('');
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
            // Show preview modal instead of sending immediately
            setPreviewImage(imageUri);
            setImageCaption('');
        }
    };

    const handlePlayAudio = async (messageId: string, audioUrl: string) => {
        try {
            if (sound) {
                await sound.unloadAsync();
                setSound(null);
                setPlayingMessageId(null);
                if (playingMessageId === messageId) return;
            }

            const { sound: newSound } = await Audio.Sound.createAsync(
                { uri: getImageUrl(audioUrl)! },
                { shouldPlay: true }
            );

            setSound(newSound);
            setPlayingMessageId(messageId);

            newSound.setOnPlaybackStatusUpdate((status) => {
                if (status.isLoaded && status.didJustFinish) {
                    setPlayingMessageId(null);
                    setSound(null);
                }
            });
        } catch (error) {
            console.error('Play audio error:', error);
        }
    };

    // Audio Functions
    async function startRecording() {
        try {
            const permission = await Audio.requestPermissionsAsync();
            if (permission.status === 'granted') {
                await Audio.setAudioModeAsync({
                    allowsRecordingIOS: true,
                    playsInSilentModeIOS: true,
                });
                const { recording } = await Audio.Recording.createAsync(
                    Audio.RecordingOptionsPresets.HIGH_QUALITY
                );
                setRecording(recording);
                setIsRecording(true);
                setRecordingDuration(0);

                recordingTimerRef.current = setInterval(() => {
                    setRecordingDuration(prev => prev + 1);
                }, 1000);

                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            } else {
                Alert.alert("Quyền truy cập", "Vui lòng cấp quyền micro để gửi tin nhắn thoại.");
            }
        } catch (err) {
            console.error('Failed to start recording', err);
        }
    }

    async function stopRecording() {
        if (!recording) return;

        setIsRecording(false);
        if (recordingTimerRef.current) {
            clearInterval(recordingTimerRef.current);
            recordingTimerRef.current = null;
        }

        try {
            await recording.stopAndUnloadAsync();
            const uri = recording.getURI();
            const duration = recordingDuration;
            setRecording(null);

            if (uri && duration >= 1) {
                uploadAndSendAudio(uri, duration);
            }
        } catch (error) {
            console.error('Stop recording error', error);
        }
    }

    const uploadAndSendAudio = async (uri: string, duration: number) => {
        try {
            setIsUploading(true);
            const token = await getToken();
            const formData = new FormData();
            formData.append('audio', {
                uri: uri,
                type: 'audio/m4a',
                name: 'voice.m4a',
            } as any);
            formData.append('duration', duration.toString());

            const response = await fetch(`${API_URL}/api/upload/audio`, {
                method: 'POST',
                body: formData,
                headers: {
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                }
            });

            if (!response.ok) throw new Error('Upload audio failed');
            const data = await response.json();

            sendMessage(undefined, 'audio', data.url, undefined, undefined, undefined, data.duration || duration);
        } catch (e) {
            console.error('Upload audio error:', e);
            Alert.alert('Lỗi', 'Gửi tin nhắn thoại thất bại');
        } finally {
            setIsUploading(false);
        }
    };

    const uploadAndSendMedia = async (mediaUri: string, caption: string = '', mediaType: 'image' | 'video' = 'image') => {
        setIsUploading(true);

        let imgWidth: number | undefined;
        let imgHeight: number | undefined;

        // Get local image dimensions first
        if (mediaType === 'image') {
            try {
                const { Image: RNImage } = require('react-native');
                await new Promise<void>((resolve) => {
                    RNImage.getSize(
                        mediaUri,
                        (w: number, h: number) => {
                            imgWidth = w;
                            imgHeight = h;
                            resolve();
                        },
                        () => resolve()
                    );
                });
            } catch (e) {
                console.log('Get image size error:', e);
            }
        }

        try {

            // Create FormData for upload
            const formData = new FormData();
            const fileName = mediaUri.split('/').pop() || (mediaType === 'video' ? 'video.mp4' : 'image.jpg');
            const mimeType = mediaType === 'video' ? 'video/mp4' : 'image/jpeg';

            formData.append(mediaType === 'video' ? 'video' : 'image', {
                uri: mediaUri,
                type: mimeType,
                name: fileName,
            } as any);

            // Upload to server
            const endpoint = mediaType === 'video' ? '/api/upload/video' : '/api/upload/image';
            const response = await fetch(`${API_URL}${endpoint}`, {
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
            const mediaUrl = data.url || mediaUri;

            // Send message with media, caption, and dimensions
            sendMessage(caption || '', mediaType, mediaUrl, imgWidth, imgHeight);
        } catch (error) {
            console.error('Upload error:', error);
            // Fallback: send with local URI and dimensions
            sendMessage(caption || '', mediaType, mediaUri, imgWidth, imgHeight);
        } finally {
            setIsUploading(false);
        }
    };

    const handlePickFile = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: '*/*',
                copyToCacheDirectory: true
            });

            if (result.canceled || !result.assets) return;
            const asset = result.assets[0];

            setIsUploading(true);
            setShowMediaPicker(false);

            try {
                const uploadRes = await uploadFile(asset.uri, asset.name, asset.mimeType || 'application/octet-stream');
                if (uploadRes.success) {
                    const contentValue = JSON.stringify({
                        url: uploadRes.url,
                        name: uploadRes.originalName,
                        size: uploadRes.size,
                        mimeType: uploadRes.mimetype
                    });

                    await sendMessage(contentValue, 'file');
                }
            } catch (error) {
                console.log('Upload error', error);
                Alert.alert('Lỗi', 'Upload file thất bại');
            } finally {
                setIsUploading(false);
            }

        } catch (err) {
            console.log('File picker error:', err);
            setIsUploading(false);
        }
    };

    const handleSendLocation = async () => {
        try {
            setShowMediaPicker(false);
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Quyền truy cập', 'Vui lòng cấp quyền vị trí để gửi tọa độ.');
                return;
            }

            const location = await Location.getCurrentPositionAsync({});
            const { latitude, longitude } = location.coords;
            const content = `${latitude},${longitude}`;
            await sendMessage(content, 'location');

        } catch (err) {
            Alert.alert('Lỗi', 'Không thể lấy vị trí');
        }
    };

    // Send media (image or video) with caption
    const handleSendImageWithCaption = async () => {
        if (!previewImage) return;
        const caption = imageCaption.trim();
        const mediaType = previewMediaType;
        setPreviewImage(null);
        setImageCaption('');
        setPreviewMediaType('image');
        await uploadAndSendMedia(previewImage, caption, mediaType);
    };

    // Cancel image preview
    const handleCancelImagePreview = () => {
        setPreviewImage(null);
        setImageCaption('');
    };

    // Format last seen time like Zalo (header only shows online status, NOT typing)
    const formatLastSeen = () => {
        if (isPartnerOnline) return 'Đang hoạt động';
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

    // Search Functions
    const handleSearch = async (query: string) => {
        setSearchQuery(query);
        if (query.trim().length === 0) {
            setSearchResults([]);
            return;
        }

        if (query.trim().length < 2) return;

        try {
            setSearchLoading(true);
            const results = await apiRequest<any[]>(`/api/groups/${groupId}/search?q=${encodeURIComponent(query)}`);
            setSearchResults(results || []);
        } catch (e) {
            console.log('Search error', e);
        } finally {
            setSearchLoading(false);
        }
    };

    const handleNavigateToMessage = (messageId: string) => {
        setIsSearching(false);
        setSearchQuery('');
        setSearchResults([]);
        scrollToMessage(messageId);
    };

    const renderSearchResults = () => {
        if (!isSearching || !searchQuery) return null;

        return (
            <View style={styles.searchResultsContainer}>
                {searchLoading ? (
                    <ActivityIndicator size="small" color={ZALO_BLUE} style={{ marginTop: 20 }} />
                ) : searchResults.length > 0 ? (
                    <FlatList
                        data={searchResults}
                        keyExtractor={item => item.id}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.searchResultItem}
                                onPress={() => handleNavigateToMessage(item.id)}
                            >
                                <Image source={{ uri: getAvatarUri(item.senderAvatar, item.senderName) }} style={styles.searchResultAvatar} />
                                <View style={styles.searchResultContent}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                        <Text style={styles.searchResultName} numberOfLines={1}>{item.senderName}</Text>
                                        <Text style={styles.searchResultTime}>{item.time}</Text>
                                    </View>
                                    <Text style={styles.searchResultText} numberOfLines={2}>
                                        {item.text}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        )}
                        contentContainerStyle={{ paddingBottom: 20 }}
                    />
                ) : searchQuery.length > 1 ? (
                    <View style={{ alignItems: 'center', marginTop: 20 }}>
                        <Text style={{ color: '#666' }}>Không tìm thấy kết quả</Text>
                    </View>
                ) : null}
            </View>
        );
    };

    const renderHeader = () => {
        if (isSearching) {
            return (
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => {
                        setIsSearching(false);
                        setSearchQuery('');
                        setSearchResults([]);
                    }} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#000" />
                    </TouchableOpacity>
                    <View style={styles.searchBarContainer}>
                        <TextInput
                            style={styles.headerSearchInput}
                            placeholder="Tìm tin nhắn..."
                            value={searchQuery}
                            onChangeText={handleSearch}
                            autoFocus
                            placeholderTextColor="#999"
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => {
                                setSearchQuery('');
                                setSearchResults([]);
                            }}>
                                <Ionicons name="close-circle" size={18} color="#999" />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            );
        }

        return (
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="chevron-back" size={28} color="#000000" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={{ flexDirection: 'row', alignItems: 'center' }}
                        onPress={() => {
                            if (isGroup && groupId) {
                                (navigation as any).navigate('GroupInfo', {
                                    groupId,
                                    groupName: headerName,
                                    groupAvatar: headerAvatar,
                                    members,
                                    creatorId: undefined
                                });
                            }
                        }}
                        disabled={!isGroup}
                    >
                        <View style={styles.headerAvatarContainer}>
                            {isGroup ? (
                                <GroupAvatar
                                    members={members}
                                    groupAvatar={headerAvatar}
                                    groupName={headerName}
                                    size={42}
                                />
                            ) : headerAvatar ? (
                                <Image
                                    source={{ uri: getAvatarUri(headerAvatar, headerName) }}
                                    style={styles.headerAvatar}
                                />
                            ) : (
                                <View style={[styles.headerAvatar, { backgroundColor: '#E4E6EB', alignItems: 'center', justifyContent: 'center' }]}>
                                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#666' }}>
                                        {headerName?.[0]?.toUpperCase()}
                                    </Text>
                                </View>
                            )}
                            {!isGroup && isPartnerOnline && <View style={styles.onlineIndicator} />}
                        </View>
                        <View style={styles.headerInfo}>
                            <Text style={styles.headerTitle} numberOfLines={1}>{headerName}</Text>
                            <Text style={[
                                styles.headerSubtitle,
                                !isGroup && isPartnerOnline && { color: '#31A24C' }
                            ]} numberOfLines={1}>
                                {isGroup ? `${members?.length || 0} thành viên` : formatLastSeen()}
                            </Text>
                        </View>
                    </TouchableOpacity>
                </View>
                <View style={styles.headerRight}>
                    {/* Search Button for all chats - NOW ONLY FOR GROUP (Moved to menu for 1-1) */}
                    {isGroup && (
                        <TouchableOpacity
                            style={[styles.headerIcon, { marginRight: 8 }]}
                            onPress={() => setIsSearching(true)}
                        >
                            <Ionicons name="search" size={24} color="#000" />
                        </TouchableOpacity>
                    )}

                    {/* Only show call buttons for 1-1 chat, not group */}
                    {!isGroup && (
                        <>
                            <TouchableOpacity
                                style={styles.headerIconCircle}
                                onPress={() => (navigation as any).navigate('Call', {
                                    partnerId,
                                    userName,
                                    avatar,
                                    isVideo: false,
                                    isIncoming: false,
                                    conversationId,
                                })}
                            >
                                <Ionicons name="call" size={18} color="#FFFFFF" />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.headerIconCircle}
                                onPress={() => (navigation as any).navigate('Call', {
                                    partnerId,
                                    userName,
                                    avatar,
                                    isVideo: true,
                                    isIncoming: false,
                                    conversationId,
                                })}
                            >
                                <Ionicons name="videocam" size={18} color="#FFFFFF" />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.headerIcon}
                                onPress={() => setShowHeaderOptions(true)}
                            >
                                <Ionicons name="ellipsis-vertical" size={24} color="#000000" />
                            </TouchableOpacity>
                        </>
                    )}

                    {/* Menu for group */}
                    {isGroup && (
                        <TouchableOpacity style={styles.headerIcon}>
                            <Ionicons name="menu" size={24} color="#000" />
                        </TouchableOpacity>
                    )}
                </View>
            </View >
        );
    };



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
        // Mark as deleted locally with deletedBy array ("Xóa ở phía tôi")
        setMessages(prev => prev.map(m =>
            m.id === messageId
                ? {
                    ...m,
                    isDeleted: true,
                    deletedBy: [...(m.deletedBy || []), currentUserId],
                    text: null, // Clear text
                    imageUrl: null // Clear image
                }
                : m
        ));
        setSelectedMessage(null);
        try {
            await deleteMessage(messageId);
            // Previously emitted revokeMessage here, but now separated
        } catch (error) {
            console.error('Delete message error', error);
        }
    };

    const handleRevokeMessageAction = async () => {
        if (!selectedMessage) return;
        const messageId = selectedMessage.id;

        // Call socket ("Thu hồi")
        if (socket) {
            socket.emit('revokeMessage', {
                conversationId,
                messageId,
                userId: currentUserId
            });
        }

        // Optimistically update UI
        setMessages(prev => prev.map(m =>
            m.id === messageId
                ? { ...m, isRevoked: true, text: 'Tin nhắn đã thu hồi', type: 'text', imageUrl: null, videoUrl: null }
                : m
        ));

        setSelectedMessage(null);
    };

    // Handle adding reaction to a message
    const handleAddReaction = (emoji: string) => {
        if (!selectedMessage || !currentUserId || !socket) return;

        const messageId = selectedMessage.id;
        const roomId = isGroup ? groupId : conversationId;

        // Emit socket event
        socket.emit('addReaction', {
            messageId,
            conversationId: isGroup ? undefined : conversationId,
            groupId: isGroup ? groupId : undefined,
            userId: currentUserId,
            emoji
        });

        // Optimistically update UI
        setMessages(prev => prev.map(m => {
            if (m.id !== messageId) return m;
            const reactions = { ...(m.reactions || {}) };

            // Remove user from any existing reaction
            Object.keys(reactions).forEach(key => {
                reactions[key] = (reactions[key] || []).filter((r: any) => r.id !== currentUserId);
                if (reactions[key].length === 0) delete reactions[key];
            });

            // Add new reaction
            if (!reactions[emoji]) reactions[emoji] = [];
            reactions[emoji].push({ id: currentUserId, name: 'Bạn' });

            return { ...m, reactions };
        }));

        // Haptic feedback
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setSelectedMessage(null);
    };

    // Edit message - start editing
    const handleEditMessage = () => {
        if (selectedMessage && selectedMessage.senderId === currentUserId) {
            setEditingMessage(selectedMessage);
            setInputText(selectedMessage.text || '');
            setSelectedMessage(null);
            inputRef.current?.focus();
        }
    };

    // Cancel edit
    const handleCancelEdit = () => {
        setEditingMessage(null);
        setInputText('');
    };

    // Save edited message
    const handleSaveEdit = async () => {
        if (!editingMessage || !inputText.trim()) return;

        const messageId = editingMessage.id;
        const newText = inputText.trim();
        const editedAt = new Date().toISOString();

        // Update locally first
        setMessages(prev => prev.map(m =>
            m.id === messageId
                ? { ...m, text: newText, isEdited: true, editedAt }
                : m
        ));

        setEditingMessage(null);
        setInputText('');

        // Send to server via socket
        if (socket) {
            socket.emit('editMessage', {
                conversationId,
                messageId,
                newText,
                editedAt
            });
        }
    };

    // Swipe to reply - render right action (reply icon)
    const renderSwipeReplyAction = (
        progress: Animated.AnimatedInterpolation<number>,
        dragX: Animated.AnimatedInterpolation<number>
    ) => {
        const scale = dragX.interpolate({
            inputRange: [-50, -30, 0],
            outputRange: [1, 0.8, 0],
            extrapolate: 'clamp',
        });

        const opacity = dragX.interpolate({
            inputRange: [-40, -20, 0],
            outputRange: [1, 0.5, 0],
            extrapolate: 'clamp',
        });

        return (
            <Animated.View style={[styles.swipeActionRightContainer, { opacity }]}>
                <Animated.View style={[styles.swipeActionRightIcon, { transform: [{ scale }] }]}>
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


    const handleViewProfile = (userId: string) => {
        if (userId) {
            (navigation as any).navigate('Profile', { userId });
        }
    };

    const renderMessageText = (text: string, isMe: boolean) => {
        if (!text) return null;

        let segments: { text: string, type: 'text' | 'mention_all' | 'mention_user', data?: any }[] = [{ text, type: 'text' }];

        // 1. Match @All
        const allRegex = /(@all|@tất cả|@everyone)/gi;
        let tempSegments: typeof segments = [];
        segments.forEach(seg => {
            if (seg.type !== 'text') { tempSegments.push(seg); return; }
            const parts = seg.text.split(allRegex);
            parts.forEach(part => {
                if (allRegex.test(part)) tempSegments.push({ text: part, type: 'mention_all' });
                else if (part) tempSegments.push({ text: part, type: 'text' });
            });
        });
        segments = tempSegments;

        // 2. Match Users (only if groupMembers available)
        if (groupMembers.length > 0) {
            const sortedMembers = [...groupMembers].sort((a, b) => (b.name?.length || 0) - (a.name?.length || 0));

            for (const member of sortedMembers) {
                if (!member.name) continue;
                const mentionStr = `@${member.name}`;

                const nextSegments: typeof segments = [];
                segments.forEach(seg => {
                    if (seg.type !== 'text') { nextSegments.push(seg); return; }

                    if (seg.text.includes(mentionStr)) {
                        const parts = seg.text.split(mentionStr);
                        parts.forEach((part, idx) => {
                            if (part) nextSegments.push({ text: part, type: 'text' });
                            if (idx < parts.length - 1) {
                                nextSegments.push({ text: mentionStr, type: 'mention_user', data: member });
                            }
                        });
                    } else {
                        nextSegments.push(seg);
                    }
                });
                segments = nextSegments;
            }
        }

        return (
            <Text style={[styles.messageText, { color: isMe ? '#FFFFFF' : '#000000' }]}>
                {segments.map((seg, index) => {
                    if (seg.type === 'mention_all') {
                        return <Text key={index} style={{ fontWeight: 'bold', color: isMe ? '#FFD700' : '#0068FF' }}>{seg.text}</Text>;
                    }
                    if (seg.type === 'mention_user' && seg.data) {
                        return (
                            <Text
                                key={index}
                                style={{ fontWeight: 'bold', color: isMe ? '#FFD700' : '#0068FF' }}
                                onPress={() => handleViewProfile(seg.data.id || seg.data.user_id)}
                                suppressHighlighting={true}
                            >
                                {seg.text}
                            </Text>
                        );
                    }
                    return <Text key={index}>{seg.text}</Text>;
                })}
            </Text>
        );
    };

    const renderMessageItem = useCallback(({ item, index }: { item: any, index: number }) => {
        const isMe = item.sender === 'me' || (!!currentUserId && item.senderId === currentUserId);
        const nextMessage = messages[index + 1];
        const isLast = index === messages.length - 1 || (nextMessage && nextMessage.senderId !== item.senderId);
        const isImage = (item.type === 'image' || item.type === 'video' || item.type === 'sticker') && item.imageUrl;

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

        // Check for system message (group events)
        const isSystemMessage = item.type === 'system' || item.senderId === 'system' || (!item.senderId && item.type === 'system');

        // Check for date separator
        const prevMessage = index > 0 ? messages[index - 1] : null;
        const showDateSeparator = shouldShowDateSeparator(item, prevMessage);

        // Render system message differently
        if (isSystemMessage) {
            return (
                <>
                    {showDateSeparator && item.createdAt && (
                        <View style={styles.dateSeparator}>
                            <Text style={styles.dateSeparatorText}>
                                {formatDateSeparator(item.createdAt)}
                            </Text>
                        </View>
                    )}
                    <View style={styles.systemMessageContainer}>
                        <Text style={styles.systemMessageText}>
                            {item.text}
                        </Text>
                    </View>
                </>
            );
        }

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
                    onSwipeableWillOpen={() => handleSwipeOpen(item, swipeableRefs.current[item.id])}
                    overshootLeft={false}
                    overshootRight={false}
                    leftThreshold={40}
                    friction={3}
                    enableTrackpadTwoFingerGesture={false}
                    containerStyle={styles.swipeableContainer}
                    hitSlop={{ left: -50 }}
                >
                    <View style={[
                        styles.messageRow,
                        isMe ? styles.messageRowMe : styles.messageRowOther,
                        { marginBottom: isLast ? 8 : 2 }
                    ]}>
                        {!isMe && (
                            <TouchableOpacity
                                style={styles.avatarContainer}
                                onPress={() => handleViewProfile(isGroup ? item.senderId : partnerId)}
                                activeOpacity={0.7}
                            >
                                {/* Use sender avatar for group chat, partner avatar for 1-1 chat */}
                                {(isGroup ? item.senderAvatar : avatar) ? (
                                    <Image
                                        source={{ uri: getAvatarUri(isGroup ? item.senderAvatar : avatar, isGroup ? item.senderName : userName) }}
                                        style={styles.avatarSmall}
                                    />
                                ) : (
                                    <View style={[styles.avatarSmall, { backgroundColor: '#A0AEC0', alignItems: 'center', justifyContent: 'center' }]}>
                                        <Text style={{ color: 'white', fontSize: 10 }}>
                                            {(isGroup ? item.senderName : userName)?.[0]?.toUpperCase()}
                                        </Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        )}

                        <View style={{ flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
                            {isGroup && !isMe && (!prevMessage || prevMessage.senderId !== item.senderId) && (
                                <Text style={{ fontSize: 11, color: '#666', marginBottom: 2, marginLeft: 4 }}>
                                    {item.senderName || item.user?.name}
                                </Text>
                            )}



                            {item.type === 'file' && (() => {
                                let fileData = { name: 'File', size: 0, url: '' };
                                try { fileData = JSON.parse(item.text); } catch { }
                                const isMe = item.sender === 'me' || (currentUserId && item.senderId === currentUserId);
                                return (
                                    <TouchableOpacity
                                        style={[
                                            styles.messageBubble,
                                            isMe ? styles.bubbleMe : styles.bubbleOther,
                                            { flexDirection: 'row', alignItems: 'center', width: 250 }
                                        ]}
                                        onPress={() => Linking.openURL(fileData.url)}
                                        onLongPress={() => handleCheckSelectMessage(item)}
                                        delayLongPress={500}
                                    >
                                        <View style={{ width: 44, height: 44, backgroundColor: isMe ? 'rgba(255,255,255,0.2)' : '#E0E0E0', borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 10 }}>
                                            <Ionicons name="document-text" size={24} color={isMe ? '#FFF' : '#555'} />
                                        </View>
                                        <View style={{ flex: 1, justifyContent: 'center' }}>
                                            <Text style={[styles.messageText, { color: isMe ? '#FFF' : '#333', fontWeight: 'bold' }]} numberOfLines={1}>{fileData.name}</Text>
                                            <Text style={{ color: isMe ? 'rgba(255,255,255,0.8)' : '#666', fontSize: 11 }}>{Math.round(fileData.size / 1024)} KB • {item.time}</Text>
                                        </View>
                                    </TouchableOpacity>
                                );
                            })()}

                            {item.type === 'location' && (() => {
                                const isMe = item.sender === 'me' || (currentUserId && item.senderId === currentUserId);
                                const [lat, long] = item.text.split(',');
                                const mapUrl = Platform.OS === 'ios' ? `http://maps.apple.com/?ll=${lat},${long}` : `geo:${lat},${long}?q=${lat},${long}`;
                                return (
                                    <TouchableOpacity
                                        style={[styles.messageBubble, isMe ? styles.bubbleMe : styles.bubbleOther, { width: 250, padding: 0, overflow: 'hidden' }]}
                                        onPress={() => Linking.openURL(mapUrl)}
                                        onLongPress={() => handleCheckSelectMessage(item)}
                                        delayLongPress={500}
                                    >
                                        <View style={{ height: 120, backgroundColor: '#EEE', justifyContent: 'center', alignItems: 'center' }}>
                                            <Ionicons name="location" size={40} color="#FF3B30" />
                                            <Text style={{ fontSize: 10, color: '#666', marginTop: 4 }}>{lat}, {long}</Text>
                                        </View>
                                        <View style={{ padding: 10 }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                <Ionicons name="location" size={20} color={isMe ? '#FFF' : '#FF3B30'} />
                                                <Text style={[styles.messageText, { color: isMe ? '#FFF' : '#333', fontWeight: 'bold', marginLeft: 5 }]}>Vị trí đã chia sẻ</Text>
                                            </View>
                                            <Text style={{ color: isMe ? 'rgba(255,255,255,0.8)' : '#0084FF', fontSize: 12, marginTop: 4 }}>Bấm để mở bản đồ</Text>
                                        </View>
                                    </TouchableOpacity>
                                );
                            })()}

                            {item.type === 'sticker' ? (
                                <TouchableOpacity
                                    style={[styles.stickerContainer, isMe ? styles.alignRight : styles.alignLeft]}
                                    onLongPress={() => handleCheckSelectMessage(item)}
                                    delayLongPress={500}
                                    activeOpacity={0.9}
                                >
                                    <Image
                                        source={{ uri: getImageUrl(item.imageUrl) }}
                                        style={styles.stickerImageMessage}
                                        contentFit="contain"
                                    />
                                    <Text style={[styles.messageTime, {
                                        position: 'absolute',
                                        bottom: 5,
                                        right: 10,
                                        color: 'rgba(0,0,0,0.4)',
                                        fontSize: 10,
                                        backgroundColor: 'rgba(255,255,255,0.5)',
                                        borderRadius: 4,
                                        paddingHorizontal: 2,
                                        overflow: 'hidden'
                                    }]}>{item.time}</Text>
                                </TouchableOpacity>
                            ) : item.type === 'audio' ? (
                                <TouchableOpacity
                                    style={[styles.messageBubble, isMe ? styles.bubbleMe : styles.bubbleOther, { width: 220, padding: 12 }]}
                                    onLongPress={() => handleCheckSelectMessage(item)}
                                    delayLongPress={500}
                                    activeOpacity={0.9}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <TouchableOpacity
                                            onPress={() => handlePlayAudio(item.id, item.imageUrl)}
                                            style={{
                                                width: 36, height: 36, borderRadius: 18,
                                                backgroundColor: isMe ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.05)',
                                                alignItems: 'center', justifyContent: 'center',
                                                marginRight: 10
                                            }}
                                        >
                                            <Ionicons
                                                name={playingMessageId === item.id ? "pause" : "play"}
                                                size={20}
                                                color={isMe ? '#FFFFFF' : '#333333'}
                                                style={{ marginLeft: playingMessageId === item.id ? 0 : 2 }}
                                            />
                                        </TouchableOpacity>
                                        <View style={{ flex: 1, justifyContent: 'center' }}>
                                            <View style={{ height: 3, backgroundColor: isMe ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.1)', borderRadius: 2, width: '100%', marginBottom: 4 }} />
                                            <Text style={{ color: isMe ? 'rgba(255,255,255,0.9)' : '#555555', fontSize: 11 }}>
                                                {item.audioDuration ? `${item.audioDuration}s` : 'Voice Message'}
                                            </Text>
                                        </View>
                                    </View>
                                    <View style={{ position: 'absolute', bottom: 4, right: 8, flexDirection: 'row', alignItems: 'center' }}>
                                        <Text style={[styles.messageTime, { color: isMe ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.5)', marginRight: 4 }]}>
                                            {item.time}
                                        </Text>
                                        {isMe && (
                                            <Ionicons
                                                name={item.seenBy && item.seenBy.length > 0 ? "checkmark-done" : "checkmark"}
                                                size={12}
                                                color="white"
                                            />
                                        )}
                                    </View>
                                </TouchableOpacity>
                            ) : isImage ? (
                                <ChatMedia
                                    source={item.imageUrl}
                                    type={item.type === 'video' ? 'video' : 'image'}
                                    caption={item.text}
                                    time={item.time}
                                    isMe={!!isMe}
                                    width={item.imageWidth}
                                    height={item.imageHeight}
                                    onPress={() => setSelectedImage(item.imageUrl)}
                                    onLongPress={() => handleCheckSelectMessage(item)}
                                />
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
                                            <Ionicons name="call" size={16} color="#FFFFFF" style={{ transform: [{ rotate: '135deg' }] }} />
                                        ) : (
                                            <Ionicons name="call" size={16} color="#FFFFFF" />
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
                            ) : item.isDeleted ? (
                                <View style={styles.deletedMessageBubble}>
                                    <Ionicons name="ban-outline" size={14} color="#9CA3AF" style={{ marginRight: 6 }} />
                                    <Text style={styles.deletedMessageText}>
                                        {item.deletedBy?.includes(currentUserId)
                                            ? 'Bạn đã xóa tin nhắn'
                                            : 'Tin nhắn đã bị xóa'}
                                    </Text>
                                </View>
                            ) : (
                                <TouchableOpacity
                                    style={[styles.messageBubble, isMe ? styles.bubbleMe : styles.bubbleOther]}
                                    onLongPress={() => handleCheckSelectMessage(item)}
                                    delayLongPress={500}
                                    activeOpacity={0.8}
                                >
                                    {item.replyTo && (
                                        <TouchableOpacity
                                            activeOpacity={0.7}
                                            onPress={() => scrollToMessage(item.replyTo.id)}
                                            style={[
                                                styles.replyPreview,
                                                !isMe && styles.replyPreviewOther
                                            ]}
                                        >
                                            <Text style={[
                                                styles.replyText,
                                                !isMe && styles.replyTextOther
                                            ]} numberOfLines={1}>
                                                ↩ {item.replyTo.text || (item.replyTo.type === 'image' ? '[Hình ảnh]' : '...')}
                                            </Text>
                                        </TouchableOpacity>
                                    )}
                                    {renderMessageText(item.text, isMe)}
                                    <View style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', marginTop: 4 }}>
                                        {item.isEdited && (
                                            <Text style={[styles.messageTime, { color: isMe ? 'rgba(255,255,255,0.7)' : '#9CA3AF', marginRight: 4 }]}>Đã chỉnh sửa</Text>
                                        )}
                                        <Text style={[styles.messageTime, { color: isMe ? 'rgba(255,255,255,0.7)' : '#9CA3AF' }]}>{item.time}</Text>

                                        {/* Status Icon for my messages */}
                                        {isMe && !isGroup && (
                                            <Ionicons
                                                name={lastSeenMessageId === item.id ? "checkmark-done-circle" : "checkmark-circle-outline"}
                                                size={12}
                                                color={isMe ? 'rgba(255,255,255,0.7)' : '#9CA3AF'}
                                                style={{ marginLeft: 4 }}
                                            />
                                        )}
                                    </View>
                                    {/* Read receipts for group chat */}
                                    {isMe && isGroup && readReceipts[item.id] && readReceipts[item.id].length > 0 ? (
                                        <View style={styles.readReceiptsContainer}>
                                            {readReceipts[item.id].slice(0, 5).map((reader, idx) => (
                                                <Image
                                                    key={reader.id}
                                                    source={{ uri: getAvatarUri(reader.avatar, reader.name) }}
                                                    style={[
                                                        styles.readReceiptAvatar,
                                                        { marginLeft: idx > 0 ? -6 : 0 }
                                                    ]}
                                                />
                                            ))}
                                            {readReceipts[item.id].length > 5 && (
                                                <View style={[styles.readReceiptAvatar, styles.readReceiptMore, { marginLeft: -6 }]}>
                                                    <Text style={styles.readReceiptMoreText}>+{readReceipts[item.id].length - 5}</Text>
                                                </View>
                                            )}
                                        </View>
                                    ) : null}
                                </TouchableOpacity>
                            )}

                            {/* Message Reactions Display */}
                            {item.reactions && Object.keys(item.reactions).length > 0 && (
                                <TouchableOpacity
                                    style={[
                                        styles.reactionsContainer,
                                        isMe ? styles.reactionsContainerMe : styles.reactionsContainerOther
                                    ]}
                                    onPress={() => {
                                        setSelectedMessage(item);
                                    }}
                                    activeOpacity={0.7}
                                >
                                    {Object.entries(item.reactions).slice(0, 4).map(([emoji, users]: [string, any]) => (
                                        <View key={emoji} style={styles.reactionBadge}>
                                            <Text style={styles.reactionBadgeEmoji}>{emoji}</Text>
                                            {(users as any[]).length > 1 && (
                                                <Text style={styles.reactionBadgeCount}>{(users as any[]).length}</Text>
                                            )}
                                        </View>
                                    ))}
                                    {Object.keys(item.reactions).length > 4 && (
                                        <View style={styles.reactionBadge}>
                                            <Text style={styles.reactionBadgeCount}>+{Object.keys(item.reactions).length - 4}</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </Swipeable>
            </>
        );
    }, [messages, currentUserId, avatar, userName, navigation, partnerId, conversationId, lastSeenMessageId, readReceipts, isGroup]);



    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
            {renderHeader()}

            {/* Header Options Menu (3-dots) */}
            {showHeaderOptions && (
                <TouchableOpacity
                    style={{
                        position: 'absolute', top: 0, bottom: 0, left: 0, right: 0,
                        zIndex: 200,
                    }}
                    activeOpacity={1}
                    onPress={() => setShowHeaderOptions(false)}
                >
                    <View style={{
                        position: 'absolute',
                        top: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 50 : 90,
                        right: 10,
                        backgroundColor: '#FFFFFF',
                        borderRadius: 8,
                        paddingVertical: 4,
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.25,
                        shadowRadius: 3.84,
                        elevation: 5,
                        minWidth: 180,
                    }}>
                        <TouchableOpacity
                            style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16 }}
                            onPress={() => {
                                setShowHeaderOptions(false);
                                setIsSearching(true);
                            }}
                        >
                            <Ionicons name="search" size={20} color="#333" style={{ marginRight: 12 }} />
                            <Text style={{ fontSize: 16, color: '#333' }}>Tìm kiếm tin nhắn</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            )}

            {renderSearchResults()}

            {pinnedMessage && (
                <View style={styles.pinnedMessageBar}>
                    <TouchableOpacity
                        style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
                        onPress={() => scrollToMessage(pinnedMessage.id)}
                    >
                        <Ionicons name="pin" size={16} color={ZALO_BLUE} style={{ marginRight: 8 }} />
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 12, fontWeight: '600', color: ZALO_BLUE }}>Tin nhắn đã ghim</Text>
                            <Text style={{ fontSize: 12, color: '#333' }} numberOfLines={1}>
                                {pinnedMessage.type === 'image' ? '[Hình ảnh]' :
                                    pinnedMessage.type === 'video' ? '[Video]' :
                                        pinnedMessage.type === 'audio' ? '[Tin nhắn thoại]' :
                                            pinnedMessage.text}
                            </Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => setShowUnpinOption(!showUnpinOption)} style={{ padding: 4 }}>
                        <Ionicons name="ellipsis-vertical" size={16} color="#666" />
                    </TouchableOpacity>

                    {showUnpinOption && (
                        <View style={{
                            position: 'absolute', right: 10, top: 30,
                            backgroundColor: 'white', padding: 8, borderRadius: 8,
                            shadowColor: "#000", shadowOpacity: 0.2, elevation: 5, zIndex: 100, width: 100
                        }}>
                            <TouchableOpacity onPress={handleUnpinMessageAction} style={{ padding: 4, flexDirection: 'row', alignItems: 'center' }}>
                                <Ionicons name="close-circle-outline" size={18} color="red" />
                                <Text style={{ color: 'red', marginLeft: 6, fontSize: 12 }}>Bỏ ghim</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            )}

            <KeyboardAvoidingView
                style={styles.keyboardAvoid}
                behavior={Platform.OS === 'android' ? 'height' : undefined}
                enabled={Platform.OS === 'android'}
            >
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={item => item.id}
                    renderItem={renderMessageItem}
                    contentContainerStyle={[styles.listContent, messages.length === 0 && styles.emptyListContent]}
                    style={styles.listStyle}
                    onContentSizeChange={() => {
                        if (isFirstLoad.current) {
                            setTimeout(() => {
                                flatListRef.current?.scrollToEnd({ animated: false });
                                isFirstLoad.current = false;
                            }, 50);
                        } else if (isNearBottom) {
                            scrollToBottom();
                        }
                    }}
                    onScroll={handleScroll}
                    scrollEventThrottle={16}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="interactive"
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <View style={styles.emptyCenter}>
                                <View style={styles.emptyIconCircle}>
                                    <View style={styles.emptyIconBubbles}>
                                        <Ionicons name="chatbubbles" size={48} color="#A0AEC0" style={{ opacity: 0.5 }} />
                                        <View style={styles.emptyIconSmile}>
                                            <Ionicons name="happy" size={20} color="#666" />
                                        </View>
                                    </View>
                                </View>
                                <Text style={styles.emptyTitle}>Bạn chưa có tin nhắn nào!</Text>
                                <Text style={styles.emptySubtitle}>Hãy bắt đầu{'\n'}cuộc trò chuyện ngay.</Text>
                            </View>

                            <View style={styles.suggestionContainer}>
                                <Text style={styles.suggestionText}>Nhắn tin hoặc nhấn vào emoji để gửi lời chào.</Text>
                                <View style={styles.suggestionRow}>
                                    {suggestedStickers.map((sticker, index) => (
                                        <TouchableOpacity
                                            key={sticker.id || index}
                                            style={styles.suggestionSticker}
                                            onPress={() => handleSendSuggestion(sticker)}
                                        >
                                            <Image
                                                source={{ uri: getImageUrl(sticker.image_url) }}
                                                style={styles.suggestionStickerImg}
                                                contentFit="contain"
                                            />
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        </View>
                    }
                />



                {/* Scroll to bottom button - positioned above input bar */}
                {showScrollToBottom && (
                    <TouchableOpacity
                        style={styles.scrollToBottomButton}
                        onPress={() => scrollToBottom()}
                        activeOpacity={0.8}
                    >
                        <View style={styles.scrollToBottomInner}>
                            <Ionicons name="chevron-down" size={20} color="#666666" />
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



                {/* Input Container */}
                <View style={[
                    styles.footer,
                    Platform.OS === 'ios'
                        ? { marginBottom: showEmojiPicker ? 0 : (keyboardHeight > 0 ? keyboardHeight : 20) }
                        : {}
                ]}>
                    {/* Mention Popup List (Moved inside footer to float above input) */}
                    {showMention && (
                        <View style={styles.mentionPopup}>
                            <FlatList
                                data={[
                                    { id: 'all', name: 'All', avatar: null, isAll: true },
                                    ...groupMembers.filter(m => m.name.toLowerCase().includes(mentionKeyword.toLowerCase()))
                                ]}
                                keyExtractor={(item, index) => item.id || String(index)}
                                renderItem={({ item }) => (
                                    <TouchableOpacity style={styles.mentionItem} onPress={() => handleMentionSelect(item)}>
                                        <View style={styles.mentionAvatarContainer}>
                                            {item.isAll ? (
                                                <View style={[styles.mentionAvatar, { backgroundColor: '#F3F4F6' }]}>
                                                    <Ionicons name="people" size={20} color="#333" />
                                                </View>
                                            ) : (
                                                <Image source={{ uri: getAvatarUri(item.avatar, item.name) }} style={styles.mentionAvatar} />
                                            )}
                                        </View>
                                        <View>
                                            <Text style={styles.mentionName}>{item.name}</Text>
                                            {item.isAll ? (
                                                <Text style={styles.mentionSubtitle}>Nhắc tất cả mọi người</Text>
                                            ) : (
                                                <Text style={styles.mentionSubtitle}>{item.role === 'admin' ? 'Quản trị viên' : (item.role === 'moderator' ? 'Phó nhóm' : 'Thành viên')}</Text>
                                            )}
                                        </View>
                                    </TouchableOpacity>
                                )}
                                keyboardShouldPersistTaps='handled'
                                style={{ maxHeight: 200 }}
                            />
                        </View>
                    )}

                    {/* Typing Indicator - shown above input like Zalo */}
                    {partnerTyping && !isGroup && (
                        <View style={styles.typingIndicatorContainer}>
                            <Text style={styles.typingIndicatorText}>
                                {headerName} đang soạn tin...
                            </Text>
                        </View>
                    )}

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

                    {editingMessage && (
                        <View style={styles.editBarContainer}>
                            <View style={[styles.replyBarAccent, { backgroundColor: '#F59E0B' }]} />
                            <View style={styles.replyBarContent}>
                                <Text style={[styles.replyBarTitle, { color: '#F59E0B' }]}>Chỉnh sửa tin nhắn</Text>
                                <Text style={styles.replyBarMessage} numberOfLines={1}>{editingMessage.text || ''}</Text>
                            </View>
                            <TouchableOpacity onPress={handleCancelEdit} style={styles.replyBarClose}>
                                <Ionicons name="close" size={20} color="#666" />
                            </TouchableOpacity>
                        </View>
                    )}

                    <View style={styles.inputRow}>
                        {/* Attachment Button (Left) */}
                        {!isRecording && (
                            <TouchableOpacity style={styles.leftButton} onPress={() => setShowMediaPicker(true)}>
                                <Ionicons name="add" size={22} color="#FFFFFF" />
                            </TouchableOpacity>
                        )}

                        {/* Text Input Wrapper (Center) */}
                        <View style={styles.inputWrapper}>
                            {isRecording ? (
                                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, paddingLeft: 10 }}>
                                    <Ionicons name="mic" size={20} color="#EF4444" />
                                    <Text style={{ marginLeft: 8, color: '#EF4444', fontWeight: '500' }}>Đang ghi âm... {recordingDuration}s</Text>
                                    <Text style={{ marginLeft: 'auto', marginRight: 10, color: '#6B7280', fontSize: 12 }}>Thả để gửi</Text>
                                </View>
                            ) : (
                                <>
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
                                        {showEmojiPicker ? (
                                            <MaterialIcons name="keyboard" size={24} color="#6B7280" />
                                        ) : (
                                            <View style={styles.stickerIconContainer}>
                                                <MaterialCommunityIcons name="sticker-emoji" size={16} color="#FFFFFF" />
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                </>
                            )}
                        </View>

                        {/* Mic or Send Button (Right) */}
                        {inputText.trim() ? (
                            <TouchableOpacity style={styles.rightButton} onPress={editingMessage ? handleSaveEdit : () => sendMessage()}>
                                <Ionicons name="send" size={22} color={ZALO_BLUE} />
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity
                                style={[styles.rightButton, isRecording && { backgroundColor: '#FEE2E2', transform: [{ scale: 1.1 }] }]}
                                onPressIn={startRecording}
                                onPressOut={stopRecording}
                            >
                                <Ionicons name="mic" size={24} color={isRecording ? "#EF4444" : "#6B7280"} />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* Emoji/Sticker Picker */}
                {showEmojiPicker && (
                    <View style={styles.pickerContainer}>
                        <View style={{ flex: 1 }}>
                            {pickerTab === 'emoji' ? (
                                <EmojiPicker onSelectEmoji={handleEmojiSelect} />
                            ) : (
                                <StickerPicker
                                    onSelectSticker={handleStickerSelect}
                                    onTabChange={(tab) => setPickerTab(tab)}
                                />
                            )}
                        </View>

                        {/* Bottom Tab Bar */}
                        <View style={styles.bottomTabBar}>
                            <View style={styles.bottomTabsContainer}>
                                <TouchableOpacity
                                    style={pickerTab === 'sticker' ? styles.bottomTabActive : styles.bottomTab}
                                    onPress={() => setPickerTab('sticker')}
                                >
                                    <Text style={pickerTab === 'sticker' ? styles.bottomTabActiveText : styles.bottomTabText}>Sticker</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={pickerTab === 'emoji' ? styles.bottomTabActive : styles.bottomTab}
                                    onPress={() => setPickerTab('emoji')}
                                >
                                    <Text style={pickerTab === 'emoji' ? styles.bottomTabActiveText : styles.bottomTabText}>Emoji</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Backspace Button */}
                            <TouchableOpacity
                                style={styles.backspaceButton}
                                onPress={() => {
                                    setInputText(prev => prev.slice(0, -1));
                                }}
                            >
                                <Ionicons name="backspace-outline" size={24} color="#333" />
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* Upload indicator */}
                {isUploading && (
                    <View style={styles.uploadingOverlay}>
                        <ActivityIndicator size="large" color={ZALO_BLUE} />
                        <Text style={styles.uploadingText}>Đang tải ảnh...</Text>
                    </View>
                )}
            </KeyboardAvoidingView>

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
                            <View style={styles.mediaRow}>
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

                                <TouchableOpacity style={styles.mediaOption} onPress={handlePickFile}>
                                    <View style={[styles.mediaOptionIcon, { backgroundColor: '#F3E8FF' }]}>
                                        <Ionicons name="document-text" size={28} color="#9333EA" />
                                    </View>
                                    <Text style={styles.mediaOptionText}>Tài liệu</Text>
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.mediaOption} onPress={handleSendLocation}>
                                    <View style={[styles.mediaOptionIcon, { backgroundColor: '#FEE2E2' }]}>
                                        <Ionicons name="location" size={28} color="#DC2626" />
                                    </View>
                                    <Text style={styles.mediaOptionText}>Vị trí</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Image Preview with Caption Modal */}
            <Modal
                visible={!!previewImage}
                transparent={false}
                animationType="slide"
                onRequestClose={handleCancelImagePreview}
            >
                <KeyboardAvoidingView
                    style={{ flex: 1 }}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    keyboardVerticalOffset={0}
                >
                    <SafeAreaView style={styles.imagePreviewModalContainer}>
                        {/* Header */}
                        <View style={styles.imagePreviewModalHeader}>
                            <TouchableOpacity
                                style={styles.imagePreviewModalClose}
                                onPress={handleCancelImagePreview}
                            >
                                <Ionicons name="close" size={28} color="#FFFFFF" />
                            </TouchableOpacity>
                            <Text style={styles.imagePreviewModalTitle}>Gửi ảnh</Text>
                            <View style={{ width: 40 }} />
                        </View>

                        {/* Image Preview */}
                        <View style={styles.imagePreviewModalContent}>
                            {previewImage && (
                                <Image
                                    source={{ uri: previewImage }}
                                    style={styles.imagePreviewModalImage}
                                    contentFit="contain"
                                />
                            )}
                        </View>

                        {/* Caption Input */}
                        <View style={styles.imagePreviewModalFooter}>
                            <View style={styles.imagePreviewCaptionContainer}>
                                <TextInput
                                    style={styles.imagePreviewCaptionInput}
                                    placeholder="Thêm tin nhắn..."
                                    placeholderTextColor="#999"
                                    value={imageCaption}
                                    onChangeText={setImageCaption}
                                    multiline
                                    maxLength={500}
                                />
                                <TouchableOpacity
                                    style={styles.imagePreviewSendButton}
                                    onPress={handleSendImageWithCaption}
                                >
                                    <Ionicons name="send" size={24} color="#FFFFFF" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </SafeAreaView>
                </KeyboardAvoidingView>
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
                            {['❤️', '👍', '👎', '🔥', '🥰', '👏', '😂', '😢'].map((emoji, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={styles.reactionButton}
                                    onPress={() => handleAddReaction(emoji)}
                                >
                                    <Text style={styles.reactionText}>{emoji}</Text>
                                </TouchableOpacity>
                            ))}
                            <TouchableOpacity
                                style={styles.reactionButton}
                                onPress={() => {
                                    setSelectedMessage(null);
                                    setTimeout(() => {
                                        setShowEmojiPicker(true);
                                        setPickerTab('emoji');
                                    }, 100);
                                }}
                            >
                                <Ionicons name="add-circle-outline" size={22} color="#9CA3AF" />
                            </TouchableOpacity>
                        </View>

                        {/* Menu Items */}
                        <View style={styles.menuContainer}>
                            <TouchableOpacity style={styles.menuItem} onPress={handleReplyMessage}>
                                <Text style={styles.menuItemText}>Trả lời</Text>
                                <Ionicons name="arrow-undo-outline" size={20} color="white" />
                            </TouchableOpacity>
                            <View style={styles.menuDivider} />

                            <TouchableOpacity style={styles.menuItem} onPress={async () => {
                                if (selectedMessage?.text) {
                                    await Clipboard.setStringAsync(selectedMessage.text);
                                }
                                setSelectedMessage(null);
                            }}>
                                <Text style={styles.menuItemText}>Sao chép</Text>
                                <Ionicons name="copy-outline" size={20} color="white" />
                            </TouchableOpacity>
                            <View style={styles.menuDivider} />

                            {selectedMessage?.sender === 'me' && (
                                <>
                                    <TouchableOpacity style={styles.menuItem} onPress={handleEditMessage}>
                                        <Text style={styles.menuItemText}>Chỉnh sửa</Text>
                                        <Ionicons name="create-outline" size={20} color="white" />
                                    </TouchableOpacity>
                                    <View style={styles.menuDivider} />
                                </>
                            )}


                            <TouchableOpacity style={styles.menuItem} onPress={handlePinMessageAction}>
                                <Text style={styles.menuItemText}>Ghim</Text>
                                <Ionicons name="pin-outline" size={20} color="white" />
                            </TouchableOpacity>
                            <View style={styles.menuDivider} />

                            <TouchableOpacity style={styles.menuItem} onPress={() => {
                                setForwardMessage(selectedMessage);
                                setSelectedMessage(null);
                                setTimeout(() => setShowForwardModal(true), 100);
                            }}>
                                <Text style={styles.menuItemText}>Chuyển tiếp</Text>
                                <Ionicons name="arrow-redo-outline" size={20} color="white" />
                            </TouchableOpacity>
                            <View style={styles.menuDivider} />

                            {selectedMessage?.sender === 'me' && (
                                <>
                                    <TouchableOpacity style={styles.menuItem} onPress={handleRevokeMessageAction}>
                                        <Text style={[styles.menuItemText, { color: '#FF3B30' }]}>Thu hồi</Text>
                                        <Ionicons name="arrow-undo-circle-outline" size={20} color="#FF3B30" />
                                    </TouchableOpacity>
                                    <View style={styles.menuDivider} />
                                </>
                            )}

                            <TouchableOpacity style={styles.menuItem} onPress={handleDeleteMessageAction}>
                                <Text style={[styles.menuItemText, { color: '#FF3B30' }]}>Xóa ở phía tôi</Text>
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

            {/* Forward Message Modal */}
            <ForwardMessageModal
                visible={showForwardModal}
                onClose={() => {
                    setShowForwardModal(false);
                    setForwardMessage(null);
                }}
                message={forwardMessage}
                currentUserId={currentUserId || ''}
            />

            {/* Chat Options Modal (Block/Report) - Only for 1-1 chats */}
            {!isGroup && (
                <ChatOptionsModal
                    visible={showHeaderOptions}
                    onClose={() => setShowHeaderOptions(false)}
                    partnerId={partnerId}
                    partnerName={headerName}
                    onSearch={() => setIsSearching(true)}
                    onViewProfile={() => (navigation as any).navigate('Profile', { userId: partnerId })}
                />
            )}
        </View >
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
        paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 8 : 50,
        height: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 58 : 100,
        paddingHorizontal: 12,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    backButton: { padding: 4, marginRight: 4 },
    headerAvatarContainer: { marginRight: 10, position: 'relative' },
    headerAvatar: { width: 42, height: 42, borderRadius: 21 },
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
    headerRight: { flexDirection: 'row', width: 120, justifyContent: 'flex-end', alignItems: 'center' },
    headerIcon: { padding: 4, marginLeft: 12 },
    headerIconCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#000000',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 10
    },

    keyboardAvoid: { flex: 1 },
    listStyle: { flex: 1 },
    listContent: { padding: 12, paddingBottom: 10 },

    // Scroll to bottom button styles
    scrollToBottomButton: {
        position: 'absolute',
        right: 16,
        bottom: 70, // Above the input bar
        zIndex: 10,
        width: 36,
        height: 36,
        borderRadius: 18,
        overflow: 'hidden',
    },
    scrollToBottomInner: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    newMessageBadge: {
        position: 'absolute',
        top: -4,
        right: -4,
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: '#E04B4B',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 5,
        borderWidth: 1.5,
        borderColor: '#FFFFFF',
    },
    newMessageBadgeText: {
        color: '#FFFFFF',
        fontSize: 10,
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
        width: 45,
        paddingLeft: 8,
    },
    swipeReplyIcon: {
        width: 28,
        height: 28,
        borderRadius: 14,
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
        padding: 10,
        paddingHorizontal: 12,
        borderRadius: 12,
    },
    // Deleted message style
    deletedMessageBubble: {
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 16,
        backgroundColor: '#F5F5F5',
        borderWidth: 1,
        borderColor: '#E5E5E5',
        borderStyle: 'dashed',
        flexDirection: 'row',
        alignItems: 'center',
    },
    deletedMessageText: {
        fontSize: 14,
        color: '#9CA3AF',
        fontStyle: 'italic',
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
        borderRadius: 16,
        paddingVertical: 8,
        paddingHorizontal: 12,
        maxWidth: '80%', // Increased from 65%
    },
    callIconCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    callIconEnded: {
        backgroundColor: CALL_PURPLE, // Filled purple background
    },
    callIconMissed: {
        backgroundColor: '#E04B4B', // Filled red background
    },
    callTextContainer: {
        justifyContent: 'center',
        flexShrink: 1, // Allow container to shrink/wrap properly
        marginRight: 4,
    },
    callMainText: {
        fontSize: 13,
        fontWeight: '500',
        color: CALL_PURPLE,
    },
    callMissedText: {
        color: '#E04B4B',
    },
    callTimeText: {
        fontSize: 11,
        color: '#9CA3AF',
        marginTop: 1,
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
        height: undefined,
        aspectRatio: 1, // Default 1:1, will be overridden by actual image
        maxWidth: SCREEN_WIDTH * 0.65,
        maxHeight: SCREEN_WIDTH * 0.8,
        minHeight: 100,
        borderRadius: 8,
        backgroundColor: '#F0F0F0', // Placeholder background
    },
    imageCaptionText: {
        fontSize: 15,
        lineHeight: 20,
        paddingHorizontal: 8,
        paddingTop: 8,
        paddingBottom: 2,
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
    pinnedMessageBar: {
        backgroundColor: '#fff',
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        zIndex: 20,
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
    editBarContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEF3C7',
        padding: 8,
        paddingHorizontal: 12,
        borderTopWidth: 1,
        borderTopColor: '#FCD34D',
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
        alignItems: 'flex-end',
        backgroundColor: '#F3F4F6', // Light gray input bg
        borderRadius: 20,
        paddingHorizontal: 16,
        minHeight: 40,
        maxHeight: 120,
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
    stickerIconContainer: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#000000',
        justifyContent: 'center',
        alignItems: 'center',
    },
    // Sticker Message Styles
    stickerContainer: {
        marginBottom: 10,
        maxWidth: '70%',
    },
    stickerImageMessage: {
        width: 120,
        height: 120,
    },
    alignRight: {
        alignSelf: 'flex-end',
        alignItems: 'flex-end',
    },
    alignLeft: {
        alignSelf: 'flex-start',
        alignItems: 'flex-start',
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
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderLeftWidth: 3,
        borderLeftColor: '#FFFFFF',
        paddingVertical: 6,
        paddingHorizontal: 8,
        borderRadius: 4,
        marginBottom: 6,
    },
    replyPreviewOther: {
        backgroundColor: 'rgba(0,0,0,0.05)',
        borderLeftColor: '#7C3C6D',
    },
    replyBar: {
        // Using borderLeft instead
    },
    replyText: {
        color: 'rgba(255,255,255,0.85)',
        fontSize: 12,
        fontStyle: 'italic',
    },
    replyTextOther: {
        color: '#666',
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
    // Message Reactions Display Styles
    reactionsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        paddingHorizontal: 6,
        paddingVertical: 3,
        marginTop: -8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
        elevation: 2,
        borderWidth: 0.5,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    reactionsContainerMe: {
        alignSelf: 'flex-end',
        marginRight: 4,
    },
    reactionsContainerOther: {
        alignSelf: 'flex-start',
        marginLeft: 44,
    },
    reactionBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 3,
        paddingVertical: 1,
    },
    reactionBadgeEmoji: {
        fontSize: 14,
    },
    reactionBadgeCount: {
        fontSize: 11,
        color: '#666',
        marginLeft: 2,
        fontWeight: '500',
    },
    // Swipe Reply Styles
    swipeActionRightContainer: {
        width: 50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    swipeActionRightIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.1,
        shadowRadius: 1.41,
        elevation: 2,
    },
    // Picker Styles
    mediaRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-around',
        width: '100%',
        paddingVertical: 10
    },

    pickerContainer: {
        height: 280,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
    },
    pickerTabs: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    pickerTab: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 6,
    },
    pickerTabActive: {
        backgroundColor: '#EBF4FF',
        borderBottomWidth: 2,
        borderBottomColor: ZALO_BLUE,
    },
    pickerTabText: {
        fontSize: 14,
        color: '#6B7280',
        fontWeight: '500',
    },
    pickerTabTextActive: {
        color: ZALO_BLUE,
        fontWeight: '600',
    },
    // Empty State Styles
    emptyListContent: {
        flexGrow: 1,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyCenter: {
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
    },
    emptyIconCircle: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        position: 'relative',
    },
    emptyIconBubbles: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyIconSmile: {
        position: 'absolute',
        bottom: 8,
        right: 8,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 2,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333333',
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 14,
        color: '#666666',
        textAlign: 'center',
        lineHeight: 20,
    },
    suggestionContainer: {
        width: '100%',
        paddingHorizontal: 16,
        paddingBottom: 10,
    },
    suggestionText: {
        fontSize: 13,
        color: '#666666',
        textAlign: 'center',
        marginBottom: 16,
    },
    suggestionRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
    },
    suggestionSticker: {
        width: 60,
        height: 60,
    },
    suggestionStickerImg: {
        width: '100%',
        height: '100%',
    },
    // Bottom Picker Tabs
    bottomTabBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
        height: 50,
    },
    bottomTabsContainer: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 10,
    },
    bottomTab: {
        paddingVertical: 6,
        paddingHorizontal: 16,
        borderRadius: 16,
    },
    bottomTabActive: {
        paddingVertical: 6,
        paddingHorizontal: 16,
        backgroundColor: '#333333', // Dark pill
        borderRadius: 16,
    },
    bottomTabText: {
        fontSize: 14,
        color: '#666',
        fontWeight: '500',
    },
    bottomTabActiveText: {
        fontSize: 14,
        color: '#FFF',
        fontWeight: '500',
    },
    backspaceButton: {
        paddingLeft: 10,
    },
    // Image Preview Modal with Caption styles
    imagePreviewModalContainer: {
        flex: 1,
        backgroundColor: '#000000',
    },
    imagePreviewModalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: 'rgba(0,0,0,0.8)',
    },
    imagePreviewModalClose: {
        padding: 8,
    },
    imagePreviewModalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    imagePreviewModalContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    imagePreviewModalImage: {
        width: '100%',
        height: '100%',
    },
    imagePreviewModalFooter: {
        backgroundColor: 'rgba(0,0,0,0.9)',
        paddingHorizontal: 16,
        paddingVertical: 12,
        paddingBottom: Platform.OS === 'ios' ? 30 : 16,
    },
    imagePreviewCaptionContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        backgroundColor: '#1E1E1E',
        borderRadius: 24,
        paddingHorizontal: 16,
        paddingVertical: 8,
        minHeight: 48,
    },
    imagePreviewCaptionInput: {
        flex: 1,
        fontSize: 16,
        color: '#FFFFFF',
        maxHeight: 100,
        paddingVertical: 8,
    },
    imagePreviewSendButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#0068FF',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 10,
    },
    // Read receipts styles
    readReceiptsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-end',
        marginTop: 4,
    },
    readReceiptAvatar: {
        width: 16,
        height: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#0068FF',
        backgroundColor: '#e1e1e1',
    },
    readReceiptMore: {
        backgroundColor: 'rgba(255,255,255,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    readReceiptMoreText: {
        fontSize: 8,
        color: '#0068FF',
        fontWeight: 'bold',
    },
    // MENTION STYLES
    mentionPopup: {
        position: 'absolute',
        bottom: '100%', // Position right above the footer input
        marginBottom: 10,
        left: 10,
        right: 10,
        backgroundColor: '#FFFFFF', // Changed to White
        borderRadius: 12,
        maxHeight: 220,
        zIndex: 1000,
        elevation: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15, // Lighter shadow
        shadowRadius: 5,
        borderWidth: 1,
        borderColor: '#E5E7EB', // Light gray border
        overflow: 'hidden'
    },
    mentionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6' // Very light gray separator
    },
    mentionAvatarContainer: {
        marginRight: 12,
    },
    mentionAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#E5E7EB' // Light gray placeholder
    },
    mentionName: {
        color: '#1F2937', // Dark text
        fontWeight: 'bold',
        fontSize: 14,
        marginBottom: 2
    },
    mentionSubtitle: {
        color: '#6B7280', // Gray text
        fontSize: 12
    },
    // SYSTEM MESSAGE STYLES
    systemMessageContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        paddingHorizontal: 20,
        marginVertical: 4,
    },
    systemMessageText: {
        backgroundColor: 'rgba(0,0,0,0.04)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 16,
        fontSize: 13,
        color: '#666666',
        textAlign: 'center',
        overflow: 'hidden',
    },
    // TYPING INDICATOR STYLES
    typingIndicatorContainer: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: 'transparent',
    },
    typingIndicatorText: {
        fontSize: 12,
        color: '#6B7280', // Gray text
        fontStyle: 'italic',
    },
    // SEARCH STYLES
    searchBarContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F0F2F5',
        borderRadius: 20,
        paddingHorizontal: 12,
        height: 40,
        marginLeft: 8
    },
    headerSearchInput: {
        flex: 1,
        fontSize: 15,
        color: '#000',
        paddingVertical: 0
    },
    searchResultsContainer: {
        position: 'absolute',
        top: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 58 : 100,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#FFFFFF',
        zIndex: 50,
        paddingHorizontal: 16
    },
    searchResultItem: {
        flexDirection: 'row',
        paddingVertical: 12,
        borderBottomWidth: 0.5,
        borderBottomColor: '#F0F0F0'
    },
    searchResultAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#E4E6EB'
    },
    searchResultContent: {
        flex: 1,
        marginLeft: 12,
        justifyContent: 'center'
    },
    searchResultName: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#000',
        marginBottom: 2,
        flex: 1,
        marginRight: 8
    },
    searchResultTime: {
        fontSize: 12,
        color: '#666'
    },
    searchResultText: {
        fontSize: 14,
        color: '#333'
    }
});

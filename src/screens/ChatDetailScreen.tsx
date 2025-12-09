import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, Platform, SafeAreaView, StatusBar, Image, Keyboard, Modal, Alert, ActivityIndicator, Dimensions } from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/types';
import { COLORS, SPACING } from '../utils/theme';
import { Ionicons, Feather, FontAwesome, MaterialIcons } from '@expo/vector-icons';
import { getSocket } from '../utils/socket';
import { getChatHistory, getCurrentUser, markConversationAsRead, API_URL, deleteMessage } from '../utils/api';
import { launchImageLibrary, launchCamera } from '../utils/imagePicker';
import EmojiPicker from '../components/EmojiPicker';

type ChatDetailRouteProp = RouteProp<RootStackParamList, 'ChatDetail'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ZALO_BLUE = '#0068FF';
const ZALO_BG = '#E2E9F1';
const MY_BUBBLE = '#D7F0FF';
const OTHER_BUBBLE = '#FFFFFF';

export default function ChatDetailScreen() {
    const route = useRoute<ChatDetailRouteProp>();
    const navigation = useNavigation();
    const { conversationId, partnerId, userName, avatar } = route.params;
    const [messages, setMessages] = useState<any[]>([]);
    const [inputText, setInputText] = useState('');
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [keyboardHeight, setKeyboardHeight] = useState(0);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showMediaPicker, setShowMediaPicker] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const flatListRef = useRef<FlatList>(null);
    const inputRef = useRef<TextInput>(null);
    const socket = getSocket();

    useEffect(() => {
        loadHistory();
        fetchCurrentUser();

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
                markConversationAsRead(conversationId);
            });
            socket.on('messageSent', (message) => {
                setMessages(prev => prev.map(msg => msg.id === message.tempId ? {
                    ...msg,
                    id: message._id,
                    time: new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                } : msg));
            });
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
                senderId: m.user._id
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
        setMessages(prev => {
            if (prev.find(m => m.id === msg._id)) return prev;
            return [...prev, {
                id: msg._id,
                text: msg.text,
                type: msg.type || 'text',
                imageUrl: msg.imageUrl,
                sender: msg.user._id === currentUserId ? 'me' : 'other',
                time: new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                senderId: msg.user._id
            }];
        });
        scrollToBottom();
    };

    const scrollToBottom = () => {
        setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
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
                tempId: tempId
            });
        }

        setInputText('');
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

    const renderHeader = () => (
        <View style={styles.header}>
            <View style={styles.headerLeft}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <View style={styles.headerAvatarContainer}>
                    {avatar ? (
                        <Image source={{ uri: avatar }} style={styles.headerAvatar} />
                    ) : (
                        <View style={[styles.headerAvatar, { backgroundColor: '#A0AEC0', alignItems: 'center', justifyContent: 'center' }]}>
                            <Text style={{ color: 'white', fontSize: 14 }}>{userName?.[0]}</Text>
                        </View>
                    )}
                </View>
                <View style={styles.headerInfo}>
                    <Text style={styles.headerTitle} numberOfLines={1}>{userName}</Text>
                    <Text style={styles.headerSubtitle}>Vừa mới truy cập</Text>
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
                    })}
                >
                    <Ionicons name="call-outline" size={22} color="white" />
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.headerIcon}
                    onPress={() => (navigation as any).navigate('Call', {
                        partnerId,
                        userName,
                        avatar,
                        isVideo: true,
                        isIncoming: false,
                    })}
                >
                    <Ionicons name="videocam-outline" size={24} color="white" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.headerIcon}>
                    <Ionicons name="list-outline" size={24} color="white" />
                </TouchableOpacity>
            </View>
        </View>
    );



    const handleDeleteMessage = (messageId: string) => {
        Alert.alert(
            'Xóa tin nhắn',
            'Tin nhắn này sẽ chỉ bị xóa ở phía bạn. Người nhận vẫn sẽ nhìn thấy.',
            [
                { text: 'Hủy', style: 'cancel' },
                {
                    text: 'Xóa ở phía tôi',
                    style: 'destructive',
                    onPress: async () => {
                        // Optimistic UI update
                        setMessages(prev => prev.filter(m => m.id !== messageId));
                        try {
                            await deleteMessage(messageId);
                        } catch (error) {
                            console.error('Delete message error', error);
                            // Optionally restore message if failed, but for now we keep it simple
                        }
                    }
                }
            ]
        );
    };

    const renderMessageItem = ({ item, index }: { item: any, index: number }) => {
        const isMe = item.sender === 'me' || (currentUserId && item.senderId === currentUserId);
        const nextMessage = messages[index + 1];
        const isLast = index === messages.length - 1 || (nextMessage && nextMessage.senderId !== item.senderId);
        const isImage = item.type === 'image' && item.imageUrl;

        return (
            <View style={[
                styles.messageRow,
                isMe ? styles.messageRowMe : styles.messageRowOther,
                { marginBottom: isLast ? 8 : 2 }
            ]}>
                {!isMe && (
                    <View style={styles.avatarContainer}>
                        {avatar ? (
                            <Image source={{ uri: avatar }} style={styles.avatarSmall} />
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
                        onLongPress={() => handleDeleteMessage(item.id)}
                        delayLongPress={500}
                    >
                        <Image
                            source={{ uri: item.imageUrl }}
                            style={styles.messageImage}
                            resizeMode="cover"
                        />
                        <Text style={styles.messageTime}>{item.time}</Text>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        style={[styles.messageBubble, isMe ? styles.bubbleMe : styles.bubbleOther]}
                        onLongPress={() => handleDeleteMessage(item.id)}
                        delayLongPress={500}
                        activeOpacity={0.8}
                    >
                        <Text style={[styles.messageText, { color: '#000' }]}>{item.text}</Text>
                        <Text style={styles.messageTime}>{item.time}</Text>
                    </TouchableOpacity>
                )}
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <SafeAreaView style={styles.safeTop}>
                <StatusBar barStyle="light-content" backgroundColor={ZALO_BLUE} />
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
                    onContentSizeChange={() => scrollToBottom()}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="interactive"
                />

                {/* Input Container */}
                <View style={[
                    styles.inputContainer,
                    Platform.OS === 'ios'
                        ? { marginBottom: showEmojiPicker ? 0 : (keyboardHeight > 0 ? keyboardHeight : 20) }
                        : {}
                ]}>
                    {/* Attachment Button (Left) */}
                    <TouchableOpacity style={styles.leftButton} onPress={() => setShowMediaPicker(true)}>
                        <Ionicons name="attach" size={28} color="#6B7280" />
                    </TouchableOpacity>

                    {/* Text Input Wrapper (Center) */}
                    <View style={styles.inputWrapper}>
                        <TextInput
                            ref={inputRef}
                            style={styles.input}
                            value={inputText}
                            onChangeText={setInputText}
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
                            <MaterialIcons
                                name={showEmojiPicker ? "keyboard" : "sentiment-satisfied-alt"}
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
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: ZALO_BG,
    },
    safeTop: {
        backgroundColor: ZALO_BLUE,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: ZALO_BLUE,
        paddingTop: Platform.OS === 'android' ? 40 : 0,
        height: Platform.OS === 'android' ? 90 : 50,
        paddingHorizontal: 12,
        paddingBottom: 10,
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    backButton: { padding: 4, marginRight: 4 },
    headerAvatarContainer: { marginRight: 10 },
    headerAvatar: { width: 36, height: 36, borderRadius: 18 },
    headerInfo: { flex: 1 },
    headerTitle: { color: 'white', fontSize: 17, fontWeight: '600' },
    headerSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 12 },
    headerRight: { flexDirection: 'row', width: 100, justifyContent: 'space-between' },
    headerIcon: { padding: 4 },

    keyboardAvoid: { flex: 1 },
    listStyle: { flex: 1 },
    listContent: { padding: 12, paddingBottom: 10 },

    messageRow: { flexDirection: 'row', alignItems: 'flex-end', marginVertical: 1 },
    messageRowMe: { justifyContent: 'flex-end' },
    messageRowOther: { justifyContent: 'flex-start' },

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

    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderTopWidth: 0,
    },
    leftButton: {
        padding: 8,
        marginRight: 8,
    },
    inputWrapper: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'transparent',
        borderRadius: 20,
        paddingHorizontal: 12,
        minHeight: 40,
    },
    input: {
        flex: 1,
        fontSize: 16,
        maxHeight: 100,
        paddingVertical: 8,
        color: '#1F2937',
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
});

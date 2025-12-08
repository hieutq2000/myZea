import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, SafeAreaView, StatusBar, Image, Keyboard } from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/types';
import { COLORS, SPACING } from '../utils/theme';
import { Ionicons, Feather, FontAwesome } from '@expo/vector-icons';
import { getSocket } from '../utils/socket';
import { getChatHistory, getCurrentUser } from '../utils/api';

type ChatDetailRouteProp = RouteProp<RootStackParamList, 'ChatDetail'>;

const ZALO_BLUE = '#0068FF';
const ZALO_BG = '#E2E9F1'; // Light gray background
const MY_BUBBLE = '#D7F0FF'; // Light blue bubble for "me"
const OTHER_BUBBLE = '#FFFFFF'; // White for "other"

export default function ChatDetailScreen() {

    const route = useRoute<ChatDetailRouteProp>();
    const navigation = useNavigation();
    const { conversationId, partnerId, userName, avatar } = route.params;
    const [messages, setMessages] = useState<any[]>([]);
    const [inputText, setInputText] = useState('');
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
    const flatListRef = useRef<FlatList>(null);
    const socket = getSocket();

    useEffect(() => {
        loadHistory();
        fetchCurrentUser();

        // Keyboard listeners for iOS
        const keyboardWillShow = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
            () => setIsKeyboardVisible(true)
        );
        const keyboardWillHide = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
            () => setIsKeyboardVisible(false)
        );

        if (socket) {
            socket.on('receiveMessage', (message) => {
                if (message.user._id === partnerId || message.user._id === currentUserId) {
                    appendMessage(message);
                }
            });
            socket.on('messageSent', (message) => {
                // Already added locally, but can confirm status there
                // For simplicity we just append if not exists or rely on local optmistic update
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
    }, []);

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
                sender: m.user._id === currentUserId ? 'me' : 'other', // We need currentId to decide, but initially null. We might need to re-map or use id check in render.
                time: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                senderId: m.user._id
            }));
            setMessages(mapped);
            scrollToBottom();
        } catch (error) {
            console.log('Load history error:', error);
        }
    };

    const appendMessage = (msg: any) => {
        setMessages(prev => {
            // Avoid duplicates
            if (prev.find(m => m.id === msg._id)) return prev;
            return [...prev, {
                id: msg._id,
                text: msg.text,
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

    const sendMessage = async () => {
        if (!inputText.trim() || !currentUserId) return;

        const tempId = Date.now().toString();
        const newMessage = {
            id: tempId,
            text: inputText,
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
                message: inputText,
                type: 'text'
            });
        }

        setInputText('');
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
                <TouchableOpacity style={styles.headerIcon}>
                    <Ionicons name="call-outline" size={22} color="white" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.headerIcon}>
                    <Ionicons name="videocam-outline" size={24} color="white" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.headerIcon}>
                    <Ionicons name="list-outline" size={24} color="white" />
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderMessageItem = ({ item, index }: { item: any, index: number }) => {
        const isMe = item.sender === 'me' || item.senderId === currentUserId; // Check both for robustness
        const isLast = index === messages.length - 1 || messages[index + 1].sender !== item.sender;

        return (
            <View style={[
                styles.messageRow,
                isMe ? styles.messageRowMe : styles.messageRowOther,
                { marginBottom: isLast ? 8 : 2 }
            ]}>
                {!isMe && (
                    <View style={styles.avatarContainer}>
                        {isLast ? (
                            avatar ? (
                                <Image source={{ uri: avatar }} style={styles.avatarSmall} />
                            ) : (
                                <View style={[styles.avatarSmall, { backgroundColor: '#A0AEC0', alignItems: 'center', justifyContent: 'center' }]}>
                                    <Text style={{ color: 'white', fontSize: 10 }}>{userName?.[0]}</Text>
                                </View>
                            )
                        ) : <View style={{ width: 28 }} />}
                    </View>
                )}

                <View style={[
                    styles.messageBubble,
                    isMe ? styles.bubbleMe : styles.bubbleOther
                ]}>
                    <Text style={[styles.messageText, { color: '#000' }]}>{item.text}</Text>
                    <Text style={styles.messageTime}>{item.time}</Text>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <SafeAreaView style={styles.safeTop}>
                <StatusBar barStyle="light-content" backgroundColor={ZALO_BLUE} />
            </SafeAreaView>
            {renderHeader()}

            <KeyboardAvoidingView
                style={styles.keyboardAvoid}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            >
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={item => item.id}
                    renderItem={renderMessageItem}
                    contentContainerStyle={styles.listContent}
                    style={styles.listStyle}
                    onContentSizeChange={() => scrollToBottom()}
                    onLayout={() => scrollToBottom()}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="interactive"
                />

                <View style={[
                    styles.inputContainer,
                    // Add bottom padding for safe area only when keyboard is NOT visible
                    !isKeyboardVisible && Platform.OS === 'ios' && { paddingBottom: 30 }
                ]}>
                    {/* Sticker/Emoji button - Left side */}
                    <TouchableOpacity style={styles.stickerButton}>
                        <FontAwesome name="smile-o" size={26} color={ZALO_BLUE} />
                    </TouchableOpacity>

                    {/* Text Input - Center */}
                    <View style={styles.inputWrapper}>
                        <TextInput
                            style={styles.input}
                            value={inputText}
                            onChangeText={setInputText}
                            placeholder="Tin nhắn"
                            placeholderTextColor="#9CA3AF"
                            multiline
                            onFocus={() => {
                                setTimeout(() => scrollToBottom(), 300);
                            }}
                        />
                    </View>

                    {/* Right side buttons */}
                    {inputText.trim() ? (
                        <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
                            <Ionicons name="send" size={24} color={ZALO_BLUE} />
                        </TouchableOpacity>
                    ) : (
                        <View style={styles.rightButtons}>
                            <TouchableOpacity style={styles.actionButton}>
                                <Feather name="more-horizontal" size={24} color="#6B7280" />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.actionButton}>
                                <Ionicons name="mic-outline" size={24} color="#6B7280" />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.actionButton}>
                                <Ionicons name="image-outline" size={24} color="#6B7280" />
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: ZALO_BG },
    safeTop: { backgroundColor: ZALO_BLUE },
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
    bubbleMe: {
        backgroundColor: MY_BUBBLE,
    },
    bubbleOther: {
        backgroundColor: OTHER_BUBBLE,
    },
    messageText: { fontSize: 16, lineHeight: 22 },
    messageTime: { fontSize: 10, color: '#9CA3AF', marginTop: 4, alignSelf: 'flex-end' },

    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        paddingVertical: 10,
        paddingHorizontal: 8,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
    },
    stickerButton: {
        padding: 8,
        marginRight: 4,
    },
    inputWrapper: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        borderRadius: 22,
        marginHorizontal: 6,
        paddingHorizontal: 14,
        minHeight: 44,
    },
    input: {
        flex: 1,
        fontSize: 16,
        maxHeight: 100,
        paddingVertical: 10,
        color: '#1F2937',
    },
    rightButtons: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    actionButton: {
        padding: 8,
    },
    sendButton: {
        padding: 8,
        marginLeft: 4,
    },
});

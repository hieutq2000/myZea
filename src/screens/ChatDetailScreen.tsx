import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, SafeAreaView, StatusBar, Image } from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/types';
import { COLORS, SPACING } from '../utils/theme';
import { Ionicons, MaterialIcons, Feather, FontAwesome } from '@expo/vector-icons';
import { getSocket } from '../utils/socket';

type ChatDetailRouteProp = RouteProp<RootStackParamList, 'ChatDetail'>;

const ZALO_BLUE = '#0068FF';
const ZALO_BG = '#E2E9F1'; // Light gray background
const MY_BUBBLE = '#D7F0FF'; // Light blue bubble for "me"
const OTHER_BUBBLE = '#FFFFFF'; // White for "other"

export default function ChatDetailScreen() {
    const route = useRoute<ChatDetailRouteProp>();
    const navigation = useNavigation();
    const { conversationId, userName, avatar } = route.params;
    const [messages, setMessages] = useState<any[]>([]);
    const [inputText, setInputText] = useState('');
    const flatListRef = useRef<FlatList>(null);
    const socket = getSocket();

    useEffect(() => {
        // Mock messages
        setMessages([
            { id: '1', text: 'Chào bạn, mình có thể giúp gì?', sender: 'other', time: '10:00' },
            { id: '2', text: 'Mình muốn hỏi về khóa học AI.', sender: 'me', time: '10:01' },
            { id: '3', text: 'Khóa học bao gồm nội dung gì vậy?', sender: 'me', time: '10:01' },
            { id: '4', text: 'Chào bạn, khóa học bao gồm các kiến thức nền tảng và nâng cao về AI, đặc biệt là Generative AI nhé!', sender: 'other', time: '10:02' },
        ]);

        if (socket) {
            socket.on('receiveMessage', (message) => {
                setMessages(prev => [...prev, message]);
                scrollToBottom();
            });
        }

        return () => {
            if (socket) socket.off('receiveMessage');
        };
    }, []);

    const scrollToBottom = () => {
        setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
    };

    const sendMessage = () => {
        if (!inputText.trim()) return;

        const newMessage = {
            id: Date.now().toString(),
            text: inputText,
            sender: 'me',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        setMessages(prev => [...prev, newMessage]);
        scrollToBottom();

        if (socket) {
            socket.emit('sendMessage', {
                conversationId,
                message: inputText,
                // senderId handled by token/session on server
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
        const isMe = item.sender === 'me';
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
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={ZALO_BLUE} />
            {renderHeader()}

            <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={item => item.id}
                renderItem={renderMessageItem}
                contentContainerStyle={styles.listContent}
                style={styles.listStyle}
            />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            >
                <View style={styles.inputContainer}>
                    <TouchableOpacity style={styles.attachButton}>
                        <MaterialIcons name="image" size={26} color="#6B7280" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.attachButton}>
                        <MaterialIcons name="mic" size={26} color="#6B7280" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.attachButton}>
                        <MaterialIcons name="more-horiz" size={26} color="#6B7280" />
                    </TouchableOpacity>

                    <View style={styles.inputWrapper}>
                        <TextInput
                            style={styles.input}
                            value={inputText}
                            onChangeText={setInputText}
                            placeholder="Tin nhắn"
                            placeholderTextColor="#9CA3AF"
                            multiline
                        />
                        <TouchableOpacity style={styles.emojiButton}>
                            <FontAwesome name="smile-o" size={24} color="#6B7280" />
                        </TouchableOpacity>
                    </View>

                    {inputText.trim() ? (
                        <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
                            <Ionicons name="send" size={20} color={ZALO_BLUE} />
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity style={styles.sendButton}>
                            <Ionicons name="thumbs-up-outline" size={24} color={ZALO_BLUE} />
                        </TouchableOpacity>
                    )}
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: ZALO_BG },
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
    backButton: { padding: 4, marginRight: 8 },
    headerInfo: { flex: 1 },
    headerTitle: { color: 'white', fontSize: 17, fontWeight: '600' },
    headerSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 12 },
    headerRight: { flexDirection: 'row', width: 100, justifyContent: 'space-between' },
    headerIcon: { padding: 4 },

    listStyle: { flex: 1 },
    listContent: { padding: 12, paddingBottom: 10 },

    messageRow: { flexDirection: 'row', alignItems: 'flex-end', marginVertical: 1 },
    messageRowMe: { justifyContent: 'flex-end' },
    messageRowOther: { justifyContent: 'flex-start' },

    avatarContainer: { marginRight: 8, width: 28, alignItems: 'center' },
    avatarSmall: { width: 28, height: 28, borderRadius: 14 },

    messageBubble: {
        maxWidth: '75%',
        padding: 10,
        paddingHorizontal: 12,
        borderRadius: 12,
        elevation: 1,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
    },
    bubbleMe: {
        backgroundColor: MY_BUBBLE,
        borderWidth: 0.5,
        borderColor: '#C6E5FF',
    },
    bubbleOther: {
        backgroundColor: OTHER_BUBBLE,
        borderWidth: 0.5,
        borderColor: '#E5E7EB',
    },
    messageText: { fontSize: 16, lineHeight: 22 },
    messageTime: { fontSize: 10, color: '#9CA3AF', marginTop: 4, alignSelf: 'flex-end' },

    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        paddingVertical: 8,
        paddingHorizontal: 8,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
    },
    attachButton: { padding: 6 },
    inputWrapper: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        borderRadius: 20,
        marginHorizontal: 4,
        paddingHorizontal: 12,
    },
    input: {
        flex: 1,
        fontSize: 16,
        maxHeight: 100,
        paddingVertical: 8,
    },
    emojiButton: { padding: 4 },
    sendButton: { padding: 8, marginLeft: 4 },
});

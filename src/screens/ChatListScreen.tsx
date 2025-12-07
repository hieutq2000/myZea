import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image, TextInput, StatusBar, SafeAreaView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { COLORS, SPACING } from '../utils/theme';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import { getSocket } from '../utils/socket';
import { LinearGradient } from 'expo-linear-gradient';

// Zalo Colors
const ZALO_BLUE = '#0068FF';
const ZALO_BG = '#F2F4F8';

export default function ChatListScreen() {
    const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
    const [conversations, setConversations] = useState<any[]>([]);
    const [searchText, setSearchText] = useState('');

    useEffect(() => {
        // Mock data
        setConversations([
            {
                id: '1',
                name: 'Trợ lý AI',
                lastMessage: 'Bạn cần hỗ trợ gì hôm nay?',
                time: '10:30',
                avatar: null,
                unread: 2,
                isOnline: true
            },
            {
                id: '2',
                name: 'Nhóm Học Tập',
                lastMessage: 'Tuấn: Bài tập tối nay khó quá!',
                time: '09:15',
                avatar: null,
                unread: 0,
                isGroup: true
            }
        ]);

        const socket = getSocket();
        if (socket) {
            // Listen for new messages
            socket.on('receiveMessage', (msg) => {
                // Update conversation list logic here
                console.log('New message in list:', msg);
            });
        }
    }, []);

    const renderItem = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={styles.itemContainer}
            onPress={() => navigation.navigate('ChatDetail', { conversationId: item.id, userName: item.name })}
            activeOpacity={0.7}
        >
            <View style={styles.avatarContainer}>
                {item.avatar ? (
                    <Image source={{ uri: item.avatar }} style={styles.avatar} />
                ) : (
                    <LinearGradient
                        colors={item.id === '1' ? [ZALO_BLUE, '#0091FF'] : ['#A0AEC0', '#718096']}
                        style={styles.avatar}
                    >
                        <Text style={styles.avatarText}>{item.name[0]}</Text>
                    </LinearGradient>
                )}
                {item.isOnline && <View style={styles.onlineDot} />}
            </View>

            <View style={styles.contentContainer}>
                <View style={styles.headerRow}>
                    <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.time}>{item.time}</Text>
                </View>

                <View style={styles.messageRow}>
                    <Text
                        style={[styles.lastMessage, item.unread > 0 && styles.lastMessageUnread]}
                        numberOfLines={1}
                    >
                        {item.lastMessage}
                    </Text>
                    {item.unread > 0 && (
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>{item.unread < 100 ? item.unread : '99+'}</Text>
                        </View>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={ZALO_BLUE} />

            {/* Zalo Header */}
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="white" />
                    </TouchableOpacity>
                    <View style={styles.searchBar}>
                        <Ionicons name="search" size={20} color="white" style={{ opacity: 0.7 }} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Tìm kiếm"
                            placeholderTextColor="rgba(255,255,255,0.7)"
                            value={searchText}
                            onChangeText={setSearchText}
                        />
                    </View>
                    <TouchableOpacity style={styles.addButton}>
                        <Ionicons name="add" size={28} color="white" />
                    </TouchableOpacity>
                </View>

                {/* Tabs (Optional for later) */}
                {/* <View style={styles.tabs}>
                    <Text style={styles.activeTab}>Tất cả</Text>
                    <Text style={styles.inactiveTab}>Khách hàng</Text>
                </View> */}
            </View>

            <FlatList
                data={conversations}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.listContent}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'white' }, // Zalo uses white for list bg
    header: {
        backgroundColor: ZALO_BLUE,
        paddingTop: Platform.OS === 'android' ? 40 : 0,
        paddingBottom: 12,
        paddingHorizontal: 16,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 44,
    },
    backButton: { marginRight: 12 },
    searchBar: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)', // Glass effect
        borderRadius: 8,
        paddingHorizontal: 10,
        height: 36,
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        color: 'white',
        fontSize: 15,
        height: '100%',
    },
    addButton: { marginLeft: 12 },
    listContent: { paddingBottom: 20 },
    itemContainer: {
        flexDirection: 'row',
        padding: 16,
        paddingVertical: 14,
        alignItems: 'center',
        backgroundColor: 'white',
    },
    avatarContainer: { position: 'relative', marginRight: 16 },
    avatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center'
    },
    avatarText: { color: 'white', fontSize: 22, fontWeight: 'bold' },
    onlineDot: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: '#4CD964', // Green dot
        borderWidth: 2,
        borderColor: 'white',
    },
    contentContainer: { flex: 1 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    name: { fontSize: 17, fontWeight: '500', color: '#111827' },
    time: { fontSize: 13, color: '#6B7280' },
    messageRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    lastMessage: { fontSize: 15, color: '#6B7280', flex: 1, marginRight: 8 },
    lastMessageUnread: { color: '#111827', fontWeight: '500' },
    badge: {
        backgroundColor: '#EF4444',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 10,
        minWidth: 20,
        alignItems: 'center',
    },
    badgeText: { color: 'white', fontSize: 11, fontWeight: 'bold' },
    separator: {
        height: 1,
        backgroundColor: '#F3F4F6',
        marginLeft: 88, // Indent separator
    },
});

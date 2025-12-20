import React, { useState, useEffect } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet,
    TextInput, FlatList, ActivityIndicator, Image, Keyboard
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { Ionicons } from '@expo/vector-icons';
import { searchUsers, ChatUser } from '../utils/api';
import { COLORS } from '../utils/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { getAvatarUri } from '../utils/media';

// Use same dark theme as ChatListScreen
const DARK_BG = '#1A1A1A';
const DARK_HEADER = '#1A1A1A';
const DARK_CARD = '#262626';
const DARK_TEXT = '#FFFFFF';
const DARK_TEXT_SECONDARY = '#8E8E93';
const ZALO_BLUE = '#0068FF';

export default function NewChatScreen() {
    const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
    const [searchQuery, setSearchQuery] = useState('');
    const [results, setResults] = useState<ChatUser[]>([]);
    const [loading, setLoading] = useState(false);
    const [initialState, setInitialState] = useState(true);

    // Search debounce could be added here, but for now we search on submit or text change with delay
    useEffect(() => {
        if (!searchQuery.trim()) {
            setResults([]);
            setInitialState(true);
            return;
        }

        const delayDebounce = setTimeout(() => {
            handleSearch(searchQuery);
        }, 500);

        return () => clearTimeout(delayDebounce);
    }, [searchQuery]);

    const handleSearch = async (query: string) => {
        setLoading(true);
        setInitialState(false);
        try {
            const users = await searchUsers(query);
            setResults(users);
        } catch (error) {
            console.error('Search error:', error);
            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    const handleUserSelect = (user: ChatUser) => {
        // Navigate to ChatDetailScreen with selected user
        // We pass the partnerId. conversationId might be null if it doesn't exist yet,
        // ChatDetailScreen should handle fetching or creating the conversation.
        // But ChatDetail expects conversationId. Let's see if we pass empty string if it works, 
        // OR we just pass partnerId and let ChatDetail find the conversation.
        // Checking ChatDetailScreen props... it takes conversationId AND partnerId.
        // Usually if we start a new chat, we might not have a conversationId yet.
        // Ideally ChatDetailScreen should handle "create if not exists" via API when first message is sent,
        // or we check if conversation exists here.
        // For simplicity, we navigate. If ChatDetail needs a valid conversation ID immediately, 
        // we might need to modify ChatDetail to accept just partnerId.

        // Assuming ChatDetail can handle just partnerId or we pass a placeholder.
        navigation.navigate('ChatDetail', {
            conversationId: 'new', // Flag to indicate new chat or lookup needed
            partnerId: user.id,
            userName: user.name,
            avatar: getAvatarUri(user.avatar, user.name)
        });
    };

    const renderItem = ({ item }: { item: ChatUser }) => (
        <TouchableOpacity
            style={styles.userItem}
            onPress={() => handleUserSelect(item)}
        >
            <View style={styles.avatarContainer}>
                {item.avatar ? (
                    <Image source={{ uri: getAvatarUri(item.avatar, item.name) }} style={styles.avatar} />
                ) : (
                    <LinearGradient
                        colors={['#667eea', '#764ba2']}
                        style={styles.avatar}
                    >
                        <Text style={styles.avatarText}>{item.name?.[0]?.toUpperCase()}</Text>
                    </LinearGradient>
                )}
            </View>
            <View style={styles.userInfo}>
                <Text style={styles.userName}>{item.name}</Text>
                {/* Optional: Show email or status if available */}
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={DARK_TEXT} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Tin nhắn mới</Text>
            </View>

            {/* Search Input */}
            <View style={styles.searchContainer}>
                <View style={styles.searchBar}>
                    <Ionicons name="search" size={20} color={DARK_TEXT_SECONDARY} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Tìm tên hoặc email..."
                        placeholderTextColor={DARK_TEXT_SECONDARY}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        autoFocus
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Ionicons name="close-circle" size={18} color={DARK_TEXT_SECONDARY} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Content */}
            {loading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={ZALO_BLUE} />
                </View>
            ) : results.length > 0 ? (
                <FlatList
                    data={results}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    keyboardShouldPersistTaps="handled"
                />
            ) : (
                <View style={styles.centerContainer}>
                    {!initialState && searchQuery.length > 0 ? (
                        <Text style={styles.emptyText}>Không tìm thấy người dùng nào</Text>
                    ) : (
                        <Text style={styles.emptyText}>Nhập tên bạn bè để tìm kiếm</Text>
                    )}
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: DARK_BG,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: DARK_HEADER,
        borderBottomWidth: 1,
        borderBottomColor: DARK_CARD,
    },
    backButton: {
        marginRight: 16,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: DARK_TEXT,
    },
    searchContainer: {
        padding: 16,
        backgroundColor: DARK_BG,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: DARK_CARD,
        borderRadius: 8,
        paddingHorizontal: 12,
        height: 44,
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        fontSize: 16,
        color: DARK_TEXT,
    },
    listContent: {
        paddingHorizontal: 16,
    },
    userItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: DARK_CARD,
    },
    avatarContainer: {
        marginRight: 12,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontSize: 16,
        color: DARK_TEXT,
        fontWeight: '500',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 40,
    },
    emptyText: {
        color: DARK_TEXT_SECONDARY,
        fontSize: 14,
    },
});

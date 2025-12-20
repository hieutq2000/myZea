import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    FlatList,
    Image,
    StatusBar,
    Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { searchUsers } from '../utils/api';
import { getAvatarUri } from '../utils/media';

const HISTORY_KEY = 'place_search_history';

interface PlaceSearchScreenProps {
    onBack: () => void;
    onSelectResult: (item: any) => void;
}

export default function PlaceSearchScreen({ onBack, onSelectResult }: PlaceSearchScreenProps) {
    const [query, setQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [recentHistory, setRecentHistory] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    useEffect(() => {
        loadHistory();
    }, []);

    const loadHistory = async () => {
        try {
            const json = await AsyncStorage.getItem(HISTORY_KEY);
            if (json) {
                setRecentHistory(JSON.parse(json));
            }
        } catch (error) {
            console.error('Failed to load search history', error);
        }
    };

    const saveHistoryToStorage = async (newHistory: any[]) => {
        try {
            await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
        } catch (error) {
            console.error('Failed to save search history', error);
        }
    };

    // Xử lý tìm kiếm
    const handleSearch = async (text: string) => {
        setQuery(text);
        if (text.length > 0) {
            setIsSearching(true);
            try {
                // Call API Search Users
                const users = await searchUsers(text);
                // Add type 'USER' to results
                const results = users.map(u => ({ ...u, type: 'USER' }));
                setSearchResults(results);
            } catch (error) {
                console.error(error);
            }
        } else {
            setSearchResults([]);
            setIsSearching(false);
        }
    };

    const removeItem = (id: string) => {
        const newHistory = recentHistory.filter(item => item.id !== id);
        setRecentHistory(newHistory);
        saveHistoryToStorage(newHistory);
    };

    const handleSelect = (item: any) => {
        // Add to history (remove duplicates based on ID or Name)
        const newHistory = [
            item,
            ...recentHistory.filter(h => h.id !== item.id && h.name !== item.name)
        ].slice(0, 20); // Limit to 20 items

        setRecentHistory(newHistory);
        saveHistoryToStorage(newHistory);

        onSelectResult(item);
    };

    const renderItem = ({ item }: { item: any }) => {
        // Render kết quả search hoặc lịch sử
        // Nếu là search result thật thì item.type='USER' do logic trên
        // Nếu là mock history thì có thể là USER hoặc KEYWORD

        return (
            <TouchableOpacity
                style={styles.itemContainer}
                onPress={() => handleSelect(item)}
            >
                {/* Icon/Avatar */}
                <View style={styles.iconContainer}>
                    {item.type === 'USER' ? (
                        <Image source={{ uri: getAvatarUri(item.avatar, item.name) }} style={styles.avatar} />
                    ) : (
                        // History keyword icon (clean without background circle as per image, just icon)
                        // Actually image shows simple clock icon
                        <Ionicons name="time-outline" size={24} color="#65676B" style={{ marginLeft: 8 }} />
                    )}
                </View>

                {/* Text */}
                <View style={styles.textContainer}>
                    <Text style={styles.itemText} numberOfLines={1}>
                        {item.name || item.text}
                    </Text>
                    {item.type === 'USER' && isSearching && (
                        <Text style={styles.subText}>Người dùng</Text>
                    )}
                </View>

                {/* Delete Button (Only for history view) */}
                {!isSearching && (
                    <TouchableOpacity onPress={() => removeItem(item.id)} style={styles.removeBtn}>
                        <Ionicons name="close" size={20} color="#65676B" />
                    </TouchableOpacity>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={28} color="#000" />
                </TouchableOpacity>
                <View style={styles.searchBar}>
                    <TextInput
                        style={styles.input}
                        placeholder="Tìm kiếm"
                        placeholderTextColor="#65676B"
                        value={query}
                        onChangeText={handleSearch}
                        autoFocus
                    />
                </View>
            </View>

            {/* Content */}
            <View style={styles.content}>
                {!isSearching && recentHistory.length > 0 && (
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Mới đây</Text>
                        <TouchableOpacity>
                            <Text style={styles.seeAllText}>Xem tất cả</Text>
                        </TouchableOpacity>
                    </View>
                )}

                <FlatList
                    data={isSearching ? searchResults : recentHistory}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={{ paddingBottom: 20 }}
                />
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f2f5',
    },
    backButton: {
        marginRight: 10,
    },
    searchBar: {
        flex: 1,
        backgroundColor: '#F0F2F5',
        borderRadius: 20,
        height: 40,
        justifyContent: 'center',
        paddingHorizontal: 16,
    },
    input: {
        fontSize: 16,
        color: '#050505',
    },
    content: {
        flex: 1,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#050505',
    },
    seeAllText: {
        fontSize: 14,
        color: '#1877F2',
    },
    itemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    iconContainer: {
        width: 40,
        marginRight: 12,
        alignItems: 'center',
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    textContainer: {
        flex: 1,
    },
    itemText: {
        fontSize: 16,
        color: '#050505',
        fontWeight: '500',
    },
    subText: {
        fontSize: 13,
        color: '#65676B',
    },
    removeBtn: {
        padding: 4,
    },
});

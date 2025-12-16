import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    Dimensions,
    TextInput,
    ActivityIndicator
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { API_URL } from '../utils/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const STICKER_SIZE = (SCREEN_WIDTH - 24) / 5; // 5 columns
const PACK_ICON_SIZE = 30;

// Sticker Interfaces
interface Sticker {
    id: string;
    image_url: string;
    file_format?: string;
    width?: number;
    height?: number;
}

interface StickerPack {
    id: string;
    name: string;
    title: string;
    icon_url?: string;
    stickers: Sticker[];
    sticker_count?: number;
}

interface StickerPickerProps {
    onSelectSticker: (packId: string, stickerIndex: number, sticker: Sticker) => void;
    onTabChange?: (tab: 'sticker' | 'emoji') => void;
}

// Helper to get full sticker URL
const getStickerUrl = (url: string): string => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
    }
    return `${API_URL}${url.startsWith('/') ? '' : '/'}${url}`;
};

export default function StickerPicker({ onSelectSticker, onTabChange }: StickerPickerProps) {
    const [stickerPacks, setStickerPacks] = useState<StickerPack[]>([]);
    const [selectedPackId, setSelectedPackId] = useState<string | null>(null); // null means 'recent'
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchText, setSearchText] = useState('');

    useEffect(() => {
        loadStickerPacks();
    }, []);

    const loadStickerPacks = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_URL}/api/app/sticker-packs`);
            if (!response.ok) throw new Error('Failed to load');
            const data = await response.json();
            const packs = (data.packs || []).filter((p: any) => p?.stickers?.length > 0);
            setStickerPacks(packs);
            if (packs.length > 0) setSelectedPackId(packs[0].id);
        } catch (err) {
            console.error('Error loading stickers:', err);
            setError('Không thể tải sticker');
        } finally {
            setLoading(false);
        }
    };

    const handleStickerSelect = (packId: string, stickerIndex: number, sticker: Sticker) => {
        if (onSelectSticker) onSelectSticker(packId, stickerIndex, sticker);
    };

    // Derived state for display
    const currentPack = stickerPacks.find(p => p.id === selectedPackId) || stickerPacks[0];
    const displayedStickers = currentPack?.stickers || [];

    // Quick reactions (mock) - visible under search bar
    const quickReactions = ['❤️', '👍', '👎', '😂', '😮', '😢', '😡'];

    if (loading) {
        return (
            <View style={[styles.container, styles.centerContent]}>
                <ActivityIndicator size="small" color="#0068FF" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* 1. Top Pack Icons List */}
            <View style={styles.topPackListContainer}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.topPackListContent}
                >
                    {/* Recent Icon (Mock) */}
                    <TouchableOpacity
                        style={[styles.topPackItem, selectedPackId === null && styles.topPackItemActive]}
                        onPress={() => setSelectedPackId(null)}
                    >
                        <Ionicons name="time-outline" size={24} color={selectedPackId === null ? '#0068FF' : '#9CA3AF'} />
                    </TouchableOpacity>

                    {stickerPacks.map(pack => (
                        <TouchableOpacity
                            key={pack.id}
                            style={[styles.topPackItem, selectedPackId === pack.id && styles.topPackItemActive]}
                            onPress={() => setSelectedPackId(pack.id)}
                        >
                            {pack.icon_url ? (
                                <Image source={{ uri: getStickerUrl(pack.icon_url) }} style={styles.topPackIcon} contentFit="contain" />
                            ) : (
                                <View style={styles.placeholderIcon}>
                                    <Text style={styles.placeholderIconText}>{pack.title?.[0]}</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* Right Settings Icon */}
                <TouchableOpacity style={styles.settingsButton}>
                    <Ionicons name="settings-outline" size={20} color="#666" />
                </TouchableOpacity>
            </View>

            {/* 2. Search & Quick Actions */}
            <View style={styles.searchRow}>
                <View style={styles.searchBar}>
                    <Ionicons name="search" size={18} color="#9CA3AF" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Tìm kiếm"
                        placeholderTextColor="#9CA3AF"
                        value={searchText}
                        onChangeText={setSearchText}
                    />
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickReactions}>
                    <TouchableOpacity style={styles.quickReactionItem}>
                        <Ionicons name="heart-outline" size={20} color="#666" />
                    </TouchableOpacity>
                    {quickReactions.map((emoji, idx) => (
                        <TouchableOpacity key={idx} style={styles.quickReactionItem}>
                            <Text style={{ fontSize: 18 }}>{emoji}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* 3. Main Content (Grid) */}
            <View style={styles.gridContainer}>
                {selectedPackId === null ? (
                    <View style={styles.centerContent}><Text style={styles.emptyText}>Chưa có sticker gần đây</Text></View>
                ) : (
                    <>
                        <Text style={styles.sectionHeader}>{currentPack?.title || 'Stickers'}</Text>
                        <ScrollView
                            contentContainerStyle={styles.stickerGridContent}
                            showsVerticalScrollIndicator={false}
                        >
                            <View style={styles.stickerFlex}>
                                {displayedStickers.map((sticker, index) => (
                                    <TouchableOpacity
                                        key={sticker.id || index}
                                        style={styles.stickerItem}
                                        onPress={() => handleStickerSelect(currentPack!.id, index, sticker)}
                                    >
                                        <Image
                                            source={{ uri: getStickerUrl(sticker.image_url) }}
                                            style={styles.stickerImg}
                                            contentFit="contain"
                                        />
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </ScrollView>
                    </>
                )}
            </View>

            {/* 4. Bottom Tab Bar - REMOVED (Controlled by Parent) */}
            {/* <View style={styles.bottomTabBar}> ... </View> */}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    centerContent: {
        justifyContent: 'center',
        alignItems: 'center',
        flex: 1,
    },
    // Top Pack List
    topPackListContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
        paddingVertical: 8,
    },
    topPackListContent: {
        paddingHorizontal: 10,
        alignItems: 'center',
    },
    topPackItem: {
        marginHorizontal: 8,
        opacity: 0.5,
    },
    topPackItemActive: {
        opacity: 1,
    },
    topPackIcon: {
        width: PACK_ICON_SIZE,
        height: PACK_ICON_SIZE,
    },
    placeholderIcon: {
        width: PACK_ICON_SIZE,
        height: PACK_ICON_SIZE,
        backgroundColor: '#E5E7EB',
        borderRadius: 4,
        alignItems: 'center',
        justifyContent: 'center',
    },
    placeholderIconText: { fontSize: 12, fontWeight: 'bold' },
    settingsButton: {
        paddingHorizontal: 12,
        borderLeftWidth: 1,
        borderLeftColor: '#F3F4F6',
    },

    // Search Row
    searchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 10,
        gap: 10,
    },
    searchBar: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        borderRadius: 20, // Pill shape
        paddingHorizontal: 10,
        height: 36,
    },
    searchInput: {
        flex: 1,
        marginLeft: 6,
        fontSize: 14,
        color: '#333',
        padding: 0,
    },
    quickReactions: {
        flexGrow: 0,
        maxWidth: SCREEN_WIDTH * 0.4,
    },
    quickReactionItem: {
        paddingHorizontal: 6,
    },

    // Grid content
    gridContainer: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    sectionHeader: {
        fontSize: 12,
        color: '#9CA3AF',
        marginLeft: 16,
        marginTop: 10,
        marginBottom: 5,
        textTransform: 'uppercase',
    },
    stickerGridContent: {
        paddingHorizontal: 12,
        paddingBottom: 20,
    },
    stickerFlex: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    stickerItem: {
        width: STICKER_SIZE,
        height: STICKER_SIZE,
        margin: 2,
        padding: 5,
    },
    stickerImg: {
        width: '100%',
        height: '100%',
    },
    emptyText: { color: '#999', fontSize: 14 },

    // Bottom Tabs
    bottomTabBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
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
});

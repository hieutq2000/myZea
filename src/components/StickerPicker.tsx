import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    Dimensions,
    Image,
    ActivityIndicator
} from 'react-native';
import { API_URL } from '../utils/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Sticker Pack interface
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
}

// Helper to get full sticker URL
const getStickerUrl = (url: string): string => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
    }
    // Relative URL - prepend API_URL
    return `${API_URL}${url.startsWith('/') ? '' : '/'}${url}`;
};

export default function StickerPicker({ onSelectSticker }: StickerPickerProps) {
    const [stickerPacks, setStickerPacks] = useState<StickerPack[]>([]);
    const [selectedPackIndex, setSelectedPackIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadStickerPacks();
    }, []);

    const loadStickerPacks = async () => {
        try {
            setLoading(true);
            setError(null);

            // Call API to get sticker packs
            const response = await fetch(`${API_URL}/api/app/sticker-packs`);

            if (!response.ok) {
                throw new Error('Không thể tải sticker');
            }

            const data = await response.json();
            const packs = data.packs || [];

            // Filter out empty packs
            const availablePacks = packs.filter((pack: StickerPack) =>
                pack && pack.stickers && Array.isArray(pack.stickers) && pack.stickers.length > 0
            );

            setStickerPacks(availablePacks);

            if (availablePacks.length > 0) {
                setSelectedPackIndex(0);
            }
        } catch (err: any) {
            console.error('Error loading sticker packs:', err);
            setError('Không thể tải sticker packs');
        } finally {
            setLoading(false);
        }
    };

    const handleStickerSelect = (packId: string, stickerIndex: number, sticker: Sticker) => {
        if (onSelectSticker) {
            onSelectSticker(packId, stickerIndex, sticker);
        }
    };

    if (loading) {
        return (
            <View style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#0068FF" />
                    <Text style={styles.loadingText}>Đang tải sticker...</Text>
                </View>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.container}>
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>{error}</Text>
                    <TouchableOpacity style={styles.retryButton} onPress={loadStickerPacks}>
                        <Text style={styles.retryText}>Thử lại</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    if (stickerPacks.length === 0) {
        return (
            <View style={styles.container}>
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>Chưa có sticker pack nào</Text>
                </View>
            </View>
        );
    }

    const currentPack = stickerPacks[selectedPackIndex];
    const stickers = currentPack?.stickers || [];

    return (
        <View style={styles.container}>
            {/* Pack Tabs */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.packTabs}
                contentContainerStyle={styles.packTabsContent}
            >
                {stickerPacks.map((pack, index) => (
                    <TouchableOpacity
                        key={pack.id}
                        style={[
                            styles.packTab,
                            index === selectedPackIndex && styles.packTabActive,
                        ]}
                        onPress={() => setSelectedPackIndex(index)}
                    >
                        {pack.icon_url ? (
                            <Image
                                source={{ uri: getStickerUrl(pack.icon_url) }}
                                style={styles.packIcon}
                                resizeMode="contain"
                            />
                        ) : (
                            <Text style={styles.packTabText} numberOfLines={1}>
                                {pack.title || pack.name || `Pack ${index + 1}`}
                            </Text>
                        )}
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Sticker Grid */}
            <ScrollView
                style={styles.stickerGrid}
                contentContainerStyle={styles.stickerGridContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.stickerRow}>
                    {stickers.map((sticker, index) => {
                        const stickerUrl = getStickerUrl(sticker.image_url);

                        return (
                            <TouchableOpacity
                                key={sticker.id || index}
                                style={styles.stickerButton}
                                onPress={() => handleStickerSelect(currentPack.id, index, sticker)}
                                activeOpacity={0.7}
                            >
                                <Image
                                    source={{ uri: stickerUrl }}
                                    style={styles.stickerImage}
                                    resizeMode="contain"
                                    onError={(e) => {
                                        console.warn('Failed to load sticker:', stickerUrl);
                                    }}
                                />
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </ScrollView>
        </View>
    );
}

const STICKER_SIZE = (SCREEN_WIDTH - 40) / 4; // 4 columns with padding
const PACK_TAB_SIZE = 48;

const styles = StyleSheet.create({
    container: {
        height: 280,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
        gap: 8,
    },
    loadingText: {
        color: '#666',
        fontSize: 14,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: {
        color: '#999',
        fontSize: 14,
    },
    retryButton: {
        marginTop: 12,
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: '#0068FF',
        borderRadius: 8,
    },
    retryText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
    packTabs: {
        maxHeight: 56,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    packTabsContent: {
        paddingHorizontal: 8,
        alignItems: 'center',
        paddingVertical: 4,
    },
    packTab: {
        minWidth: PACK_TAB_SIZE,
        height: PACK_TAB_SIZE,
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 4,
        borderRadius: 8,
        paddingHorizontal: 8,
        backgroundColor: '#F3F4F6',
    },
    packTabActive: {
        backgroundColor: '#E0F2FE',
        borderWidth: 2,
        borderColor: '#0068FF',
    },
    packIcon: {
        width: 32,
        height: 32,
    },
    packTabText: {
        fontSize: 12,
        color: '#374151',
        fontWeight: '500',
    },
    stickerGrid: {
        flex: 1,
        paddingHorizontal: 8,
        paddingTop: 8,
    },
    stickerGridContent: {
        paddingBottom: 20,
    },
    stickerRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-start',
    },
    stickerButton: {
        width: STICKER_SIZE,
        height: STICKER_SIZE,
        padding: 4,
        justifyContent: 'center',
        alignItems: 'center',
    },
    stickerImage: {
        width: '100%',
        height: '100%',
        borderRadius: 4,
    },
});

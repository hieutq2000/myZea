
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    Image,
    TextInput,
    ActivityIndicator,
    Alert,
    ScrollView,
    Modal,
    Platform,
    SafeAreaView,
    StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { launchImageLibrary } from '../utils/imagePicker';
import { API_URL, getToken } from '../utils/api';

const ZALO_BLUE = '#0068FF';

interface StickerPack {
    id: string;
    name: string;
    title: string;
    icon_url: string;
    is_active: boolean | number;
    sticker_count: number;
}

interface Sticker {
    id: string;
    image_url: string;
    sort_order: number;
}

export default function AdminStickersScreen() {
    const navigation = useNavigation();
    const [packs, setPacks] = useState<StickerPack[]>([]);
    const [selectedPack, setSelectedPack] = useState<StickerPack | null>(null);
    const [stickers, setStickers] = useState<Sticker[]>([]);
    const [loading, setLoading] = useState(false);

    // Modal states
    const [showPackModal, setShowPackModal] = useState(false);
    const [packForm, setPackForm] = useState({ name: '', title: '', description: '', icon_url: '' });

    useEffect(() => {
        loadPacks();
    }, []);

    useEffect(() => {
        if (selectedPack) {
            loadStickers(selectedPack.id);
        } else {
            setStickers([]);
        }
    }, [selectedPack]);

    const getFullUrl = (url: string) => {
        if (!url) return null;
        if (url.startsWith('http')) return url;
        return `${API_URL}${url.startsWith('/') ? '' : '/'}${url}`;
    };

    const loadPacks = async () => {
        setLoading(true);
        try {
            const token = await getToken();
            const response = await fetch(`${API_URL}/api/admin/sticker-packs`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                setPacks(data.packs || []);
            } else {
                Alert.alert('Lỗi', data.error || 'Không tải được packs');
            }
        } catch (error) {
            console.error(error);
            Alert.alert('Lỗi', 'Không thể kết nối server');
        } finally {
            setLoading(false);
        }
    };

    const loadStickers = async (packId: string) => {
        setLoading(true);
        try {
            const token = await getToken();
            const response = await fetch(`${API_URL}/api/admin/sticker-packs/${packId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                setStickers(data.stickers || []);
            } else {
                Alert.alert('Lỗi', data.error || 'Không tải được stickers');
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreatePack = async () => {
        if (!packForm.name || !packForm.title) {
            Alert.alert('Thiếu thông tin', 'Vui lòng nhập ID và tên hiển thị');
            return;
        }

        try {
            const token = await getToken();
            const response = await fetch(`${API_URL}/api/admin/sticker-packs`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(packForm)
            });
            const data = await response.json();
            if (response.ok) {
                Alert.alert('Thành công', 'Đã tạo pack mới');
                setShowPackModal(false);
                setPackForm({ name: '', title: '', description: '', icon_url: '' });
                loadPacks();
            } else {
                Alert.alert('Lỗi', data.error || 'Không tạo được pack');
            }
        } catch (error) {
            Alert.alert('Lỗi', 'Server error');
        }
    };

    const handleDeletePack = async (packId: string) => {
        Alert.alert('Xác nhận', 'Bạn có chắc muốn xóa pack này và toàn bộ sticker trong đó?', [
            { text: 'Hủy', style: 'cancel' },
            {
                text: 'Xóa', style: 'destructive', onPress: async () => {
                    try {
                        const token = await getToken();
                        await fetch(`${API_URL}/api/admin/sticker-packs/${packId}`, {
                            method: 'DELETE',
                            headers: { Authorization: `Bearer ${token}` }
                        });
                        if (selectedPack?.id === packId) setSelectedPack(null);
                        loadPacks();
                    } catch (e) {
                        Alert.alert('Lỗi', 'Không xóa được');
                    }
                }
            }
        ]);
    };

    const handleAddSticker = async () => {
        if (!selectedPack) return;

        const result = await launchImageLibrary({ mediaType: 'photo', quality: 1 });
        if (result.didCancel || !result.assets || !result.assets[0]) return;

        const imageUri = result.assets[0].uri;

        try {
            setLoading(true);
            const token = await getToken();

            // 1. Upload file
            const formData = new FormData();
            const filename = imageUri.split('/').pop() || 'sticker.webp';
            formData.append('sticker', {
                uri: imageUri,
                name: filename,
                type: 'image/webp' // Or detect based on file
            } as any);

            const uploadRes = await fetch(`${API_URL}/api/upload/sticker`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }, // Form data automatically sets content-type multipart
                body: formData
            });

            const uploadData = await uploadRes.json();

            if (!uploadRes.ok || !uploadData.success) {
                throw new Error(uploadData.error || 'Upload failed');
            }

            // 2. Add to pack
            const addRes = await fetch(`${API_URL}/api/admin/sticker-packs/${selectedPack.id}/stickers`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    image_url: uploadData.url,
                    file_format: uploadData.fileFormat,
                    file_size: uploadData.size
                })
            });

            if (addRes.ok) {
                loadStickers(selectedPack.id);
            } else {
                Alert.alert('Lỗi', 'Không thêm được sticker vào pack');
            }

        } catch (error: any) {
            Alert.alert('Lỗi', error.message || 'Upload thất bại');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteSticker = async (stickerId: string) => {
        try {
            const token = await getToken();
            await fetch(`${API_URL}/api/admin/stickers/${stickerId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            if (selectedPack) loadStickers(selectedPack.id);
        } catch (e) {
            Alert.alert('Lỗi', 'Không xóa được sticker');
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Quản lý Sticker</Text>
                <TouchableOpacity onPress={() => setShowPackModal(true)} style={styles.addButton}>
                    <Ionicons name="add" size={24} color={ZALO_BLUE} />
                </TouchableOpacity>
            </View>

            <View style={styles.content}>
                {/* Left Side: Pack List (Horizontal or Vertical List) */}
                <View style={styles.packListContainer}>
                    <Text style={styles.sectionTitle}>Danh sách Pack</Text>
                    <FlatList
                        data={packs}
                        keyExtractor={item => item.id}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={{ flexGrow: 0 }}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={[styles.packItem, selectedPack?.id === item.id && styles.packItemActive]}
                                onPress={() => setSelectedPack(item)}
                                onLongPress={() => handleDeletePack(item.id)}
                            >
                                {item.icon_url ? (
                                    <Image source={{ uri: getFullUrl(item.icon_url) || '' }} style={styles.packIcon} />
                                ) : (
                                    <View style={styles.packIconPlaceholder}>
                                        <Text style={styles.packIconText}>{item.name.substring(0, 2)}</Text>
                                    </View>
                                )}
                                <Text style={styles.packName} numberOfLines={1}>{item.title}</Text>
                                <Text style={styles.packCount}>{item.sticker_count}</Text>
                            </TouchableOpacity>
                        )}
                    />
                </View>

                {/* Right/Main Side: Stickers Grid */}
                <View style={styles.stickersContainer}>
                    <View style={styles.stickersHeader}>
                        <Text style={styles.sectionTitle}>
                            {selectedPack ? `Stickers: ${selectedPack.title}` : 'Chọn một pack để xem'}
                        </Text>
                        {selectedPack && (
                            <TouchableOpacity onPress={handleAddSticker} style={styles.addStickerButton}>
                                <Text style={styles.addStickerText}>+ Thêm Sticker</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {loading ? (
                        <ActivityIndicator size="large" color={ZALO_BLUE} style={{ marginTop: 20 }} />
                    ) : (
                        <FlatList
                            data={stickers}
                            keyExtractor={item => item.id}
                            numColumns={4}
                            contentContainerStyle={styles.stickersGrid}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.stickerItem}
                                    onLongPress={() => handleDeleteSticker(item.id)}
                                >
                                    <Image
                                        source={{ uri: getFullUrl(item.image_url) || '' }}
                                        style={styles.stickerImage}
                                        resizeMode="contain"
                                    />
                                </TouchableOpacity>
                            )}
                            ListEmptyComponent={
                                <Text style={styles.emptyText}>Chưa có sticker nào</Text>
                            }
                        />
                    )}
                </View>
            </View>

            {/* Create Pack Modal */}
            <Modal visible={showPackModal} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Tạo Sticker Pack Mới</Text>

                        <TextInput
                            style={styles.input}
                            placeholder="Mã Pack (VD: zalo_cat)"
                            value={packForm.name}
                            onChangeText={t => setPackForm({ ...packForm, name: t })}
                            autoCapitalize="none"
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Tên hiển thị (VD: Mèo Zalo)"
                            value={packForm.title}
                            onChangeText={t => setPackForm({ ...packForm, title: t })}
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Mô tả"
                            value={packForm.description}
                            onChangeText={t => setPackForm({ ...packForm, description: t })}
                        />

                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={styles.cancelButton} onPress={() => setShowPackModal(false)}>
                                <Text style={styles.cancelButtonText}>Hủy</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.confirmButton} onPress={handleCreatePack}>
                                <Text style={styles.confirmButtonText}>Tạo</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F7FA',
        paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    backButton: {
        padding: 4,
    },
    addButton: {
        padding: 4,
    },
    content: {
        flex: 1,
        padding: 16,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 10,
        color: '#374151',
    },
    packListContainer: {
        marginBottom: 20,
    },
    packItem: {
        width: 80,
        marginRight: 10,
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 8,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    packItemActive: {
        borderColor: ZALO_BLUE,
        backgroundColor: '#EBF4FF',
    },
    packIcon: {
        width: 48,
        height: 48,
        borderRadius: 8,
        marginBottom: 4,
    },
    packIconPlaceholder: {
        width: 48,
        height: 48,
        borderRadius: 8,
        backgroundColor: '#E5E7EB',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 4,
    },
    packIconText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#6B7280',
    },
    packName: {
        fontSize: 12,
        fontWeight: '500',
        color: '#374151',
    },
    packCount: {
        fontSize: 10,
        color: '#9CA3AF',
    },
    stickersContainer: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 12,
    },
    stickersHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    addStickerButton: {
        backgroundColor: ZALO_BLUE,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 4,
    },
    addStickerText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    stickersGrid: {
        paddingBottom: 20,
    },
    stickerItem: {
        flex: 1,
        aspectRatio: 1,
        margin: 4,
        backgroundColor: '#F9FAFB',
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    stickerImage: {
        width: '80%',
        height: '80%',
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 40,
        color: '#9CA3AF',
    },
    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '80%',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 20,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    input: {
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
        fontSize: 16,
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
    },
    cancelButton: {
        flex: 1,
        padding: 12,
        marginRight: 8,
        backgroundColor: '#F3F4F6',
        borderRadius: 8,
        alignItems: 'center',
    },
    cancelButtonText: {
        color: '#374151',
        fontWeight: '600',
    },
    confirmButton: {
        flex: 1,
        padding: 12,
        marginLeft: 8,
        backgroundColor: ZALO_BLUE,
        borderRadius: 8,
        alignItems: 'center',
    },
    confirmButtonText: {
        color: '#fff',
        fontWeight: '600',
    },
});

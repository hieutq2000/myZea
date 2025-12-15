/**
 * WalletsScreen - Màn hình quản lý ví
 * 
 * Features:
 * - Xem danh sách các ví
 * - Thêm ví mới
 * - Sửa/Xóa ví
 */

import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
    Platform,
    ScrollView,
    Alert,
    Modal,
    TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Wallet } from '../../types/finance';
import { getWallets, addWallet, updateWallet, deleteWallet, calculateWalletBalance } from '../../utils/finance/storage';

// Format số tiền
const formatMoney = (amount: number): string => {
    return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
};

// Màu sắc cho các ví
const WALLET_COLORS = [
    ['#6366F1', '#8B5CF6'],
    ['#10B981', '#059669'],
    ['#F59E0B', '#D97706'],
    ['#EF4444', '#DC2626'],
    ['#EC4899', '#DB2777'],
    ['#3B82F6', '#2563EB'],
];

export default function WalletsScreen() {
    const navigation = useNavigation();

    // State
    const [wallets, setWallets] = useState<Wallet[]>([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newWalletName, setNewWalletName] = useState('');
    const [newWalletBalance, setNewWalletBalance] = useState('');
    const [selectedColorIndex, setSelectedColorIndex] = useState(0);

    // Load wallets
    useFocusEffect(
        useCallback(() => {
            loadWallets();
        }, [])
    );

    const loadWallets = async () => {
        const data = await getWallets();
        // Tính lại số dư cho mỗi ví
        const walletsWithBalance = await Promise.all(
            data.map(async (w) => ({
                ...w,
                balance: await calculateWalletBalance(w.id),
            }))
        );
        setWallets(walletsWithBalance);
    };

    // Thêm ví mới
    const handleAddWallet = async () => {
        if (!newWalletName.trim()) {
            Alert.alert('Lỗi', 'Vui lòng nhập tên ví');
            return;
        }

        if (wallets.length >= 5) {
            Alert.alert('Lỗi', 'Bạn chỉ có thể tạo tối đa 5 ví');
            return;
        }

        try {
            await addWallet({
                name: newWalletName.trim(),
                balance: parseFloat(newWalletBalance.replace(/[^0-9]/g, '')) || 0,
                color: WALLET_COLORS[selectedColorIndex][0],
                icon: 'wallet',
                isDefault: wallets.length === 0,
            });


            setShowAddModal(false);
            setNewWalletName('');
            setNewWalletBalance('');
            setSelectedColorIndex(0);
            loadWallets();
        } catch (error) {
            Alert.alert('Lỗi', 'Không thể tạo ví mới');
        }
    };

    // Xóa ví
    const handleDeleteWallet = (wallet: Wallet) => {
        if (wallets.length <= 1) {
            Alert.alert('Lỗi', 'Bạn cần có ít nhất 1 ví');
            return;
        }

        Alert.alert(
            'Xác nhận xóa',
            `Bạn có chắc muốn xóa ví "${wallet.name}"?\n\nLưu ý: Các giao dịch trong ví này sẽ không bị xóa.`,
            [
                { text: 'Hủy', style: 'cancel' },
                {
                    text: 'Xóa',
                    style: 'destructive',
                    onPress: async () => {
                        await deleteWallet(wallet.id);
                        loadWallets();
                    },
                },
            ]
        );
    };

    // Tính tổng số dư
    const totalBalance = wallets.reduce((sum, w) => sum + w.balance, 0);

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />

            {/* Header */}
            <LinearGradient
                colors={['#6366F1', '#8B5CF6']}
                style={styles.header}
            >
                <SafeAreaView>
                    <View style={styles.headerContent}>
                        <TouchableOpacity onPress={() => navigation.goBack()}>
                            <Ionicons name="arrow-back" size={24} color="#FFF" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Quản lý ví</Text>
                        <TouchableOpacity onPress={() => setShowAddModal(true)}>
                            <Ionicons name="add-circle" size={28} color="#FFF" />
                        </TouchableOpacity>
                    </View>

                    {/* Total Balance */}
                    <View style={styles.totalSection}>
                        <Text style={styles.totalLabel}>Tổng tất cả các ví</Text>
                        <Text style={styles.totalBalance}>{formatMoney(totalBalance)}</Text>
                    </View>
                </SafeAreaView>
            </LinearGradient>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Wallets List */}
                {wallets.map((wallet, index) => (
                    <TouchableOpacity
                        key={wallet.id}
                        style={styles.walletCard}
                        onLongPress={() => handleDeleteWallet(wallet)}
                    >
                        <LinearGradient
                            colors={WALLET_COLORS[index % WALLET_COLORS.length] as any}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.walletGradient}
                        >
                            <View style={styles.walletHeader}>
                                <View style={styles.walletIcon}>
                                    <Ionicons name="wallet" size={24} color="#FFF" />
                                </View>
                                <TouchableOpacity onPress={() => handleDeleteWallet(wallet)}>
                                    <Ionicons name="ellipsis-horizontal" size={20} color="rgba(255,255,255,0.7)" />
                                </TouchableOpacity>
                            </View>

                            <Text style={styles.walletName}>{wallet.name}</Text>
                            <Text style={styles.walletBalance}>{formatMoney(wallet.balance)}</Text>

                            <View style={styles.walletFooter}>
                                <Text style={styles.walletDate}>
                                    Tạo ngày: {new Date(wallet.createdAt).toLocaleDateString('vi-VN')}
                                </Text>
                            </View>
                        </LinearGradient>
                    </TouchableOpacity>
                ))}

                {/* Empty State */}
                {wallets.length === 0 && (
                    <View style={styles.emptyState}>
                        <Ionicons name="wallet-outline" size={64} color="#6B7280" />
                        <Text style={styles.emptyText}>Chưa có ví nào</Text>
                        <TouchableOpacity
                            style={styles.addButton}
                            onPress={() => setShowAddModal(true)}
                        >
                            <Ionicons name="add" size={24} color="#FFF" />
                            <Text style={styles.addButtonText}>Tạo ví mới</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Add New Wallet Card */}
                {wallets.length > 0 && wallets.length < 5 && (
                    <TouchableOpacity
                        style={styles.addWalletCard}
                        onPress={() => setShowAddModal(true)}
                    >
                        <Ionicons name="add-circle-outline" size={40} color="#6B7280" />
                        <Text style={styles.addWalletText}>Thêm ví mới</Text>
                        <Text style={styles.addWalletHint}>{wallets.length}/5 ví</Text>
                    </TouchableOpacity>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>

            {/* Add Wallet Modal */}
            <Modal
                visible={showAddModal}
                animationType="slide"
                transparent
                onRequestClose={() => setShowAddModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Tạo ví mới</Text>
                            <TouchableOpacity onPress={() => setShowAddModal(false)}>
                                <Ionicons name="close" size={24} color="#FFF" />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.inputLabel}>Tên ví</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Ví dụ: Ví tiết kiệm"
                            placeholderTextColor="#6B7280"
                            value={newWalletName}
                            onChangeText={setNewWalletName}
                        />

                        <Text style={styles.inputLabel}>Số dư ban đầu</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="0"
                            placeholderTextColor="#6B7280"
                            keyboardType="numeric"
                            value={newWalletBalance}
                            onChangeText={setNewWalletBalance}
                        />

                        <Text style={styles.inputLabel}>Màu sắc</Text>
                        <View style={styles.colorPicker}>
                            {WALLET_COLORS.map((colors, index) => (
                                <TouchableOpacity
                                    key={index}
                                    onPress={() => setSelectedColorIndex(index)}
                                >
                                    <LinearGradient
                                        colors={colors as any}
                                        style={[
                                            styles.colorOption,
                                            selectedColorIndex === index && styles.colorOptionSelected,
                                        ]}
                                    />
                                </TouchableOpacity>
                            ))}
                        </View>

                        <TouchableOpacity
                            style={styles.createButton}
                            onPress={handleAddWallet}
                        >
                            <Text style={styles.createButtonText}>Tạo ví</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0F0F23',
    },
    header: {
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
        paddingBottom: 24,
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFF',
    },
    totalSection: {
        alignItems: 'center',
        paddingTop: 16,
    },
    totalLabel: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 14,
        marginBottom: 8,
    },
    totalBalance: {
        color: '#FFF',
        fontSize: 32,
        fontWeight: 'bold',
    },
    content: {
        flex: 1,
        padding: 16,
    },
    // Wallet Card
    walletCard: {
        marginBottom: 16,
        borderRadius: 20,
        overflow: 'hidden',
    },
    walletGradient: {
        padding: 20,
    },
    walletHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    walletIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    walletName: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 14,
        marginBottom: 4,
    },
    walletBalance: {
        color: '#FFF',
        fontSize: 28,
        fontWeight: 'bold',
    },
    walletFooter: {
        marginTop: 16,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.2)',
    },
    walletDate: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 12,
    },
    // Empty State
    emptyState: {
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        color: '#6B7280',
        fontSize: 16,
        marginTop: 16,
        marginBottom: 24,
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#6366F1',
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 12,
        gap: 8,
    },
    addButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
    },
    // Add Wallet Card
    addWalletCard: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#1A1A2E',
        borderRadius: 20,
        padding: 32,
        borderWidth: 2,
        borderColor: '#2D2D4A',
        borderStyle: 'dashed',
    },
    addWalletText: {
        color: '#6B7280',
        fontSize: 16,
        marginTop: 12,
    },
    addWalletHint: {
        color: '#4B5563',
        fontSize: 12,
        marginTop: 4,
    },
    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#1A1A2E',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingBottom: 40,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    modalTitle: {
        color: '#FFF',
        fontSize: 20,
        fontWeight: 'bold',
    },
    inputLabel: {
        color: '#9CA3AF',
        fontSize: 14,
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#0F0F23',
        borderRadius: 12,
        padding: 16,
        color: '#FFF',
        fontSize: 16,
        marginBottom: 16,
    },
    colorPicker: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 24,
    },
    colorOption: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    colorOptionSelected: {
        borderWidth: 3,
        borderColor: '#FFF',
    },
    createButton: {
        backgroundColor: '#6366F1',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    createButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
    },
});

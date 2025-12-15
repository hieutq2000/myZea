/**
 * AddTransactionScreen - Màn hình thêm giao dịch
 * 
 * Layout giống ảnh mẫu với:
 * - Tab Chi phí / Thu nhập
 * - Chi tiết giao dịch (tên, số tiền, ngày)
 * - Chọn ví
 * - Danh mục dạng grid
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
    Platform,
    ScrollView,
    TextInput,
    Alert,
    Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { TransactionType, Wallet } from '../../types/finance';
import { addTransaction, getWallets } from '../../utils/finance/storage';
import { getCategoriesByType, Category } from '../../utils/finance/categories';

const { width } = Dimensions.get('window');

export default function AddTransactionScreen() {
    const navigation = useNavigation();
    const route = useRoute();

    // Params
    const params = route.params as { walletId?: string; type?: TransactionType } | undefined;

    // State
    const [type, setType] = useState<TransactionType>(params?.type || 'expense');
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [wallets, setWallets] = useState<Wallet[]>([]);
    const [selectedWalletId, setSelectedWalletId] = useState<string>(params?.walletId || '');
    const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Load wallets
    useEffect(() => {
        loadWallets();
    }, []);

    const loadWallets = async () => {
        const data = await getWallets();
        setWallets(data);
        if (!selectedWalletId && data.length > 0) {
            setSelectedWalletId(data[0].id);
        }
    };

    // Get categories
    const categories = getCategoriesByType(type);

    // Format date display
    const formatDateDisplay = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    // Get selected wallet
    const selectedWallet = wallets.find(w => w.id === selectedWalletId);

    // Handle save
    const handleSave = async () => {
        const numAmount = parseFloat(amount.replace(/[^0-9.]/g, '')) || 0;

        if (numAmount <= 0) {
            Alert.alert('Lỗi', 'Vui lòng nhập số tiền hợp lệ');
            return;
        }

        if (!selectedCategory) {
            Alert.alert('Lỗi', 'Vui lòng chọn danh mục');
            return;
        }

        setIsSubmitting(true);

        try {
            await addTransaction({
                walletId: selectedWalletId || wallets[0]?.id || 'wallet_default',
                type,
                amount: numAmount,
                categoryId: selectedCategory.id,
                description: description || selectedCategory.name,
                date,
                createdBy: 'manual',
            });

            navigation.goBack();
        } catch (error) {
            console.error('Error saving transaction:', error);
            Alert.alert('Lỗi', 'Không thể lưu giao dịch');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />

            {/* Header */}
            <View style={styles.header}>
                <SafeAreaView>
                    <View style={styles.headerContent}>
                        <Text style={styles.headerTitle}>Giao dịch mới</Text>
                        <TouchableOpacity onPress={() => navigation.goBack()}>
                            <Ionicons name="close" size={24} color="#FFF" />
                        </TouchableOpacity>
                    </View>

                    {/* Type Tabs */}
                    <View style={styles.typeTabs}>
                        <TouchableOpacity
                            style={[styles.typeTab, type === 'expense' && styles.typeTabExpenseActive]}
                            onPress={() => {
                                setType('expense');
                                setSelectedCategory(null);
                            }}
                        >
                            <Ionicons name="remove-circle" size={18} color={type === 'expense' ? '#FFF' : '#9CA3AF'} />
                            <Text style={[styles.typeTabText, type === 'expense' && styles.typeTabTextActive]}>
                                Chi phí
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.typeTab, type === 'income' && styles.typeTabIncomeActive]}
                            onPress={() => {
                                setType('income');
                                setSelectedCategory(null);
                            }}
                        >
                            <Ionicons name="trending-up" size={18} color={type === 'income' ? '#FFF' : '#9CA3AF'} />
                            <Text style={[styles.typeTabText, type === 'income' && styles.typeTabTextActive]}>
                                Thu nhập
                            </Text>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Chi tiết giao dịch */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Chi tiết giao dịch</Text>

                    <View style={styles.inputGroup}>
                        <View style={styles.inputRow}>
                            <Ionicons name="text-outline" size={20} color="#6B7280" />
                            <TextInput
                                style={styles.input}
                                placeholder="Tên giao dịch"
                                placeholderTextColor="#6B7280"
                                value={description}
                                onChangeText={setDescription}
                            />
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.inputRow}>
                            <Text style={styles.currencySymbol}>$</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Số tiền"
                                placeholderTextColor="#6B7280"
                                keyboardType="numeric"
                                value={amount}
                                onChangeText={setAmount}
                            />
                        </View>

                        <View style={styles.divider} />

                        <TouchableOpacity style={styles.inputRow}>
                            <Ionicons name="calendar-outline" size={20} color="#6B7280" />
                            <Text style={styles.inputText}>{formatDateDisplay(date)}</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Chọn ví */}
                <View style={styles.section}>
                    <TouchableOpacity style={styles.walletSelector}>
                        <View style={styles.walletInfo}>
                            <Ionicons name="wallet-outline" size={20} color="#6B7280" />
                            <Text style={styles.walletName}>{selectedWallet?.name || 'Chọn ví'}</Text>
                        </View>
                        <Ionicons name="chevron-down" size={20} color="#6B7280" />
                    </TouchableOpacity>
                </View>

                {/* Danh mục */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Danh mục</Text>

                    <View style={styles.categoryGrid}>
                        {categories.map((cat) => (
                            <TouchableOpacity
                                key={cat.id}
                                style={[
                                    styles.categoryItem,
                                    selectedCategory?.id === cat.id && styles.categoryItemSelected,
                                ]}
                                onPress={() => setSelectedCategory(cat)}
                            >
                                <View style={[
                                    styles.categoryIcon,
                                    { backgroundColor: cat.color + '20' },
                                    selectedCategory?.id === cat.id && { backgroundColor: cat.color },
                                ]}>
                                    <Ionicons
                                        name={cat.icon as any}
                                        size={20}
                                        color={selectedCategory?.id === cat.id ? '#FFF' : cat.color}
                                    />
                                </View>
                                <Text style={[
                                    styles.categoryName,
                                    selectedCategory?.id === cat.id && styles.categoryNameSelected,
                                ]}>
                                    {cat.name}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Save Button */}
            <View style={styles.footer}>
                <TouchableOpacity
                    style={[
                        styles.saveButton,
                        { backgroundColor: type === 'expense' ? '#3B82F6' : '#10B981' },
                    ]}
                    onPress={handleSave}
                    disabled={isSubmitting}
                >
                    <Text style={styles.saveButtonText}>
                        {isSubmitting ? 'Đang lưu...' : 'Lưu'}
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0F0F23',
    },
    header: {
        backgroundColor: '#0F0F23',
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
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
        fontWeight: '600',
        color: '#FFF',
    },
    // Type Tabs
    typeTabs: {
        flexDirection: 'row',
        marginHorizontal: 16,
        marginBottom: 16,
        gap: 12,
    },
    typeTab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: '#1A1A2E',
        gap: 8,
    },
    typeTabExpenseActive: {
        backgroundColor: '#EF4444',
    },
    typeTabIncomeActive: {
        backgroundColor: '#10B981',
    },
    typeTabText: {
        color: '#9CA3AF',
        fontWeight: '600',
        fontSize: 14,
    },
    typeTabTextActive: {
        color: '#FFF',
    },
    content: {
        flex: 1,
        paddingHorizontal: 16,
    },
    // Section
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 12,
    },
    // Input Group
    inputGroup: {
        backgroundColor: '#1A1A2E',
        borderRadius: 16,
        overflow: 'hidden',
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 16,
        gap: 12,
    },
    input: {
        flex: 1,
        color: '#FFF',
        fontSize: 16,
    },
    inputText: {
        flex: 1,
        color: '#FFF',
        fontSize: 16,
    },
    currencySymbol: {
        color: '#6B7280',
        fontSize: 18,
        fontWeight: '600',
    },
    divider: {
        height: 1,
        backgroundColor: '#2D2D4A',
        marginHorizontal: 16,
    },
    // Wallet Selector
    walletSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#1A1A2E',
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 16,
    },
    walletInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    walletName: {
        color: '#FFF',
        fontSize: 16,
    },
    // Category Grid
    categoryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    categoryItem: {
        width: (width - 32 - 30) / 4,
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 8,
        backgroundColor: '#1A1A2E',
        borderRadius: 12,
    },
    categoryItemSelected: {
        backgroundColor: '#2D2D4A',
    },
    categoryIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 6,
    },
    categoryName: {
        color: '#9CA3AF',
        fontSize: 11,
        textAlign: 'center',
    },
    categoryNameSelected: {
        color: '#FFF',
    },
    // Footer
    footer: {
        padding: 16,
        paddingBottom: Platform.OS === 'ios' ? 32 : 16,
        backgroundColor: '#0F0F23',
    },
    saveButton: {
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    saveButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
    },
});

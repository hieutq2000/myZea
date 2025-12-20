/**
 * AddTransactionScreen - Màn hình thêm giao dịch
 * 
 * UI giống ảnh mẫu với bàn phím số tích hợp
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    Platform,
    ScrollView,
    TextInput,
    Alert,
    Dimensions,
    Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { TransactionType, Wallet, Category } from '../../types/finance';
import { addTransaction, getWallets } from '../../utils/finance/storage';
import { getCategoriesByType } from '../../utils/finance/categories';

const { width } = Dimensions.get('window');

export default function AddTransactionScreen() {
    const navigation = useNavigation();
    const route = useRoute();

    // Params
    const params = route.params as { walletId?: string; type?: TransactionType } | undefined;

    // State
    const [type, setType] = useState<TransactionType>(params?.type || 'expense');
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('0');
    const [selectedDay, setSelectedDay] = useState(new Date().getDate());
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [wallets, setWallets] = useState<Wallet[]>([]);
    const [selectedWalletId, setSelectedWalletId] = useState<string>(params?.walletId || '');
    const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [showWalletModal, setShowWalletModal] = useState(false);
    const [showNumpad, setShowNumpad] = useState(false);

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

    // Format display
    const formatAmount = (val: string) => {
        const num = parseInt(val.replace(/[^0-9]/g, '')) || 0;
        return num.toLocaleString('vi-VN');
    };

    const formatDate = () => {
        return `${selectedDay.toString().padStart(2, '0')}/${selectedMonth.toString().padStart(2, '0')}/${selectedYear}`;
    };

    // Get selected wallet
    const selectedWallet = wallets.find(w => w.id === selectedWalletId);

    // Handle numpad
    const handleNumPress = (val: string) => {
        if (val === 'C') {
            setAmount('0');
            return;
        }
        if (val === '⌫') {
            setAmount(prev => prev.length > 1 ? prev.slice(0, -1) : '0');
            return;
        }
        if (val === '000') {
            setAmount(prev => prev === '0' ? '0' : prev + '000');
            return;
        }
        if (val === '.') {
            if (!amount.includes('.')) {
                setAmount(prev => prev + '.');
            }
            return;
        }
        // Numbers
        setAmount(prev => {
            if (prev === '0') return val;
            if (prev.length >= 12) return prev;
            return prev + val;
        });
    };

    // Handle save
    const handleSave = async () => {
        const numAmount = parseInt(amount.replace(/[^0-9]/g, '')) || 0;

        if (numAmount <= 0) {
            Alert.alert('Lỗi', 'Vui lòng nhập số tiền');
            return;
        }

        if (!selectedCategory) {
            Alert.alert('Lỗi', 'Vui lòng chọn danh mục');
            return;
        }

        setIsSubmitting(true);

        try {
            const dateStr = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-${selectedDay.toString().padStart(2, '0')}`;

            await addTransaction({
                walletId: selectedWalletId || wallets[0]?.id || 'wallet_default',
                type,
                amount: numAmount,
                categoryId: selectedCategory.id,
                description: description || selectedCategory.name,
                date: dateStr,
                createdBy: 'manual',
            });

            navigation.goBack();
        } catch (error) {
            Alert.alert('Lỗi', 'Không thể lưu giao dịch');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Numpad button
    const NumButton = ({ value, color, textColor, flex = 1 }: { value: string; color?: string; textColor?: string; flex?: number }) => (
        <TouchableOpacity
            style={[styles.numBtn, { backgroundColor: color || '#1A1A2E', flex }]}
            onPress={() => handleNumPress(value)}
            activeOpacity={0.7}
        >
            <Text style={[styles.numBtnText, textColor ? { color: textColor } : {}]}>{value}</Text>
        </TouchableOpacity>
    );

    // Generate date options
    const days = Array.from({ length: 31 }, (_, i) => i + 1);
    const months = Array.from({ length: 12 }, (_, i) => i + 1);
    const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i);

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />

            {/* Header */}
            <SafeAreaView>
                <View style={styles.header}>
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
                        <Text style={styles.typeTabIcon}>✕✕</Text>
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
                        <Text style={styles.typeTabIcon}>↗</Text>
                        <Text style={[styles.typeTabText, type === 'income' && styles.typeTabTextActive]}>
                            Thu nhập
                        </Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Chi tiết giao dịch */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Chi tiết giao dịch</Text>

                    <View style={styles.inputCard}>
                        {/* Tên giao dịch */}
                        <View style={styles.inputRow}>
                            <Ionicons name="document-text-outline" size={20} color="#6B7280" />
                            <TextInput
                                style={styles.input}
                                placeholder="Tên giao dịch"
                                placeholderTextColor="#6B7280"
                                value={description}
                                onChangeText={setDescription}
                            />
                        </View>

                        <View style={styles.divider} />

                        {/* Số tiền */}
                        <TouchableOpacity
                            style={styles.inputRow}
                            onPress={() => setShowNumpad(!showNumpad)}
                        >
                            <Text style={styles.currencySymbol}>$</Text>
                            <Text style={styles.amountDisplay}>{formatAmount(amount)}</Text>
                            <Ionicons
                                name={showNumpad ? 'chevron-up' : 'keypad-outline'}
                                size={20}
                                color="#6B7280"
                            />
                        </TouchableOpacity>

                        {/* Numpad - Ẩn/hiện */}
                        {showNumpad && (
                            <View style={styles.numpad}>
                                <View style={styles.numRow}>
                                    <NumButton value="7" />
                                    <NumButton value="8" />
                                    <NumButton value="9" />
                                    <NumButton value="+" color="#0EA5E9" textColor="#FFF" />
                                </View>
                                <View style={styles.numRow}>
                                    <NumButton value="4" />
                                    <NumButton value="5" />
                                    <NumButton value="6" />
                                    <NumButton value="×" color="#F97316" textColor="#FFF" />
                                </View>
                                <View style={styles.numRow}>
                                    <NumButton value="1" />
                                    <NumButton value="2" />
                                    <NumButton value="3" />
                                    <NumButton value="-" color="#10B981" textColor="#FFF" />
                                </View>
                                <View style={styles.numRow}>
                                    <NumButton value="." />
                                    <NumButton value="0" />
                                    <NumButton value="000" />
                                    <NumButton value="+" color="#6366F1" textColor="#FFF" />
                                </View>
                                <View style={styles.numRow}>
                                    <NumButton value="⌫" flex={1} />
                                    <TouchableOpacity
                                        style={[styles.numBtn, { backgroundColor: '#EF4444', flex: 1 }]}
                                        onPress={() => setAmount('0')}
                                    >
                                        <Text style={[styles.numBtnText, { color: '#FFF' }]}>Xóa</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.numBtn, { backgroundColor: '#10B981', flex: 1 }]}
                                        onPress={() => { }}
                                    >
                                        <Text style={[styles.numBtnText, { color: '#FFF' }]}>=</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}

                        <View style={styles.divider} />

                        {/* Ngày */}
                        <TouchableOpacity style={styles.inputRow} onPress={() => setShowDatePicker(true)}>
                            <Ionicons name="calendar-outline" size={20} color="#6B7280" />
                            <Text style={styles.inputText}>{formatDate()}</Text>
                            <Ionicons name="chevron-down" size={20} color="#6B7280" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Chọn ví */}
                <TouchableOpacity style={styles.walletRow} onPress={() => setShowWalletModal(true)}>
                    <View style={styles.walletLeft}>
                        <Ionicons name="wallet-outline" size={20} color="#6B7280" />
                        <Text style={styles.walletName}>{selectedWallet?.name || 'Hiếu'}</Text>
                    </View>
                    <Ionicons name="chevron-down" size={20} color="#6B7280" />
                </TouchableOpacity>

                {/* Danh mục */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Danh mục</Text>

                    <View style={styles.categoryGrid}>
                        {categories.map((cat) => (
                            <TouchableOpacity
                                key={cat.id}
                                style={[
                                    styles.categoryItem,
                                    selectedCategory?.id === cat.id && { backgroundColor: cat.color + '30' },
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
                                    selectedCategory?.id === cat.id && { color: '#FFF' },
                                ]}>
                                    {cat.name}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <View style={{ height: 120 }} />
            </ScrollView>

            {/* Save Button */}
            <View style={styles.footer}>
                <TouchableOpacity
                    style={styles.saveBtn}
                    onPress={handleSave}
                    disabled={isSubmitting}
                >
                    <Text style={styles.saveBtnText}>
                        {isSubmitting ? 'Đang lưu...' : 'Lưu'}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Date Picker Modal */}
            <Modal
                visible={showDatePicker}
                animationType="slide"
                transparent
                onRequestClose={() => setShowDatePicker(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.datePickerModal}>
                        <View style={styles.datePickerContent}>
                            {/* Day */}
                            <ScrollView style={styles.dateColumn} showsVerticalScrollIndicator={false}>
                                {days.map(d => (
                                    <TouchableOpacity
                                        key={d}
                                        style={[styles.dateOption, selectedDay === d && styles.dateOptionActive]}
                                        onPress={() => setSelectedDay(d)}
                                    >
                                        <Text style={[styles.dateOptionText, selectedDay === d && styles.dateOptionTextActive]}>
                                            {d}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>

                            {/* Month */}
                            <ScrollView style={styles.dateColumn} showsVerticalScrollIndicator={false}>
                                {months.map(m => (
                                    <TouchableOpacity
                                        key={m}
                                        style={[styles.dateOption, selectedMonth === m && styles.dateOptionActive]}
                                        onPress={() => setSelectedMonth(m)}
                                    >
                                        <Text style={[styles.dateOptionText, selectedMonth === m && styles.dateOptionTextActive]}>
                                            tháng {m}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>

                            {/* Year */}
                            <ScrollView style={styles.dateColumn} showsVerticalScrollIndicator={false}>
                                {years.map(y => (
                                    <TouchableOpacity
                                        key={y}
                                        style={[styles.dateOption, selectedYear === y && styles.dateOptionActive]}
                                        onPress={() => setSelectedYear(y)}
                                    >
                                        <Text style={[styles.dateOptionText, selectedYear === y && styles.dateOptionTextActive]}>
                                            {y}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>

                        <TouchableOpacity style={styles.confirmBtn} onPress={() => setShowDatePicker(false)}>
                            <Text style={styles.confirmBtnText}>Confirm</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowDatePicker(false)}>
                            <Text style={styles.cancelBtnText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Wallet Modal */}
            <Modal
                visible={showWalletModal}
                animationType="slide"
                transparent
                onRequestClose={() => setShowWalletModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.walletModal}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Chọn ví</Text>
                            <TouchableOpacity onPress={() => setShowWalletModal(false)}>
                                <Ionicons name="close" size={24} color="#FFF" />
                            </TouchableOpacity>
                        </View>
                        {wallets.map(w => (
                            <TouchableOpacity
                                key={w.id}
                                style={[styles.walletOption, selectedWalletId === w.id && styles.walletOptionActive]}
                                onPress={() => {
                                    setSelectedWalletId(w.id);
                                    setShowWalletModal(false);
                                }}
                            >
                                <Ionicons name="wallet" size={24} color={selectedWalletId === w.id ? '#8B5CF6' : '#6B7280'} />
                                <Text style={[styles.walletOptionText, selectedWalletId === w.id && { color: '#FFF' }]}>
                                    {w.name}
                                </Text>
                            </TouchableOpacity>
                        ))}
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
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    },
    headerTitle: {
        fontSize: 17,
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
    typeTabIcon: {
        fontSize: 14,
        color: '#FFF',
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
        marginBottom: 20,
    },
    sectionTitle: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 12,
    },
    // Input Card
    inputCard: {
        backgroundColor: '#1A1A2E',
        borderRadius: 16,
        overflow: 'hidden',
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
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
    amountDisplay: {
        flex: 1,
        color: '#FFF',
        fontSize: 18,
        fontWeight: '600',
    },
    divider: {
        height: 1,
        backgroundColor: '#2D2D4A',
        marginHorizontal: 16,
    },
    // Numpad
    numpad: {
        padding: 8,
        gap: 6,
    },
    numRow: {
        flexDirection: 'row',
        gap: 6,
    },
    numBtn: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 8,
    },
    numBtnText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '500',
    },
    // Wallet Row
    walletRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#1A1A2E',
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 14,
        marginBottom: 20,
    },
    walletLeft: {
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
        paddingHorizontal: 4,
        backgroundColor: '#1A1A2E',
        borderRadius: 12,
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
        fontSize: 10,
        textAlign: 'center',
    },
    // Footer
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 16,
        paddingBottom: Platform.OS === 'ios' ? 32 : 16,
        backgroundColor: '#0F0F23',
    },
    saveBtn: {
        backgroundColor: '#3B82F6',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    saveBtnText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
    },
    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'flex-end',
    },
    datePickerModal: {
        backgroundColor: '#1A1A2E',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
        paddingBottom: 40,
    },
    datePickerContent: {
        flexDirection: 'row',
        height: 200,
    },
    dateColumn: {
        flex: 1,
    },
    dateOption: {
        paddingVertical: 10,
        alignItems: 'center',
    },
    dateOptionActive: {
        backgroundColor: '#2D2D4A',
        borderRadius: 8,
    },
    dateOptionText: {
        color: '#6B7280',
        fontSize: 16,
    },
    dateOptionTextActive: {
        color: '#FFF',
        fontWeight: '600',
    },
    confirmBtn: {
        alignItems: 'center',
        paddingVertical: 16,
        marginTop: 16,
    },
    confirmBtnText: {
        color: '#3B82F6',
        fontSize: 16,
        fontWeight: '600',
    },
    cancelBtn: {
        alignItems: 'center',
        paddingVertical: 12,
    },
    cancelBtnText: {
        color: '#EF4444',
        fontSize: 16,
    },
    walletModal: {
        backgroundColor: '#1A1A2E',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
        paddingBottom: 40,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    modalTitle: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    walletOption: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 14,
        paddingHorizontal: 12,
        borderRadius: 12,
    },
    walletOptionActive: {
        backgroundColor: '#2D2D4A',
    },
    walletOptionText: {
        color: '#9CA3AF',
        fontSize: 16,
    },
});

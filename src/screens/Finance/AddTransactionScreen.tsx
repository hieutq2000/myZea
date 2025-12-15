/**
 * AddTransactionScreen - Màn hình thêm giao dịch
 * 
 * Features:
 * - Máy tính tích hợp để nhập số tiền
 * - Chọn danh mục trực quan
 * - Nhập mô tả
 * - Chọn ngày
 * - Nhập bằng giọng nói (AI parse)
 */

import React, { useState, useCallback, useRef } from 'react';
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
    Modal,
    Alert,
    Vibration,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { Transaction, TransactionType } from '../../types/finance';
import { addTransaction, getWallets } from '../../utils/finance/storage';
import { getCategoriesByType, Category, findCategoryFromText } from '../../utils/finance/categories';

// Format số tiền hiển thị
const formatDisplayNumber = (num: string): string => {
    if (!num || num === '0') return '0';
    const parts = num.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
};

// Parse số từ display format
const parseDisplayNumber = (str: string): number => {
    return parseFloat(str.replace(/,/g, '')) || 0;
};

export default function AddTransactionScreen() {
    const navigation = useNavigation();
    const route = useRoute();
    const { colors, isDark } = useTheme();

    // Params từ navigation
    const params = route.params as { walletId?: string; type?: TransactionType } | undefined;

    // State
    const [type, setType] = useState<TransactionType>(params?.type || 'expense');
    const [amount, setAmount] = useState('0');
    const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
    const [description, setDescription] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Lấy danh mục theo loại
    const categories = getCategoriesByType(type);

    // Xử lý bấm nút máy tính
    const handlePress = useCallback((value: string) => {
        Vibration.vibrate(10); // Haptic nhẹ

        if (value === 'C') {
            setAmount('0');
            return;
        }

        if (value === '⌫') {
            setAmount(prev => prev.length > 1 ? prev.slice(0, -1) : '0');
            return;
        }

        if (value === '.') {
            if (amount.includes('.')) return;
            setAmount(prev => prev + '.');
            return;
        }

        // Operators - tính toán đơn giản
        if (['+', '-', '×', '÷'].includes(value)) {
            // Đơn giản: chỉ lưu operator để tính sau
            setAmount(prev => {
                if (['+', '-', '×', '÷'].includes(prev.slice(-1))) {
                    return prev.slice(0, -1) + value;
                }
                return prev + value;
            });
            return;
        }

        if (value === '=') {
            try {
                // Replace operators và tính
                const expr = amount
                    .replace(/×/g, '*')
                    .replace(/÷/g, '/');
                const result = eval(expr); // eslint-disable-line no-eval
                setAmount(String(Math.round(result * 100) / 100));
            } catch {
                // Nếu lỗi, giữ nguyên
            }
            return;
        }

        // Số
        setAmount(prev => {
            if (prev === '0' && value !== '.') return value;
            // Giới hạn độ dài
            if (prev.replace(/[^0-9]/g, '').length >= 12) return prev;
            return prev + value;
        });
    }, [amount]);

    // Lưu giao dịch
    const handleSave = async () => {
        const numAmount = parseDisplayNumber(amount);

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
            const wallets = await getWallets();
            const walletId = params?.walletId || wallets[0]?.id || 'wallet_default';

            await addTransaction({
                walletId,
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
            Alert.alert('Lỗi', 'Không thể lưu giao dịch. Vui lòng thử lại.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Render nút máy tính
    const renderCalcButton = (value: string, flex = 1, bgColor?: string, textColor?: string) => (
        <TouchableOpacity
            key={value}
            style={[
                styles.calcButton,
                {
                    flex,
                    backgroundColor: bgColor || (isDark ? '#2D2D2D' : '#F3F4F6'),
                },
            ]}
            onPress={() => handlePress(value)}
            activeOpacity={0.7}
        >
            <Text style={[
                styles.calcButtonText,
                { color: textColor || colors.text }
            ]}>
                {value}
            </Text>
        </TouchableOpacity>
    );

    // Render danh mục trong modal
    const renderCategoryItem = (category: Category) => (
        <TouchableOpacity
            key={category.id}
            style={[
                styles.categoryItem,
                selectedCategory?.id === category.id && {
                    backgroundColor: category.color + '20',
                    borderColor: category.color,
                    borderWidth: 2,
                },
            ]}
            onPress={() => {
                setSelectedCategory(category);
                setShowCategoryModal(false);
            }}
        >
            <View style={[styles.categoryIcon, { backgroundColor: category.color + '20' }]}>
                <Ionicons name={category.icon as any} size={24} color={category.color} />
            </View>
            <Text style={[styles.categoryName, { color: colors.text }]}>{category.name}</Text>
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle="light-content" />

            {/* Header */}
            <LinearGradient
                colors={type === 'expense' ? ['#EF4444', '#DC2626'] : ['#10B981', '#059669']}
                style={styles.header}
            >
                <SafeAreaView>
                    <View style={styles.headerContent}>
                        <TouchableOpacity onPress={() => navigation.goBack()}>
                            <Ionicons name="close" size={28} color="#FFF" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>
                            {type === 'expense' ? 'Chi tiêu' : 'Thu nhập'}
                        </Text>
                        <TouchableOpacity
                            onPress={handleSave}
                            disabled={isSubmitting}
                            style={styles.saveButton}
                        >
                            <Text style={styles.saveButtonText}>
                                {isSubmitting ? 'Đang lưu...' : 'Lưu'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Type Switcher */}
                    <View style={styles.typeSwitcher}>
                        <TouchableOpacity
                            style={[
                                styles.typeButton,
                                type === 'expense' && styles.typeButtonActive,
                            ]}
                            onPress={() => {
                                setType('expense');
                                setSelectedCategory(null);
                            }}
                        >
                            <Text style={[
                                styles.typeButtonText,
                                type === 'expense' && styles.typeButtonTextActive,
                            ]}>Chi tiêu</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.typeButton,
                                type === 'income' && styles.typeButtonActive,
                            ]}
                            onPress={() => {
                                setType('income');
                                setSelectedCategory(null);
                            }}
                        >
                            <Text style={[
                                styles.typeButtonText,
                                type === 'income' && styles.typeButtonTextActive,
                            ]}>Thu nhập</Text>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </LinearGradient>

            {/* Amount Display */}
            <View style={styles.amountContainer}>
                <Text style={[styles.amountLabel, { color: colors.textSecondary }]}>Số tiền</Text>
                <Text style={[
                    styles.amountValue,
                    { color: type === 'expense' ? '#EF4444' : '#10B981' }
                ]}>
                    {type === 'expense' ? '-' : '+'}{formatDisplayNumber(amount)}đ
                </Text>
            </View>

            {/* Category & Description */}
            <View style={styles.infoSection}>
                <TouchableOpacity
                    style={[styles.infoRow, { backgroundColor: colors.card }]}
                    onPress={() => setShowCategoryModal(true)}
                >
                    {selectedCategory ? (
                        <>
                            <View style={[styles.categoryIconSmall, { backgroundColor: selectedCategory.color + '20' }]}>
                                <Ionicons name={selectedCategory.icon as any} size={20} color={selectedCategory.color} />
                            </View>
                            <Text style={[styles.infoText, { color: colors.text }]}>{selectedCategory.name}</Text>
                        </>
                    ) : (
                        <>
                            <Ionicons name="grid-outline" size={20} color={colors.textSecondary} />
                            <Text style={[styles.infoText, { color: colors.textSecondary }]}>Chọn danh mục</Text>
                        </>
                    )}
                    <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                </TouchableOpacity>

                <View style={[styles.infoRow, { backgroundColor: colors.card }]}>
                    <Ionicons name="create-outline" size={20} color={colors.textSecondary} />
                    <TextInput
                        style={[styles.descriptionInput, { color: colors.text }]}
                        placeholder="Ghi chú (tùy chọn)"
                        placeholderTextColor={colors.textSecondary}
                        value={description}
                        onChangeText={setDescription}
                    />
                </View>
            </View>

            {/* Calculator */}
            <View style={[styles.calculator, { backgroundColor: isDark ? '#1F1F1F' : '#E5E7EB' }]}>
                <View style={styles.calcRow}>
                    {renderCalcButton('C', 1, '#EF4444', '#FFF')}
                    {renderCalcButton('⌫')}
                    {renderCalcButton('÷', 1, type === 'expense' ? '#FEE2E2' : '#D1FAE5', type === 'expense' ? '#EF4444' : '#10B981')}
                    {renderCalcButton('×', 1, type === 'expense' ? '#FEE2E2' : '#D1FAE5', type === 'expense' ? '#EF4444' : '#10B981')}
                </View>
                <View style={styles.calcRow}>
                    {renderCalcButton('7')}
                    {renderCalcButton('8')}
                    {renderCalcButton('9')}
                    {renderCalcButton('-', 1, type === 'expense' ? '#FEE2E2' : '#D1FAE5', type === 'expense' ? '#EF4444' : '#10B981')}
                </View>
                <View style={styles.calcRow}>
                    {renderCalcButton('4')}
                    {renderCalcButton('5')}
                    {renderCalcButton('6')}
                    {renderCalcButton('+', 1, type === 'expense' ? '#FEE2E2' : '#D1FAE5', type === 'expense' ? '#EF4444' : '#10B981')}
                </View>
                <View style={styles.calcRow}>
                    {renderCalcButton('1')}
                    {renderCalcButton('2')}
                    {renderCalcButton('3')}
                    {renderCalcButton('=', 1, type === 'expense' ? '#EF4444' : '#10B981', '#FFF')}
                </View>
                <View style={styles.calcRow}>
                    {renderCalcButton('0', 2)}
                    {renderCalcButton('000')}
                    {renderCalcButton('.')}
                </View>
            </View>

            {/* Category Modal */}
            <Modal
                visible={showCategoryModal}
                animationType="slide"
                transparent
                onRequestClose={() => setShowCategoryModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>Chọn danh mục</Text>
                            <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
                                <Ionicons name="close" size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView contentContainerStyle={styles.categoryGrid}>
                            {categories.map(renderCategoryItem)}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
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
        fontWeight: 'bold',
        color: '#FFF',
    },
    saveButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 20,
    },
    saveButtonText: {
        color: '#FFF',
        fontWeight: '600',
    },
    typeSwitcher: {
        flexDirection: 'row',
        marginHorizontal: 16,
        marginBottom: 16,
        padding: 4,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 12,
    },
    typeButton: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 10,
    },
    typeButtonActive: {
        backgroundColor: '#FFF',
    },
    typeButtonText: {
        color: 'rgba(255,255,255,0.7)',
        fontWeight: '600',
    },
    typeButtonTextActive: {
        color: '#1F2937',
    },
    amountContainer: {
        paddingVertical: 24,
        alignItems: 'center',
    },
    amountLabel: {
        fontSize: 14,
        marginBottom: 8,
    },
    amountValue: {
        fontSize: 40,
        fontWeight: 'bold',
    },
    infoSection: {
        paddingHorizontal: 16,
        gap: 8,
        marginBottom: 16,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 12,
        gap: 12,
    },
    infoText: {
        flex: 1,
        fontSize: 15,
    },
    categoryIconSmall: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    descriptionInput: {
        flex: 1,
        fontSize: 15,
    },
    calculator: {
        flex: 1,
        padding: 8,
        gap: 8,
    },
    calcRow: {
        flex: 1,
        flexDirection: 'row',
        gap: 8,
    },
    calcButton: {
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    calcButtonText: {
        fontSize: 24,
        fontWeight: '500',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        maxHeight: '70%',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: 16,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.1)',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    categoryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        padding: 16,
        gap: 12,
    },
    categoryItem: {
        width: '30%',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        backgroundColor: 'transparent',
    },
    categoryIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    categoryName: {
        fontSize: 12,
        textAlign: 'center',
    },
});

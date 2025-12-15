/**
 * FinanceHomeScreen - Màn hình chính quản lý tài chính
 * Layout giống app mẫu: Dark theme với gradient card
 */

import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
    Platform,
    RefreshControl,
    Alert,
    Modal,
    TextInput,
    KeyboardAvoidingView,
    Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '../../context/ThemeContext';
import { Transaction, Wallet } from '../../types/finance';
import {
    getWallets,
    getTransactions,
    calculateTotalBalance,
    getMonthlyStats,
    deleteTransaction,
    updateWallet,
    getMonthlySalary,
    setMonthlySalary,
} from '../../utils/finance/storage';
import { getCategoryById } from '../../utils/finance/categories';

const { width } = Dimensions.get('window');

// Format số tiền
const formatMoney = (amount: number): string => {
    return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
};

// Format ngày
const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (dateStr === today.toISOString().split('T')[0]) {
        return 'Hôm nay';
    } else if (dateStr === yesterday.toISOString().split('T')[0]) {
        return 'Hôm qua';
    }

    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
};

export default function FinanceHomeScreen() {
    const navigation = useNavigation<StackNavigationProp<any>>();
    const { colors, isDark } = useTheme();

    // State
    const [totalBalance, setTotalBalance] = useState(0);
    const [monthlyStats, setMonthlyStats] = useState({ income: 0, expense: 0, balance: 0 });
    const [todayStats, setTodayStats] = useState({ income: 0, expense: 0 });
    const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
    const [wallets, setWallets] = useState<Wallet[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Modal nhập số dư
    const [showBalanceModal, setShowBalanceModal] = useState(false);
    const [balanceInput, setBalanceInput] = useState('');
    const [isFirstTime, setIsFirstTime] = useState(false);

    // Modal nhập lương tháng
    const [showSalaryModal, setShowSalaryModal] = useState(false);
    const [salaryInput, setSalaryInput] = useState('');
    const [monthlySalary, setMonthlySalaryState] = useState(0);

    // Load data
    const loadData = async () => {
        try {
            const [walletsData, transactionsData, balance] = await Promise.all([
                getWallets(),
                getTransactions(),
                calculateTotalBalance(),
            ]);

            const now = new Date();
            const stats = await getMonthlyStats(now.getFullYear(), now.getMonth() + 1);

            // Tính thu/chi hôm nay
            const todayStr = now.toISOString().split('T')[0];
            const todayTxns = transactionsData.filter(t => t.date === todayStr);
            const todayIncome = todayTxns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
            const todayExpense = todayTxns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

            setWallets(walletsData);
            setRecentTransactions(transactionsData.slice(0, 10));
            setTotalBalance(balance);
            setMonthlyStats(stats);
            setTodayStats({ income: todayIncome, expense: todayExpense });

            // Lấy lương tháng
            const salary = await getMonthlySalary();
            setMonthlySalaryState(salary);

            // Kiểm tra lần đầu dùng app
            if (transactionsData.length === 0 && walletsData[0]?.balance === 0) {
                setIsFirstTime(true);
                setShowBalanceModal(true);
            }
        } catch (error) {
            console.error('Error loading finance data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    const onRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };

    // Lưu số dư ban đầu
    const handleSaveInitialBalance = async () => {
        const amount = parseFloat(balanceInput.replace(/[^0-9]/g, ''));
        if (isNaN(amount)) {
            Alert.alert('Lỗi', 'Vui lòng nhập số tiền hợp lệ');
            return;
        }

        if (wallets.length > 0) {
            await updateWallet(wallets[0].id, { balance: amount });
            setShowBalanceModal(false);
            setIsFirstTime(false);
            loadData();
        }
    };

    // Lưu lương tháng
    const handleSaveSalary = async () => {
        const amount = parseFloat(salaryInput.replace(/[^0-9]/g, ''));
        if (isNaN(amount) || amount <= 0) {
            Alert.alert('Lỗi', 'Vui lòng nhập số tiền hợp lệ');
            return;
        }

        await setMonthlySalary(amount);
        setMonthlySalaryState(amount);
        setShowSalaryModal(false);
    };

    // Mở modal nhập lương
    const handleOpenSalaryModal = () => {
        setSalaryInput(monthlySalary > 0 ? monthlySalary.toString() : '');
        setShowSalaryModal(true);
    };


    // Xử lý tap vào giao dịch
    const handleTransactionPress = (txn: Transaction) => {
        const category = getCategoryById(txn.categoryId);

        Alert.alert(
            txn.description || category?.name || 'Giao dịch',
            `${txn.type === 'expense' ? 'Chi' : 'Thu'}: ${formatMoney(txn.amount)}\nDanh mục: ${category?.name}\nNgày: ${formatDate(txn.date)}`,
            [
                { text: 'Đóng', style: 'cancel' },
                {
                    text: 'Sửa',
                    onPress: () => {
                        navigation.navigate('FinanceAddTransaction' as any, {
                            type: txn.type,
                            editTransaction: txn,
                        });
                    },
                },
                {
                    text: 'Xóa',
                    style: 'destructive',
                    onPress: () => handleDeleteTransaction(txn),
                },
            ]
        );
    };

    const handleDeleteTransaction = (txn: Transaction) => {
        Alert.alert(
            'Xác nhận xóa',
            `Bạn có chắc muốn xóa giao dịch "${txn.description}"?`,
            [
                { text: 'Hủy', style: 'cancel' },
                {
                    text: 'Xóa',
                    style: 'destructive',
                    onPress: async () => {
                        await deleteTransaction(txn.id);
                        loadData();
                    },
                },
            ]
        );
    };

    const handleEditBalance = () => {
        setBalanceInput(wallets[0]?.balance?.toString() || '0');
        setShowBalanceModal(true);
    };

    const handleAddTransaction = (type: 'income' | 'expense') => {
        navigation.navigate('FinanceAddTransaction' as any, { type });
    };

    // Tính % so với tháng trước
    const getPercentChange = () => {
        // Giả lập - cần implement so sánh với tháng trước
        if (monthlyStats.income > 0) {
            return '+100.0%';
        }
        return '0%';
    };

    // Render giao dịch
    const renderTransaction = (txn: Transaction) => {
        const category = getCategoryById(txn.categoryId);
        const isExpense = txn.type === 'expense';

        return (
            <TouchableOpacity
                key={txn.id}
                style={styles.transactionItem}
                onPress={() => handleTransactionPress(txn)}
                activeOpacity={0.7}
            >
                <View style={[styles.txnIcon, { backgroundColor: category?.color + '30' }]}>
                    <Ionicons
                        name={category?.icon as any || 'help-outline'}
                        size={20}
                        color={category?.color || '#6B7280'}
                    />
                </View>
                <View style={styles.txnInfo}>
                    <Text style={styles.txnDesc} numberOfLines={1}>
                        {txn.description || category?.name}
                    </Text>
                    <Text style={styles.txnDate}>{formatDate(txn.date)}</Text>
                </View>
                <Text style={[styles.txnAmount, { color: isExpense ? '#EF4444' : '#10B981' }]}>
                    {isExpense ? '-' : '+'}{formatMoney(txn.amount)}
                </Text>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />

            {/* Dark Header */}
            <View style={styles.header}>
                <SafeAreaView>
                    <View style={styles.headerTop}>
                        <TouchableOpacity onPress={() => navigation.goBack()}>
                            <Ionicons name="arrow-back" size={24} color="#FFF" />
                        </TouchableOpacity>
                        <View style={styles.headerCenter}>
                            <Text style={styles.totalBalanceSmall}>{formatMoney(totalBalance)}</Text>
                            <Text style={styles.totalBalanceLabel}>Tổng số dư</Text>
                        </View>
                        <TouchableOpacity style={styles.walletBtn}>
                            <Text style={styles.walletBtnText}>Đổi ví</Text>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFF" />
                }
            >
                {/* Main Balance Card */}
                <LinearGradient
                    colors={['#6366F1', '#8B5CF6', '#A855F7']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.balanceCard}
                >
                    <View style={styles.cardHeader}>
                        <View style={styles.userInfo}>
                            <View style={styles.avatar}>
                                <Ionicons name="person" size={20} color="#8B5CF6" />
                            </View>
                            <Text style={styles.userName}>{wallets[0]?.name || 'Ví chính'}</Text>
                        </View>
                        <TouchableOpacity onPress={handleEditBalance}>
                            <Ionicons name="settings-outline" size={22} color="rgba(255,255,255,0.8)" />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.mainBalance}>{formatMoney(totalBalance)}</Text>

                    <View style={styles.percentBadge}>
                        <Text style={styles.percentText}>{getPercentChange()} so với tháng trước</Text>
                    </View>
                </LinearGradient>

                {/* Action Buttons */}
                <View style={styles.actionRow}>
                    <TouchableOpacity
                        style={styles.actionItem}
                        onPress={() => navigation.navigate('FinanceVoiceInput' as any)}
                    >
                        <View style={[styles.actionIcon, { backgroundColor: '#10B981' }]}>
                            <Ionicons name="mic" size={22} color="#FFF" />
                        </View>
                        <Text style={styles.actionLabel}>Nhập bằng{'\n'}giọng nói</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.actionItem}
                        onPress={() => handleAddTransaction('expense')}
                    >
                        <View style={[styles.actionIcon, { backgroundColor: '#F59E0B' }]}>
                            <Ionicons name="remove" size={22} color="#FFF" />
                        </View>
                        <Text style={styles.actionLabel}>Nhập{'\n'}Chi tiêu</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.actionItem}
                        onPress={() => handleAddTransaction('income')}
                    >
                        <View style={[styles.actionIcon, { backgroundColor: '#3B82F6' }]}>
                            <Ionicons name="add" size={22} color="#FFF" />
                        </View>
                        <Text style={styles.actionLabel}>Nhập{'\n'}Thu nhập</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionItem}>
                        <View style={[styles.actionIcon, { backgroundColor: '#8B5CF6' }]}>
                            <Ionicons name="flag" size={22} color="#FFF" />
                        </View>
                        <Text style={styles.actionLabel}>Thiết lập{'\n'}Mục tiêu</Text>
                    </TouchableOpacity>
                </View>

                {/* Monthly Stats Cards */}
                <View style={styles.statsRow}>
                    <View style={styles.statCard}>
                        <View style={styles.statHeader}>
                            <View style={[styles.statDot, { backgroundColor: '#EF4444' }]} />
                            <Text style={styles.statTitle}>Chi phí</Text>
                        </View>
                        <Text style={styles.statSubtitle}>Tháng này</Text>
                        <Text style={[styles.statAmount, { color: '#EF4444' }]}>
                            {formatMoney(monthlyStats.expense)}
                        </Text>
                    </View>

                    <TouchableOpacity
                        style={styles.statCard}
                        onPress={handleOpenSalaryModal}
                        activeOpacity={0.7}
                    >
                        <View style={styles.statHeader}>
                            <View style={[styles.statDot, { backgroundColor: '#10B981' }]} />
                            <Text style={styles.statTitle}>Thu nhập</Text>
                            <Ionicons name="create-outline" size={14} color="#6B7280" style={{ marginLeft: 4 }} />
                        </View>
                        <Text style={styles.statSubtitle}>Lương tháng</Text>
                        <Text style={[styles.statAmount, { color: '#10B981' }]}>
                            {monthlySalary > 0 ? formatMoney(monthlySalary) : 'Chưa nhập'}
                        </Text>
                    </TouchableOpacity>
                </View>


                {/* Recent Transactions */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Giao dịch gần đây</Text>
                        <TouchableOpacity>
                            <Text style={styles.seeAll}>Xem tất cả</Text>
                        </TouchableOpacity>
                    </View>

                    {recentTransactions.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Ionicons name="receipt-outline" size={48} color="#6B7280" />
                            <Text style={styles.emptyText}>Chưa có giao dịch nào</Text>
                            <Text style={styles.emptyHint}>Bấm "Nhập Chi tiêu" hoặc "Nhập Thu nhập" để bắt đầu</Text>
                        </View>
                    ) : (
                        <View style={styles.transactionList}>
                            {recentTransactions.map(renderTransaction)}
                        </View>
                    )}
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Modal nhập số dư ban đầu */}
            <Modal
                visible={showBalanceModal}
                animationType="slide"
                transparent
                onRequestClose={() => !isFirstTime && setShowBalanceModal(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalOverlay}
                >
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                {isFirstTime ? '👋 Chào mừng!' : 'Điều chỉnh số dư'}
                            </Text>
                            {!isFirstTime && (
                                <TouchableOpacity onPress={() => setShowBalanceModal(false)}>
                                    <Ionicons name="close" size={24} color="#FFF" />
                                </TouchableOpacity>
                            )}
                        </View>

                        <Text style={styles.modalDesc}>
                            {isFirstTime
                                ? 'Để bắt đầu, hãy nhập số tiền bạn đang có trong ví:'
                                : 'Nhập số dư hiện tại của ví:'}
                        </Text>

                        <TextInput
                            style={styles.balanceInput}
                            placeholder="Ví dụ: 5000000"
                            placeholderTextColor="#6B7280"
                            keyboardType="numeric"
                            value={balanceInput}
                            onChangeText={setBalanceInput}
                            autoFocus
                        />

                        <View style={styles.quickAmounts}>
                            {[1000000, 5000000, 10000000, 20000000].map((amount) => (
                                <TouchableOpacity
                                    key={amount}
                                    style={styles.quickAmountBtn}
                                    onPress={() => setBalanceInput(amount.toString())}
                                >
                                    <Text style={styles.quickAmountText}>
                                        {formatMoney(amount).replace('đ', '')}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <TouchableOpacity
                            style={styles.saveBalanceBtn}
                            onPress={handleSaveInitialBalance}
                        >
                            <Text style={styles.saveBalanceBtnText}>Xác nhận</Text>
                        </TouchableOpacity>

                        {isFirstTime && (
                            <TouchableOpacity
                                style={styles.skipBtn}
                                onPress={() => {
                                    setShowBalanceModal(false);
                                    setIsFirstTime(false);
                                }}
                            >
                                <Text style={styles.skipBtnText}>Bỏ qua, tôi sẽ nhập sau</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Modal nhập lương tháng */}
            <Modal
                visible={showSalaryModal}
                animationType="slide"
                transparent
                onRequestClose={() => setShowSalaryModal(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalOverlay}
                >
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>💰 Nhập lương tháng</Text>
                            <TouchableOpacity onPress={() => setShowSalaryModal(false)}>
                                <Ionicons name="close" size={24} color="#FFF" />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.modalDesc}>
                            Nhập số tiền lương bạn nhận được mỗi tháng:
                        </Text>

                        <TextInput
                            style={styles.balanceInput}
                            placeholder="Ví dụ: 15000000"
                            placeholderTextColor="#6B7280"
                            keyboardType="numeric"
                            value={salaryInput}
                            onChangeText={setSalaryInput}
                            autoFocus
                        />

                        <View style={styles.quickAmounts}>
                            {[8000000, 10000000, 15000000, 20000000, 30000000].map((amount) => (
                                <TouchableOpacity
                                    key={amount}
                                    style={styles.quickAmountBtn}
                                    onPress={() => setSalaryInput(amount.toString())}
                                >
                                    <Text style={styles.quickAmountText}>
                                        {(amount / 1000000)}tr
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <TouchableOpacity
                            style={[styles.saveBalanceBtn, { backgroundColor: '#10B981' }]}
                            onPress={handleSaveSalary}
                        >
                            <Text style={styles.saveBalanceBtnText}>Lưu lương tháng</Text>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}


const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0F0F23', // Dark navy background
    },
    header: {
        backgroundColor: '#0F0F23',
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    headerCenter: {
        alignItems: 'center',
    },
    totalBalanceSmall: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    totalBalanceLabel: {
        color: '#9CA3AF',
        fontSize: 12,
    },
    walletBtn: {
        backgroundColor: 'rgba(139, 92, 246, 0.3)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    walletBtnText: {
        color: '#A78BFA',
        fontSize: 13,
        fontWeight: '500',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingTop: 8,
    },
    // Balance Card
    balanceCard: {
        borderRadius: 24,
        padding: 20,
        marginBottom: 20,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#FFF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    userName: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
    },
    mainBalance: {
        color: '#FFF',
        fontSize: 36,
        fontWeight: 'bold',
        marginBottom: 12,
    },
    percentBadge: {
        backgroundColor: 'rgba(16, 185, 129, 0.3)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        alignSelf: 'flex-start',
    },
    percentText: {
        color: '#10B981',
        fontSize: 13,
        fontWeight: '500',
    },
    // Action Buttons
    actionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    actionItem: {
        alignItems: 'center',
        width: (width - 32 - 36) / 4,
    },
    actionIcon: {
        width: 48,
        height: 48,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    actionLabel: {
        color: '#9CA3AF',
        fontSize: 11,
        textAlign: 'center',
        lineHeight: 14,
    },
    // Stats Cards
    statsRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 24,
    },
    statCard: {
        flex: 1,
        backgroundColor: '#1A1A2E',
        borderRadius: 16,
        padding: 16,
    },
    statHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
    },
    statDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    statTitle: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '500',
    },
    statSubtitle: {
        color: '#6B7280',
        fontSize: 12,
        marginBottom: 8,
    },
    statAmount: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    // Section
    section: {
        marginBottom: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionTitle: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
    },
    seeAll: {
        color: '#8B5CF6',
        fontSize: 13,
    },
    // Transactions
    transactionList: {
        gap: 8,
    },
    transactionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1A1A2E',
        padding: 14,
        borderRadius: 12,
    },
    txnIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    txnInfo: {
        flex: 1,
    },
    txnDesc: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '500',
    },
    txnDate: {
        color: '#6B7280',
        fontSize: 12,
        marginTop: 2,
    },
    txnAmount: {
        fontSize: 14,
        fontWeight: '600',
    },
    // Empty State
    emptyState: {
        alignItems: 'center',
        backgroundColor: '#1A1A2E',
        padding: 32,
        borderRadius: 16,
    },
    emptyText: {
        color: '#9CA3AF',
        fontSize: 16,
        fontWeight: '500',
        marginTop: 12,
    },
    emptyHint: {
        color: '#6B7280',
        fontSize: 13,
        marginTop: 4,
        textAlign: 'center',
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
        marginBottom: 8,
    },
    modalTitle: {
        color: '#FFF',
        fontSize: 20,
        fontWeight: 'bold',
    },
    modalDesc: {
        color: '#9CA3AF',
        fontSize: 14,
        marginBottom: 20,
    },
    balanceInput: {
        backgroundColor: '#0F0F23',
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FFF',
        padding: 16,
        borderRadius: 12,
        textAlign: 'center',
        marginBottom: 16,
    },
    quickAmounts: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 20,
    },
    quickAmountBtn: {
        backgroundColor: '#0F0F23',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
    },
    quickAmountText: {
        color: '#A78BFA',
        fontSize: 13,
        fontWeight: '500',
    },
    saveBalanceBtn: {
        backgroundColor: '#8B5CF6',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    saveBalanceBtnText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    skipBtn: {
        alignItems: 'center',
        marginTop: 16,
    },
    skipBtnText: {
        color: '#6B7280',
        fontSize: 14,
    },
});

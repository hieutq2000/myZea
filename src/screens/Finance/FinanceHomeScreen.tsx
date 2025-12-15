/**
 * FinanceHomeScreen - Màn hình chính quản lý tài chính
 * 
 * Features:
 * - Hiển thị số dư tổng
 * - Danh sách giao dịch gần đây
 * - Nút thêm giao dịch (tay + giọng nói)
 * - Truy cập nhanh: Ví, Mục tiêu, Thống kê, Lịch
 */

import React, { useState, useEffect, useCallback } from 'react';
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
    addTransaction,
    deleteTransaction,
} from '../../utils/finance/storage';
import { getCategoryById, ALL_CATEGORIES } from '../../utils/finance/categories';

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
    const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
    const [wallets, setWallets] = useState<Wallet[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

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

            setWallets(walletsData);
            setRecentTransactions(transactionsData.slice(0, 10)); // 10 giao dịch gần nhất
            setTotalBalance(balance);
            setMonthlyStats(stats);
        } catch (error) {
            console.error('Error loading finance data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Load khi màn hình focus
    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    // Pull to refresh
    const onRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };

    // Xóa giao dịch
    const handleDeleteTransaction = (txn: Transaction) => {
        Alert.alert(
            'Xóa giao dịch',
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

    // Render giao dịch
    const renderTransaction = (txn: Transaction) => {
        const category = getCategoryById(txn.categoryId);
        const isExpense = txn.type === 'expense';

        return (
            <TouchableOpacity
                key={txn.id}
                style={[styles.transactionItem, { backgroundColor: colors.card }]}
                onLongPress={() => handleDeleteTransaction(txn)}
                activeOpacity={0.7}
            >
                <View style={[styles.categoryIcon, { backgroundColor: category?.color + '20' }]}>
                    <Ionicons
                        name={category?.icon as any || 'help-outline'}
                        size={24}
                        color={category?.color || '#6B7280'}
                    />
                </View>
                <View style={styles.transactionInfo}>
                    <Text style={[styles.transactionDesc, { color: colors.text }]} numberOfLines={1}>
                        {txn.description || category?.name}
                    </Text>
                    <Text style={[styles.transactionMeta, { color: colors.textSecondary }]}>
                        {category?.name} • {formatDate(txn.date)}
                    </Text>
                </View>
                <Text style={[
                    styles.transactionAmount,
                    { color: isExpense ? '#EF4444' : '#10B981' }
                ]}>
                    {isExpense ? '-' : '+'}{formatMoney(txn.amount)}
                </Text>
            </TouchableOpacity>
        );
    };

    // Thêm giao dịch test (tạm thời)
    const handleAddTestTransaction = async (type: 'income' | 'expense') => {
        const category = type === 'expense'
            ? ALL_CATEGORIES.find(c => c.id === 'food')
            : ALL_CATEGORIES.find(c => c.id === 'salary');

        await addTransaction({
            walletId: wallets[0]?.id || 'wallet_default',
            type,
            amount: type === 'expense' ? Math.floor(Math.random() * 200000) + 10000 : Math.floor(Math.random() * 5000000) + 1000000,
            categoryId: category?.id || 'other',
            description: type === 'expense' ? 'Ăn sáng' : 'Nhận lương',
            date: new Date().toISOString().split('T')[0],
            createdBy: 'manual',
        });

        loadData();
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

            {/* Header */}
            <LinearGradient
                colors={['#10B981', '#059669']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.header}
            >
                <SafeAreaView>
                    <View style={styles.headerContent}>
                        <TouchableOpacity onPress={() => navigation.goBack()}>
                            <Ionicons name="arrow-back" size={24} color="#FFF" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Quản lý chi tiêu</Text>
                        <TouchableOpacity>
                            <Ionicons name="settings-outline" size={24} color="#FFF" />
                        </TouchableOpacity>
                    </View>

                    {/* Balance Card */}
                    <View style={styles.balanceCard}>
                        <Text style={styles.balanceLabel}>Tổng số dư</Text>
                        <Text style={styles.balanceAmount}>{formatMoney(totalBalance)}</Text>

                        <View style={styles.statsRow}>
                            <View style={styles.statItem}>
                                <View style={[styles.statIcon, { backgroundColor: 'rgba(16, 185, 129, 0.3)' }]}>
                                    <Ionicons name="arrow-down" size={16} color="#FFF" />
                                </View>
                                <View>
                                    <Text style={styles.statLabel}>Thu tháng này</Text>
                                    <Text style={styles.statValue}>+{formatMoney(monthlyStats.income)}</Text>
                                </View>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.statItem}>
                                <View style={[styles.statIcon, { backgroundColor: 'rgba(239, 68, 68, 0.3)' }]}>
                                    <Ionicons name="arrow-up" size={16} color="#FFF" />
                                </View>
                                <View>
                                    <Text style={styles.statLabel}>Chi tháng này</Text>
                                    <Text style={styles.statValue}>-{formatMoney(monthlyStats.expense)}</Text>
                                </View>
                            </View>
                        </View>
                    </View>
                </SafeAreaView>
            </LinearGradient>

            <ScrollView
                style={styles.content}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                {/* Quick Actions */}
                <View style={styles.section}>
                    <View style={styles.quickActions}>
                        <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: '#10B981' }]}
                            onPress={() => handleAddTestTransaction('income')}
                        >
                            <Ionicons name="add-circle-outline" size={24} color="#FFF" />
                            <Text style={styles.actionText}>Thêm Thu</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: '#EF4444' }]}
                            onPress={() => handleAddTestTransaction('expense')}
                        >
                            <Ionicons name="remove-circle-outline" size={24} color="#FFF" />
                            <Text style={styles.actionText}>Thêm Chi</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: '#8B5CF6' }]}
                            onPress={() => Alert.alert('Giọng nói', 'Tính năng đang phát triển')}
                        >
                            <Ionicons name="mic-outline" size={24} color="#FFF" />
                            <Text style={styles.actionText}>Nói</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Menu Grid */}
                <View style={styles.section}>
                    <View style={styles.menuGrid}>
                        <TouchableOpacity style={[styles.menuItem, { backgroundColor: colors.card }]}>
                            <View style={[styles.menuIcon, { backgroundColor: '#E0F2FE' }]}>
                                <Ionicons name="wallet-outline" size={24} color="#0EA5E9" />
                            </View>
                            <Text style={[styles.menuText, { color: colors.text }]}>Ví</Text>
                            <Text style={[styles.menuCount, { color: colors.textSecondary }]}>{wallets.length}/3</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.menuItem, { backgroundColor: colors.card }]}>
                            <View style={[styles.menuIcon, { backgroundColor: '#FEF3C7' }]}>
                                <Ionicons name="flag-outline" size={24} color="#F59E0B" />
                            </View>
                            <Text style={[styles.menuText, { color: colors.text }]}>Mục tiêu</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.menuItem, { backgroundColor: colors.card }]}>
                            <View style={[styles.menuIcon, { backgroundColor: '#E0E7FF' }]}>
                                <Ionicons name="calendar-outline" size={24} color="#6366F1" />
                            </View>
                            <Text style={[styles.menuText, { color: colors.text }]}>Lịch</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.menuItem, { backgroundColor: colors.card }]}>
                            <View style={[styles.menuIcon, { backgroundColor: '#FCE7F3' }]}>
                                <Ionicons name="pie-chart-outline" size={24} color="#EC4899" />
                            </View>
                            <Text style={[styles.menuText, { color: colors.text }]}>Thống kê</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Recent Transactions */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Giao dịch gần đây</Text>
                        <TouchableOpacity>
                            <Text style={{ color: colors.primary }}>Xem tất cả</Text>
                        </TouchableOpacity>
                    </View>

                    {recentTransactions.length === 0 ? (
                        <View style={[styles.emptyState, { backgroundColor: colors.card }]}>
                            <Ionicons name="receipt-outline" size={48} color={colors.textSecondary} />
                            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                                Chưa có giao dịch nào
                            </Text>
                            <Text style={[styles.emptyHint, { color: colors.textSecondary }]}>
                                Bấm "Thêm Thu" hoặc "Thêm Chi" để bắt đầu
                            </Text>
                        </View>
                    ) : (
                        <View style={styles.transactionList}>
                            {recentTransactions.map(renderTransaction)}
                        </View>
                    )}
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
        paddingBottom: 20,
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
    balanceCard: {
        marginHorizontal: 16,
        padding: 20,
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 20,
    },
    balanceLabel: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 14,
    },
    balanceAmount: {
        color: '#FFF',
        fontSize: 32,
        fontWeight: 'bold',
        marginVertical: 8,
    },
    statsRow: {
        flexDirection: 'row',
        marginTop: 16,
    },
    statItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    statIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    statLabel: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 11,
    },
    statValue: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '600',
    },
    statDivider: {
        width: 1,
        backgroundColor: 'rgba(255,255,255,0.2)',
        marginHorizontal: 8,
    },
    content: {
        flex: 1,
        marginTop: -10,
    },
    scrollContent: {
        paddingTop: 20,
    },
    section: {
        paddingHorizontal: 16,
        marginBottom: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    quickActions: {
        flexDirection: 'row',
        gap: 12,
    },
    actionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 12,
        gap: 8,
    },
    actionText: {
        color: '#FFF',
        fontWeight: '600',
        fontSize: 14,
    },
    menuGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    menuItem: {
        width: '47%',
        padding: 16,
        borderRadius: 16,
        alignItems: 'center',
    },
    menuIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    menuText: {
        fontSize: 14,
        fontWeight: '600',
    },
    menuCount: {
        fontSize: 12,
        marginTop: 2,
    },
    transactionList: {
        gap: 8,
    },
    transactionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 12,
    },
    categoryIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    transactionInfo: {
        flex: 1,
    },
    transactionDesc: {
        fontSize: 15,
        fontWeight: '500',
    },
    transactionMeta: {
        fontSize: 12,
        marginTop: 2,
    },
    transactionAmount: {
        fontSize: 15,
        fontWeight: '600',
    },
    emptyState: {
        alignItems: 'center',
        padding: 32,
        borderRadius: 16,
    },
    emptyText: {
        fontSize: 16,
        fontWeight: '500',
        marginTop: 12,
    },
    emptyHint: {
        fontSize: 13,
        marginTop: 4,
        textAlign: 'center',
    },
});

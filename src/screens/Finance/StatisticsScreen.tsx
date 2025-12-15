/**
 * StatisticsScreen - Màn hình thống kê chi tiêu
 * 
 * Features:
 * - Biểu đồ tròn chi tiêu theo danh mục
 * - Biểu đồ cột thu chi theo ngày/tuần/tháng
 * - Top danh mục chi tiêu nhiều nhất
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
    Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Transaction } from '../../types/finance';
import { getTransactions, getMonthlyStats } from '../../utils/finance/storage';
import { getCategoryById, EXPENSE_CATEGORIES } from '../../utils/finance/categories';

const { width } = Dimensions.get('window');

// Format số tiền
const formatMoney = (amount: number): string => {
    if (amount >= 1000000) {
        return (amount / 1000000).toFixed(1) + 'tr';
    }
    if (amount >= 1000) {
        return (amount / 1000).toFixed(0) + 'k';
    }
    return amount.toString();
};

const formatFullMoney = (amount: number): string => {
    return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
};

type PeriodType = 'week' | 'month' | 'year';

export default function StatisticsScreen() {
    const navigation = useNavigation();

    const [period, setPeriod] = useState<PeriodType>('month');
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [monthlyStats, setMonthlyStats] = useState({ income: 0, expense: 0, balance: 0 });
    const [categoryStats, setCategoryStats] = useState<{
        categoryId: string;
        name: string;
        icon: string;
        color: string;
        amount: number;
        percentage: number;
    }[]>([]);

    // Load data
    const loadData = async () => {
        const now = new Date();
        const allTransactions = await getTransactions();
        const stats = await getMonthlyStats(now.getFullYear(), now.getMonth() + 1);

        setTransactions(allTransactions);
        setMonthlyStats(stats);

        // Tính thống kê theo danh mục
        const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const monthTransactions = allTransactions.filter(t =>
            t.date.startsWith(monthStr) && t.type === 'expense'
        );

        const categoryMap: { [key: string]: number } = {};
        monthTransactions.forEach(txn => {
            categoryMap[txn.categoryId] = (categoryMap[txn.categoryId] || 0) + txn.amount;
        });

        const totalExpense = monthTransactions.reduce((sum, t) => sum + t.amount, 0);

        const stats_by_category = Object.entries(categoryMap)
            .map(([categoryId, amount]) => {
                const category = getCategoryById(categoryId);
                return {
                    categoryId,
                    name: category?.name || 'Khác',
                    icon: category?.icon || 'help-outline',
                    color: category?.color || '#6B7280',
                    amount,
                    percentage: totalExpense > 0 ? (amount / totalExpense) * 100 : 0,
                };
            })
            .sort((a, b) => b.amount - a.amount);

        setCategoryStats(stats_by_category);
    };

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    // Render pie chart (simple version)
    const renderPieChart = () => {
        if (categoryStats.length === 0) {
            return (
                <View style={styles.emptyChart}>
                    <Ionicons name="pie-chart-outline" size={64} color="#6B7280" />
                    <Text style={styles.emptyText}>Chưa có dữ liệu chi tiêu</Text>
                </View>
            );
        }

        let currentAngle = 0;
        const size = width - 80;
        const radius = size / 2;
        const center = radius;

        return (
            <View style={styles.pieChartContainer}>
                <View style={[styles.pieChart, { width: size, height: size }]}>
                    {/* Simple pie chart visualization */}
                    <View style={styles.pieCenter}>
                        <Text style={styles.pieCenterAmount}>{formatFullMoney(monthlyStats.expense)}</Text>
                        <Text style={styles.pieCenterLabel}>Tổng chi tiêu</Text>
                    </View>

                    {/* Category rings */}
                    {categoryStats.slice(0, 5).map((cat, index) => (
                        <View
                            key={cat.categoryId}
                            style={[
                                styles.pieRing,
                                {
                                    backgroundColor: cat.color + '40',
                                    borderColor: cat.color,
                                    width: size - (index * 30),
                                    height: size - (index * 30),
                                    borderRadius: (size - (index * 30)) / 2,
                                }
                            ]}
                        />
                    ))}
                </View>

                {/* Legend */}
                <View style={styles.legend}>
                    {categoryStats.slice(0, 5).map((cat) => (
                        <View key={cat.categoryId} style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: cat.color }]} />
                            <Text style={styles.legendText}>{cat.name}</Text>
                            <Text style={styles.legendPercent}>{cat.percentage.toFixed(1)}%</Text>
                        </View>
                    ))}
                </View>
            </View>
        );
    };

    // Render category list
    const renderCategoryList = () => {
        return (
            <View style={styles.categoryList}>
                {categoryStats.map((cat, index) => (
                    <View key={cat.categoryId} style={styles.categoryItem}>
                        <View style={styles.categoryLeft}>
                            <Text style={styles.categoryRank}>#{index + 1}</Text>
                            <View style={[styles.categoryIcon, { backgroundColor: cat.color + '30' }]}>
                                <Ionicons name={cat.icon as any} size={20} color={cat.color} />
                            </View>
                            <View>
                                <Text style={styles.categoryName}>{cat.name}</Text>
                                <Text style={styles.categoryPercent}>{cat.percentage.toFixed(1)}%</Text>
                            </View>
                        </View>
                        <Text style={styles.categoryAmount}>{formatFullMoney(cat.amount)}</Text>
                    </View>
                ))}

                {categoryStats.length === 0 && (
                    <View style={styles.emptyCategory}>
                        <Text style={styles.emptyCategoryText}>Chưa có chi tiêu trong tháng này</Text>
                    </View>
                )}
            </View>
        );
    };

    // Render summary cards
    const renderSummaryCards = () => {
        const balance = monthlyStats.income - monthlyStats.expense;

        return (
            <View style={styles.summaryRow}>
                <View style={[styles.summaryCard, { backgroundColor: '#10B98120' }]}>
                    <Ionicons name="arrow-down" size={20} color="#10B981" />
                    <Text style={styles.summaryLabel}>Thu nhập</Text>
                    <Text style={[styles.summaryAmount, { color: '#10B981' }]}>
                        {formatFullMoney(monthlyStats.income)}
                    </Text>
                </View>

                <View style={[styles.summaryCard, { backgroundColor: '#EF444420' }]}>
                    <Ionicons name="arrow-up" size={20} color="#EF4444" />
                    <Text style={styles.summaryLabel}>Chi tiêu</Text>
                    <Text style={[styles.summaryAmount, { color: '#EF4444' }]}>
                        {formatFullMoney(monthlyStats.expense)}
                    </Text>
                </View>

                <View style={[styles.summaryCard, { backgroundColor: balance >= 0 ? '#3B82F620' : '#F5910B20' }]}>
                    <Ionicons name="wallet" size={20} color={balance >= 0 ? '#3B82F6' : '#F59E0B'} />
                    <Text style={styles.summaryLabel}>Còn lại</Text>
                    <Text style={[styles.summaryAmount, { color: balance >= 0 ? '#3B82F6' : '#F59E0B' }]}>
                        {formatFullMoney(balance)}
                    </Text>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />

            {/* Header */}
            <LinearGradient
                colors={['#EC4899', '#8B5CF6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.header}
            >
                <SafeAreaView>
                    <View style={styles.headerContent}>
                        <TouchableOpacity onPress={() => navigation.goBack()}>
                            <Ionicons name="arrow-back" size={24} color="#FFF" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Thống kê chi tiêu</Text>
                        <View style={{ width: 24 }} />
                    </View>

                    {/* Period Selector */}
                    <View style={styles.periodSelector}>
                        {(['week', 'month', 'year'] as PeriodType[]).map((p) => (
                            <TouchableOpacity
                                key={p}
                                style={[styles.periodBtn, period === p && styles.periodBtnActive]}
                                onPress={() => setPeriod(p)}
                            >
                                <Text style={[styles.periodText, period === p && styles.periodTextActive]}>
                                    {p === 'week' ? 'Tuần' : p === 'month' ? 'Tháng' : 'Năm'}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </SafeAreaView>
            </LinearGradient>

            <ScrollView
                style={styles.content}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Summary Cards */}
                {renderSummaryCards()}

                {/* Pie Chart */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Chi tiêu theo danh mục</Text>
                    {renderPieChart()}
                </View>

                {/* Category Ranking */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Xếp hạng chi tiêu</Text>
                    {renderCategoryList()}
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>
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
        paddingBottom: 16,
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
    periodSelector: {
        flexDirection: 'row',
        marginHorizontal: 16,
        padding: 4,
        backgroundColor: 'rgba(0,0,0,0.2)',
        borderRadius: 12,
    },
    periodBtn: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 10,
    },
    periodBtnActive: {
        backgroundColor: '#FFF',
    },
    periodText: {
        color: 'rgba(255,255,255,0.7)',
        fontWeight: '600',
        fontSize: 13,
    },
    periodTextActive: {
        color: '#8B5CF6',
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
    },
    // Summary Cards
    summaryRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 24,
    },
    summaryCard: {
        flex: 1,
        padding: 12,
        borderRadius: 12,
        alignItems: 'center',
    },
    summaryLabel: {
        color: '#9CA3AF',
        fontSize: 11,
        marginTop: 4,
    },
    summaryAmount: {
        fontSize: 14,
        fontWeight: 'bold',
        marginTop: 4,
    },
    // Section
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 16,
    },
    // Pie Chart
    pieChartContainer: {
        alignItems: 'center',
    },
    pieChart: {
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    pieCenter: {
        position: 'absolute',
        alignItems: 'center',
        zIndex: 10,
    },
    pieCenterAmount: {
        color: '#FFF',
        fontSize: 20,
        fontWeight: 'bold',
    },
    pieCenterLabel: {
        color: '#9CA3AF',
        fontSize: 12,
    },
    pieRing: {
        position: 'absolute',
        borderWidth: 3,
        opacity: 0.5,
    },
    emptyChart: {
        alignItems: 'center',
        padding: 40,
    },
    emptyText: {
        color: '#6B7280',
        marginTop: 12,
    },
    // Legend
    legend: {
        width: '100%',
        gap: 8,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1A1A2E',
        padding: 12,
        borderRadius: 10,
    },
    legendDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: 10,
    },
    legendText: {
        color: '#FFF',
        flex: 1,
        fontSize: 14,
    },
    legendPercent: {
        color: '#9CA3AF',
        fontSize: 14,
        fontWeight: '500',
    },
    // Category List
    categoryList: {
        gap: 8,
    },
    categoryItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#1A1A2E',
        padding: 14,
        borderRadius: 12,
    },
    categoryLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    categoryRank: {
        color: '#6B7280',
        fontSize: 12,
        fontWeight: 'bold',
        width: 24,
    },
    categoryIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    categoryName: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '500',
    },
    categoryPercent: {
        color: '#6B7280',
        fontSize: 12,
    },
    categoryAmount: {
        color: '#EF4444',
        fontSize: 14,
        fontWeight: '600',
    },
    emptyCategory: {
        padding: 32,
        alignItems: 'center',
    },
    emptyCategoryText: {
        color: '#6B7280',
        fontSize: 14,
    },
});

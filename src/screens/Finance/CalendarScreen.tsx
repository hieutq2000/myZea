/**
 * CalendarScreen - Màn hình lịch chi tiêu
 * 
 * Features:
 * - Xem chi tiêu theo ngày trên lịch
 * - Đánh dấu màu ngày có chi tiêu nhiều/ít
 * - Xem chi tiết giao dịch trong ngày
 */

import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    StatusBar,
    Platform,
    Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Transaction } from '../../types/finance';
import { getTransactions } from '../../utils/finance/storage';
import { getCategoryById } from '../../utils/finance/categories';

const { width } = Dimensions.get('window');
const CELL_SIZE = (width - 48) / 7;

// Format số tiền
const formatMoney = (amount: number): string => {
    return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
};

const WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const MONTHS = [
    'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
    'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
];

export default function CalendarScreen() {
    const navigation = useNavigation();

    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [dailyStats, setDailyStats] = useState<{ [date: string]: { income: number; expense: number } }>({});

    // Load data
    const loadData = async () => {
        const allTransactions = await getTransactions();
        setTransactions(allTransactions);

        // Tính thống kê theo ngày
        const stats: { [date: string]: { income: number; expense: number } } = {};
        allTransactions.forEach(txn => {
            if (!stats[txn.date]) {
                stats[txn.date] = { income: 0, expense: 0 };
            }
            if (txn.type === 'income') {
                stats[txn.date].income += txn.amount;
            } else {
                stats[txn.date].expense += txn.amount;
            }
        });
        setDailyStats(stats);
    };

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    // Get calendar days
    const getCalendarDays = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);

        const startPadding = firstDay.getDay(); // 0 = Sunday
        const days: (number | null)[] = [];

        // Add padding for days before month starts
        for (let i = 0; i < startPadding; i++) {
            days.push(null);
        }

        // Add days of month
        for (let i = 1; i <= lastDay.getDate(); i++) {
            days.push(i);
        }

        return days;
    };

    // Get date string
    const getDateString = (day: number) => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1;
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    };

    // Get expense level (for color coding)
    const getExpenseLevel = (dateStr: string): 'none' | 'low' | 'medium' | 'high' => {
        const stat = dailyStats[dateStr];
        if (!stat || stat.expense === 0) return 'none';
        if (stat.expense < 100000) return 'low';
        if (stat.expense < 500000) return 'medium';
        return 'high';
    };

    // Navigate month
    const navigateMonth = (direction: number) => {
        const newDate = new Date(currentDate);
        newDate.setMonth(newDate.getMonth() + direction);
        setCurrentDate(newDate);
        setSelectedDate(null);
    };

    // Get transactions for selected date
    const getSelectedDateTransactions = () => {
        if (!selectedDate) return [];
        return transactions.filter(t => t.date === selectedDate);
    };

    // Render calendar day
    const renderDay = (day: number | null, index: number) => {
        if (day === null) {
            return <View key={`empty-${index}`} style={styles.dayCell} />;
        }

        const dateStr = getDateString(day);
        const isToday = dateStr === new Date().toISOString().split('T')[0];
        const isSelected = dateStr === selectedDate;
        const level = getExpenseLevel(dateStr);
        const stat = dailyStats[dateStr];

        return (
            <TouchableOpacity
                key={dateStr}
                style={[
                    styles.dayCell,
                    isToday && styles.dayCellToday,
                    isSelected && styles.dayCellSelected,
                ]}
                onPress={() => setSelectedDate(dateStr)}
            >
                <Text style={[
                    styles.dayText,
                    isToday && styles.dayTextToday,
                    isSelected && styles.dayTextSelected,
                ]}>
                    {day}
                </Text>

                {/* Expense indicator */}
                {level !== 'none' && (
                    <View style={[
                        styles.expenseIndicator,
                        level === 'low' && { backgroundColor: '#10B981' },
                        level === 'medium' && { backgroundColor: '#F59E0B' },
                        level === 'high' && { backgroundColor: '#EF4444' },
                    ]} />
                )}
            </TouchableOpacity>
        );
    };

    // Render transaction
    const renderTransaction = (txn: Transaction) => {
        const category = getCategoryById(txn.categoryId);
        const isExpense = txn.type === 'expense';

        return (
            <View key={txn.id} style={styles.txnItem}>
                <View style={[styles.txnIcon, { backgroundColor: category?.color + '30' }]}>
                    <Ionicons
                        name={category?.icon as any || 'help-outline'}
                        size={18}
                        color={category?.color || '#6B7280'}
                    />
                </View>
                <View style={styles.txnInfo}>
                    <Text style={styles.txnDesc}>{txn.description || category?.name}</Text>
                    <Text style={styles.txnCategory}>{category?.name}</Text>
                </View>
                <Text style={[styles.txnAmount, { color: isExpense ? '#EF4444' : '#10B981' }]}>
                    {isExpense ? '-' : '+'}{formatMoney(txn.amount)}
                </Text>
            </View>
        );
    };

    const selectedTransactions = getSelectedDateTransactions();
    const selectedDayStats = selectedDate ? dailyStats[selectedDate] : null;

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
                        <Text style={styles.headerTitle}>Lịch chi tiêu</Text>
                        <TouchableOpacity onPress={() => setCurrentDate(new Date())}>
                            <Text style={styles.todayBtn}>Hôm nay</Text>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </LinearGradient>

            <ScrollView
                style={styles.content}
                showsVerticalScrollIndicator={false}
            >
                {/* Month Navigator */}
                <View style={styles.monthNav}>
                    <TouchableOpacity onPress={() => navigateMonth(-1)}>
                        <Ionicons name="chevron-back" size={24} color="#FFF" />
                    </TouchableOpacity>
                    <Text style={styles.monthTitle}>
                        {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
                    </Text>
                    <TouchableOpacity onPress={() => navigateMonth(1)}>
                        <Ionicons name="chevron-forward" size={24} color="#FFF" />
                    </TouchableOpacity>
                </View>

                {/* Weekday Headers */}
                <View style={styles.weekdayRow}>
                    {WEEKDAYS.map((day, index) => (
                        <View key={day} style={styles.weekdayCell}>
                            <Text style={[
                                styles.weekdayText,
                                index === 0 && { color: '#EF4444' },
                            ]}>
                                {day}
                            </Text>
                        </View>
                    ))}
                </View>

                {/* Calendar Grid */}
                <View style={styles.calendarGrid}>
                    {getCalendarDays().map((day, index) => renderDay(day, index))}
                </View>

                {/* Legend */}
                <View style={styles.legend}>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
                        <Text style={styles.legendText}>&lt;100k</Text>
                    </View>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
                        <Text style={styles.legendText}>100k-500k</Text>
                    </View>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
                        <Text style={styles.legendText}>&gt;500k</Text>
                    </View>
                </View>

                {/* Selected Day Details */}
                {selectedDate && (
                    <View style={styles.dayDetails}>
                        <View style={styles.dayDetailsHeader}>
                            <Text style={styles.dayDetailsTitle}>
                                {new Date(selectedDate).toLocaleDateString('vi-VN', {
                                    weekday: 'long',
                                    day: 'numeric',
                                    month: 'long',
                                })}
                            </Text>
                            {selectedDayStats && (
                                <View style={styles.dayStatsBadges}>
                                    {selectedDayStats.income > 0 && (
                                        <Text style={styles.incomeLabel}>
                                            +{formatMoney(selectedDayStats.income)}
                                        </Text>
                                    )}
                                    {selectedDayStats.expense > 0 && (
                                        <Text style={styles.expenseLabel}>
                                            -{formatMoney(selectedDayStats.expense)}
                                        </Text>
                                    )}
                                </View>
                            )}
                        </View>

                        {selectedTransactions.length === 0 ? (
                            <View style={styles.noTransactions}>
                                <Text style={styles.noTransactionsText}>Không có giao dịch</Text>
                            </View>
                        ) : (
                            <View style={styles.transactionsList}>
                                {selectedTransactions.map(renderTransaction)}
                            </View>
                        )}
                    </View>
                )}

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
    todayBtn: {
        color: '#FFF',
        fontSize: 14,
        opacity: 0.8,
    },
    content: {
        flex: 1,
        padding: 16,
    },
    // Month Navigator
    monthNav: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    monthTitle: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '600',
    },
    // Weekdays
    weekdayRow: {
        flexDirection: 'row',
        marginBottom: 8,
    },
    weekdayCell: {
        width: CELL_SIZE,
        alignItems: 'center',
        paddingVertical: 8,
    },
    weekdayText: {
        color: '#9CA3AF',
        fontSize: 12,
        fontWeight: '500',
    },
    // Calendar Grid
    calendarGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    dayCell: {
        width: CELL_SIZE,
        height: CELL_SIZE,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
    },
    dayCellToday: {
        backgroundColor: 'rgba(139, 92, 246, 0.3)',
        borderRadius: CELL_SIZE / 2,
    },
    dayCellSelected: {
        backgroundColor: '#8B5CF6',
        borderRadius: CELL_SIZE / 2,
    },
    dayText: {
        color: '#FFF',
        fontSize: 14,
    },
    dayTextToday: {
        fontWeight: 'bold',
    },
    dayTextSelected: {
        color: '#FFF',
        fontWeight: 'bold',
    },
    expenseIndicator: {
        position: 'absolute',
        bottom: 4,
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    // Legend
    legend: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 20,
        marginVertical: 16,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    legendDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    legendText: {
        color: '#6B7280',
        fontSize: 11,
    },
    // Day Details
    dayDetails: {
        backgroundColor: '#1A1A2E',
        borderRadius: 16,
        padding: 16,
        marginTop: 8,
    },
    dayDetailsHeader: {
        marginBottom: 12,
    },
    dayDetailsTitle: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
        textTransform: 'capitalize',
    },
    dayStatsBadges: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 8,
    },
    incomeLabel: {
        color: '#10B981',
        fontSize: 14,
        fontWeight: '500',
    },
    expenseLabel: {
        color: '#EF4444',
        fontSize: 14,
        fontWeight: '500',
    },
    noTransactions: {
        padding: 20,
        alignItems: 'center',
    },
    noTransactionsText: {
        color: '#6B7280',
        fontSize: 14,
    },
    transactionsList: {
        gap: 8,
    },
    txnItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0F0F23',
        padding: 12,
        borderRadius: 10,
    },
    txnIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    txnInfo: {
        flex: 1,
    },
    txnDesc: {
        color: '#FFF',
        fontSize: 14,
    },
    txnCategory: {
        color: '#6B7280',
        fontSize: 12,
    },
    txnAmount: {
        fontSize: 14,
        fontWeight: '600',
    },
});

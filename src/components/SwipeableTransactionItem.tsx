/**
 * SwipeableTransactionItem - Giao dịch có thể trượt để hiện nút sửa/xóa
 */

import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Transaction, Category } from '../types/finance';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BUTTON_WIDTH = 70;
const SWIPE_THRESHOLD = BUTTON_WIDTH * 1.5;

interface Props {
    transaction: Transaction;
    category: Category | undefined;
    onEdit: () => void;
    onDelete: () => void;
}

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

export default function SwipeableTransactionItem({
    transaction,
    category,
    onEdit,
    onDelete
}: Props) {
    const translateX = useSharedValue(0);
    const isExpense = transaction.type === 'expense';

    const panGesture = Gesture.Pan()
        .activeOffsetX([-10, 10])
        .onUpdate((event) => {
            // Chỉ cho phép trượt sang trái
            const newTranslateX = Math.min(0, Math.max(-BUTTON_WIDTH * 2, event.translationX));
            translateX.value = newTranslateX;
        })
        .onEnd((event) => {
            if (translateX.value < -SWIPE_THRESHOLD) {
                // Mở hoàn toàn
                translateX.value = withSpring(-BUTTON_WIDTH * 2, { damping: 20 });
            } else {
                // Đóng lại
                translateX.value = withSpring(0, { damping: 20 });
            }
        });

    const tapGesture = Gesture.Tap()
        .onEnd(() => {
            if (translateX.value < -10) {
                // Nếu đang mở, tap để đóng
                translateX.value = withSpring(0, { damping: 20 });
            }
        });

    const composedGesture = Gesture.Simultaneous(panGesture, tapGesture);

    const animatedRowStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: translateX.value }],
    }));

    const animatedButtonsStyle = useAnimatedStyle(() => ({
        opacity: Math.min(1, Math.abs(translateX.value) / BUTTON_WIDTH),
        transform: [{
            translateX: Math.max(0, translateX.value + BUTTON_WIDTH * 2)
        }],
    }));

    const handleEdit = () => {
        translateX.value = withSpring(0, { damping: 20 });
        setTimeout(onEdit, 200);
    };

    const handleDelete = () => {
        translateX.value = withSpring(0, { damping: 20 });
        setTimeout(onDelete, 200);
    };

    return (
        <View style={styles.container}>
            {/* Action Buttons (behind the row) */}
            <Animated.View style={[styles.actionButtons, animatedButtonsStyle]}>
                <TouchableOpacity
                    style={[styles.actionBtn, styles.editBtn]}
                    onPress={handleEdit}
                >
                    <Ionicons name="create-outline" size={20} color="#FFF" />
                    <Text style={styles.actionText}>Sửa</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.actionBtn, styles.deleteBtn]}
                    onPress={handleDelete}
                >
                    <Ionicons name="trash-outline" size={20} color="#FFF" />
                    <Text style={styles.actionText}>Xóa</Text>
                </TouchableOpacity>
            </Animated.View>

            {/* Swipeable Row */}
            <GestureDetector gesture={composedGesture}>
                <Animated.View style={[styles.row, animatedRowStyle]}>
                    <View style={[styles.txnIcon, { backgroundColor: (category?.color || '#6B7280') + '30' }]}>
                        <Ionicons
                            name={category?.icon as any || 'help-outline'}
                            size={20}
                            color={category?.color || '#6B7280'}
                        />
                    </View>
                    <View style={styles.txnInfo}>
                        <Text style={styles.txnDesc} numberOfLines={1}>
                            {transaction.description || category?.name}
                        </Text>
                        <Text style={styles.txnDate}>{formatDate(transaction.date)}</Text>
                    </View>
                    <Text style={[styles.txnAmount, { color: isExpense ? '#EF4444' : '#10B981' }]}>
                        {isExpense ? '-' : '+'}{formatMoney(transaction.amount)}
                    </Text>
                </Animated.View>
            </GestureDetector>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'relative',
        marginBottom: 8,
        borderRadius: 12,
        overflow: 'hidden',
    },
    row: {
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
    // Action Buttons
    actionButtons: {
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        flexDirection: 'row',
    },
    actionBtn: {
        width: BUTTON_WIDTH,
        justifyContent: 'center',
        alignItems: 'center',
    },
    editBtn: {
        backgroundColor: '#3B82F6',
    },
    deleteBtn: {
        backgroundColor: '#EF4444',
    },
    actionText: {
        color: '#FFF',
        fontSize: 11,
        marginTop: 4,
    },
});

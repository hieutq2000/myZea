import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    StatusBar,
    RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../utils/theme';
import { User, ExamResult } from '../types';

interface HistoryScreenProps {
    user: User;
}

export default function HistoryScreen({ user }: HistoryScreenProps) {
    const [refreshing, setRefreshing] = useState(false);

    // Mock data - later can be fetched from API
    const examHistory: ExamResult[] = user.history || [];

    const onRefresh = async () => {
        setRefreshing(true);
        // TODO: Fetch from API
        setTimeout(() => setRefreshing(false), 1000);
    };

    const getScoreColor = (score: string) => {
        if (score === 'ĐẠT') return COLORS.success;
        return COLORS.error;
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

            {/* Header */}
            <View style={styles.header}>
                <MaterialIcons name="history" size={24} color={COLORS.primary} />
                <Text style={styles.headerTitle}>Lịch sử bài thi</Text>
            </View>

            {/* Stats Summary */}
            <View style={styles.statsRow}>
                <View style={styles.statCard}>
                    <Text style={styles.statNumber}>{examHistory.length}</Text>
                    <Text style={styles.statLabel}>Bài thi</Text>
                </View>
                <View style={styles.statCard}>
                    <Text style={[styles.statNumber, { color: COLORS.success }]}>
                        {examHistory.filter(e => e.score === 'ĐẠT').length}
                    </Text>
                    <Text style={styles.statLabel}>Đạt</Text>
                </View>
                <View style={styles.statCard}>
                    <Text style={[styles.statNumber, { color: COLORS.primary }]}>
                        {examHistory.length > 0
                            ? Math.round(examHistory.filter(e => e.score === 'ĐẠT').length / examHistory.length * 100)
                            : 0}%
                    </Text>
                    <Text style={styles.statLabel}>TB</Text>
                </View>
            </View>

            {/* History List */}
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                {examHistory.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Feather name="inbox" size={60} color={COLORS.textMuted} />
                        <Text style={styles.emptyTitle}>Chưa có bài thi nào</Text>
                        <Text style={styles.emptySubtitle}>
                            Hãy bắt đầu làm bài thi để xem lịch sử tại đây
                        </Text>
                    </View>
                ) : (
                    examHistory.map((exam, index) => (
                        <View key={exam.id || index} style={styles.examCard}>
                            <View style={styles.examHeader}>
                                <View style={styles.examInfo}>
                                    <Text style={styles.examTopic}>{exam.topic}</Text>
                                    <Text style={styles.examDate}>
                                        {formatDate(exam.timestamp)}
                                    </Text>
                                </View>
                                <View style={[
                                    styles.scoreBadge,
                                    { backgroundColor: getScoreColor(exam.score) + '20' }
                                ]}>
                                    <Text style={[
                                        styles.scoreText,
                                        { color: getScoreColor(exam.score) }
                                    ]}>
                                        {exam.score}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.examStats}>
                                <View style={styles.examStat}>
                                    <Feather name="clock" size={14} color={COLORS.textMuted} />
                                    <Text style={styles.examStatText}>
                                        {exam.duration || 'N/A'}
                                    </Text>
                                </View>
                                <View style={styles.examStat}>
                                    <Feather name="message-circle" size={14} color={COLORS.textMuted} />
                                    <Text style={styles.examStatText}>
                                        {exam.transcript?.length || 0} câu hỏi
                                    </Text>
                                </View>
                            </View>
                        </View>
                    ))
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.lg,
        paddingBottom: SPACING.md,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: COLORS.text,
        marginLeft: SPACING.sm,
    },
    statsRow: {
        flexDirection: 'row',
        paddingHorizontal: SPACING.lg,
        marginBottom: SPACING.md,
        gap: SPACING.sm,
    },
    statCard: {
        flex: 1,
        backgroundColor: COLORS.white,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md,
        alignItems: 'center',
        ...SHADOWS.sm,
    },
    statNumber: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    statLabel: {
        fontSize: 12,
        color: COLORS.textMuted,
        marginTop: 2,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: SPACING.lg,
        paddingTop: 0,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: SPACING.xl * 2,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.text,
        marginTop: SPACING.lg,
    },
    emptySubtitle: {
        fontSize: 14,
        color: COLORS.textMuted,
        textAlign: 'center',
        marginTop: SPACING.sm,
        paddingHorizontal: SPACING.xl,
    },
    examCard: {
        backgroundColor: COLORS.white,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md,
        marginBottom: SPACING.md,
        ...SHADOWS.sm,
    },
    examHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    examInfo: {
        flex: 1,
    },
    examTopic: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
    },
    examDate: {
        fontSize: 12,
        color: COLORS.textMuted,
        marginTop: 2,
    },
    scoreBadge: {
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.xs,
        borderRadius: BORDER_RADIUS.md,
    },
    scoreText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    examStats: {
        flexDirection: 'row',
        marginTop: SPACING.sm,
        gap: SPACING.lg,
    },
    examStat: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    examStatText: {
        fontSize: 12,
        color: COLORS.textMuted,
    },
});

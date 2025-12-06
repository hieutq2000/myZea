import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Image,
    SafeAreaView,
    StatusBar,
    Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../utils/theme';
import { User, LiveMode, TargetAudience, Topic, TOPIC_LABELS, TOPIC_ICONS } from '../types';

interface HomeScreenProps {
    user: User;
    onLogout: () => void;
    onOpenProfile: () => void;
    onStartSession: (mode: LiveMode, topic: Topic, audience: TargetAudience) => void;
}

export default function HomeScreen({ user, onLogout, onOpenProfile, onStartSession }: HomeScreenProps) {
    const [selectedMode, setSelectedMode] = useState<LiveMode | null>(null);
    const [targetAudience, setTargetAudience] = useState<TargetAudience>(TargetAudience.GENERAL);

    const modes = [
        {
            id: LiveMode.PRACTICE,
            icon: '📚',
            title: 'Luyện Tập',
            desc: 'Ôn tập kiến thức với AI',
            color: '#10B981',
            bgColor: '#ECFDF5'
        },
        {
            id: LiveMode.EXAM,
            icon: '📝',
            title: 'Thi Thử',
            desc: 'Kiểm tra với giám sát AI',
            color: '#F97316',
            bgColor: '#FFF7ED'
        },
    ];

    const renderModeSelection = () => (
        <View style={styles.modeSection}>
            <Text style={styles.sectionTitle}>📖 Chọn Hình Thức Học</Text>

            <View style={styles.modeGrid}>
                {modes.map((mode) => (
                    <TouchableOpacity
                        key={mode.id}
                        style={[
                            styles.modeCard,
                            selectedMode === mode.id && styles.modeCardActive,
                            { borderColor: selectedMode === mode.id ? mode.color : COLORS.border }
                        ]}
                        onPress={() => setSelectedMode(mode.id)}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.modeIconContainer, { backgroundColor: mode.bgColor }]}>
                            <Text style={styles.modeIcon}>{mode.icon}</Text>
                        </View>
                        <View style={styles.modeInfo}>
                            <Text style={[
                                styles.modeTitle,
                                selectedMode === mode.id && { color: mode.color }
                            ]}>
                                {mode.title}
                            </Text>
                            <Text style={styles.modeDesc}>{mode.desc}</Text>
                        </View>
                        {selectedMode === mode.id && (
                            <View style={[styles.modeCheck, { backgroundColor: mode.color }]}>
                                <Text style={styles.modeCheckIcon}>✓</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                ))}
            </View>

            {/* Kids Mode Toggle */}
            <TouchableOpacity
                style={[
                    styles.kidsToggle,
                    targetAudience === TargetAudience.KIDS && styles.kidsToggleActive
                ]}
                onPress={() => setTargetAudience(
                    targetAudience === TargetAudience.KIDS
                        ? TargetAudience.GENERAL
                        : TargetAudience.KIDS
                )}
                activeOpacity={0.8}
            >
                <Text style={styles.kidsToggleIcon}>
                    {targetAudience === TargetAudience.KIDS ? '🧒' : '👶'}
                </Text>
                <Text style={[
                    styles.kidsToggleText,
                    targetAudience === TargetAudience.KIDS && styles.kidsToggleTextActive
                ]}>
                    {targetAudience === TargetAudience.KIDS ? 'Chế độ trẻ em đang BẬT' : 'Bật chế độ trẻ em'}
                </Text>
                <View style={[
                    styles.kidsSwitch,
                    targetAudience === TargetAudience.KIDS && styles.kidsSwitchActive
                ]}>
                    <View style={[
                        styles.kidsSwitchKnob,
                        targetAudience === TargetAudience.KIDS && styles.kidsSwitchKnobActive
                    ]} />
                </View>
            </TouchableOpacity>
        </View>
    );

    const renderTopicSelection = () => {
        if (!selectedMode) return null;

        const topics = Object.values(Topic).filter(t =>
            targetAudience === TargetAudience.KIDS ? t.startsWith('KIDS_') : !t.startsWith('KIDS_')
        );

        return (
            <View style={styles.topicsSection}>
                <Text style={styles.sectionTitle}>
                    {targetAudience === TargetAudience.KIDS ? '🌈 Chọn Chủ Đề' : '🎯 Chọn Môn Học'}
                </Text>

                <View style={styles.topicsGrid}>
                    {topics.map((topic) => (
                        <TouchableOpacity
                            key={topic}
                            style={[
                                styles.topicCard,
                                targetAudience === TargetAudience.KIDS && styles.kidsTopicCard
                            ]}
                            onPress={() => onStartSession(selectedMode, topic, targetAudience)}
                            activeOpacity={0.7}
                        >
                            <LinearGradient
                                colors={targetAudience === TargetAudience.KIDS
                                    ? ['#FDF2F8', '#FCE7F3']
                                    : ['#F8FAFC', '#F1F5F9']
                                }
                                style={styles.topicGradient}
                            >
                                <Text style={styles.topicIcon}>{TOPIC_ICONS[topic]}</Text>
                                <Text style={[
                                    styles.topicLabel,
                                    targetAudience === TargetAudience.KIDS && styles.kidsTopicLabel
                                ]}>
                                    {TOPIC_LABELS[topic]}
                                </Text>
                                <View style={styles.topicArrow}>
                                    <Text style={styles.topicArrowText}>→</Text>
                                </View>
                            </LinearGradient>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

            {/* Compact Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.profileBtn} onPress={onOpenProfile}>
                    {user.avatar ? (
                        <Image source={{ uri: user.avatar }} style={styles.avatar} />
                    ) : (
                        <LinearGradient
                            colors={COLORS.gradientPrimary as [string, string]}
                            style={styles.avatarGradient}
                        >
                            <Text style={styles.avatarText}>{user.name?.charAt(0) || '👤'}</Text>
                        </LinearGradient>
                    )}
                </TouchableOpacity>

                <View style={styles.headerCenter}>
                    <Text style={styles.greeting}>Xin chào 👋</Text>
                    <Text style={styles.userName}>{user.name || 'Học viên'}</Text>
                </View>

                <View style={styles.headerRight}>
                    <View style={styles.statBadge}>
                        <Text style={styles.statIcon}>⭐</Text>
                        <Text style={styles.statValue}>Lv.{user.level || 1}</Text>
                    </View>
                    <View style={styles.statBadge}>
                        <Text style={styles.statIcon}>💎</Text>
                        <Text style={styles.statValue}>{user.xp || 0}</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.logoutBtn}
                        onPress={() => Alert.alert(
                            'Đăng xuất',
                            'Bạn có chắc muốn đăng xuất?',
                            [
                                { text: 'Hủy', style: 'cancel' },
                                { text: 'Đăng xuất', style: 'destructive', onPress: onLogout }
                            ]
                        )}
                    >
                        <Text style={styles.logoutIcon}>🚪</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView
                style={styles.content}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* Quick Stats Card */}
                <View style={styles.statsCard}>
                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <Text style={styles.statNumber}>{user.history?.length || 0}</Text>
                            <Text style={styles.statLabel}>Bài thi</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statNumber}>
                                {user.history?.filter(h => h.score === 'ĐẠT').length || 0}
                            </Text>
                            <Text style={styles.statLabel}>Đạt</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statNumber}>{user.badges?.length || 0}</Text>
                            <Text style={styles.statLabel}>Huy hiệu</Text>
                        </View>
                    </View>
                </View>

                {renderModeSelection()}
                {renderTopicSelection()}

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        backgroundColor: COLORS.white,
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
    },
    profileBtn: {
        marginRight: SPACING.sm,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 2,
        borderColor: COLORS.primary,
    },
    avatarGradient: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.white,
    },
    headerCenter: {
        flex: 1,
    },
    greeting: {
        fontSize: 12,
        color: COLORS.textMuted,
    },
    userName: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.text,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    statBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F1F5F9',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
    },
    statIcon: {
        fontSize: 12,
    },
    statValue: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.text,
    },
    logoutBtn: {
        padding: 8,
    },
    logoutIcon: {
        fontSize: 18,
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        padding: SPACING.md,
    },
    statsCard: {
        backgroundColor: COLORS.white,
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.md,
        marginBottom: SPACING.lg,
        ...SHADOWS.sm,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
    },
    statItem: {
        alignItems: 'center',
        flex: 1,
    },
    statNumber: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.primary,
    },
    statLabel: {
        fontSize: 12,
        color: COLORS.textMuted,
        marginTop: 2,
    },
    statDivider: {
        width: 1,
        height: 30,
        backgroundColor: '#E2E8F0',
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: SPACING.md,
    },
    modeSection: {
        marginBottom: SPACING.lg,
    },
    modeGrid: {
        gap: SPACING.sm,
    },
    modeCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md,
        borderWidth: 2,
        borderColor: COLORS.border,
        ...SHADOWS.sm,
    },
    modeCardActive: {
        backgroundColor: '#FFFBEB',
    },
    modeIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: SPACING.md,
    },
    modeIcon: {
        fontSize: 24,
    },
    modeInfo: {
        flex: 1,
    },
    modeTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
    },
    modeDesc: {
        fontSize: 12,
        color: COLORS.textMuted,
        marginTop: 2,
    },
    modeCheck: {
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modeCheckIcon: {
        color: COLORS.white,
        fontSize: 14,
        fontWeight: 'bold',
    },
    kidsToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md,
        marginTop: SPACING.md,
        borderWidth: 2,
        borderColor: '#E2E8F0',
    },
    kidsToggleActive: {
        borderColor: '#EC4899',
        backgroundColor: '#FDF2F8',
    },
    kidsToggleIcon: {
        fontSize: 24,
        marginRight: SPACING.sm,
    },
    kidsToggleText: {
        flex: 1,
        fontSize: 14,
        color: COLORS.textMuted,
    },
    kidsToggleTextActive: {
        color: '#EC4899',
        fontWeight: '600',
    },
    kidsSwitch: {
        width: 44,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#E2E8F0',
        padding: 2,
    },
    kidsSwitchActive: {
        backgroundColor: '#EC4899',
    },
    kidsSwitchKnob: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: COLORS.white,
    },
    kidsSwitchKnobActive: {
        marginLeft: 20,
    },
    topicsSection: {
        marginBottom: SPACING.md,
    },
    topicsGrid: {
        gap: SPACING.sm,
    },
    topicCard: {
        borderRadius: BORDER_RADIUS.lg,
        overflow: 'hidden',
        ...SHADOWS.sm,
    },
    kidsTopicCard: {
        borderWidth: 2,
        borderColor: '#FBCFE8',
    },
    topicGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.md,
    },
    topicIcon: {
        fontSize: 28,
        marginRight: SPACING.md,
    },
    topicLabel: {
        flex: 1,
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.text,
    },
    kidsTopicLabel: {
        color: '#DB2777',
    },
    topicArrow: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: COLORS.white,
        alignItems: 'center',
        justifyContent: 'center',
        ...SHADOWS.sm,
    },
    topicArrowText: {
        fontSize: 16,
        color: COLORS.primary,
        fontWeight: 'bold',
    },
});

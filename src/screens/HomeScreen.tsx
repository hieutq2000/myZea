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

    const renderModeSelection = () => (
        <View style={styles.modeContainer}>
            <Text style={styles.sectionTitle}>Chọn Chế Độ</Text>

            <View style={styles.modeButtons}>
                <TouchableOpacity
                    style={[styles.modeButton, selectedMode === LiveMode.PRACTICE && styles.modeButtonActive]}
                    onPress={() => setSelectedMode(LiveMode.PRACTICE)}
                    activeOpacity={0.8}
                >
                    <Text style={styles.modeIcon}>📖</Text>
                    <Text style={[styles.modeText, selectedMode === LiveMode.PRACTICE && styles.modeTextActive]}>
                        Luyện Tập
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.modeButton, styles.examButton, selectedMode === LiveMode.EXAM && styles.examButtonActive]}
                    onPress={() => setSelectedMode(LiveMode.EXAM)}
                    activeOpacity={0.8}
                >
                    <LinearGradient
                        colors={selectedMode === LiveMode.EXAM ? COLORS.gradientPrimary as [string, string] : ['transparent', 'transparent']}
                        style={styles.examGradient}
                    >
                        <Text style={styles.modeIcon}>📝</Text>
                        <Text style={[styles.modeText, selectedMode === LiveMode.EXAM && { color: COLORS.white }]}>
                            Thi Thử
                        </Text>
                    </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.modeButton, targetAudience === TargetAudience.KIDS && styles.kidsButtonActive]}
                    onPress={() => {
                        setTargetAudience(targetAudience === TargetAudience.KIDS ? TargetAudience.GENERAL : TargetAudience.KIDS);
                    }}
                    activeOpacity={0.8}
                >
                    <Text style={styles.modeIcon}>👶</Text>
                    <Text style={[styles.modeText, targetAudience === TargetAudience.KIDS && { color: COLORS.kidsPrimary }]}>
                        Kids
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderTopicSelection = () => {
        if (!selectedMode) return null;

        const topics = Object.values(Topic).filter(t =>
            targetAudience === TargetAudience.KIDS ? t.startsWith('KIDS_') : !t.startsWith('KIDS_')
        );

        return (
            <View style={styles.topicsContainer}>
                <Text style={styles.sectionTitle}>
                    {targetAudience === TargetAudience.KIDS ? '🌟 Chọn Chủ Đề Vui' : '📚 Chọn Môn Thi'}
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
                            <Text style={styles.topicIcon}>{TOPIC_ICONS[topic]}</Text>
                            <Text style={[
                                styles.topicLabel,
                                targetAudience === TargetAudience.KIDS && { color: COLORS.kidsPrimary }
                            ]}>
                                {TOPIC_LABELS[topic]}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.avatarButton} onPress={onOpenProfile}>
                    {user.avatar ? (
                        <Image source={{ uri: user.avatar }} style={styles.avatar} />
                    ) : (
                        <View style={styles.avatarPlaceholder}>
                            <Text style={styles.avatarText}>{user.name?.charAt(0) || '👤'}</Text>
                        </View>
                    )}
                </TouchableOpacity>

                <View style={styles.userInfo}>
                    <Text style={styles.userName}>{user.name || 'Học viên'}</Text>
                    <View style={styles.levelBadge}>
                        <Text style={styles.levelText}>Level {user.level || 1}</Text>
                    </View>
                </View>

                <TouchableOpacity style={styles.xpBadge}>
                    <Text style={styles.xpText}>💎 {user.xp || 0}</Text>
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Welcome Message */}
                <View style={styles.welcomeCard}>
                    <Text style={styles.welcomeEmoji}>👋</Text>
                    <View>
                        <Text style={styles.welcomeTitle}>Xin chào, {user.name?.split(' ').pop() || 'bạn'}!</Text>
                        <Text style={styles.welcomeSubtitle}>Hôm nay bạn muốn học gì?</Text>
                    </View>
                </View>

                {renderModeSelection()}
                {renderTopicSelection()}

                {/* Spacer for bottom */}
                <View style={{ height: 100 }} />
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
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.md,
        backgroundColor: COLORS.white,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    avatarButton: {
        marginRight: SPACING.md,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        borderWidth: 2,
        borderColor: COLORS.primary,
    },
    avatarPlaceholder: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: COLORS.primaryLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.primary,
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    levelBadge: {
        backgroundColor: COLORS.secondary,
        paddingHorizontal: SPACING.sm,
        paddingVertical: 2,
        borderRadius: BORDER_RADIUS.sm,
        alignSelf: 'flex-start',
        marginTop: 2,
    },
    levelText: {
        color: COLORS.white,
        fontSize: 10,
        fontWeight: 'bold',
    },
    xpBadge: {
        backgroundColor: COLORS.backgroundDark,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        borderRadius: BORDER_RADIUS.lg,
    },
    xpText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    content: {
        flex: 1,
        padding: SPACING.md,
    },
    welcomeCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        padding: SPACING.lg,
        borderRadius: BORDER_RADIUS.xl,
        marginBottom: SPACING.lg,
        ...SHADOWS.md,
    },
    welcomeEmoji: {
        fontSize: 48,
        marginRight: SPACING.md,
    },
    welcomeTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    welcomeSubtitle: {
        fontSize: 14,
        color: COLORS.textLight,
        marginTop: 2,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: SPACING.md,
    },
    modeContainer: {
        marginBottom: SPACING.lg,
    },
    modeButtons: {
        flexDirection: 'row',
        gap: SPACING.sm,
    },
    modeButton: {
        flex: 1,
        backgroundColor: COLORS.white,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: COLORS.border,
        ...SHADOWS.sm,
    },
    modeButtonActive: {
        borderColor: COLORS.secondary,
        backgroundColor: COLORS.secondary + '10',
    },
    examButton: {
        borderColor: COLORS.primary,
        overflow: 'hidden',
    },
    examButtonActive: {
        borderColor: COLORS.primary,
    },
    examGradient: {
        alignItems: 'center',
        width: '100%',
        padding: SPACING.sm,
        margin: -SPACING.md,
        paddingVertical: SPACING.md,
    },
    kidsButtonActive: {
        borderColor: COLORS.kidsPrimary,
        backgroundColor: COLORS.kidsBackground,
    },
    modeIcon: {
        fontSize: 28,
        marginBottom: SPACING.xs,
    },
    modeText: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.text,
    },
    modeTextActive: {
        color: COLORS.secondary,
    },
    topicsContainer: {
        marginBottom: SPACING.lg,
    },
    topicsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.sm,
    },
    topicCard: {
        width: '48%',
        backgroundColor: COLORS.white,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
        ...SHADOWS.sm,
    },
    kidsTopicCard: {
        borderColor: COLORS.kidsPrimaryLight,
        backgroundColor: COLORS.kidsBackground,
    },
    topicIcon: {
        fontSize: 36,
        marginBottom: SPACING.xs,
    },
    topicLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.text,
        textAlign: 'center',
    },
});

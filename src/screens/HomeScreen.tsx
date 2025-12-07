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
import * as Updates from 'expo-updates';
import { Feather, MaterialIcons, Ionicons } from '@expo/vector-icons';
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

    const handleDebugUpdate = async () => {
        try {
            Alert.alert('Đang kiểm tra...', 'Đang kết nối tới máy chủ cập nhật...');
            const update = await Updates.checkForUpdateAsync();
            if (update.isAvailable) {
                Alert.alert('Có bản cập nhật mới!', 'Phiên bản mới đã sẵn sàng. Tải xuống ngay?', [
                    { text: 'Để sau', style: 'cancel' },
                    {
                        text: 'Cập nhật', onPress: async () => {
                            Alert.alert('Đang tải xuống...', 'Vui lòng chờ trong giây lát.');
                            await Updates.fetchUpdateAsync();
                            Alert.alert('Hoàn tất!', 'Ứng dụng sẽ khởi động lại ngay.', [
                                { text: 'OK', onPress: () => Updates.reloadAsync() }
                            ]);
                        }
                    }
                ]);
            } else {
                Alert.alert('Đã cập nhật', 'Bạn đang sử dụng phiên bản mới nhất.');
            }
        } catch (error: any) {
            Alert.alert('Lỗi', `Không thể kiểm tra cập nhật: ${error.message}`);
        }
    };

    const modes = [
        {
            id: LiveMode.PRACTICE,
            icon: 'book-open',
            iconSet: Feather,
            title: 'Luyện Tập',
            desc: 'Ôn tập kiến thức với AI',
            color: '#10B981',
            bgColor: '#ECFDF5'
        },
        {
            id: LiveMode.EXAM,
            icon: 'assignment',
            iconSet: MaterialIcons,
            title: 'Thi Thử',
            desc: 'Kiểm tra với giám sát AI',
            color: '#F97316',
            bgColor: '#FFF7ED'
        },
    ];

    const renderModeSelection = () => (
        <View style={styles.modeSection}>
            <View style={styles.sectionHeader}>
                <MaterialIcons name="category" size={20} color={COLORS.primary} />
                <Text style={styles.sectionTitle}>Chọn Hình Thức Học</Text>
            </View>

            <View style={styles.modeGrid}>
                {modes.map((mode) => {
                    const IconComponent = mode.iconSet;
                    return (
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
                                <IconComponent name={mode.icon as any} size={24} color={mode.color} />
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
                                    <Feather name="check" size={14} color={COLORS.white} />
                                </View>
                            )}
                        </TouchableOpacity>
                    );
                })}
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
                <View style={[styles.toggleIconBox, targetAudience === TargetAudience.KIDS && { backgroundColor: '#FBCFE8' }]}>
                    <MaterialIcons
                        name={targetAudience === TargetAudience.KIDS ? "child-care" : "person-outline"}
                        size={24}
                        color={targetAudience === TargetAudience.KIDS ? '#DB2777' : COLORS.textMuted}
                    />
                </View>

                <View style={styles.toggleContent}>
                    <Text style={[
                        styles.kidsToggleTitle,
                        targetAudience === TargetAudience.KIDS && { color: '#DB2777' }
                    ]}>
                        Chế độ trẻ em (Kids)
                    </Text>
                    <Text style={styles.kidsToggleSubtitle}>
                        {targetAudience === TargetAudience.KIDS ? 'Nội dung phù hợp với bé' : 'Chuyển sang giao diện cho bé'}
                    </Text>
                </View>

                <View style={[
                    styles.switchTrack,
                    targetAudience === TargetAudience.KIDS && styles.switchTrackActive
                ]}>
                    <View style={[
                        styles.switchThumb,
                        targetAudience === TargetAudience.KIDS && styles.switchThumbActive
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
                <View style={styles.sectionHeader}>
                    <Feather name="target" size={20} color={targetAudience === TargetAudience.KIDS ? '#DB2777' : COLORS.primary} />
                    <Text style={[
                        styles.sectionTitle,
                        targetAudience === TargetAudience.KIDS && { color: '#DB2777' }
                    ]}>
                        {targetAudience === TargetAudience.KIDS ? 'Chọn Chủ Đề Vui Nhộn' : 'Chọn Môn Học'}
                    </Text>
                </View>

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
                                <View style={[styles.topicArrow, targetAudience === TargetAudience.KIDS && { backgroundColor: '#FBCFE8' }]}>
                                    <Feather
                                        name="chevron-right"
                                        size={20}
                                        color={targetAudience === TargetAudience.KIDS ? '#DB2777' : COLORS.primary}
                                    />
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

            {/* Modern Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
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
                        <View style={styles.onlineIndicator} />
                    </TouchableOpacity>

                    <View style={styles.headerInfo}>
                        <TouchableOpacity onPress={handleDebugUpdate}>
                            <Text style={styles.greeting}>Xin chào (v1.8) 🔐</Text>
                            <Text style={[styles.greeting, { fontSize: 10, color: COLORS.primary }]}>Chạm để kiểm tra cập nhật</Text>
                        </TouchableOpacity>
                        <Text style={styles.userName} numberOfLines={1}>{user.name || 'Học viên'}</Text>
                    </View>
                </View>

                <View style={styles.headerRight}>
                    <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => {
                            // Notification feature placeholder
                            Alert.alert('Thông báo', 'Không có thông báo mới');
                        }}
                    >
                        <Feather name="bell" size={22} color={COLORS.text} />
                        <View style={styles.badgeDot} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionBtn, styles.logoutBtn]}
                        onPress={() => Alert.alert(
                            'Đăng xuất',
                            'Bạn có chắc muốn đăng xuất?',
                            [
                                { text: 'Hủy', style: 'cancel' },
                                { text: 'Đăng xuất', style: 'destructive', onPress: onLogout }
                            ]
                        )}
                    >
                        <MaterialIcons name="logout" size={22} color="#EF4444" />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView
                style={styles.content}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* Stats Card - Card style glass effect */}
                <View style={styles.statsCard}>
                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <View style={[styles.statIconBox, { backgroundColor: '#E0F2FE' }]}>
                                <Feather name="file-text" size={18} color="#0284C7" />
                            </View>
                            <Text style={styles.statNumber}>{user.history?.length || 0}</Text>
                            <Text style={styles.statLabel}>Bài thi</Text>
                        </View>

                        <View style={styles.statDivider} />

                        <View style={styles.statItem}>
                            <View style={[styles.statIconBox, { backgroundColor: '#DCFCE7' }]}>
                                <Feather name="check-circle" size={18} color="#16A34A" />
                            </View>
                            <Text style={styles.statNumber}>
                                {user.history?.filter(h => h.score === 'ĐẠT').length || 0}
                            </Text>
                            <Text style={styles.statLabel}>Đạt</Text>
                        </View>

                        <View style={styles.statDivider} />

                        <View style={styles.statItem}>
                            <View style={[styles.statIconBox, { backgroundColor: '#FEF3C7' }]}>
                                <Feather name="award" size={18} color="#D97706" />
                            </View>
                            <Text style={styles.statNumber}>{user.badges?.length || 0}</Text>
                            <Text style={styles.statLabel}>Huy hiệu</Text>
                        </View>
                    </View>

                    {/* Level Progress Bar */}
                    <View style={styles.levelContainer}>
                        <View style={styles.levelInfo}>
                            <Text style={styles.levelText}>Level {user.level || 1}</Text>
                            <Text style={styles.xpText}>{user.xp || 0} XP</Text>
                        </View>
                        <View style={styles.progressBarBg}>
                            <View style={[styles.progressBarFill, { width: `${Math.min((user.xp || 0) % 100, 100)}%` }]} />
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
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.md,
        backgroundColor: COLORS.white,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
        ...SHADOWS.xs,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    profileBtn: {
        position: 'relative',
        marginRight: 12,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        borderWidth: 2,
        borderColor: COLORS.primary,
    },
    avatarGradient: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.white,
    },
    onlineIndicator: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#22C55E',
        borderWidth: 2,
        borderColor: COLORS.white,
    },
    headerInfo: {
        flex: 1,
    },
    greeting: {
        fontSize: 13,
        color: COLORS.textLight,
        marginBottom: 2,
    },
    userName: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.text,
    },
    actionBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoutBtn: {
        backgroundColor: '#FEF2F2',
    },
    badgeDot: {
        position: 'absolute',
        top: 10,
        right: 10,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#EF4444',
        borderWidth: 1.5,
        borderColor: '#F1F5F9',
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
        padding: SPACING.lg,
        marginBottom: SPACING.xl,
        ...SHADOWS.md,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: SPACING.lg,
    },
    statItem: {
        alignItems: 'center',
        flex: 1,
    },
    statIconBox: {
        width: 36,
        height: 36,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    statNumber: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    statLabel: {
        fontSize: 12,
        color: COLORS.textLight,
    },
    statDivider: {
        width: 1,
        height: 40,
        backgroundColor: '#F1F5F9',
    },
    levelContainer: {
        marginTop: SPACING.xs,
    },
    levelInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    levelText: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.text,
    },
    xpText: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.primary,
    },
    progressBarBg: {
        height: 8,
        backgroundColor: '#F1F5F9',
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: COLORS.primary,
        borderRadius: 4,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.md,
        gap: 8,
    },
    sectionTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: COLORS.text,
    },
    modeSection: {
        marginBottom: SPACING.xl,
    },
    modeGrid: {
        gap: SPACING.md,
    },
    modeCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.md,
        borderWidth: 1.5,
        borderColor: COLORS.border,
        ...SHADOWS.sm,
    },
    modeCardActive: {
        backgroundColor: '#FAFAFA',
        ...SHADOWS.md,
    },
    modeIconContainer: {
        width: 52,
        height: 52,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: SPACING.md,
    },
    modeInfo: {
        flex: 1,
    },
    modeTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: 2,
    },
    modeDesc: {
        fontSize: 13,
        color: COLORS.textLight,
    },
    modeCheck: {
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    kidsToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.md,
        marginTop: SPACING.lg,
        borderWidth: 1.5,
        borderColor: '#F1F5F9',
        ...SHADOWS.sm,
    },
    kidsToggleActive: {
        borderColor: '#FBCFE8',
        backgroundColor: '#FFF1F2',
    },
    toggleIconBox: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: SPACING.md,
    },
    toggleContent: {
        flex: 1,
    },
    kidsToggleTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: 2,
    },
    kidsToggleSubtitle: {
        fontSize: 12,
        color: COLORS.textLight,
    },
    switchTrack: {
        width: 48,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#E2E8F0',
        padding: 2,
    },
    switchTrackActive: {
        backgroundColor: '#DB2777',
    },
    switchThumb: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: COLORS.white,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1,
        elevation: 2,
    },
    switchThumbActive: {
        transform: [{ translateX: 20 }],
    },
    topicsSection: {
        marginBottom: SPACING.lg,
    },
    topicsGrid: {
        gap: SPACING.sm,
    },
    topicCard: {
        borderRadius: BORDER_RADIUS.lg,
        overflow: 'hidden',
        ...SHADOWS.sm,
        backgroundColor: COLORS.white,
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
        fontSize: 26,
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
        fontWeight: '700',
    },
    topicArrow: {
        width: 32,
        height: 32,
        borderRadius: 12,
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
        justifyContent: 'center',
    },
});

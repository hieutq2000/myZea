import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Image,
    StatusBar,
    Alert,
    Platform,
    Animated,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather, MaterialIcons, Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import { User, LiveMode, TargetAudience, Topic, TOPIC_LABELS, TOPIC_ICONS } from '../types';
import { RootStackParamList } from '../navigation/types';
import { getAvatarUri } from '../utils/media';
import { getUnreadNotificationCount } from '../utils/api';

interface HomeScreenProps {
    user: User;
    onLogout: () => void;
    onOpenProfile: () => void;
    onStartSession: (mode: LiveMode, topic: Topic, audience: TargetAudience) => void;
    onViewTasks: () => void;
}

export default function HomeScreen({ user, onLogout, onOpenProfile, onStartSession, onViewTasks }: HomeScreenProps) {
    const { colors, isDark } = useTheme();
    const scrollY = useRef(new Animated.Value(0)).current;

    const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
    const [selectedMode, setSelectedMode] = useState<LiveMode | null>(null);
    const [targetAudience, setTargetAudience] = useState<TargetAudience>(TargetAudience.GENERAL);
    const [unreadCount, setUnreadCount] = useState(0);

    // Fetch unread notification count
    useEffect(() => {
        const fetchNotificationCount = async () => {
            try {
                const { count } = await getUnreadNotificationCount();
                setUnreadCount(count);
            } catch (error) {
                console.log('Error fetching notification count:', error);
            }
        };
        fetchNotificationCount();
        // Refresh every 30 seconds
        const interval = setInterval(fetchNotificationCount, 30000);
        return () => clearInterval(interval);
    }, []);

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
            title: 'AI Dò Bài',
            desc: 'Kiểm tra với giám sát AI',
            color: '#F97316',
            bgColor: '#FFF7ED'
        },
    ];

    const renderModeSelection = () => (
        <View style={styles.modeSection}>
            <View style={styles.sectionHeader}>
                <MaterialIcons name="category" size={20} color={colors.primary} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Chọn Hình Thức Học</Text>
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
                                {
                                    backgroundColor: isDark ? colors.card : '#FFFFFF',
                                    borderColor: selectedMode === mode.id ? mode.color : colors.border
                                }
                            ]}
                            onPress={() => setSelectedMode(selectedMode === mode.id ? null : mode.id)}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.modeIconContainer, { backgroundColor: mode.bgColor }]}>
                                <IconComponent name={mode.icon as any} size={24} color={mode.color} />
                            </View>
                            <View style={styles.modeInfo}>
                                <Text style={[
                                    styles.modeTitle,
                                    { color: colors.text },
                                    selectedMode === mode.id && { color: mode.color }
                                ]}>
                                    {mode.title}
                                </Text>
                                <Text style={styles.modeDesc}>{mode.desc}</Text>
                            </View>
                            {selectedMode === mode.id && (
                                <View style={[styles.modeCheck, { backgroundColor: mode.color }]}>
                                    <Feather name="check" size={14} color="#FFFFFF" />
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
                    { backgroundColor: isDark ? colors.card : '#FFFFFF', borderColor: isDark ? colors.border : '#F1F5F9' },
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
                        color={targetAudience === TargetAudience.KIDS ? '#DB2777' : colors.textSecondary}
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
                    <Feather name="target" size={20} color={targetAudience === TargetAudience.KIDS ? '#DB2777' : colors.primary} />
                    <Text style={[
                        styles.sectionTitle,
                        { color: colors.text },
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
                                    : (isDark ? ['#1F1F1F', '#2D2D2D'] : ['#F8FAFC', '#F1F5F9'])
                                }
                                style={styles.topicGradient}
                            >
                                <Text style={styles.topicIcon}>{TOPIC_ICONS[topic]}</Text>
                                <Text style={[
                                    styles.topicLabel,
                                    { color: colors.text },
                                    targetAudience === TargetAudience.KIDS && styles.kidsTopicLabel
                                ]}>
                                    {TOPIC_LABELS[topic]}
                                </Text>
                                <View style={[styles.topicArrow, { backgroundColor: isDark ? '#374151' : '#F1F5F9' }, targetAudience === TargetAudience.KIDS && { backgroundColor: '#FBCFE8' }]}>
                                    <Feather
                                        name="chevron-right"
                                        size={20}
                                        color={targetAudience === TargetAudience.KIDS ? '#DB2777' : colors.primary}
                                    />
                                </View>
                            </LinearGradient>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
        );
    };

    const HEADER_MAX_HEIGHT = 180;
    const HEADER_MIN_HEIGHT = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 60 : 90;
    const HEADER_SCROLL_DISTANCE = HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT;

    const headerHeight = scrollY.interpolate({
        inputRange: [0, HEADER_SCROLL_DISTANCE],
        outputRange: [HEADER_MAX_HEIGHT, HEADER_MIN_HEIGHT],
        extrapolate: 'clamp',
    });

    const headerOpacity = scrollY.interpolate({
        inputRange: [0, HEADER_SCROLL_DISTANCE * 0.8, HEADER_SCROLL_DISTANCE],
        outputRange: [0, 0, 1],
        extrapolate: 'clamp',
    });

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

            {/* Layer 0: Animated Header Background (Collapses on Scroll) */}
            <Animated.View style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: headerHeight,
                overflow: 'hidden',
                zIndex: 0,
            }}>
                <LinearGradient
                    colors={['#EA580C', '#FB923C']}
                    style={{ flex: 1 }}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0.5 }}
                >
                    <View style={styles.headerCircle1} />
                    <View style={styles.headerCircle2} />
                </LinearGradient>
            </Animated.View>

            {/* Layer 2: Header UI Content (Fixed ON TOP of everything) */}
            <SafeAreaView style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20 }}>
                {/* Cross-fading Background Layer to cover scrolled content */}
                <Animated.View style={{
                    ...StyleSheet.absoluteFillObject,
                    opacity: headerOpacity,
                    backgroundColor: '#EA580C', // Solid color to hide content
                    borderBottomWidth: 1,
                    borderBottomColor: 'rgba(255,255,255,0.1)'
                }}>
                    <LinearGradient
                        colors={['#EA580C', '#FB923C']}
                        style={{ flex: 1 }}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0.5 }}
                    />
                </Animated.View>

                <View style={styles.headerContent}>
                    <View style={styles.headerLeft}>
                        {user.avatar && !user.avatar.includes('ui-avatars.com') ? (
                            <Image source={{ uri: getAvatarUri(user.avatar, user.name || 'User') }} style={styles.headerAvatar} />
                        ) : (
                            <View style={styles.headerAvatarPlaceholder}>
                                <Text style={styles.headerAvatarText}>{user.name?.charAt(0) || 'H'}</Text>
                            </View>
                        )}
                        <View style={{ marginLeft: 12 }}>
                            <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: '500' }}>Xin chào,</Text>
                            <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>
                                {user.name || 'Người dùng'}
                            </Text>
                        </View>
                    </View>
                    <View style={styles.headerRight}>
                        <TouchableOpacity style={styles.headerIconBtn}>
                            <MaterialIcons name="qr-code-scanner" size={24} color="white" />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.headerIconBtn}
                            onPress={() => navigation.navigate('PlaceNotifications')}
                        >
                            <Ionicons name="notifications-outline" size={24} color="white" />
                            {unreadCount > 0 && (
                                <View style={styles.headerBadge}>
                                    <Text style={styles.headerBadgeText}>
                                        {unreadCount > 99 ? '99+' : unreadCount}
                                    </Text>
                                </View>
                            )}
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.headerIconBtn} onPress={() => navigation.navigate('Settings')}>
                            <Ionicons name="settings-outline" size={24} color="white" />
                        </TouchableOpacity>
                    </View>
                </View>
            </SafeAreaView>

            {/* Layer 1: ScrollView Content (Scrollable, sits between BG and UI) */}
            <Animated.ScrollView
                style={styles.content}
                showsVerticalScrollIndicator={false}
                scrollEventThrottle={16}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                    { useNativeDriver: false }
                )}
                contentContainerStyle={{ paddingTop: HEADER_MAX_HEIGHT, paddingBottom: 160 }}
            >
                {/* 1. Quick Menu (Moved up to overlap) */}
                <View style={[styles.quickMenuCard, { marginTop: -40, backgroundColor: isDark ? colors.card : '#FFFFFF' }]}>
                    <View style={styles.quickMenuItem}>
                        <View style={[styles.quickMenuIcon, { backgroundColor: '#FFEDD5' }]}>
                            <Ionicons name="trophy" size={24} color="#F97316" />
                        </View>
                        <Text style={[styles.quickMenuLabel, { color: colors.text }]}>Reward</Text>
                    </View>
                    <View style={styles.quickMenuItem}>
                        <View style={[styles.quickMenuIcon, { backgroundColor: '#FEF9C3' }]}>
                            <Ionicons name="star" size={24} color="#EAB308" />
                        </View>
                        <Text style={[styles.quickMenuLabel, { color: colors.text }]}>My Gold</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.quickMenuItem}
                        onPress={() => navigation.navigate('FinanceHome')}
                    >
                        <View style={[styles.quickMenuIcon, { backgroundColor: '#DCFCE7' }]}>
                            <Ionicons name="wallet" size={24} color="#16A34A" />
                        </View>
                        <Text style={[styles.quickMenuLabel, { color: colors.text }]}>Ví</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.quickMenuItem}
                        onPress={() => navigation.navigate('TodoNotes')}
                    >
                        <View style={[styles.quickMenuIcon, { backgroundColor: '#FFEDD5' }]}>
                            <Ionicons name="clipboard" size={24} color="#F97316" />
                        </View>
                        <Text style={[styles.quickMenuLabel, { color: colors.text }]}>To-do Notes</Text>
                    </TouchableOpacity>
                </View>

                {/* 2. My Tasks (Việc của tôi) */}
                <View style={styles.sectionContainer}>
                    <View style={styles.sectionHeaderNew}>
                        <Text style={[styles.sectionTitleNew, { color: colors.text }]}>Việc của tôi</Text>
                        <TouchableOpacity onPress={onViewTasks}>
                            <Text style={styles.viewAllText}>Xem tất cả {'>'}</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.tasksRow}>
                        {/* Orange Card */}
                        <TouchableOpacity style={[styles.taskCard, { backgroundColor: '#EA580C' }]}>
                            <View style={styles.taskCardHeader}>
                                <Text style={[styles.taskCount, { color: 'white' }]}>0</Text>
                                <Feather name="info" size={16} color="rgba(255,255,255,0.7)" />
                            </View>
                            <Text style={[styles.taskLabel, { color: 'white' }]}>Công việc{'\n'}chưa làm</Text>
                            <View style={styles.taskCardBgIcon}>
                                <Feather name="file-text" size={60} color="rgba(255,255,255,0.1)" />
                            </View>
                        </TouchableOpacity>

                        {/* White Card */}
                        <TouchableOpacity style={[styles.taskCard, { backgroundColor: isDark ? colors.card : 'white', borderColor: colors.border, borderWidth: 1 }]}>
                            <View style={styles.taskCardHeader}>
                                <Text style={[styles.taskCount, { color: colors.text }]}>0</Text>
                                <Feather name="info" size={16} color={colors.textSecondary} />
                            </View>
                            <Text style={[styles.taskLabel, { color: colors.text }]}>Quá hạn{'\n'}đã lâu</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* 3. News (Không thể bỏ lỡ) - Temporarily hidden */}

                {/* --- Existing Functionality (Moved to bottom) --- */}
                {/* --- Existing Functionality (Moved to bottom) --- */}
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <Text style={[styles.functionalityTitle, { color: colors.text }]}>Học tập & Rèn luyện</Text>
                {renderModeSelection()}
                {renderTopicSelection()}

                <View style={{ height: 40 }} />
            </Animated.ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    // ... (Keep existing styles for Compatibility with renderModeSelection)

    // New Styles for  Design
    headerGradient: {
        paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 20) : 0,
        paddingBottom: 50, // Restore large padding for overlap
        zIndex: 0,
        elevation: 0,
    },
    content: {
        flex: 1,
        backgroundColor: 'transparent', // Transparent to show Header Background
        zIndex: 10,
        elevation: 10,
        overflow: 'visible', // Prevent clipping of negative margin content
    },
    headerCircle1: {
        position: 'absolute',
        top: -50,
        right: -20,
        width: 240,
        height: 240,
        borderRadius: 120,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    headerCircle2: {
        position: 'absolute',
        top: 40,
        right: -40,
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: 'rgba(255,255,255,0.08)',
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        paddingBottom: 0, // Ensure no extra padding at bottom of content
    },

    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: 'white',
    },
    headerAvatarPlaceholder: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: 'white',
    },
    headerAvatarText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 18,
    },
    headerTitle: {
        color: 'white',
        fontSize: 18,
        fontWeight: '700',
        marginLeft: 10,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    headerIconBtn: {
        padding: 4,
        position: 'relative',
    },
    headerBadge: {
        position: 'absolute',
        top: 0,
        right: 0,
        backgroundColor: '#EF4444',
        borderRadius: 10,
        minWidth: 18,
        height: 14,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'white',
    },
    headerBadgeText: {
        color: 'white',
        fontSize: 8,
        fontWeight: 'bold',
    },
    quickMenuCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: '#FFFFFF', // Fix this to white even in dark mode initially? Or adapt?
        // Let's adapt
        // backgroundColor: COLORS.white, 
        // We can't access 'colors' here. We'll utilize inline style for dynamic background if needed or assume Card is White for pop
        borderRadius: 24,
        padding: 16,
        marginHorizontal: 16,
        marginTop: -30, // Negative margin for overlap
        ...SHADOWS.md,
        zIndex: 100,
        elevation: 10,
    },
    quickMenuItem: {
        alignItems: 'center',
        width: '23%',
    },
    quickMenuIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    quickMenuLabel: {
        fontSize: 11,
        color: '#334155',
        textAlign: 'center',
        fontWeight: '500',
    },
    sectionContainer: {
        marginTop: 24,
        paddingHorizontal: 16,
    },
    sectionHeaderNew: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionTitleNew: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0F172A',
    },
    viewAllText: {
        color: '#64748B',
        fontSize: 13,
    },
    tasksRow: {
        flexDirection: 'row',
        gap: 12,
    },
    taskCard: {
        flex: 1,
        borderRadius: 16,
        padding: 16,
        paddingVertical: 20,
        minHeight: 120,
        justifyContent: 'space-between',
        overflow: 'hidden',
    },
    taskCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    taskCount: {
        fontSize: 36,
        fontWeight: 'bold',
        lineHeight: 40,
    },
    taskLabel: {
        fontSize: 14,
        fontWeight: '600',
        marginTop: 8,
    },
    taskCardBgIcon: {
        position: 'absolute',
        bottom: -20,
        right: -20,
    },
    newsCard: {
        backgroundColor: COLORS.white,
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#F1F5F9',
        ...SHADOWS.sm,
    },
    newsImageContainer: {
        height: 160,
        backgroundColor: '#E2E8F0',
    },
    newsImagePlaceholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    newsPlaceholderText: {
        color: 'white',
        fontSize: 24,
        fontWeight: 'bold',
    },
    newsContent: {
        padding: 16,
    },
    newsMeta: {
        flexDirection: 'row',
        marginBottom: 8,
    },
    newsSource: {
        color: '#64748B',
        fontSize: 12,
        fontWeight: '600',
    },
    newsDate: {
        color: '#94A3B8',
        fontSize: 12,
        marginLeft: 4,
    },
    newsTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0F172A',
        marginBottom: 8,
        lineHeight: 24,
    },
    newsDesc: {
        fontSize: 14,
        color: '#475569',
        lineHeight: 20,
    },
    divider: {
        height: 1,
        backgroundColor: '#E2E8F0',
        marginVertical: 24,
        marginHorizontal: 16,
    },
    functionalityTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0F172A',
        paddingHorizontal: 16,
        marginBottom: 16,
    },

    // Existing styles required for compatibility
    container: {
        flex: 1,
        // backgroundColor: '#F8FAFC', // Overridden
    },

    scrollContent: {
        paddingBottom: 40,
    },
    modeSection: {
        marginBottom: SPACING.xl,
        paddingHorizontal: 16,
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
    topicsSection: {
        marginBottom: SPACING.lg,
        paddingHorizontal: 16,
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

    // Unused Legacy Styles (Safe to leave or remove if confirmed unused)
    // ...
});

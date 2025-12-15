import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
    Platform,
    Alert,
    Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../context/ThemeContext';

interface AppItem {
    id: string;
    name: string;
    description: string;
    icon: string;
    iconSet: 'Ionicons' | 'MaterialCommunityIcons' | 'MaterialIcons' | 'FontAwesome5';
    color: string;
    bgColor: string;
    category: string;
    isAvailable: boolean;
    isNew?: boolean;
    isComing?: boolean;
}

const APPS: AppItem[] = [
    {
        id: 'expense',
        name: 'Quản lý chi tiêu',
        description: 'Theo dõi thu chi cá nhân',
        icon: 'wallet-outline',
        iconSet: 'Ionicons',
        color: '#10B981',
        bgColor: '#D1FAE5',
        category: 'Tài chính',
        isAvailable: true,
        isNew: true,
    },
    {
        id: 'todo',
        name: 'To-do Notes',
        description: 'Quản lý công việc hàng ngày',
        icon: 'checkbox-outline',
        iconSet: 'Ionicons',
        color: '#6366F1',
        bgColor: '#E0E7FF',
        category: 'Công việc',
        isAvailable: true,
    },
    {
        id: 'qrcode',
        name: 'QR Scanner',
        description: 'Quét mã QR nhanh chóng',
        icon: 'qr-code-outline',
        iconSet: 'Ionicons',
        color: '#8B5CF6',
        bgColor: '#EDE9FE',
        category: 'Tiện ích',
        isAvailable: true,
    },
    {
        id: 'learning',
        name: 'Learning',
        description: 'Khóa học trực tuyến',
        icon: 'school-outline',
        iconSet: 'Ionicons',
        color: '#F59E0B',
        bgColor: '#FEF3C7',
        category: 'Học tập',
        isAvailable: true,
    },
    {
        id: 'payslip',
        name: 'Payslip',
        description: 'Xem phiếu lương',
        icon: 'receipt-outline',
        iconSet: 'Ionicons',
        color: '#EF4444',
        bgColor: '#FEE2E2',
        category: 'Tài chính',
        isAvailable: true,
    },
    {
        id: 'reward',
        name: 'Reward',
        description: 'Điểm thưởng & ưu đãi',
        icon: 'gift-outline',
        iconSet: 'Ionicons',
        color: '#EC4899',
        bgColor: '#FCE7F3',
        category: 'Ưu đãi',
        isAvailable: true,
    },
    {
        id: 'my-gold',
        name: 'My Gold',
        description: 'Quản lý điểm vàng',
        icon: 'star',
        iconSet: 'Ionicons',
        color: '#F59E0B',
        bgColor: '#FEF3C7',
        category: 'Ưu đãi',
        isAvailable: true,
    },
    {
        id: 'zyea-care',
        name: 'Zyea Care',
        description: 'Chăm sóc sức khỏe',
        icon: 'heart-outline',
        iconSet: 'Ionicons',
        color: '#EF4444',
        bgColor: '#FEE2E2',
        category: 'Sức khỏe',
        isAvailable: true,
    },
    {
        id: 'survey',
        name: 'Survey',
        description: 'Khảo sát & đánh giá',
        icon: 'clipboard-outline',
        iconSet: 'Ionicons',
        color: '#14B8A6',
        bgColor: '#CCFBF1',
        category: 'Công việc',
        isAvailable: true,
    },
    {
        id: 'budget',
        name: 'Ngân sách',
        description: 'Lập kế hoạch tài chính',
        icon: 'calculator-outline',
        iconSet: 'Ionicons',
        color: '#0EA5E9',
        bgColor: '#E0F2FE',
        category: 'Tài chính',
        isAvailable: false,
        isComing: true,
    },
    {
        id: 'investment',
        name: 'Đầu tư',
        description: 'Theo dõi danh mục đầu tư',
        icon: 'trending-up-outline',
        iconSet: 'Ionicons',
        color: '#22C55E',
        bgColor: '#DCFCE7',
        category: 'Tài chính',
        isAvailable: false,
        isComing: true,
    },
    {
        id: 'health',
        name: 'Sức khỏe',
        description: 'Theo dõi sức khỏe cá nhân',
        icon: 'fitness-outline',
        iconSet: 'Ionicons',
        color: '#F43F5E',
        bgColor: '#FFE4E6',
        category: 'Sức khỏe',
        isAvailable: false,
        isComing: true,
    },
];

const CATEGORIES = ['Tất cả', 'Tài chính', 'Công việc', 'Tiện ích', 'Học tập', 'Ưu đãi', 'Sức khỏe'];

interface StoreScreenProps {
    onNavigateToSettings?: () => void;
    onNavigateToProfile?: () => void;
}

export default function StoreScreen({ onNavigateToSettings, onNavigateToProfile }: StoreScreenProps) {
    const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
    const { colors, isDark } = useTheme();
    const [selectedCategory, setSelectedCategory] = useState('Tất cả');

    const filteredApps = selectedCategory === 'Tất cả'
        ? APPS
        : APPS.filter(app => app.category === selectedCategory);

    const handleAppPress = (app: AppItem) => {
        if (!app.isAvailable) {
            Alert.alert(
                'Sắp ra mắt',
                `${app.name} sẽ được cập nhật trong thời gian tới. Hãy đón chờ nhé!`,
                [{ text: 'OK' }]
            );
            return;
        }

        // Điều hướng đến các màn hình tương ứng
        switch (app.id) {
            case 'expense':
                navigation.navigate('FinanceHome' as any);
                break;
            default:
                Alert.alert(
                    app.name,
                    `Đang mở ${app.name}...`,
                    [{ text: 'OK' }]
                );
        }
    };

    const renderIcon = (app: AppItem) => {
        switch (app.iconSet) {
            case 'Ionicons':
                return <Ionicons name={app.icon as any} size={28} color={app.color} />;
            case 'MaterialCommunityIcons':
                return <MaterialCommunityIcons name={app.icon as any} size={28} color={app.color} />;
            case 'MaterialIcons':
                return <MaterialIcons name={app.icon as any} size={28} color={app.color} />;
            case 'FontAwesome5':
                return <FontAwesome5 name={app.icon as any} size={24} color={app.color} />;
            default:
                return <Ionicons name={app.icon as any} size={28} color={app.color} />;
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />

            {/* Header */}
            <LinearGradient
                colors={colors.headerGradient}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.header}
            >
                <SafeAreaView>
                    <View style={styles.headerContent}>
                        <View style={styles.headerLeft}>
                            <Ionicons name="grid" size={24} color={colors.primary} />
                            <Text style={[styles.headerTitle, { color: isDark ? '#FFF' : '#000' }]}>Store</Text>
                        </View>
                        <View style={styles.headerRight}>
                            <TouchableOpacity
                                style={[styles.headerBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
                                onPress={onNavigateToProfile}
                            >
                                <Ionicons name="person-outline" size={22} color={isDark ? '#FFF' : '#000'} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.headerBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
                                onPress={onNavigateToSettings}
                            >
                                <Ionicons name="settings-outline" size={22} color={isDark ? '#FFF' : '#000'} />
                            </TouchableOpacity>
                        </View>
                    </View>
                </SafeAreaView>
            </LinearGradient>

            <ScrollView
                style={styles.content}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Categories Filter */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.categoriesContainer}
                    contentContainerStyle={styles.categoriesContent}
                >
                    {CATEGORIES.map((category) => (
                        <TouchableOpacity
                            key={category}
                            style={[
                                styles.categoryChip,
                                {
                                    backgroundColor: selectedCategory === category
                                        ? colors.primary
                                        : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'
                                }
                            ]}
                            onPress={() => setSelectedCategory(category)}
                        >
                            <Text style={[
                                styles.categoryText,
                                {
                                    color: selectedCategory === category
                                        ? '#FFF'
                                        : colors.text
                                }
                            ]}>
                                {category}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* Featured Section */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Ứng dụng nổi bật</Text>
                    <View style={styles.featuredGrid}>
                        {filteredApps.filter(app => app.isAvailable).slice(0, 4).map((app) => (
                            <TouchableOpacity
                                key={app.id}
                                style={[styles.featuredCard, { backgroundColor: colors.card }]}
                                onPress={() => handleAppPress(app)}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.appIconBg, { backgroundColor: app.bgColor }]}>
                                    {renderIcon(app)}
                                </View>
                                <Text style={[styles.appName, { color: colors.text }]} numberOfLines={1}>{app.name}</Text>
                                <Text style={[styles.appDesc, { color: colors.textSecondary }]} numberOfLines={1}>{app.description}</Text>
                                {app.isNew && (
                                    <View style={styles.newBadge}>
                                        <Text style={styles.newBadgeText}>Mới</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* All Apps Section */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Tất cả ứng dụng</Text>
                    <View style={[styles.allAppsContainer, { backgroundColor: colors.card }]}>
                        {filteredApps.map((app, index) => (
                            <TouchableOpacity
                                key={app.id}
                                style={[
                                    styles.appRow,
                                    index !== filteredApps.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }
                                ]}
                                onPress={() => handleAppPress(app)}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.appIconSmall, { backgroundColor: app.bgColor }]}>
                                    {renderIcon(app)}
                                </View>
                                <View style={styles.appInfo}>
                                    <View style={styles.appNameRow}>
                                        <Text style={[styles.appNameList, { color: colors.text }]}>{app.name}</Text>
                                        {app.isComing && (
                                            <View style={styles.comingBadge}>
                                                <Text style={styles.comingBadgeText}>Sắp ra mắt</Text>
                                            </View>
                                        )}
                                    </View>
                                    <Text style={[styles.appDescList, { color: colors.textSecondary }]}>{app.description}</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Coming Soon Banner */}
                <View style={styles.section}>
                    <LinearGradient
                        colors={['#6366F1', '#8B5CF6']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.comingSoonBanner}
                    >
                        <View style={styles.bannerContent}>
                            <Ionicons name="rocket-outline" size={40} color="#FFF" />
                            <View style={styles.bannerText}>
                                <Text style={styles.bannerTitle}>Nhiều ứng dụng hơn sắp ra mắt!</Text>
                                <Text style={styles.bannerDesc}>Chúng tôi đang phát triển thêm nhiều ứng dụng tiện ích</Text>
                            </View>
                        </View>
                    </LinearGradient>
                </View>

                <View style={{ height: 120 }} />
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
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    headerRight: {
        flexDirection: 'row',
        gap: 8,
    },
    headerBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        paddingTop: 8,
    },
    categoriesContainer: {
        marginBottom: 16,
    },
    categoriesContent: {
        paddingHorizontal: 16,
        gap: 8,
    },
    categoryChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginRight: 8,
    },
    categoryText: {
        fontSize: 14,
        fontWeight: '500',
    },
    section: {
        marginBottom: 24,
        paddingHorizontal: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 12,
    },
    featuredGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    featuredCard: {
        width: '47%',
        borderRadius: 16,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
    appIconBg: {
        width: 56,
        height: 56,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    appName: {
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 4,
    },
    appDesc: {
        fontSize: 12,
    },
    newBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: '#EF4444',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
    },
    newBadgeText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: 'bold',
    },
    allAppsContainer: {
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
    appRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    appIconSmall: {
        width: 48,
        height: 48,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    appInfo: {
        flex: 1,
    },
    appNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    appNameList: {
        fontSize: 15,
        fontWeight: '600',
    },
    appDescList: {
        fontSize: 12,
        marginTop: 2,
    },
    comingBadge: {
        backgroundColor: '#FEF3C7',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
    },
    comingBadgeText: {
        color: '#D97706',
        fontSize: 10,
        fontWeight: 'bold',
    },
    comingSoonBanner: {
        borderRadius: 16,
        padding: 20,
    },
    bannerContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    bannerText: {
        flex: 1,
        marginLeft: 16,
    },
    bannerTitle: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    bannerDesc: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 13,
    },
});

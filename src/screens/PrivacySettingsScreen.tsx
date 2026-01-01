import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    StatusBar,
    Platform,
    Switch,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import * as FileSystem from 'expo-file-system/legacy';
import { useTheme } from '../context/ThemeContext';

interface SettingItemProps {
    icon: string;
    iconType?: 'ionicon' | 'material' | 'materialCommunity';
    title: string;
    subtitle?: string;
    value?: boolean;
    onToggle?: (value: boolean) => void;
    onPress?: () => void;
    showArrow?: boolean;
    disabled?: boolean;
}

export default function PrivacySettingsScreen() {
    const navigation = useNavigation();
    const { colors, isDark } = useTheme();

    // Security States
    const [biometricEnabled, setBiometricEnabled] = useState(false);
    const [biometricAvailable, setBiometricAvailable] = useState(false);
    const [pinEnabled, setPinEnabled] = useState(false);
    const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
    const [loginNotifications, setLoginNotifications] = useState(true);

    // Privacy States
    const [lastSeenVisible, setLastSeenVisible] = useState(true);
    const [profilePhotoVisible, setProfilePhotoVisible] = useState(true);
    const [statusVisible, setStatusVisible] = useState(true);
    const [readReceipts, setReadReceipts] = useState(true);
    const [onlineStatus, setOnlineStatus] = useState(true);

    useEffect(() => {
        loadSettings();
        checkBiometricAvailability();
    }, []);

    const checkBiometricAvailability = async () => {
        const compatible = await LocalAuthentication.hasHardwareAsync();
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        setBiometricAvailable(compatible && enrolled);
    };

    const loadSettings = async () => {
        try {
            const settings = await AsyncStorage.getItem('privacySettings');
            if (settings) {
                const parsed = JSON.parse(settings);
                setBiometricEnabled(parsed.biometricEnabled || false);
                setPinEnabled(parsed.pinEnabled || false);
                setTwoFactorEnabled(parsed.twoFactorEnabled || false);
                setLoginNotifications(parsed.loginNotifications ?? true);
                setLastSeenVisible(parsed.lastSeenVisible ?? true);
                setProfilePhotoVisible(parsed.profilePhotoVisible ?? true);
                setStatusVisible(parsed.statusVisible ?? true);
                setReadReceipts(parsed.readReceipts ?? true);
                setOnlineStatus(parsed.onlineStatus ?? true);
            }
        } catch (e) {
            console.log('Error loading privacy settings');
        }
    };

    const saveSettings = async (key: string, value: boolean) => {
        try {
            const settings = await AsyncStorage.getItem('privacySettings');
            const parsed = settings ? JSON.parse(settings) : {};
            parsed[key] = value;
            await AsyncStorage.setItem('privacySettings', JSON.stringify(parsed));
        } catch (e) {
            console.log('Error saving privacy settings');
        }
    };

    const handleBiometricToggle = async (value: boolean) => {
        if (value) {
            // Verify biometric before enabling
            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: 'Xác thực để bật bảo mật sinh trắc học',
                fallbackLabel: 'Sử dụng mã PIN',
            });
            if (result.success) {
                setBiometricEnabled(true);
                saveSettings('biometricEnabled', true);
                Alert.alert('Thành công', 'Đã bật xác thực sinh trắc học');
            }
        } else {
            setBiometricEnabled(false);
            saveSettings('biometricEnabled', false);
        }
    };

    const handlePinToggle = (value: boolean) => {
        if (value) {
            // Navigate to PIN setup screen
            Alert.alert('Thiết lập mã PIN', 'Tính năng này sẽ sớm được cập nhật');
        } else {
            setPinEnabled(false);
            saveSettings('pinEnabled', false);
        }
    };

    const handleTwoFactorToggle = (value: boolean) => {
        if (value) {
            Alert.alert('Xác thực 2 lớp', 'Tính năng này sẽ sớm được cập nhật');
        } else {
            setTwoFactorEnabled(false);
            saveSettings('twoFactorEnabled', false);
        }
    };

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const handleClearCache = async () => {
        try {
            const cacheDir = FileSystem.cacheDirectory;
            if (!cacheDir) return;

            // Calculate size before clearing
            let totalSize = 0;
            const files = await FileSystem.readDirectoryAsync(cacheDir);
            for (const file of files) {
                const info = await FileSystem.getInfoAsync(cacheDir + file);
                if (info.exists) {
                    totalSize += info.size;
                }
            }

            Alert.alert(
                'Xóa bộ nhớ đệm',
                `Bạn có chắc muốn xóa ${formatSize(totalSize)} dữ liệu đệm? Thao tác này sẽ không xóa dữ liệu quan trọng của bạn.`,
                [
                    { text: 'Hủy', style: 'cancel' },
                    {
                        text: 'Xóa ngay',
                        style: 'destructive',
                        onPress: async () => {
                            try {
                                // Delete all files in cache directory
                                for (const file of files) {
                                    await FileSystem.deleteAsync(cacheDir + file, { idempotent: true });
                                }
                                Alert.alert('Thành công', 'Đã giải phóng bộ nhớ đệm.');
                            } catch (error) {
                                console.log('Clear cache error:', error);
                                Alert.alert('Lỗi', 'Không thể xóa một số file.');
                            }
                        }
                    }
                ]
            );
        } catch (error) {
            console.log('Error calculating cache size:', error);
            Alert.alert('Lỗi', 'Không thể tính toán dung lượng cache.');
        }
    };

    const SettingItem = ({
        icon,
        iconType = 'ionicon',
        title,
        subtitle,
        value,
        onToggle,
        onPress,
        showArrow = false,
        disabled = false
    }: SettingItemProps) => {
        const IconComponent = iconType === 'material' ? MaterialIcons :
            iconType === 'materialCommunity' ? MaterialCommunityIcons : Ionicons;

        return (
            <TouchableOpacity
                style={[styles.settingItem, disabled && { opacity: 0.5 }]}
                onPress={onPress}
                disabled={disabled || !onPress}
                activeOpacity={onPress ? 0.7 : 1}
            >
                <View style={[styles.iconContainer, { backgroundColor: isDark ? '#2D2D2D' : '#F3F4F6' }]}>
                    <IconComponent name={icon as any} size={22} color={colors.primary} />
                </View>
                <View style={styles.settingContent}>
                    <Text style={[styles.settingTitle, { color: colors.text }]}>{title}</Text>
                    {subtitle && <Text style={[styles.settingSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>}
                </View>
                {onToggle && (
                    <Switch
                        value={value}
                        onValueChange={onToggle}
                        trackColor={{ false: colors.border, true: colors.primary + '60' }}
                        thumbColor={value ? colors.primary : '#f4f3f4'}
                        disabled={disabled}
                    />
                )}
                {showArrow && (
                    <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                )}
            </TouchableOpacity>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />

            {/* Header */}
            <LinearGradient
                colors={['#ffebd9', '#e0f8ff']}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.headerGradient}
            >
                <SafeAreaView>
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                            <Ionicons name="chevron-back" size={28} color="#333" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Cài đặt và quyền riêng tư</Text>
                    </View>
                </SafeAreaView>
            </LinearGradient>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>

                {/* Security Section */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>BẢO MẬT TÀI KHOẢN</Text>

                    <View style={[styles.card, { backgroundColor: colors.card }]}>
                        <SettingItem
                            icon="finger-print"
                            title="Xác thực sinh trắc học"
                            subtitle={biometricAvailable ? "Face ID / Touch ID" : "Thiết bị không hỗ trợ"}
                            value={biometricEnabled}
                            onToggle={handleBiometricToggle}
                            disabled={!biometricAvailable}
                        />

                        <View style={[styles.divider, { backgroundColor: colors.border }]} />

                        <SettingItem
                            icon="keypad"
                            title="Mã PIN ứng dụng"
                            subtitle="Yêu cầu mã PIN khi mở app"
                            value={pinEnabled}
                            onToggle={handlePinToggle}
                        />

                        <View style={[styles.divider, { backgroundColor: colors.border }]} />

                        <SettingItem
                            icon="shield-checkmark"
                            title="Xác thực 2 lớp (2FA)"
                            subtitle="Bảo mật thêm với mã OTP"
                            value={twoFactorEnabled}
                            onToggle={handleTwoFactorToggle}
                        />

                        <View style={[styles.divider, { backgroundColor: colors.border }]} />

                        <SettingItem
                            icon="notifications"
                            title="Thông báo đăng nhập"
                            subtitle="Nhận thông báo khi có đăng nhập mới"
                            value={loginNotifications}
                            onToggle={(val) => { setLoginNotifications(val); saveSettings('loginNotifications', val); }}
                        />
                    </View>
                </View>

                {/* Privacy Section */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>QUYỀN RIÊNG TƯ</Text>

                    <View style={[styles.card, { backgroundColor: colors.card }]}>
                        <SettingItem
                            icon="time"
                            title="Lần truy cập cuối"
                            subtitle="Ai có thể xem thời gian online"
                            value={lastSeenVisible}
                            onToggle={(val) => { setLastSeenVisible(val); saveSettings('lastSeenVisible', val); }}
                        />

                        <View style={[styles.divider, { backgroundColor: colors.border }]} />

                        <SettingItem
                            icon="image"
                            title="Ảnh đại diện"
                            subtitle="Ai có thể xem ảnh của bạn"
                            value={profilePhotoVisible}
                            onToggle={(val) => { setProfilePhotoVisible(val); saveSettings('profilePhotoVisible', val); }}
                        />

                        <View style={[styles.divider, { backgroundColor: colors.border }]} />

                        <SettingItem
                            icon="radio-button-on"
                            title="Trạng thái online"
                            subtitle="Hiển thị khi bạn đang hoạt động"
                            value={onlineStatus}
                            onToggle={(val) => { setOnlineStatus(val); saveSettings('onlineStatus', val); }}
                        />

                        <View style={[styles.divider, { backgroundColor: colors.border }]} />

                        <SettingItem
                            icon="checkmark-done"
                            title="Thông báo đã xem"
                            subtitle="Hiển thị khi bạn đã đọc tin nhắn"
                            value={readReceipts}
                            onToggle={(val) => { setReadReceipts(val); saveSettings('readReceipts', val); }}
                        />
                    </View>
                </View>

                {/* Session Management */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>QUẢN LÝ PHIÊN</Text>

                    <View style={[styles.card, { backgroundColor: colors.card }]}>
                        <SettingItem
                            icon="phone-portrait"
                            title="Thiết bị đã đăng nhập"
                            subtitle="Xem và quản lý các phiên đăng nhập"
                            showArrow
                            onPress={() => navigation.navigate('ActiveSessions' as never)}
                        />

                        <View style={[styles.divider, { backgroundColor: colors.border }]} />

                        <SettingItem
                            icon="log-out"
                            iconType="ionicon"
                            title="Đăng xuất tất cả thiết bị"
                            subtitle="Đăng xuất khỏi mọi thiết bị khác"
                            showArrow
                            onPress={() => {
                                Alert.alert(
                                    'Đăng xuất tất cả',
                                    'Bạn sẽ bị đăng xuất khỏi tất cả các thiết bị khác. Tiếp tục?',
                                    [
                                        { text: 'Hủy', style: 'cancel' },
                                        { text: 'Đăng xuất', style: 'destructive', onPress: () => Alert.alert('Đã đăng xuất tất cả thiết bị khác') }
                                    ]
                                );
                            }}
                        />
                    </View>
                </View>

                {/* Data & Storage */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>DỮ LIỆU & LƯU TRỮ</Text>

                    <View style={[styles.card, { backgroundColor: colors.card }]}>
                        <SettingItem
                            icon="download"
                            title="Tải dữ liệu của bạn"
                            subtitle="Yêu cầu bản sao dữ liệu cá nhân"
                            showArrow
                            onPress={() => Alert.alert('Tải dữ liệu', 'Yêu cầu đã được gửi. Bạn sẽ nhận được thông báo khi dữ liệu sẵn sàng.')}
                        />

                        <View style={[styles.divider, { backgroundColor: colors.border }]} />

                        <SettingItem
                            icon="trash"
                            title="Xóa bộ nhớ cache"
                            subtitle="Giải phóng dung lượng lưu trữ"
                            showArrow
                            onPress={() => {
                                Alert.alert(
                                    'Xóa cache',
                                    'Xóa tất cả dữ liệu cache? Ứng dụng có thể chậm hơn tạm thời.',
                                    [
                                        { text: 'Hủy', style: 'cancel' },
                                        { text: 'Xóa', style: 'destructive', onPress: () => Alert.alert('Đã xóa cache') }
                                    ]
                                );
                            }}
                        />
                    </View>
                </View>

                {/* Blocked Users */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>NGƯỜI DÙNG ĐÃ CHẶN</Text>

                    <View style={[styles.card, { backgroundColor: colors.card }]}>
                        <SettingItem
                            icon="ban"
                            iconType="materialCommunity"
                            title="Danh sách chặn"
                            subtitle="Xem và quản lý người dùng đã chặn"
                            showArrow
                            onPress={() => navigation.navigate('BlockedUsers' as never)}
                        />
                    </View>
                </View>

                {/* Danger Zone */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: '#EF4444' }]}>VÙNG NGUY HIỂM</Text>

                    <TouchableOpacity
                        style={[styles.card, { backgroundColor: colors.card, borderWidth: 1, borderColor: '#FECACA' }]}
                        onPress={() => navigation.navigate('DeleteAccount' as never)}
                    >
                        <View style={styles.settingItem}>
                            <View style={[styles.iconContainer, { backgroundColor: '#FEE2E2' }]}>
                                <Ionicons name="trash-outline" size={22} color="#EF4444" />
                            </View>
                            <View style={styles.settingContent}>
                                <Text style={[styles.settingTitle, { color: '#EF4444' }]}>Xóa tài khoản</Text>
                                <Text style={[styles.settingSubtitle, { color: '#F87171' }]}>Xóa vĩnh viễn tài khoản và dữ liệu</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#F87171" />
                        </View>
                    </TouchableOpacity>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    headerGradient: {
        paddingBottom: 0,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    },
    backButton: {
        marginRight: 12,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    content: {
        flex: 1,
        padding: 16,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 12,
        marginLeft: 4,
        letterSpacing: 0.5,
    },
    card: {
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    settingContent: {
        flex: 1,
    },
    settingTitle: {
        fontSize: 16,
        fontWeight: '500',
    },
    settingSubtitle: {
        fontSize: 13,
        marginTop: 2,
    },
    divider: {
        height: 1,
        marginLeft: 70,
    },
});

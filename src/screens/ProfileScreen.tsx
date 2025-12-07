import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Image,
    SafeAreaView,
    Alert,
    StatusBar,
    Modal,
    Switch,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Updates from 'expo-updates';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../utils/theme';
import { User, BADGES, LEVEL_THRESHOLDS } from '../types';
import { getLatestChangelog } from '../utils/changelog';
import UpdateModal from '../components/UpdateModal';

interface ProfileScreenProps {
    user: User;
    onUpdate: (user: User) => void;
    onCancel: () => void;
    onLogout?: () => void;
}

export default function ProfileScreen({ user, onUpdate, onCancel, onLogout }: ProfileScreenProps) {
    const [avatar, setAvatar] = useState<string | undefined>(user.avatar);
    const [showCamera, setShowCamera] = useState(false);
    const [showImageOptions, setShowImageOptions] = useState(false);
    const [faceIdEnabled, setFaceIdEnabled] = useState(false);
    const [cameraPermission, requestCameraPermission] = useCameraPermissions();
    const cameraRef = useRef<CameraView>(null);
    const [showUpdateModal, setShowUpdateModal] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    const isOnboarding = !user.avatar;

    // Load Face ID setting
    useEffect(() => {
        loadFaceIdSetting();
    }, []);

    const loadFaceIdSetting = async () => {
        try {
            const saved = await AsyncStorage.getItem('faceIdEnabled');
            setFaceIdEnabled(saved === 'true');
        } catch (e) {
            console.log('Error loading Face ID setting');
        }
    };

    const toggleFaceId = async (value: boolean) => {
        setFaceIdEnabled(value);
        try {
            await AsyncStorage.setItem('faceIdEnabled', value.toString());
        } catch (e) {
            console.log('Error saving Face ID setting');
        }
    };

    const handleLogout = () => {
        Alert.alert(
            'Đăng xuất',
            'Bạn có chắc muốn đăng xuất?',
            [
                { text: 'Hủy', style: 'cancel' },
                { text: 'Đăng xuất', style: 'destructive', onPress: () => onLogout?.() }
            ]
        );
    };

    const handleCheckUpdate = async () => {
        try {
            Alert.alert('Đang kiểm tra...', 'Đang kết nối tới máy chủ cập nhật...');
            const update = await Updates.checkForUpdateAsync();
            if (update.isAvailable) {
                setShowUpdateModal(true);
            } else {
                Alert.alert('Đã cập nhật', 'Bạn đang sử dụng phiên bản mới nhất.');
            }
        } catch (error: any) {
            Alert.alert('Lỗi', `Không thể kiểm tra cập nhật: ${error.message}`);
        }
    };

    const handleDownloadUpdate = async () => {
        try {
            setIsDownloading(true);
            await Updates.fetchUpdateAsync();
            Alert.alert('Hoàn tất!', 'Ứng dụng sẽ khởi động lại ngay.', [
                { text: 'OK', onPress: () => Updates.reloadAsync() }
            ]);
        } catch (error: any) {
            Alert.alert('Lỗi', `Không thể tải bản cập nhật: ${error.message}`);
        } finally {
            setIsDownloading(false);
            setShowUpdateModal(false);
        }
    };

    const handleTakePhoto = async () => {
        setShowImageOptions(false);
        if (!cameraPermission?.granted) {
            const result = await requestCameraPermission();
            if (!result.granted) {
                Alert.alert('Quyền truy cập', 'Cần quyền camera để chụp ảnh đại diện');
                return;
            }
        }
        setShowCamera(true);
    };

    const capturePhoto = async () => {
        if (cameraRef.current) {
            try {
                const photo = await cameraRef.current.takePictureAsync({
                    base64: true,
                    quality: 0.7,
                });
                if (photo?.base64) {
                    setAvatar(`data:image/jpeg;base64,${photo.base64}`);
                    setShowCamera(false);
                }
            } catch (error) {
                console.error('Error taking photo:', error);
                Alert.alert('Lỗi', 'Không thể chụp ảnh. Vui lòng thử lại.');
            }
        }
    };

    const handlePickImage = async () => {
        setShowImageOptions(false);

        try {
            // Request permission first
            const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

            if (!permissionResult.granted) {
                Alert.alert(
                    'Quyền truy cập',
                    'Cần quyền truy cập thư viện ảnh để chọn ảnh đại diện',
                    [{ text: 'Đóng' }]
                );
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.7,
                base64: true,
            });

            console.log('[ImagePicker] Result:', result.canceled, result.assets?.length);

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const asset = result.assets[0];

                if (asset.base64) {
                    setAvatar(`data:image/jpeg;base64,${asset.base64}`);
                    console.log('[ImagePicker] Avatar set successfully');
                } else if (asset.uri) {
                    // Fallback: use URI if base64 not available
                    setAvatar(asset.uri);
                    console.log('[ImagePicker] Using URI fallback:', asset.uri);
                } else {
                    Alert.alert('Lỗi', 'Không thể đọc ảnh đã chọn');
                }
            }
        } catch (error) {
            console.error('[ImagePicker] Error:', error);
            Alert.alert('Lỗi', 'Không thể mở thư viện ảnh. Vui lòng thử lại.');
        }
    };

    const handleSubmit = () => {
        if (!avatar) {
            Alert.alert('Thông báo', 'Bạn cần chụp hoặc tải ảnh đại diện để tiếp tục!');
            return;
        }
        onUpdate({ ...user, avatar });
    };

    const currentLevel = user.level || 1;
    const currentXp = user.xp || 0;
    const nextLevelXp = LEVEL_THRESHOLDS[currentLevel] || LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
    const prevLevelXp = LEVEL_THRESHOLDS[currentLevel - 1] || 0;
    const progress = ((currentXp - prevLevelXp) / (nextLevelXp - prevLevelXp)) * 100;

    if (showCamera) {
        return (
            <SafeAreaView style={styles.cameraContainer}>
                <CameraView
                    ref={cameraRef}
                    style={styles.camera}
                    facing="front"
                >
                    <View style={styles.cameraOverlay}>
                        <View style={styles.cameraFrame} />
                    </View>

                    <View style={styles.cameraButtons}>
                        <TouchableOpacity
                            style={styles.cameraCancelBtn}
                            onPress={() => setShowCamera(false)}
                        >
                            <Ionicons name="close" size={28} color={COLORS.white} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.captureBtn}
                            onPress={capturePhoto}
                        >
                            <View style={styles.captureBtnInner} />
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.cameraFlipBtn}>
                            <Ionicons name="camera-reverse" size={28} color={COLORS.white} />
                        </TouchableOpacity>
                    </View>
                </CameraView>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

            {/* Header */}
            <View style={styles.header}>
                {!isOnboarding && (
                    <TouchableOpacity style={styles.backBtn} onPress={onCancel}>
                        <Ionicons name="arrow-back" size={24} color={COLORS.text} />
                    </TouchableOpacity>
                )}
                <Text style={styles.headerTitle}>
                    {isOnboarding ? 'Tạo hồ sơ' : 'Hồ sơ'}
                </Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Avatar Section */}
                <View style={styles.avatarSection}>
                    <View style={styles.avatarWrapper}>
                        <TouchableOpacity
                            style={styles.avatarContainer}
                            onPress={() => setShowImageOptions(true)}
                        >
                            {avatar ? (
                                <Image source={{ uri: avatar }} style={styles.avatar} />
                            ) : (
                                <LinearGradient
                                    colors={['#E2E8F0', '#CBD5E1']}
                                    style={styles.avatarPlaceholder}
                                >
                                    <Ionicons name="person" size={50} color={COLORS.textMuted} />
                                </LinearGradient>
                            )}
                        </TouchableOpacity>

                        {/* Edit Avatar Button */}
                        <TouchableOpacity
                            style={styles.editAvatarBtn}
                            onPress={() => setShowImageOptions(true)}
                        >
                            <Ionicons name="camera" size={18} color={COLORS.white} />
                        </TouchableOpacity>
                    </View>

                    {/* Image Options Modal */}
                    <Modal
                        visible={showImageOptions}
                        transparent
                        animationType="fade"
                        onRequestClose={() => setShowImageOptions(false)}
                    >
                        <View style={styles.imageOptionsOverlay}>
                            <View style={styles.imageOptionsCard}>
                                <Text style={styles.imageOptionsTitle}>Chọn ảnh đại diện</Text>

                                <TouchableOpacity style={styles.imageOption} onPress={handleTakePhoto}>
                                    <View style={[styles.imageOptionIcon, { backgroundColor: '#EEF2FF' }]}>
                                        <Ionicons name="camera" size={24} color="#6366F1" />
                                    </View>
                                    <View style={styles.imageOptionText}>
                                        <Text style={styles.imageOptionTitle}>Chụp ảnh</Text>
                                        <Text style={styles.imageOptionDesc}>Sử dụng camera</Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.imageOption} onPress={handlePickImage}>
                                    <View style={[styles.imageOptionIcon, { backgroundColor: '#FEF3C7' }]}>
                                        <Ionicons name="images" size={24} color="#F59E0B" />
                                    </View>
                                    <View style={styles.imageOptionText}>
                                        <Text style={styles.imageOptionTitle}>Chọn từ thư viện</Text>
                                        <Text style={styles.imageOptionDesc}>Tải ảnh có sẵn</Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.imageOptionsCancel}
                                    onPress={() => setShowImageOptions(false)}
                                >
                                    <Text style={styles.imageOptionsCancelText}>Hủy</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </Modal>

                    {/* Level & XP */}
                    <View style={styles.levelContainer}>
                        <View style={styles.levelBadge}>
                            <MaterialIcons name="star" size={16} color="#F59E0B" />
                            <Text style={styles.levelText}>Level {currentLevel}</Text>
                        </View>
                    </View>

                    <View style={styles.xpContainer}>
                        <View style={styles.xpHeader}>
                            <Text style={styles.xpText}>{currentXp} XP</Text>
                            <Text style={styles.xpNext}>{nextLevelXp} XP</Text>
                        </View>
                        <View style={styles.xpBar}>
                            <LinearGradient
                                colors={COLORS.gradientPrimary as [string, string]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={[styles.xpProgress, { width: `${Math.min(100, progress)}%` }]}
                            />
                        </View>
                        <Text style={styles.xpNextLevel}>
                            Còn {nextLevelXp - currentXp} XP để lên Level {currentLevel + 1}
                        </Text>
                    </View>
                </View>

                {/* Personal Info - Read Only */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Feather name="user" size={20} color={COLORS.primary} />
                        <Text style={styles.cardTitle}>Thông tin cá nhân</Text>
                    </View>

                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Tên hiển thị</Text>
                        <Text style={styles.infoValue}>{user.name}</Text>
                    </View>

                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Email</Text>
                        <Text style={styles.infoValue}>{user.email}</Text>
                    </View>
                </View>

                {/* Badges */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <MaterialIcons name="emoji-events" size={20} color={COLORS.primary} />
                        <Text style={styles.cardTitle}>Huy hiệu</Text>
                        <Text style={styles.badgeCount}>
                            {user.badges?.length || 0}/{BADGES.length}
                        </Text>
                    </View>

                    <View style={styles.badgesGrid}>
                        {BADGES.map((badge) => {
                            const unlocked = user.badges?.includes(badge.id);
                            return (
                                <View
                                    key={badge.id}
                                    style={[styles.badgeCard, !unlocked && styles.badgeLocked]}
                                >
                                    <Text style={[styles.badgeIcon, !unlocked && styles.badgeIconLocked]}>
                                        {badge.icon}
                                    </Text>
                                    <Text style={[styles.badgeName, !unlocked && styles.badgeNameLocked]}>
                                        {badge.name}
                                    </Text>
                                </View>
                            );
                        })}
                    </View>
                </View>

                {/* Settings */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Ionicons name="settings-outline" size={20} color={COLORS.primary} />
                        <Text style={styles.cardTitle}>Cài đặt</Text>
                    </View>

                    <View style={styles.settingRow}>
                        <View style={styles.settingInfo}>
                            <View style={styles.settingIconContainer}>
                                <Ionicons name="finger-print" size={22} color={COLORS.primary} />
                            </View>
                            <View>
                                <Text style={styles.settingLabel}>Đăng nhập Face ID</Text>
                                <Text style={styles.settingDesc}>Xác thực khuôn mặt khi đăng nhập</Text>
                            </View>
                        </View>
                        <Switch
                            value={faceIdEnabled}
                            onValueChange={toggleFaceId}
                            trackColor={{ false: COLORS.border, true: COLORS.primary + '60' }}
                            thumbColor={faceIdEnabled ? COLORS.primary : '#f4f3f4'}
                        />
                    </View>

                    {/* App Update Row */}
                    <TouchableOpacity style={styles.settingRow} onPress={handleCheckUpdate}>
                        <View style={styles.settingInfo}>
                            <View style={[styles.settingIconContainer, { backgroundColor: '#DCFCE7' }]}>
                                <Ionicons name="cloud-download-outline" size={22} color="#16A34A" />
                            </View>
                            <View>
                                <Text style={styles.settingLabel}>Cập nhật ứng dụng</Text>
                                <Text style={styles.settingDesc}>Phiên bản hiện tại: v{getLatestChangelog()?.version || '?'}</Text>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
                    </TouchableOpacity>
                </View>

                {/* Submit Button */}
                <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
                    <LinearGradient
                        colors={COLORS.gradientPrimary as [string, string]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.submitGradient}
                    >
                        <Text style={styles.submitText}>
                            {isOnboarding ? 'Bắt đầu học!' : 'Lưu thay đổi'}
                        </Text>
                        <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
                    </LinearGradient>
                </TouchableOpacity>

                {/* Logout Button - only show if not onboarding */}
                {!isOnboarding && onLogout && (
                    <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                        <Ionicons name="log-out-outline" size={20} color={COLORS.error} />
                        <Text style={styles.logoutText}>Đăng xuất</Text>
                    </TouchableOpacity>
                )}

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Update Modal */}
            <UpdateModal
                visible={showUpdateModal}
                onUpdate={handleDownloadUpdate}
                onClose={() => setShowUpdateModal(false)}
                isDownloading={isDownloading}
            />
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
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.md,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.white,
        alignItems: 'center',
        justifyContent: 'center',
        ...SHADOWS.sm,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    scrollContent: {
        padding: SPACING.lg,
        paddingTop: 0,
    },
    avatarSection: {
        alignItems: 'center',
        marginBottom: SPACING.lg,
    },
    avatarWrapper: {
        position: 'relative',
        marginBottom: SPACING.md,
    },
    avatarContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        overflow: 'hidden',
        ...SHADOWS.md,
    },
    avatar: {
        width: '100%',
        height: '100%',
    },
    avatarPlaceholder: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    editAvatarBtn: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: COLORS.background,
    },
    imageOptionsOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    imageOptionsCard: {
        backgroundColor: COLORS.white,
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.lg,
        width: '90%',
        ...SHADOWS.lg,
    },
    imageOptionsTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.text,
        textAlign: 'center',
        marginBottom: SPACING.lg,
    },
    imageOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    imageOptionIcon: {
        width: 48,
        height: 48,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: SPACING.md,
    },
    imageOptionText: {
        flex: 1,
    },
    imageOptionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
    },
    imageOptionDesc: {
        fontSize: 13,
        color: COLORS.textMuted,
    },
    imageOptionsCancel: {
        marginTop: SPACING.lg,
        paddingVertical: SPACING.md,
        alignItems: 'center',
    },
    imageOptionsCancelText: {
        fontSize: 16,
        color: COLORS.textMuted,
        fontWeight: '600',
    },
    levelContainer: {
        marginBottom: SPACING.sm,
    },
    levelBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEF3C7',
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.xs,
        borderRadius: BORDER_RADIUS.full,
        gap: 4,
    },
    levelText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#92400E',
    },
    xpContainer: {
        width: '100%',
        backgroundColor: COLORS.white,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md,
        ...SHADOWS.sm,
    },
    xpHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: SPACING.xs,
    },
    xpText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: COLORS.primary,
    },
    xpNext: {
        fontSize: 12,
        color: COLORS.textMuted,
    },
    xpBar: {
        height: 8,
        backgroundColor: COLORS.backgroundDark,
        borderRadius: 4,
        overflow: 'hidden',
    },
    xpProgress: {
        height: '100%',
        borderRadius: 4,
    },
    xpNextLevel: {
        fontSize: 12,
        color: COLORS.textMuted,
        marginTop: SPACING.xs,
        textAlign: 'center',
    },
    card: {
        backgroundColor: COLORS.white,
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.lg,
        marginBottom: SPACING.md,
        ...SHADOWS.sm,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.md,
        gap: SPACING.sm,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
        flex: 1,
    },
    badgeCount: {
        fontSize: 14,
        color: COLORS.textMuted,
    },
    inputGroup: {
        marginBottom: 0,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        color: COLORS.textLight,
        marginBottom: SPACING.xs,
    },
    input: {
        backgroundColor: COLORS.backgroundDark,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md,
        fontSize: 16,
        color: COLORS.text,
    },
    voiceGrid: {
        gap: SPACING.sm,
    },
    voiceCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.md,
        backgroundColor: COLORS.backgroundDark,
        borderRadius: BORDER_RADIUS.lg,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    voiceCardActive: {
        borderColor: COLORS.primary,
        backgroundColor: COLORS.primary + '08',
    },
    voiceIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.white,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: SPACING.md,
    },
    voiceIconActive: {
        backgroundColor: COLORS.primary + '20',
    },
    voiceEmoji: {
        fontSize: 24,
    },
    voiceLabel: {
        flex: 1,
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.text,
    },
    voiceLabelActive: {
        color: COLORS.primary,
    },
    voiceDesc: {
        fontSize: 12,
        color: COLORS.textMuted,
    },
    voiceCheck: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: SPACING.sm,
    },
    badgesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.sm,
    },
    badgeCard: {
        width: '30%',
        alignItems: 'center',
        padding: SPACING.md,
        backgroundColor: COLORS.backgroundDark,
        borderRadius: BORDER_RADIUS.lg,
    },
    badgeLocked: {
        opacity: 0.4,
    },
    badgeIcon: {
        fontSize: 32,
        marginBottom: SPACING.xs,
    },
    badgeIconLocked: {
        filter: 'grayscale(1)',
    },
    badgeName: {
        fontSize: 11,
        fontWeight: '600',
        color: COLORS.text,
        textAlign: 'center',
    },
    badgeNameLocked: {
        color: COLORS.textMuted,
    },
    submitBtn: {
        marginTop: SPACING.md,
        borderRadius: BORDER_RADIUS.lg,
        overflow: 'hidden',
        ...SHADOWS.md,
    },
    submitGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: SPACING.md + 2,
        gap: SPACING.sm,
    },
    submitText: {
        color: COLORS.white,
        fontSize: 17,
        fontWeight: 'bold',
    },
    cameraContainer: {
        flex: 1,
        backgroundColor: '#000',
    },
    camera: {
        flex: 1,
    },
    cameraOverlay: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cameraFrame: {
        width: 250,
        height: 250,
        borderRadius: 125,
        borderWidth: 3,
        borderColor: 'rgba(255,255,255,0.5)',
        borderStyle: 'dashed',
    },
    cameraButtons: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingVertical: SPACING.xl,
        paddingHorizontal: SPACING.lg,
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    cameraCancelBtn: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    cameraFlipBtn: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    captureBtn: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255,255,255,0.3)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: COLORS.white,
    },
    captureBtnInner: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: COLORS.white,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: SPACING.sm,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    infoLabel: {
        fontSize: 14,
        color: COLORS.textMuted,
    },
    infoValue: {
        fontSize: 15,
        fontWeight: '500',
        color: COLORS.text,
    },
    settingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: SPACING.sm,
    },
    settingInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    settingIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: COLORS.primary + '15',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: SPACING.md,
    },
    settingLabel: {
        fontSize: 15,
        fontWeight: '500',
        color: COLORS.text,
    },
    settingDesc: {
        fontSize: 12,
        color: COLORS.textMuted,
        marginTop: 2,
    },
    logoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: SPACING.lg,
        paddingVertical: SPACING.md,
        backgroundColor: COLORS.error + '10',
        borderRadius: BORDER_RADIUS.lg,
        gap: SPACING.sm,
    },
    logoutText: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.error,
    },
});

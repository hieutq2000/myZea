import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Image,
    SafeAreaView,
    Alert,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../utils/theme';
import { User, AiVoice, VOICE_LABELS, BADGES, LEVEL_THRESHOLDS } from '../types';

interface ProfileScreenProps {
    user: User;
    onUpdate: (user: User) => void;
    onCancel: () => void;
}

export default function ProfileScreen({ user, onUpdate, onCancel }: ProfileScreenProps) {
    const [name, setName] = useState(user.name);
    const [avatar, setAvatar] = useState<string | undefined>(user.avatar);
    const [voice, setVoice] = useState<AiVoice>(user.voice || AiVoice.KORE);
    const [showCamera, setShowCamera] = useState(false);
    const [cameraPermission, requestCameraPermission] = useCameraPermissions();
    const cameraRef = useRef<CameraView>(null);

    const isOnboarding = !user.avatar;

    const handleTakePhoto = async () => {
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
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
            base64: true,
        });

        if (!result.canceled && result.assets[0]?.base64) {
            setAvatar(`data:image/jpeg;base64,${result.assets[0].base64}`);
        }
    };

    const handleSubmit = () => {
        if (!avatar) {
            Alert.alert('Thông báo', 'Bạn cần chụp hoặc tải ảnh đại diện để tiếp tục!');
            return;
        }
        onUpdate({ ...user, name, avatar, voice });
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
                            <Text style={styles.cameraCancelText}>Hủy</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.captureBtn}
                            onPress={capturePhoto}
                        >
                            <View style={styles.captureBtnInner} />
                        </TouchableOpacity>

                        <View style={{ width: 60 }} />
                    </View>
                </CameraView>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>
                        {isOnboarding ? '🎉 Chào mừng bạn mới!' : 'Hồ Sơ Của Tôi'}
                    </Text>
                    {isOnboarding && (
                        <Text style={styles.headerSubtitle}>
                            Hãy hoàn tất hồ sơ để bắt đầu học nhé!
                        </Text>
                    )}
                </View>

                <View style={styles.avatarSection}>
                    <View style={styles.levelBadge}>
                        <Text style={styles.levelText}>Level {currentLevel}</Text>
                    </View>

                    <View style={styles.avatarContainer}>
                        {avatar ? (
                            <Image source={{ uri: avatar }} style={styles.avatar} />
                        ) : (
                            <View style={styles.avatarPlaceholder}>
                                <Text style={styles.avatarPlaceholderText}>📷</Text>
                            </View>
                        )}
                    </View>

                    <View style={styles.avatarButtons}>
                        <TouchableOpacity style={styles.avatarBtn} onPress={handleTakePhoto}>
                            <Text style={styles.avatarBtnIcon}>📷</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.avatarBtn} onPress={handlePickImage}>
                            <Text style={styles.avatarBtnIcon}>🖼️</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.xpContainer}>
                        <Text style={styles.xpText}>💎 {currentXp} XP</Text>
                        <View style={styles.xpBar}>
                            <View style={[styles.xpProgress, { width: `${Math.min(100, progress)}%` }]} />
                        </View>
                        <Text style={styles.xpNextLevel}>
                            {nextLevelXp - currentXp} XP để lên Level {currentLevel + 1}
                        </Text>
                    </View>
                </View>

                <View style={styles.form}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Tên hiển thị</Text>
                        <TextInput
                            style={styles.input}
                            value={name}
                            onChangeText={setName}
                            placeholder="Nhập tên của bạn"
                            placeholderTextColor={COLORS.textMuted}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>🎙️ Giọng Gia Sư AI</Text>
                        <View style={styles.voiceGrid}>
                            {Object.values(AiVoice).map((v) => (
                                <TouchableOpacity
                                    key={v}
                                    style={[
                                        styles.voiceCard,
                                        voice === v && styles.voiceCardActive
                                    ]}
                                    onPress={() => setVoice(v)}
                                >
                                    <Text style={styles.voiceIcon}>
                                        {VOICE_LABELS[v].gender === 'female' ? '👩‍🏫' : '👨‍🏫'}
                                    </Text>
                                    <Text style={[
                                        styles.voiceLabel,
                                        voice === v && styles.voiceLabelActive
                                    ]}>
                                        {VOICE_LABELS[v].label}
                                    </Text>
                                    <Text style={styles.voiceDesc}>{VOICE_LABELS[v].desc}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>🏅 Huy Hiệu</Text>
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
                </View>

                <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
                    <Text style={styles.submitText}>
                        {isOnboarding ? 'Bắt Đầu Học Thôi! 🚀' : 'Lưu Thay Đổi'}
                    </Text>
                </TouchableOpacity>

                {!isOnboarding && (
                    <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
                        <Text style={styles.cancelText}>Hủy</Text>
                    </TouchableOpacity>
                )}

                <View style={{ height: 50 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    scrollContent: {
        padding: SPACING.lg,
    },
    header: {
        marginBottom: SPACING.lg,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: COLORS.text,
        textAlign: 'center',
    },
    headerSubtitle: {
        fontSize: 16,
        color: COLORS.textLight,
        textAlign: 'center',
        marginTop: SPACING.xs,
    },
    avatarSection: {
        alignItems: 'center',
        backgroundColor: COLORS.white,
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.lg,
        marginBottom: SPACING.lg,
        ...SHADOWS.md,
    },
    levelBadge: {
        backgroundColor: COLORS.secondary,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.xs,
        borderRadius: BORDER_RADIUS.full,
        marginBottom: SPACING.md,
    },
    levelText: {
        color: COLORS.white,
        fontWeight: 'bold',
        fontSize: 12,
    },
    avatarContainer: {
        marginBottom: SPACING.md,
    },
    avatar: {
        width: 140,
        height: 140,
        borderRadius: 70,
        borderWidth: 4,
        borderColor: COLORS.primary,
    },
    avatarPlaceholder: {
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: COLORS.backgroundDark,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 4,
        borderColor: COLORS.border,
    },
    avatarPlaceholderText: {
        fontSize: 48,
    },
    avatarButtons: {
        flexDirection: 'row',
        gap: SPACING.md,
        marginBottom: SPACING.md,
    },
    avatarBtn: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center',
        ...SHADOWS.sm,
    },
    avatarBtnIcon: {
        fontSize: 24,
    },
    xpContainer: {
        width: '100%',
        alignItems: 'center',
    },
    xpText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: SPACING.xs,
    },
    xpBar: {
        width: '100%',
        height: 8,
        backgroundColor: COLORS.backgroundDark,
        borderRadius: 4,
        overflow: 'hidden',
    },
    xpProgress: {
        height: '100%',
        backgroundColor: COLORS.primary,
        borderRadius: 4,
    },
    xpNextLevel: {
        fontSize: 12,
        color: COLORS.textLight,
        marginTop: SPACING.xs,
    },
    form: {
        backgroundColor: COLORS.white,
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.lg,
        marginBottom: SPACING.lg,
        ...SHADOWS.md,
    },
    inputGroup: {
        marginBottom: SPACING.lg,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: SPACING.sm,
    },
    input: {
        backgroundColor: COLORS.backgroundDark,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md,
        fontSize: 16,
        color: COLORS.text,
        borderWidth: 1,
        borderColor: COLORS.border,
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
        backgroundColor: COLORS.primary + '10',
    },
    voiceIcon: {
        fontSize: 24,
        marginRight: SPACING.md,
    },
    voiceLabel: {
        flex: 1,
        fontSize: 14,
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
    badgesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.sm,
    },
    badgeCard: {
        width: '30%',
        alignItems: 'center',
        padding: SPACING.sm,
        backgroundColor: COLORS.backgroundDark,
        borderRadius: BORDER_RADIUS.md,
    },
    badgeLocked: {
        opacity: 0.5,
    },
    badgeIcon: {
        fontSize: 32,
        marginBottom: SPACING.xs,
    },
    badgeIconLocked: {
        opacity: 0.4,
    },
    badgeName: {
        fontSize: 10,
        fontWeight: '600',
        color: COLORS.text,
        textAlign: 'center',
    },
    badgeNameLocked: {
        color: COLORS.textMuted,
    },
    submitBtn: {
        backgroundColor: COLORS.primary,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md,
        alignItems: 'center',
        ...SHADOWS.md,
    },
    submitText: {
        color: COLORS.white,
        fontSize: 18,
        fontWeight: 'bold',
    },
    cancelBtn: {
        marginTop: SPACING.md,
        alignItems: 'center',
    },
    cancelText: {
        color: COLORS.textLight,
        fontSize: 16,
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
        borderWidth: 4,
        borderColor: COLORS.white,
        borderStyle: 'dashed',
    },
    cameraButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: SPACING.xl,
        paddingBottom: SPACING.xxl,
    },
    cameraCancelBtn: {
        width: 60,
    },
    cameraCancelText: {
        color: COLORS.white,
        fontSize: 16,
    },
    captureBtn: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255,255,255,0.3)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    captureBtnInner: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: COLORS.white,
    },
});

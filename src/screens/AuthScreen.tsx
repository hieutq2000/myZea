import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather, Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../utils/theme';
import { login, register, checkServerHealth } from '../utils/api';
import { User, AuthView } from '../types';
import { getLatestChangelog } from '../utils/changelog';

interface AuthScreenProps {
    onLogin: (user: User) => void;
}

export default function AuthScreen({ onLogin }: AuthScreenProps) {
    const [view, setView] = useState<AuthView>(AuthView.LOGIN);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);

    const [faceIdEnabled, setFaceIdEnabled] = useState(false);
    const [hasBiometrics, setHasBiometrics] = useState(false);
    const [hasSavedCredentials, setHasSavedCredentials] = useState(false);

    // Load saved credentials and Face ID setting on mount
    useEffect(() => {
        loadSavedCredentials();
        checkBiometrics();
    }, []);

    const checkBiometrics = async () => {
        try {
            const compatible = await LocalAuthentication.hasHardwareAsync();
            const enrolled = await LocalAuthentication.isEnrolledAsync();
            setHasBiometrics(compatible && enrolled);

            const faceIdSetting = await AsyncStorage.getItem('faceIdEnabled');
            setFaceIdEnabled(faceIdSetting === 'true');
        } catch (e) {
            console.log('Biometric check error:', e);
        }
    };

    const loadSavedCredentials = async () => {
        try {
            const savedEmail = await AsyncStorage.getItem('savedEmail');
            const savedPassword = await AsyncStorage.getItem('savedPassword');
            if (savedEmail && savedPassword) {
                setEmail(savedEmail);
                setPassword(savedPassword);
                setHasSavedCredentials(true);
            }
        } catch (e) {
            console.log('Error loading credentials');
        }
    };

    const handleFaceIdLogin = async () => {
        if (!hasSavedCredentials) {
            Alert.alert('Thông báo', 'Chưa có thông tin đăng nhập được lưu. Vui lòng đăng nhập thủ công trước.');
            return;
        }

        try {
            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: 'Xác thực để đăng nhập',
                cancelLabel: 'Hủy',
                fallbackLabel: 'Nhập mật khẩu',
                disableDeviceFallback: false,
            });

            if (result.success) {
                // Biometric authentication successful, proceed with login
                handleSubmit();
            } else if (result.error === 'user_cancel') {
                // User cancelled, do nothing
            } else {
                Alert.alert('Lỗi', 'Xác thực sinh trắc học thất bại');
            }
        } catch (e) {
            console.log('Face ID error:', e);
            Alert.alert('Lỗi', 'Không thể sử dụng Face ID');
        }
    };

    const saveCredentials = async () => {
        try {
            // Always save credentials for Face ID login
            await AsyncStorage.setItem('savedEmail', email);
            await AsyncStorage.setItem('savedPassword', password);
        } catch (e) {
            console.log('Error saving credentials');
        }
    };

    const handleSubmit = async () => {
        if (!email || !password) {
            setError('Vui lòng nhập email và mật khẩu');
            return;
        }

        if (view === AuthView.REGISTER && !name) {
            setError('Vui lòng nhập họ tên');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Check server connection first
            const isServerOnline = await checkServerHealth();

            if (!isServerOnline) {
                setError('Không thể kết nối đến server. Vui lòng kiểm tra:\n• Server đang chạy\n• Kết nối mạng WiFi');
                Alert.alert(
                    '❌ Lỗi kết nối',
                    'Không thể kết nối đến server.\n\nVui lòng đảm bảo:\n• Server backend đang chạy\n• Điện thoại và máy chủ cùng mạng WiFi',
                    [{ text: 'Đóng' }]
                );
                return;
            }

            let response;
            if (view === AuthView.LOGIN) {
                response = await login(email, password);
            } else {
                response = await register(email, password, name);
            }

            onLogin(response.user);
            await saveCredentials();
        } catch (err) {
            const errorMessage = (err as Error).message;
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
            >
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.logo}>🎓</Text>
                    <Text style={styles.title}>Vinalive AI</Text>
                    <Text style={styles.subtitle}>Trợ lý học tập AI cá nhân</Text>
                </View>

                {/* Form Card */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>
                        {view === AuthView.LOGIN ? 'Đăng Nhập' : 'Đăng Ký'}
                    </Text>

                    {error && (
                        <View style={styles.errorBox}>
                            <Text style={styles.errorText}>⚠️ {error}</Text>
                        </View>
                    )}

                    {view === AuthView.REGISTER && (
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Họ và tên</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Nguyễn Văn A"
                                value={name}
                                onChangeText={setName}
                                placeholderTextColor={COLORS.textMuted}
                            />
                        </View>
                    )}

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Email</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="email@example.com"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            placeholderTextColor={COLORS.textMuted}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Mật khẩu</Text>
                        <View style={styles.passwordContainer}>
                            <TextInput
                                style={styles.passwordInput}
                                placeholder="••••••••"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                                placeholderTextColor={COLORS.textMuted}
                            />
                            <TouchableOpacity
                                style={styles.eyeButton}
                                onPress={() => setShowPassword(!showPassword)}
                            >
                                <Feather
                                    name={showPassword ? 'eye' : 'eye-off'}
                                    size={20}
                                    color={COLORS.textMuted}
                                />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Login Button Row with Face ID */}
                    <View style={styles.loginRow}>
                        <TouchableOpacity
                            style={styles.submitButton}
                            onPress={handleSubmit}
                            disabled={loading}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={COLORS.gradientPrimary as [string, string]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.gradientButton}
                            >
                                {loading ? (
                                    <ActivityIndicator color={COLORS.white} />
                                ) : (
                                    <Text style={styles.submitText}>
                                        {view === AuthView.LOGIN ? 'Đăng Nhập' : 'Đăng Ký'}
                                    </Text>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>

                        {/* Face ID Button - Icon only, next to login button */}
                        {view === AuthView.LOGIN && faceIdEnabled && hasBiometrics && hasSavedCredentials && (
                            <TouchableOpacity
                                style={styles.faceIdIconButton}
                                onPress={handleFaceIdLogin}
                                activeOpacity={0.8}
                            >
                                <View style={styles.faceIdIconContainer}>
                                    <Ionicons name="scan-outline" size={28} color={COLORS.primary} />
                                </View>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Forgot Password - only show in login mode */}
                    {view === AuthView.LOGIN && (
                        <TouchableOpacity
                            style={styles.forgotPasswordButton}
                            onPress={() => Alert.alert(
                                'Quên mật khẩu',
                                'Vui lòng liên hệ admin để được hỗ trợ reset mật khẩu.\n\nEmail: support@vinalive.ai',
                                [{ text: 'Đóng' }]
                            )}
                        >
                            <Text style={styles.forgotPasswordText}>Quên mật khẩu?</Text>
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity
                        style={styles.switchButton}
                        onPress={() => {
                            setView(view === AuthView.LOGIN ? AuthView.REGISTER : AuthView.LOGIN);
                            setError(null);
                        }}
                    >
                        <Text style={styles.switchText}>
                            {view === AuthView.LOGIN
                                ? 'Chưa có tài khoản? Đăng ký ngay'
                                : 'Đã có tài khoản? Đăng nhập'}
                        </Text>
                    </TouchableOpacity>


                </View>
            </ScrollView>

            {/* Version Badge - Bottom Right */}
            <View style={styles.versionBadge}>
                <Text style={styles.versionText}>v{getLatestChangelog()?.version || '?'}</Text>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: SPACING.lg,
    },
    header: {
        alignItems: 'center',
        marginBottom: SPACING.xl,
    },
    logo: {
        fontSize: 64,
        marginBottom: SPACING.md,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    subtitle: {
        fontSize: 16,
        color: COLORS.textLight,
        marginTop: SPACING.xs,
    },
    card: {
        backgroundColor: COLORS.white,
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.lg,
        ...SHADOWS.lg,
    },
    cardTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.text,
        textAlign: 'center',
        marginBottom: SPACING.lg,
    },
    errorBox: {
        backgroundColor: COLORS.error + '15',
        borderRadius: BORDER_RADIUS.md,
        padding: SPACING.md,
        marginBottom: SPACING.md,
        borderWidth: 1,
        borderColor: COLORS.error,
    },
    errorText: {
        color: COLORS.error,
        fontSize: 14,
        textAlign: 'center',
    },
    inputGroup: {
        marginBottom: SPACING.md,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.textLight,
        marginBottom: SPACING.xs,
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
    gradientButton: {
        paddingVertical: SPACING.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    submitText: {
        color: COLORS.white,
        fontSize: 18,
        fontWeight: 'bold',
    },
    switchButton: {
        marginTop: SPACING.md,
        alignItems: 'center',
    },
    switchText: {
        color: COLORS.primary,
        fontSize: 14,
        fontWeight: '500',
    },
    passwordContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.backgroundDark,
        borderRadius: BORDER_RADIUS.lg,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    passwordInput: {
        flex: 1,
        padding: SPACING.md,
        fontSize: 16,
        color: COLORS.text,
    },
    eyeButton: {
        padding: SPACING.md,
    },
    loginRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: SPACING.lg,
        gap: SPACING.sm,
    },
    submitButton: {
        flex: 1,
        borderRadius: BORDER_RADIUS.lg,
        overflow: 'hidden',
    },
    faceIdIconButton: {
        width: 52,
        height: 52,
        borderRadius: BORDER_RADIUS.lg,
        backgroundColor: '#E8F4FD',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#B8D4E8',
    },
    faceIdIconContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    forgotPasswordButton: {
        marginTop: SPACING.md,
        alignItems: 'center',
    },
    forgotPasswordText: {
        color: COLORS.primary,
        fontSize: 14,
        fontWeight: '500',
    },
    versionBadge: {
        position: 'absolute',
        bottom: 20,
        right: 20,
        backgroundColor: 'rgba(0,0,0,0.1)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    versionText: {
        fontSize: 12,
        color: COLORS.textMuted,
        fontWeight: '500',
    },
});

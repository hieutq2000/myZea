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
    Image,
    Dimensions,
    StatusBar,
    SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather, Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../utils/theme';
import { login, register, checkServerHealth } from '../utils/api';
import { User, AuthView } from '../types';
import { getLatestChangelog } from '../utils/changelog';
import FloatingLabelInput from '../components/FloatingLabelInput';

interface AuthScreenProps {
    onLogin: (user: User) => void;
}

export default function AuthScreen({ onLogin }: AuthScreenProps) {
    const [view, setView] = useState<AuthView>(AuthView.LOGIN);
    const [showLoginForm, setShowLoginForm] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [name, setName] = useState('');
    const [agreeToTerms, setAgreeToTerms] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

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
                // Biometric authentication successful
                setLoading(true);
                setError(null);

                try {
                    // Check server connection
                    const isServerOnline = await checkServerHealth();
                    if (!isServerOnline) {
                        throw new Error('Không thể kết nối đến server.');
                    }

                    // Retrieve saved credentials directly
                    const savedEmail = await AsyncStorage.getItem('savedEmail');
                    const savedPassword = await AsyncStorage.getItem('savedPassword');

                    if (savedEmail && savedPassword) {
                        const response = await login(savedEmail, savedPassword);
                        onLogin(response.user);
                    } else {
                        setError('Không tìm thấy thông tin đăng nhập đã lưu');
                    }
                } catch (err) {
                    const errorMessage = (err as Error).message;
                    setError(errorMessage);
                    Alert.alert('Lỗi đăng nhập', errorMessage);
                } finally {
                    setLoading(false);
                }
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
        // 1. Validate empty fields
        if (!email.trim() || !password) {
            setError('Vui lòng nhập đầy đủ email và mật khẩu');
            return;
        }

        // 2. Validate Email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
            setError('Email không hợp lệ (ví dụ: email@domain.com)');
            return;
        }

        // 3. Validate Password length
        if (password.length < 6) {
            setError('Mật khẩu phải có ít nhất 6 ký tự');
            return;
        }

        if (view === AuthView.REGISTER) {
            if (!name.trim()) {
                setError('Vui lòng nhập họ và tên');
                return;
            }
            if (password !== confirmPassword) {
                setError('Mật khẩu nhập lại không khớp');
                return;
            }
            if (!agreeToTerms) {
                setError('Bạn cần đồng ý với điều khoản sử dụng');
                return;
            }
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

    const renderWelcome = () => (
        <View style={styles.welcomeContainer}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

            {/* Top Blue Section */}
            <View style={styles.topSection}>
                <LinearGradient
                    colors={['#5B6BE6', '#4F46E5']}
                    style={StyleSheet.absoluteFill}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                />

                <SafeAreaView style={{ flex: 1 }}>
                    <View style={styles.headerTextContainer}>
                        <Text style={styles.wBrandTitle}>Global Enterprise</Text>
                        <Text style={styles.wSlogan}>
                            Be the world-class technology solutions provider for complex business challenger
                        </Text>
                    </View>
                </SafeAreaView>

                {/* Team Image - People cutout style */}
                <View style={styles.teamImageContainer}>
                    <Image
                        source={{ uri: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&q=80' }}
                        style={styles.teamImagePerson1}
                        resizeMode="contain"
                    />
                    <Image
                        source={{ uri: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&q=80' }}
                        style={styles.teamImagePerson2}
                        resizeMode="contain"
                    />
                </View>
            </View>

            {/* Bottom Black Section */}
            <View style={styles.bottomSection}>
                {/* Curve Effect */}
                <View style={styles.curveOverlay} />

                <View style={styles.bottomContent}>
                    {/* myZyea Logo */}
                    <View style={styles.wLogoRow}>
                        <View style={styles.zyeaLogoContainer}>
                            <Text style={styles.zyeaMy}>my</Text>
                            <Text style={styles.zyeaName}>Zyea</Text>
                        </View>
                    </View>

                    <Text style={styles.wWelcomeText}>Chào mừng bạn !</Text>
                    <Text style={styles.wInstructionText}>Vui lòng nhập email để đăng nhập myZyea</Text>

                    <TouchableOpacity
                        style={styles.wLoginButton}
                        onPress={() => setShowLoginForm(true)}
                        activeOpacity={0.9}
                    >
                        <Text style={styles.wLoginButtonText}>Đăng nhập</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );

    if (!showLoginForm) {
        return renderWelcome();
    }

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
            >
                <TouchableOpacity
                    style={{ position: 'absolute', top: 50, left: 20, zIndex: 10, padding: 8 }}
                    onPress={() => setShowLoginForm(false)}
                >
                    <Feather name="arrow-left" size={24} color={COLORS.text} />
                </TouchableOpacity>

                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.logo}>🎓</Text>
                    <Text style={styles.title}>Zyea</Text>
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
                        <FloatingLabelInput
                            label="Họ và tên"
                            value={name}
                            onChangeText={setName}
                            placeholder="Nguyễn Văn A"
                            icon="user"
                        />
                    )}

                    <FloatingLabelInput
                        label="Email"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        placeholder="email@example.com"
                        icon="user"
                    />

                    <FloatingLabelInput
                        label="Mật khẩu"
                        value={password}
                        onChangeText={setPassword}
                        isPassword
                        placeholder="••••••••"
                        icon="lock"
                    />

                    {view === AuthView.REGISTER && (
                        <>
                            <FloatingLabelInput
                                label="Nhập lại mật khẩu"
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                isPassword
                                placeholder="••••••••"
                                icon="lock"
                            />

                            <TouchableOpacity
                                style={styles.termsContainer}
                                onPress={() => setAgreeToTerms(!agreeToTerms)}
                                activeOpacity={0.8}
                            >
                                <View style={[
                                    styles.checkbox,
                                    agreeToTerms && styles.checkboxChecked
                                ]}>
                                    {agreeToTerms && <Feather name="check" size={14} color={COLORS.white} />}
                                </View>
                                <Text style={styles.termsText}>
                                    Tôi đồng ý với <Text style={styles.linkText}>Điều khoản sử dụng</Text> và <Text style={styles.linkText}>Chính sách bảo mật</Text>
                                </Text>
                            </TouchableOpacity>
                        </>
                    )}

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
                                'Vui lòng liên hệ admin để được hỗ trợ reset mật khẩu.\n\nEmail: support@zyea.ai',
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
                            // Clear form data when switching views
                            setEmail('');
                            setPassword('');
                            setName('');
                            setConfirmPassword('');
                            setAgreeToTerms(false);
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
    termsContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginTop: SPACING.md,
        marginHorizontal: SPACING.xs,
    },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: COLORS.primary,
        marginRight: SPACING.sm,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 2,
    },
    checkboxChecked: {
        backgroundColor: COLORS.primary,
    },
    termsText: {
        flex: 1,
        fontSize: 14,
        color: COLORS.textLight,
        lineHeight: 20,
    },
    linkText: {
        color: COLORS.primary,
        fontWeight: 'bold',
    },
    // Welcome Screen Styles
    welcomeContainer: {
        flex: 1,
        backgroundColor: '#111', // Very dark bg
    },
    topSection: {
        height: Dimensions.get('window').height * 0.60,
        position: 'relative',
        zIndex: 1,
    },
    headerTextContainer: {
        paddingHorizontal: 24,
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight! + 20 : 60,
        alignItems: 'center',
    },
    wBrandTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 8,
        letterSpacing: 1,
    },
    wSlogan: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.9)',
        textAlign: 'center',
        paddingHorizontal: 40,
        lineHeight: 18,
    },
    teamImageContainer: {
        position: 'absolute',
        bottom: 20,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'flex-end',
        zIndex: 10,
    },
    teamImagePerson1: {
        width: Dimensions.get('window').width * 0.4,
        height: 220,
        marginRight: -30,
    },
    teamImagePerson2: {
        width: Dimensions.get('window').width * 0.4,
        height: 200,
    },
    bottomSection: {
        flex: 1,
        backgroundColor: '#0D0D0D',
        justifyContent: 'flex-end',
        paddingBottom: 40,
        paddingHorizontal: 24,
        marginTop: -80,
        paddingTop: 100,
        position: 'relative',
        overflow: 'visible',
    },
    curveOverlay: {
        position: 'absolute',
        top: -60,
        left: 0,
        right: 0,
        height: 100,
        backgroundColor: '#0D0D0D',
        borderTopLeftRadius: 60,
        borderTopRightRadius: 60,
        zIndex: 5,
    },
    bottomContent: {
        zIndex: 2,
    },
    wLogoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    zyeaLogoContainer: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    zyeaMy: {
        fontSize: 24,
        fontWeight: '600',
        color: '#F97316', // Orange
        fontStyle: 'italic',
    },
    zyeaName: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#5B6BE6', // Blue/Purple matching header
    },
    wLogoText: {
        fontSize: 32,
        fontWeight: '900',
        fontStyle: 'italic',
    },
    wWelcomeText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 8,
    },
    wInstructionText: {
        fontSize: 14,
        color: '#888',
        marginBottom: 32,
    },
    wLoginButton: {
        backgroundColor: '#fff',
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
    },
    wLoginButtonText: {
        color: '#000',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

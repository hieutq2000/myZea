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
    FlatList,
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

    // Carousel State
    const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
    const flatListRef = React.useRef<any>(null);

    useEffect(() => {
        if (showLoginForm) return;
        const interval = setInterval(() => {
            setCurrentSlideIndex((prev) => {
                const next = prev === 2 ? 0 : prev + 1; // 3 slides (0, 1, 2)
                flatListRef.current?.scrollToIndex({ index: next, animated: true });
                return next;
            });
        }, 3500);
        return () => clearInterval(interval);
    }, [showLoginForm]);

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
                        throw new Error('Không thể kết nối đến server, hoặc kiểm tra lại internet của bạn ');
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

            {/* Slider Section */}
            <View style={styles.sliderContainer}>
                <FlatList
                    ref={flatListRef}
                    data={[
                        {
                            id: '1',
                            colors: ['#FF9966', '#FF5E62'], // Orange
                            title: 'Gene MyZyea',
                            slogan: 'Administer a dynamic, innovative workforce committed to excellence',
                            image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&q=80'
                        },
                        {
                            id: '2',
                            colors: ['#56ab2f', '#a8e063'], // Green
                            title: 'MyZyea DC-135',
                            slogan: 'Happy working environment, respect, trust and development opportunities',
                            image: 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=800&q=80'
                        },
                        {
                            id: '3',
                            colors: ['#1a45a0', '#0d2860'], // Blue
                            title: 'Global Enterprise',
                            slogan: 'Be the world-class technology solutions provider for complex business challenger',
                            image: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800&q=80'
                        }
                    ]}
                    keyExtractor={(item) => item.id}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    scrollEnabled={false}
                    renderItem={({ item }) => (
                        <View style={{ width: Dimensions.get('window').width, height: '100%', position: 'relative' }}>
                            <LinearGradient
                                colors={item.colors as [string, string]}
                                style={StyleSheet.absoluteFill}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            />

                            <View style={[styles.bgCircle, { top: -50, right: -50, width: 200, height: 200 }]} />
                            <View style={[styles.bgCircle, { top: 100, left: -20, width: 100, height: 100 }]} />

                            <SafeAreaView style={{ flex: 1 }}>
                                <View style={styles.headerTextContainer}>
                                    <Text style={styles.wBrandTitle}>{item.title}</Text>
                                    <Text style={styles.wSlogan}>{item.slogan}</Text>
                                </View>
                            </SafeAreaView>

                            {/* Team Image */}
                            <View style={styles.teamImageContainer}>
                                <Image
                                    source={{ uri: item.image }}
                                    style={styles.teamImage}
                                    resizeMode="contain"
                                />
                            </View>
                        </View>
                    )}
                    onMomentumScrollEnd={(ev) => {
                        const index = Math.round(ev.nativeEvent.contentOffset.x / Dimensions.get('window').width);
                        setCurrentSlideIndex(index);
                    }}
                />
            </View>

            {/* Curved Separator */}
            <View style={styles.curveSeparator} />

            {/* Bottom Black Section */}
            <View style={styles.bottomSection}>
                <View style={styles.bottomContent}>
                    {/* myZyea Logo (Old FPT place) */}
                    <View style={styles.logoContainer}>
                        {/* Mimic FPT 3-color logo shape with simple blocks or just text */}
                        <View style={{ flexDirection: 'row', marginBottom: 10 }}>
                            <Text style={{ fontSize: 36, fontWeight: '900', color: '#F27125' }}>my</Text>
                            <Text style={{ fontSize: 36, fontWeight: '900', color: '#27A844' }}>Z</Text>
                            <Text style={{ fontSize: 36, fontWeight: '900', color: '#1a45a0' }}>yea</Text>
                        </View>
                    </View>

                    <Text style={styles.wWelcomeText}>Chào mừng bạn !</Text>
                    <Text style={styles.wInstructionText}>Vui lòng nhập email để đăng nhập MyZyea Chat</Text>

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

    // If showing login form, render the "Bottom Sheet" style form (FPT Next style)
    if (showLoginForm) {
        return (
            <View style={{ flex: 1 }}>
                <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

                {/* Full Screen Background - Orange Theme to match request */}
                <LinearGradient
                    colors={['#FF9966', '#FF5E62', '#da2e66']}
                    style={StyleSheet.absoluteFill}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                />

                {/* Abstract Background Decoration */}
                <View style={{ position: 'absolute', top: 100, alignSelf: 'center', opacity: 0.8 }}>
                    <View style={{ width: 300, height: 300, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 150 }} />
                </View>

                <KeyboardAvoidingView
                    style={{ flex: 1, justifyContent: 'flex-end' }}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                >
                    {/* The Bottom Sheet */}
                    <View style={styles.bottomSheet}>

                        {/* Drag Handle / Decoration */}
                        <View style={{ alignSelf: 'center', width: 40, height: 4, backgroundColor: '#E0E0E0', borderRadius: 2, marginBottom: 20 }} />

                        {/* Close Button */}
                        <TouchableOpacity
                            style={{ position: 'absolute', top: 20, right: 20, zIndex: 10, padding: 4 }}
                            onPress={() => setShowLoginForm(false)}
                        >
                            <Feather name="x" size={24} color="#999" />
                        </TouchableOpacity>

                        {/* Header: Logo & Title */}
                        <View style={{ marginBottom: 24 }}>
                            <View style={{ flexDirection: 'row', marginBottom: 8 }}>
                                <Text style={{ fontSize: 24, fontWeight: '900', color: '#F27125' }}>my</Text>
                                <Text style={{ fontSize: 24, fontWeight: '900', color: '#27A844' }}>Z</Text>
                                <Text style={{ fontSize: 24, fontWeight: '900', color: '#1a45a0' }}>yea</Text>
                            </View>
                            <Text style={styles.sheetTitle}>
                                Chào mừng bạn trở lại{'\n'}myZyea Chat!
                            </Text>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                            {error && (
                                <Text style={{ color: 'red', marginBottom: 10 }}>{error}</Text>
                            )}

                            {view === AuthView.REGISTER && (
                                <View style={{ marginBottom: 16 }}>
                                    <TextInput
                                        style={styles.sheetInput}
                                        placeholder="Họ và tên"
                                        value={name}
                                        onChangeText={setName}
                                        placeholderTextColor="#999"
                                    />
                                </View>
                            )}

                            <View style={{ marginBottom: 16 }}>
                                <TextInput
                                    style={styles.sheetInput}
                                    placeholder="Nhập email của bạn"
                                    value={email}
                                    onChangeText={setEmail}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    placeholderTextColor="#999"
                                />
                            </View>

                            <View style={{ marginBottom: 20 }}>
                                <TextInput
                                    style={styles.sheetInput}
                                    placeholder="Mật khẩu"
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry
                                    placeholderTextColor="#999"
                                />
                            </View>

                            <TouchableOpacity
                                style={styles.sheetButton}
                                onPress={handleSubmit}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.sheetButtonText}>
                                        {view === AuthView.LOGIN ? 'Tiếp tục' : 'Đăng ký'}
                                    </Text>
                                )}
                            </TouchableOpacity>

                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }}>
                                <TouchableOpacity onPress={() => { }}>
                                    <Text style={{ color: '#666' }}>Quên mật khẩu?</Text>
                                </TouchableOpacity>

                                <TouchableOpacity onPress={() => setView(view === AuthView.LOGIN ? AuthView.REGISTER : AuthView.LOGIN)}>
                                    <Text style={{ color: '#F27125', fontWeight: 'bold' }}>
                                        {view === AuthView.LOGIN ? 'Đăng ký ngay' : 'Đăng nhập'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </View>
        );
    }
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

    // ================= NEW STYLE =================
    welcomeContainer: {
        flex: 1,
        backgroundColor: '#121212', // Black background base
    },
    sliderContainer: {
        height: Dimensions.get('window').height * 0.65, // Match topSection height logic
        position: 'relative',
        zIndex: 1,
    },
    topSection: {
        // Deprecated, replaced by sliderContainer but kept if needed for reference
        height: Dimensions.get('window').height * 0.65,
        position: 'relative',
        zIndex: 1,
        overflow: 'hidden',
    },
    bgCircle: {
        position: 'absolute',
        borderRadius: 999,
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    headerTextContainer: {
        paddingHorizontal: 30,
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight! + 40 : 80,
        alignItems: 'center',
    },
    wBrandTitle: {
        fontSize: 26,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 12,
        letterSpacing: 0.5,
    },
    wSlogan: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.8)',
        textAlign: 'center',
        paddingHorizontal: 20,
        lineHeight: 20,
        fontWeight: '300',
    },

    // The trick for S-Curve: A rotated black view overlapping the blue
    curveSeparator: {
        position: 'absolute',
        top: Dimensions.get('window').height * 0.55, // Adjust this to move curve up/down
        left: '-10%',
        width: '120%',
        height: 200,
        backgroundColor: '#121212', // Match bottom background
        transform: [{ rotate: '-8deg' }], // Slight tilt
        zIndex: 2,
        borderRadius: 80, // Soften edges
    },

    teamImageContainer: {
        position: 'absolute',
        top: Dimensions.get('window').height * 0.28, // Position image
        width: '100%',
        alignItems: 'center',
        zIndex: 3, // Above curve
    },
    teamImage: {
        width: Dimensions.get('window').width * 0.9,
        height: Dimensions.get('window').height * 0.45,
    },

    bottomSection: {
        flex: 1,
        backgroundColor: '#121212',
        justifyContent: 'flex-end',
        paddingBottom: 50,
        paddingHorizontal: 24,
        zIndex: 4, // Topmost text content
    },
    bottomContent: {
        width: '100%',
    },
    logoContainer: {
        marginBottom: 20,
    },
    wWelcomeText: {
        fontSize: 30,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 10,
    },
    wInstructionText: {
        fontSize: 15,
        color: '#888',
        marginBottom: 40,
    },
    wLoginButton: {
        backgroundColor: '#fff',
        paddingVertical: 18,
        borderRadius: 12,
        alignItems: 'center',
        width: '100%',
    },
    wLoginButtonText: {
        color: '#000',
        fontSize: 16,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    // Styles for "Bottom Sheet" FPT Next Style
    bottomSheet: {
        backgroundColor: 'white',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingBottom: 40,
        width: '100%',
    },
    sheetTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#333',
        marginTop: 8,
        lineHeight: 30,
    },
    sheetInput: {
        borderWidth: 1,
        borderColor: '#eee',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 12,
        fontSize: 16,
        backgroundColor: '#FCFCFC',
    },
    sheetButton: {
        backgroundColor: '#EAEAEA', // Default disabled-like look, could be orange if we wanted
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 10,
    },
    sheetButtonText: {
        color: '#666',
        fontSize: 16,
        fontWeight: '600',
    },
});

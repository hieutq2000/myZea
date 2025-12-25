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
    FlatList,
    Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
    const [birthDate, setBirthDate] = useState<Date | null>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [tempDay, setTempDay] = useState(1);
    const [tempMonth, setTempMonth] = useState(1);
    const [tempYear, setTempYear] = useState(2000);
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
                        throw new Error('Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.');
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

            // Validate real name format (at least 2 words)
            const nameParts = name.trim().split(/\s+/);
            if (nameParts.length < 2) {
                setError('Vui lòng nhập đầy đủ họ và tên thật của bạn (ví dụ: Nguyễn Văn A)');
                return;
            }

            // Check for prohibited names
            const prohibitedNames = ['admin', 'administrator', 'bot', 'moderator', 'mod', 'system', 'support', 'root', 'user', 'guest', 'test', 'demo', 'anonymous'];
            const nameLower = name.toLowerCase().trim();
            const hasProhibitedName = prohibitedNames.some(prohibited =>
                nameLower === prohibited ||
                nameLower.includes(prohibited) ||
                nameParts.some(part => part.toLowerCase() === prohibited)
            );

            if (hasProhibitedName) {
                setError('Vui lòng sử dụng họ và tên thật. Không được dùng các tên như: admin, bot, moderator...');
                return;
            }

            // Check if name contains numbers or special characters (not a real name)
            const nameRegex = /^[a-zA-ZÀ-ỹ\s]+$/;
            if (!nameRegex.test(name.trim())) {
                setError('Họ và tên chỉ được chứa chữ cái, không được có số hoặc ký tự đặc biệt');
                return;
            }

            // Validate birth date
            if (!birthDate) {
                setError('Vui lòng chọn ngày sinh');
                return;
            }

            // Check minimum age (13 years old)
            const today = new Date();
            const age = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();
            const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())
                ? age - 1
                : age;

            if (actualAge < 13) {
                setError('Bạn phải đủ 13 tuổi trở lên để đăng ký');
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
                setError('Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng của bạn.');
                Alert.alert(
                    '❌ Lỗi kết nối',
                    'Không thể kết nối đến server.\n\nVui lòng kiểm tra:\n• Kết nối Internet của bạn\n• Thử lại sau ít phút',
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
                                <FloatingLabelInput
                                    label="Họ và tên thật"
                                    value={name}
                                    onChangeText={setName}
                                    icon="user"
                                    placeholder="Ví dụ: Nguyễn Văn A"
                                />
                            )}

                            {/* Birth Date Picker - Only for Register */}
                            {view === AuthView.REGISTER && (
                                <TouchableOpacity
                                    style={styles.datePickerButton}
                                    onPress={() => {
                                        if (birthDate) {
                                            setTempDay(birthDate.getDate());
                                            setTempMonth(birthDate.getMonth() + 1);
                                            setTempYear(birthDate.getFullYear());
                                        }
                                        setShowDatePicker(true);
                                    }}
                                    activeOpacity={0.7}
                                >
                                    <Feather name="calendar" size={20} color="#666" style={{ marginRight: 12 }} />
                                    <Text style={[styles.datePickerText, !birthDate && { color: '#999' }]}>
                                        {birthDate
                                            ? `${birthDate.getDate().toString().padStart(2, '0')}/${(birthDate.getMonth() + 1).toString().padStart(2, '0')}/${birthDate.getFullYear()}`
                                            : 'Chọn ngày sinh'
                                        }
                                    </Text>
                                    <Feather name="chevron-down" size={20} color="#666" />
                                </TouchableOpacity>
                            )}

                            <FloatingLabelInput
                                label="Email"
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                icon="mail"
                            />

                            <FloatingLabelInput
                                label="Mật khẩu"
                                value={password}
                                onChangeText={setPassword}
                                isPassword={true}
                                icon="lock"
                            />

                            {view === AuthView.REGISTER && (
                                <FloatingLabelInput
                                    label="Nhập lại mật khẩu"
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    isPassword={true}
                                    icon="lock"
                                />
                            )}

                            {/* Terms & Conditions Checkbox - Only for Register */}
                            {view === AuthView.REGISTER && (
                                <View style={styles.termsContainer}>
                                    <TouchableOpacity
                                        style={{ flexDirection: 'row', alignItems: 'flex-start' }}
                                        onPress={() => setAgreeToTerms(!agreeToTerms)}
                                        activeOpacity={0.7}
                                    >
                                        <View style={[styles.checkbox, agreeToTerms && styles.checkboxChecked]}>
                                            {agreeToTerms && <Feather name="check" size={14} color="#fff" />}
                                        </View>
                                    </TouchableOpacity>
                                    <Text style={styles.termsText}>
                                        Tôi đồng ý với{' '}
                                        <Text
                                            style={styles.linkText}
                                            onPress={() => Alert.alert(
                                                'Điều khoản sử dụng',
                                                'Khi sử dụng ứng dụng myZyea Chat, bạn đồng ý:\n\n• Không chia sẻ thông tin cá nhân của người khác\n• Không đăng nội dung vi phạm pháp luật\n• Không spam hoặc quấy rối người dùng khác\n• Tuân thủ quy định của công ty\n• Chịu trách nhiệm về nội dung bạn đăng tải\n\nChúng tôi có quyền khóa tài khoản nếu vi phạm điều khoản.',
                                                [{ text: 'Đã hiểu' }]
                                            )}
                                        >
                                            Điều khoản sử dụng
                                        </Text>
                                        {' '}và{' '}
                                        <Text
                                            style={styles.linkText}
                                            onPress={() => Alert.alert(
                                                'Chính sách bảo mật',
                                                'Chúng tôi cam kết bảo vệ thông tin của bạn:\n\n• Thông tin cá nhân được mã hóa và bảo mật\n• Không chia sẻ dữ liệu với bên thứ ba\n• Bạn có quyền yêu cầu xóa dữ liệu\n• Tin nhắn được lưu trữ an toàn\n• Chỉ thu thập thông tin cần thiết\n\nLiên hệ: support@myzyea.com để biết thêm chi tiết.',
                                                [{ text: 'Đã hiểu' }]
                                            )}
                                        >
                                            Chính sách bảo mật
                                        </Text>
                                    </Text>
                                </View>
                            )}

                            {/* Action Buttons Row */}
                            {(() => {
                                // Check if form is valid
                                const isLoginValid = email.trim() !== '' && password !== '';
                                const isRegisterValid = email.trim() !== '' && password !== '' && name.trim() !== '' && confirmPassword !== '' && agreeToTerms;
                                const isFormValid = view === AuthView.LOGIN ? isLoginValid : isRegisterValid;

                                return (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                        <TouchableOpacity
                                            style={{ flex: 1, borderRadius: 12, overflow: 'hidden' }}
                                            onPress={handleSubmit}
                                            disabled={loading || !isFormValid}
                                            activeOpacity={0.8}
                                        >
                                            {isFormValid ? (
                                                <LinearGradient
                                                    colors={['#FFB347', '#FF7E21']}
                                                    start={{ x: 0, y: 0 }}
                                                    end={{ x: 1, y: 0 }}
                                                    style={{ paddingVertical: 16, alignItems: 'center' }}
                                                >
                                                    {loading ? (
                                                        <ActivityIndicator color="#fff" />
                                                    ) : (
                                                        <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
                                                            {view === AuthView.LOGIN ? 'Tiếp tục' : 'Đăng ký'}
                                                        </Text>
                                                    )}
                                                </LinearGradient>
                                            ) : (
                                                <View style={styles.sheetButton}>
                                                    <Text style={styles.sheetButtonText}>
                                                        {view === AuthView.LOGIN ? 'Tiếp tục' : 'Đăng ký'}
                                                    </Text>
                                                </View>
                                            )}
                                        </TouchableOpacity>

                                        {/* Face ID Button - Only show in Login view */}
                                        {view === AuthView.LOGIN && hasBiometrics && (
                                            <TouchableOpacity
                                                style={styles.faceIdIconButton}
                                                onPress={handleFaceIdLogin}
                                            >
                                                <Ionicons name="scan-outline" size={28} color="#F27125" />
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                );
                            })()}

                            <View style={{ flexDirection: 'row', justifyContent: view === AuthView.LOGIN ? 'space-between' : 'flex-end', marginTop: 16 }}>
                                {view === AuthView.LOGIN && (
                                    <TouchableOpacity onPress={() => {
                                        if (!email.trim()) {
                                            Alert.alert(
                                                'Quên mật khẩu',
                                                'Vui lòng nhập email của bạn vào ô Email phía trên, sau đó nhấn lại "Quên mật khẩu?"',
                                                [{ text: 'Đã hiểu' }]
                                            );
                                            return;
                                        }

                                        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                                        if (!emailRegex.test(email.trim())) {
                                            Alert.alert(
                                                'Email không hợp lệ',
                                                'Vui lòng nhập đúng định dạng email (ví dụ: email@domain.com)',
                                                [{ text: 'Đóng' }]
                                            );
                                            return;
                                        }

                                        Alert.alert(
                                            '📧 Đặt lại mật khẩu',
                                            `Chúng tôi sẽ gửi hướng dẫn đặt lại mật khẩu đến:\n\n${email.trim()}\n\nVui lòng kiểm tra hộp thư (bao gồm cả thư mục Spam).`,
                                            [
                                                { text: 'Hủy', style: 'cancel' },
                                                {
                                                    text: 'Gửi email',
                                                    onPress: async () => {
                                                        // TODO: Call API to send reset password email
                                                        Alert.alert(
                                                            'Đã gửi!',
                                                            'Nếu email tồn tại trong hệ thống, bạn sẽ nhận được hướng dẫn đặt lại mật khẩu trong vài phút.\n\nNếu không nhận được email, vui lòng liên hệ: support@myzyea.com',
                                                            [{ text: 'Đóng' }]
                                                        );
                                                    }
                                                }
                                            ]
                                        );
                                    }}>
                                        <Text style={{ color: '#666' }}>Quên mật khẩu?</Text>
                                    </TouchableOpacity>
                                )}

                                <TouchableOpacity onPress={() => {
                                    // Clear all form data when switching views
                                    setError(null);
                                    setEmail('');
                                    setPassword('');
                                    setName('');
                                    setConfirmPassword('');
                                    setBirthDate(null);
                                    setAgreeToTerms(false);
                                    setView(view === AuthView.LOGIN ? AuthView.REGISTER : AuthView.LOGIN);
                                }}>
                                    <Text style={{ color: '#F27125', fontWeight: 'bold' }}>
                                        {view === AuthView.LOGIN ? 'Đăng ký ngay' : 'Đăng nhập'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>

                {/* Date Picker Modal */}
                <Modal
                    visible={showDatePicker}
                    transparent
                    animationType="slide"
                    onRequestClose={() => setShowDatePicker(false)}
                >
                    <View style={styles.datePickerModalOverlay}>
                        <View style={styles.datePickerModalContent}>
                            <View style={styles.datePickerModalHeader}>
                                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                                    <Text style={{ color: '#666', fontSize: 16 }}>Hủy</Text>
                                </TouchableOpacity>
                                <Text style={styles.datePickerModalTitle}>Chọn ngày sinh</Text>
                                <TouchableOpacity onPress={() => {
                                    const newDate = new Date(tempYear, tempMonth - 1, tempDay);
                                    setBirthDate(newDate);
                                    setShowDatePicker(false);
                                }}>
                                    <Text style={{ color: '#FF7E21', fontSize: 16, fontWeight: '600' }}>Xong</Text>
                                </TouchableOpacity>
                            </View>

                            <View style={styles.datePickerRow}>
                                {/* Day */}
                                <View style={styles.datePickerColumn}>
                                    <Text style={styles.datePickerLabel}>Ngày</Text>
                                    <ScrollView style={styles.datePickerScroll} showsVerticalScrollIndicator={false}>
                                        {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                                            <TouchableOpacity
                                                key={day}
                                                style={[styles.datePickerItem, tempDay === day && styles.datePickerItemSelected]}
                                                onPress={() => setTempDay(day)}
                                            >
                                                <Text style={[styles.datePickerItemText, tempDay === day && styles.datePickerItemTextSelected]}>
                                                    {day.toString().padStart(2, '0')}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>

                                {/* Month */}
                                <View style={styles.datePickerColumn}>
                                    <Text style={styles.datePickerLabel}>Tháng</Text>
                                    <ScrollView style={styles.datePickerScroll} showsVerticalScrollIndicator={false}>
                                        {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                                            <TouchableOpacity
                                                key={month}
                                                style={[styles.datePickerItem, tempMonth === month && styles.datePickerItemSelected]}
                                                onPress={() => setTempMonth(month)}
                                            >
                                                <Text style={[styles.datePickerItemText, tempMonth === month && styles.datePickerItemTextSelected]}>
                                                    {month.toString().padStart(2, '0')}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>

                                {/* Year */}
                                <View style={styles.datePickerColumn}>
                                    <Text style={styles.datePickerLabel}>Năm</Text>
                                    <ScrollView style={styles.datePickerScroll} showsVerticalScrollIndicator={false}>
                                        {Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i).map(year => (
                                            <TouchableOpacity
                                                key={year}
                                                style={[styles.datePickerItem, tempYear === year && styles.datePickerItemSelected]}
                                                onPress={() => setTempYear(year)}
                                            >
                                                <Text style={[styles.datePickerItemText, tempYear === year && styles.datePickerItemTextSelected]}>
                                                    {year}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                            </View>
                        </View>
                    </View>
                </Modal>
            </View>
        );
    }

    return renderWelcome();
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
    // Date Picker Styles
    datePickerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#eee',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 12,
        backgroundColor: '#FCFCFC',
        marginBottom: 12,
    },
    datePickerText: {
        flex: 1,
        fontSize: 16,
        color: '#333',
    },
    datePickerModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    datePickerModalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        paddingBottom: 40,
    },
    datePickerModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    datePickerModalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    datePickerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    datePickerColumn: {
        flex: 1,
        marginHorizontal: 5,
    },
    datePickerLabel: {
        fontSize: 13,
        color: '#666',
        marginBottom: 8,
        textAlign: 'center',
    },
    datePickerScroll: {
        height: 150,
        borderWidth: 1,
        borderColor: '#eee',
        borderRadius: 10,
    },
    datePickerItem: {
        paddingVertical: 12,
        alignItems: 'center',
    },
    datePickerItemText: {
        fontSize: 16,
        color: '#333',
    },
    datePickerItemSelected: {
        backgroundColor: '#FF7E21',
    },
    datePickerItemTextSelected: {
        color: '#fff',
        fontWeight: 'bold',
    },
    datePickerConfirmButton: {
        backgroundColor: '#FF7E21',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    datePickerConfirmText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});

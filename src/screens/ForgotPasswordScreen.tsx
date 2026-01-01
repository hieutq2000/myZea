/**
 * ForgotPasswordScreen - Màn hình quên mật khẩu với OTP verification
 * Flow: Email -> OTP -> New Password -> Success
 */

import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    StatusBar,
    Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather, Ionicons } from '@expo/vector-icons';
import { forgotPassword, verifyOtp, resetPassword } from '../utils/api';
import FloatingLabelInput from '../components/FloatingLabelInput';

type Step = 'EMAIL' | 'OTP' | 'NEW_PASSWORD' | 'SUCCESS';

interface ForgotPasswordScreenProps {
    onBack: () => void;
    onSuccess?: () => void;
}

export default function ForgotPasswordScreen({ onBack, onSuccess }: ForgotPasswordScreenProps) {
    const [step, setStep] = useState<Step>('EMAIL');
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [resetToken, setResetToken] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [countdown, setCountdown] = useState(0);

    // OTP input refs
    const otpRefs = useRef<(TextInput | null)[]>([]);

    // Countdown timer for resend OTP
    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [countdown]);

    // Step 1: Send OTP to email
    const handleSendOtp = async () => {
        if (!email.trim()) {
            setError('Vui lòng nhập email');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
            setError('Email không hợp lệ');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await forgotPassword(email.trim());

            // In development, show OTP in alert for testing
            if (response.devOtp) {
                Alert.alert('🔑 Mã OTP (Dev Mode)', `Mã OTP của bạn: ${response.devOtp}`);
            }

            setStep('OTP');
            setCountdown(60); // 60 seconds countdown
            Alert.alert('✅ Thành công', response.message);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    // Handle OTP input
    const handleOtpChange = (value: string, index: number) => {
        if (value.length > 1) {
            // Handle paste - take only first 6 characters
            const pastedOtp = value.slice(0, 6).split('');
            const newOtp = [...otp];
            pastedOtp.forEach((char, i) => {
                if (i < 6) newOtp[i] = char;
            });
            setOtp(newOtp);
            otpRefs.current[5]?.focus();
            return;
        }

        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

        // Auto-focus next input
        if (value && index < 5) {
            otpRefs.current[index + 1]?.focus();
        }
    };

    const handleOtpKeyPress = (key: string, index: number) => {
        if (key === 'Backspace' && !otp[index] && index > 0) {
            otpRefs.current[index - 1]?.focus();
        }
    };

    // Step 2: Verify OTP
    const handleVerifyOtp = async () => {
        const otpString = otp.join('');
        if (otpString.length !== 6) {
            setError('Vui lòng nhập đủ 6 số OTP');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await verifyOtp(email, otpString);
            setResetToken(response.resetToken);
            setStep('NEW_PASSWORD');
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    // Resend OTP
    const handleResendOtp = async () => {
        if (countdown > 0) return;

        setLoading(true);
        try {
            const response = await forgotPassword(email);
            if (response.devOtp) {
                Alert.alert('🔑 Mã OTP mới (Dev Mode)', `Mã OTP của bạn: ${response.devOtp}`);
            }
            setCountdown(60);
            setOtp(['', '', '', '', '', '']);
            Alert.alert('✅ Đã gửi lại', 'Mã OTP mới đã được gửi đến email của bạn');
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    // Step 3: Reset password
    const handleResetPassword = async () => {
        if (!newPassword || !confirmPassword) {
            setError('Vui lòng nhập đầy đủ mật khẩu');
            return;
        }

        if (newPassword.length < 6) {
            setError('Mật khẩu phải có ít nhất 6 ký tự');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('Mật khẩu nhập lại không khớp');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            await resetPassword(resetToken, newPassword);
            setStep('SUCCESS');
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    const getStepInfo = () => {
        switch (step) {
            case 'EMAIL':
                return { title: 'Quên mật khẩu', subtitle: 'Nhập email để nhận mã OTP' };
            case 'OTP':
                return { title: 'Xác thực OTP', subtitle: `Nhập mã 6 số đã gửi đến ${email}` };
            case 'NEW_PASSWORD':
                return { title: 'Đặt mật khẩu mới', subtitle: 'Tạo mật khẩu mới cho tài khoản' };
            case 'SUCCESS':
                return { title: 'Thành công!', subtitle: 'Mật khẩu đã được đặt lại' };
        }
    };

    const renderContent = () => {
        const info = getStepInfo();

        return (
            <>
                {/* Header */}
                <View style={styles.header}>
                    {step !== 'SUCCESS' && (
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => step === 'EMAIL' ? onBack() : setStep(step === 'OTP' ? 'EMAIL' : 'OTP')}
                        >
                            <Feather name="arrow-left" size={24} color="#333" />
                        </TouchableOpacity>
                    )}
                    <Text style={styles.title}>{info.title}</Text>
                    <Text style={styles.subtitle}>{info.subtitle}</Text>
                </View>

                {error && (
                    <View style={styles.errorContainer}>
                        <Feather name="alert-circle" size={16} color="#EF4444" />
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                )}

                {/* Step Content */}
                {step === 'EMAIL' && (
                    <View style={styles.formContainer}>
                        <FloatingLabelInput
                            label="Email"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            icon="mail"
                        />

                        <TouchableOpacity
                            style={[styles.primaryButton, loading && styles.buttonDisabled]}
                            onPress={handleSendOtp}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.primaryButtonText}>Gửi mã OTP</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                )}

                {step === 'OTP' && (
                    <View style={styles.formContainer}>
                        <View style={styles.otpContainer}>
                            {otp.map((digit, index) => (
                                <TextInput
                                    key={index}
                                    ref={(ref) => otpRefs.current[index] = ref}
                                    style={[styles.otpInput, digit && styles.otpInputFilled]}
                                    value={digit}
                                    onChangeText={(value) => handleOtpChange(value, index)}
                                    onKeyPress={({ nativeEvent }) => handleOtpKeyPress(nativeEvent.key, index)}
                                    keyboardType="number-pad"
                                    maxLength={1}
                                    selectTextOnFocus
                                />
                            ))}
                        </View>

                        <TouchableOpacity
                            style={styles.resendButton}
                            onPress={handleResendOtp}
                            disabled={countdown > 0}
                        >
                            <Text style={[styles.resendText, countdown > 0 && styles.resendTextDisabled]}>
                                {countdown > 0 ? `Gửi lại sau ${countdown}s` : 'Gửi lại mã OTP'}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.primaryButton, loading && styles.buttonDisabled]}
                            onPress={handleVerifyOtp}
                            disabled={loading || otp.join('').length !== 6}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.primaryButtonText}>Xác nhận</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                )}

                {step === 'NEW_PASSWORD' && (
                    <View style={styles.formContainer}>
                        <FloatingLabelInput
                            label="Mật khẩu mới"
                            value={newPassword}
                            onChangeText={setNewPassword}
                            isPassword={true}
                            icon="lock"
                        />

                        <FloatingLabelInput
                            label="Nhập lại mật khẩu"
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            isPassword={true}
                            icon="lock"
                        />

                        <TouchableOpacity
                            style={[styles.primaryButton, loading && styles.buttonDisabled]}
                            onPress={handleResetPassword}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.primaryButtonText}>Đặt lại mật khẩu</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                )}

                {step === 'SUCCESS' && (
                    <View style={styles.successContainer}>
                        <View style={styles.successIcon}>
                            <Ionicons name="checkmark-circle" size={80} color="#10B981" />
                        </View>
                        <Text style={styles.successTitle}>Đặt lại mật khẩu thành công!</Text>
                        <Text style={styles.successText}>
                            Bạn có thể đăng nhập với mật khẩu mới ngay bây giờ.
                        </Text>

                        <TouchableOpacity
                            style={styles.primaryButton}
                            onPress={() => {
                                onSuccess ? onSuccess() : onBack();
                            }}
                        >
                            <Text style={styles.primaryButtonText}>Đăng nhập ngay</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            <LinearGradient
                colors={['#667eea', '#764ba2']}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />

            <KeyboardAvoidingView
                style={{ flex: 1, justifyContent: 'flex-end' }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <View style={styles.bottomSheet}>
                    <View style={styles.handle} />
                    {renderContent()}
                </View>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    bottomSheet: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 24,
        paddingTop: 12,
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
        minHeight: '60%',
    },
    handle: {
        width: 40,
        height: 4,
        backgroundColor: '#E0E0E0',
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 20,
    },
    header: {
        marginBottom: 24,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1F2937',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 15,
        color: '#6B7280',
        lineHeight: 22,
    },
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEE2E2',
        padding: 12,
        borderRadius: 12,
        marginBottom: 16,
        gap: 8,
    },
    errorText: {
        color: '#DC2626',
        fontSize: 14,
        flex: 1,
    },
    formContainer: {
        gap: 16,
    },
    otpContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginVertical: 20,
    },
    otpInput: {
        width: 48,
        height: 56,
        borderWidth: 2,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        color: '#1F2937',
        backgroundColor: '#F9FAFB',
    },
    otpInputFilled: {
        borderColor: '#667eea',
        backgroundColor: '#EEF2FF',
    },
    resendButton: {
        alignSelf: 'center',
        padding: 8,
    },
    resendText: {
        color: '#667eea',
        fontSize: 14,
        fontWeight: '600',
    },
    resendTextDisabled: {
        color: '#9CA3AF',
    },
    primaryButton: {
        backgroundColor: '#667eea',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 8,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    primaryButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    successContainer: {
        alignItems: 'center',
        paddingVertical: 20,
    },
    successIcon: {
        marginBottom: 20,
    },
    successTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#1F2937',
        marginBottom: 12,
        textAlign: 'center',
    },
    successText: {
        fontSize: 15,
        color: '#6B7280',
        textAlign: 'center',
        marginBottom: 30,
        lineHeight: 22,
    },
});

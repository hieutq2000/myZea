/**
 * ChangePasswordScreen - Màn hình đổi mật khẩu cho user đã đăng nhập
 * Được truy cập từ Settings
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    StatusBar,
    ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { changePassword } from '../utils/api';
import FloatingLabelInput from '../components/FloatingLabelInput';
import { useTheme } from '../context/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ChangePasswordScreen() {
    const navigation = useNavigation();
    const { colors, isDark } = useTheme();

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const validateForm = (): boolean => {
        if (!currentPassword) {
            setError('Vui lòng nhập mật khẩu hiện tại');
            return false;
        }

        if (!newPassword) {
            setError('Vui lòng nhập mật khẩu mới');
            return false;
        }

        if (newPassword.length < 6) {
            setError('Mật khẩu mới phải có ít nhất 6 ký tự');
            return false;
        }

        if (currentPassword === newPassword) {
            setError('Mật khẩu mới phải khác mật khẩu hiện tại');
            return false;
        }

        if (newPassword !== confirmPassword) {
            setError('Mật khẩu nhập lại không khớp');
            return false;
        }

        // Check for strong password
        const hasNumber = /\d/.test(newPassword);
        const hasLetter = /[a-zA-Z]/.test(newPassword);
        if (!hasNumber || !hasLetter) {
            setError('Mật khẩu nên có cả chữ và số để bảo mật hơn');
            // This is a warning, not blocking
        }

        return true;
    };

    const handleChangePassword = async () => {
        if (!validateForm()) return;

        setLoading(true);
        setError(null);

        try {
            await changePassword(currentPassword, newPassword);

            // Update saved credentials if exists
            const savedPassword = await AsyncStorage.getItem('savedPassword');
            if (savedPassword) {
                await AsyncStorage.setItem('savedPassword', newPassword);
            }

            setSuccess(true);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    const getPasswordStrength = (password: string): { level: number; text: string; color: string } => {
        if (!password) return { level: 0, text: '', color: '#E5E7EB' };

        let score = 0;
        if (password.length >= 6) score++;
        if (password.length >= 8) score++;
        if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
        if (/\d/.test(password)) score++;
        if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;

        if (score <= 2) return { level: 1, text: 'Yếu', color: '#EF4444' };
        if (score <= 3) return { level: 2, text: 'Trung bình', color: '#F59E0B' };
        if (score <= 4) return { level: 3, text: 'Mạnh', color: '#10B981' };
        return { level: 4, text: 'Rất mạnh', color: '#059669' };
    };

    const strength = getPasswordStrength(newPassword);

    if (success) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

                <LinearGradient
                    colors={colors.headerGradient}
                    style={styles.header}
                >
                    <SafeAreaView>
                        <View style={styles.headerContent}>
                            <View style={{ width: 40 }} />
                            <Text style={[styles.headerTitle, { color: isDark ? '#FFF' : '#000' }]}>
                                Đổi mật khẩu
                            </Text>
                            <View style={{ width: 40 }} />
                        </View>
                    </SafeAreaView>
                </LinearGradient>

                <View style={styles.successContainer}>
                    <View style={styles.successIcon}>
                        <Ionicons name="checkmark-circle" size={100} color="#10B981" />
                    </View>
                    <Text style={[styles.successTitle, { color: colors.text }]}>
                        Đổi mật khẩu thành công!
                    </Text>
                    <Text style={[styles.successText, { color: colors.textSecondary }]}>
                        Mật khẩu mới của bạn đã được lưu. Hãy sử dụng mật khẩu mới cho lần đăng nhập tiếp theo.
                    </Text>

                    <TouchableOpacity
                        style={[styles.primaryButton, { backgroundColor: colors.primary }]}
                        onPress={() => navigation.goBack()}
                    >
                        <Text style={styles.primaryButtonText}>Quay lại</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

            {/* Header */}
            <LinearGradient
                colors={colors.headerGradient}
                style={styles.header}
            >
                <SafeAreaView>
                    <View style={styles.headerContent}>
                        <TouchableOpacity
                            style={[styles.headerButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
                            onPress={() => navigation.goBack()}
                        >
                            <Feather name="arrow-left" size={20} color={isDark ? '#FFF' : '#000'} />
                        </TouchableOpacity>
                        <Text style={[styles.headerTitle, { color: isDark ? '#FFF' : '#000' }]}>
                            Đổi mật khẩu
                        </Text>
                        <View style={{ width: 40 }} />
                    </View>
                </SafeAreaView>
            </LinearGradient>

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView
                    style={styles.content}
                    contentContainerStyle={styles.contentContainer}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Info Card */}
                    <View style={[styles.infoCard, { backgroundColor: isDark ? 'rgba(102,126,234,0.1)' : '#EEF2FF' }]}>
                        <Feather name="info" size={20} color="#667eea" />
                        <Text style={[styles.infoText, { color: '#667eea' }]}>
                            Đổi mật khẩu định kỳ giúp bảo vệ tài khoản của bạn an toàn hơn.
                        </Text>
                    </View>

                    {/* Error Message */}
                    {error && (
                        <View style={styles.errorContainer}>
                            <Feather name="alert-circle" size={16} color="#EF4444" />
                            <Text style={styles.errorText}>{error}</Text>
                        </View>
                    )}

                    {/* Form */}
                    <View style={styles.form}>
                        <FloatingLabelInput
                            label="Mật khẩu hiện tại"
                            value={currentPassword}
                            onChangeText={(text) => {
                                setCurrentPassword(text);
                                setError(null);
                            }}
                            isPassword={true}
                            icon="lock"
                        />

                        <View style={styles.divider} />

                        <FloatingLabelInput
                            label="Mật khẩu mới"
                            value={newPassword}
                            onChangeText={(text) => {
                                setNewPassword(text);
                                setError(null);
                            }}
                            isPassword={true}
                            icon="lock"
                        />

                        {/* Password Strength Indicator */}
                        {newPassword.length > 0 && (
                            <View style={styles.strengthContainer}>
                                <View style={styles.strengthBars}>
                                    {[1, 2, 3, 4].map((level) => (
                                        <View
                                            key={level}
                                            style={[
                                                styles.strengthBar,
                                                {
                                                    backgroundColor: strength.level >= level ? strength.color : '#E5E7EB',
                                                },
                                            ]}
                                        />
                                    ))}
                                </View>
                                <Text style={[styles.strengthText, { color: strength.color }]}>
                                    {strength.text}
                                </Text>
                            </View>
                        )}

                        <FloatingLabelInput
                            label="Nhập lại mật khẩu mới"
                            value={confirmPassword}
                            onChangeText={(text) => {
                                setConfirmPassword(text);
                                setError(null);
                            }}
                            isPassword={true}
                            icon="lock"
                        />

                        {/* Match Indicator */}
                        {confirmPassword.length > 0 && (
                            <View style={styles.matchContainer}>
                                <Feather
                                    name={newPassword === confirmPassword ? 'check-circle' : 'x-circle'}
                                    size={16}
                                    color={newPassword === confirmPassword ? '#10B981' : '#EF4444'}
                                />
                                <Text style={[
                                    styles.matchText,
                                    { color: newPassword === confirmPassword ? '#10B981' : '#EF4444' }
                                ]}>
                                    {newPassword === confirmPassword ? 'Mật khẩu khớp' : 'Mật khẩu không khớp'}
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Tips */}
                    <View style={[styles.tipsCard, { backgroundColor: colors.card }]}>
                        <Text style={[styles.tipsTitle, { color: colors.text }]}>💡 Gợi ý mật khẩu mạnh</Text>
                        <View style={styles.tipRow}>
                            <Feather name="check" size={14} color="#10B981" />
                            <Text style={[styles.tipText, { color: colors.textSecondary }]}>Ít nhất 8 ký tự</Text>
                        </View>
                        <View style={styles.tipRow}>
                            <Feather name="check" size={14} color="#10B981" />
                            <Text style={[styles.tipText, { color: colors.textSecondary }]}>Có cả chữ hoa và chữ thường</Text>
                        </View>
                        <View style={styles.tipRow}>
                            <Feather name="check" size={14} color="#10B981" />
                            <Text style={[styles.tipText, { color: colors.textSecondary }]}>Bao gồm số và ký tự đặc biệt</Text>
                        </View>
                    </View>

                    {/* Submit Button */}
                    <TouchableOpacity
                        style={[
                            styles.primaryButton,
                            { backgroundColor: colors.primary },
                            loading && styles.buttonDisabled
                        ]}
                        onPress={handleChangePassword}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.primaryButtonText}>Đổi mật khẩu</Text>
                        )}
                    </TouchableOpacity>

                    <View style={{ height: 40 }} />
                </ScrollView>
            </KeyboardAvoidingView>
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
    headerButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    content: {
        flex: 1,
    },
    contentContainer: {
        padding: 20,
    },
    infoCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        marginBottom: 20,
        gap: 12,
    },
    infoText: {
        flex: 1,
        fontSize: 14,
        lineHeight: 20,
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
    form: {
        gap: 4,
    },
    divider: {
        height: 1,
        backgroundColor: '#E5E7EB',
        marginVertical: 16,
    },
    strengthContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        marginBottom: 12,
        gap: 12,
    },
    strengthBars: {
        flexDirection: 'row',
        gap: 4,
        flex: 1,
    },
    strengthBar: {
        flex: 1,
        height: 4,
        borderRadius: 2,
    },
    strengthText: {
        fontSize: 12,
        fontWeight: '600',
    },
    matchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        gap: 6,
    },
    matchText: {
        fontSize: 13,
        fontWeight: '500',
    },
    tipsCard: {
        padding: 16,
        borderRadius: 12,
        marginTop: 24,
        marginBottom: 24,
    },
    tipsTitle: {
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 12,
    },
    tipRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    tipText: {
        fontSize: 13,
    },
    primaryButton: {
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
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
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
    },
    successIcon: {
        marginBottom: 24,
    },
    successTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 12,
        textAlign: 'center',
    },
    successText: {
        fontSize: 15,
        textAlign: 'center',
        marginBottom: 40,
        lineHeight: 22,
    },
});

import React, { useState } from 'react';
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
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../utils/theme';
import { login, register, checkServerHealth } from '../utils/api';
import { User, AuthView } from '../types';

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
                    <Text style={styles.subtitle}>Gia sư AI thông minh</Text>
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
                        <TextInput
                            style={styles.input}
                            placeholder="••••••••"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                            placeholderTextColor={COLORS.textMuted}
                        />
                    </View>

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

                    {/* Server info */}
                    <View style={styles.serverInfo}>
                        <Text style={styles.serverText}>🌐 Yêu cầu kết nối Server</Text>
                    </View>
                </View>
            </ScrollView>
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
    submitButton: {
        marginTop: SPACING.lg,
        borderRadius: BORDER_RADIUS.lg,
        overflow: 'hidden',
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
    serverInfo: {
        marginTop: SPACING.lg,
        alignItems: 'center',
        paddingVertical: SPACING.sm,
        backgroundColor: COLORS.success + '15',
        borderRadius: BORDER_RADIUS.md,
    },
    serverText: {
        color: COLORS.success,
        fontSize: 12,
        fontWeight: '500',
    },
});

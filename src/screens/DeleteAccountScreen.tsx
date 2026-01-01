/**
 * DeleteAccountScreen - Màn hình xóa tài khoản vĩnh viễn
 * Tuân thủ GDPR và quy định về quyền riêng tư
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Alert,
    ActivityIndicator,
    StatusBar,
    Platform,
    ScrollView,
    KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { deleteAccount, removeToken } from '../utils/api';
import FloatingLabelInput from '../components/FloatingLabelInput';

interface DeleteAccountScreenProps {
    onAccountDeleted?: () => void;
}

export default function DeleteAccountScreen() {
    const navigation = useNavigation();
    const { colors, isDark } = useTheme();

    const [step, setStep] = useState<'info' | 'confirm' | 'success'>('info');
    const [password, setPassword] = useState('');
    const [confirmText, setConfirmText] = useState('');
    const [selectedReason, setSelectedReason] = useState<string | null>(null);
    const [customReason, setCustomReason] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const reasons = [
        { id: 'not_using', label: 'Không còn sử dụng ứng dụng' },
        { id: 'privacy', label: 'Lo ngại về quyền riêng tư' },
        { id: 'another_account', label: 'Đã có tài khoản khác' },
        { id: 'difficult_to_use', label: 'Ứng dụng khó sử dụng' },
        { id: 'too_many_notifications', label: 'Quá nhiều thông báo' },
        { id: 'other', label: 'Lý do khác' },
    ];

    const handleProceedToConfirm = () => {
        if (!selectedReason) {
            setError('Vui lòng chọn lý do xóa tài khoản');
            return;
        }
        setError(null);
        setStep('confirm');
    };

    const handleDelete = async () => {
        if (!password) {
            setError('Vui lòng nhập mật khẩu để xác nhận');
            return;
        }

        if (confirmText !== 'XÓA TÀI KHOẢN') {
            setError('Vui lòng nhập chính xác "XÓA TÀI KHOẢN" để xác nhận');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const reason = selectedReason === 'other' ? customReason : selectedReason;
            await deleteAccount(password, reason || undefined);

            // Clear all stored data
            await removeToken();

            setStep('success');
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    const renderInfoStep = () => (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Warning Box */}
            <View style={[styles.warningBox, { backgroundColor: '#FEE2E2' }]}>
                <Ionicons name="warning" size={24} color="#DC2626" />
                <View style={styles.warningContent}>
                    <Text style={styles.warningTitle}>Cảnh báo quan trọng</Text>
                    <Text style={styles.warningText}>
                        Xóa tài khoản là hành động không thể hoàn tác. Tất cả dữ liệu của bạn sẽ bị xóa vĩnh viễn.
                    </Text>
                </View>
            </View>

            {/* What will be deleted */}
            <View style={[styles.infoSection, { backgroundColor: colors.card }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    Khi xóa tài khoản, bạn sẽ mất:
                </Text>

                {[
                    'Tất cả tin nhắn và cuộc trò chuyện',
                    'Bài viết, bình luận và tương tác',
                    'Thông tin hồ sơ cá nhân',
                    'Dữ liệu tài chính và giao dịch',
                    'Lịch sử hoạt động và điểm thưởng',
                    'Kết nối với bạn bè và nhóm',
                ].map((item, index) => (
                    <View key={index} style={styles.listItem}>
                        <Ionicons name="close-circle" size={18} color="#EF4444" />
                        <Text style={[styles.listItemText, { color: colors.text }]}>{item}</Text>
                    </View>
                ))}
            </View>

            {/* Reason Selection */}
            <View style={[styles.infoSection, { backgroundColor: colors.card }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    Tại sao bạn muốn xóa tài khoản?
                </Text>

                {reasons.map((reason) => (
                    <TouchableOpacity
                        key={reason.id}
                        style={[
                            styles.reasonItem,
                            { borderColor: selectedReason === reason.id ? colors.primary : colors.border }
                        ]}
                        onPress={() => setSelectedReason(reason.id)}
                    >
                        <View style={[
                            styles.radioCircle,
                            { borderColor: selectedReason === reason.id ? colors.primary : colors.border }
                        ]}>
                            {selectedReason === reason.id && (
                                <View style={[styles.radioFilled, { backgroundColor: colors.primary }]} />
                            )}
                        </View>
                        <Text style={[styles.reasonText, { color: colors.text }]}>{reason.label}</Text>
                    </TouchableOpacity>
                ))}

                {selectedReason === 'other' && (
                    <TextInput
                        style={[styles.customReasonInput, {
                            backgroundColor: isDark ? '#2D2D2D' : '#F9FAFB',
                            color: colors.text,
                            borderColor: colors.border
                        }]}
                        placeholder="Nhập lý do của bạn..."
                        placeholderTextColor={colors.textSecondary}
                        value={customReason}
                        onChangeText={setCustomReason}
                        multiline
                    />
                )}
            </View>

            {error && (
                <View style={styles.errorContainer}>
                    <Feather name="alert-circle" size={16} color="#EF4444" />
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            )}

            <TouchableOpacity
                style={[styles.dangerButton, { backgroundColor: '#DC2626' }]}
                onPress={handleProceedToConfirm}
            >
                <Text style={styles.dangerButtonText}>Tiếp tục</Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={[styles.cancelButton, { borderColor: colors.border }]}
                onPress={() => navigation.goBack()}
            >
                <Text style={[styles.cancelButtonText, { color: colors.text }]}>Hủy bỏ</Text>
            </TouchableOpacity>

            <View style={{ height: 40 }} />
        </ScrollView>
    );

    const renderConfirmStep = () => (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={[styles.confirmHeader, { backgroundColor: '#FEE2E2' }]}>
                <Ionicons name="skull-outline" size={48} color="#DC2626" />
                <Text style={styles.confirmTitle}>Xác nhận xóa tài khoản</Text>
                <Text style={styles.confirmSubtitle}>
                    Đây là bước cuối cùng. Sau khi xác nhận, tài khoản sẽ bị xóa vĩnh viễn.
                </Text>
            </View>

            <View style={[styles.infoSection, { backgroundColor: colors.card }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    Xác nhận bằng mật khẩu
                </Text>

                <FloatingLabelInput
                    label="Mật khẩu"
                    value={password}
                    onChangeText={setPassword}
                    isPassword={true}
                    icon="lock"
                />

                <Text style={[styles.confirmInstruction, { color: colors.textSecondary }]}>
                    Nhập "XÓA TÀI KHOẢN" để xác nhận:
                </Text>

                <TextInput
                    style={[styles.confirmInput, {
                        backgroundColor: isDark ? '#2D2D2D' : '#F9FAFB',
                        color: colors.text,
                        borderColor: confirmText === 'XÓA TÀI KHOẢN' ? '#10B981' : colors.border
                    }]}
                    value={confirmText}
                    onChangeText={setConfirmText}
                    placeholder="XÓA TÀI KHOẢN"
                    placeholderTextColor={colors.textSecondary}
                    autoCapitalize="characters"
                />
            </View>

            {error && (
                <View style={styles.errorContainer}>
                    <Feather name="alert-circle" size={16} color="#EF4444" />
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            )}

            <TouchableOpacity
                style={[
                    styles.dangerButton,
                    { backgroundColor: '#DC2626' },
                    loading && styles.buttonDisabled
                ]}
                onPress={handleDelete}
                disabled={loading}
            >
                {loading ? (
                    <ActivityIndicator color="#FFF" />
                ) : (
                    <>
                        <Ionicons name="trash-outline" size={20} color="#FFF" style={{ marginRight: 8 }} />
                        <Text style={styles.dangerButtonText}>Xóa tài khoản vĩnh viễn</Text>
                    </>
                )}
            </TouchableOpacity>

            <TouchableOpacity
                style={[styles.cancelButton, { borderColor: colors.border }]}
                onPress={() => setStep('info')}
            >
                <Text style={[styles.cancelButtonText, { color: colors.text }]}>Quay lại</Text>
            </TouchableOpacity>

            <View style={{ height: 40 }} />
        </ScrollView>
    );

    const renderSuccessStep = () => (
        <View style={styles.successContainer}>
            <Ionicons name="checkmark-circle" size={80} color="#10B981" />
            <Text style={[styles.successTitle, { color: colors.text }]}>
                Tài khoản đã được xóa
            </Text>
            <Text style={[styles.successText, { color: colors.textSecondary }]}>
                Chúng tôi rất tiếc khi thấy bạn ra đi. Nếu bạn đổi ý, bạn có thể tạo tài khoản mới bất cứ lúc nào.
            </Text>
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

            {/* Header */}
            <LinearGradient
                colors={['#DC2626', '#B91C1C']}
                style={styles.header}
            >
                <SafeAreaView>
                    <View style={styles.headerContent}>
                        <TouchableOpacity
                            style={styles.headerButton}
                            onPress={() => step === 'confirm' ? setStep('info') : navigation.goBack()}
                        >
                            <Ionicons name="chevron-back" size={24} color="#FFF" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Xóa tài khoản</Text>
                        <View style={{ width: 40 }} />
                    </View>
                </SafeAreaView>
            </LinearGradient>

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                {step === 'info' && renderInfoStep()}
                {step === 'confirm' && renderConfirmStep()}
                {step === 'success' && renderSuccessStep()}
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
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#FFF',
    },
    content: {
        flex: 1,
        padding: 20,
    },
    warningBox: {
        flexDirection: 'row',
        padding: 16,
        borderRadius: 12,
        marginBottom: 20,
        gap: 12,
    },
    warningContent: {
        flex: 1,
    },
    warningTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#DC2626',
        marginBottom: 4,
    },
    warningText: {
        fontSize: 14,
        color: '#DC2626',
        lineHeight: 20,
    },
    infoSection: {
        padding: 16,
        borderRadius: 12,
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 16,
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 12,
    },
    listItemText: {
        fontSize: 14,
        flex: 1,
    },
    reasonItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 10,
        borderWidth: 1,
        marginBottom: 10,
        gap: 12,
    },
    radioCircle: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    radioFilled: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    reasonText: {
        fontSize: 15,
        flex: 1,
    },
    customReasonInput: {
        marginTop: 10,
        padding: 12,
        borderRadius: 10,
        borderWidth: 1,
        fontSize: 15,
        minHeight: 80,
        textAlignVertical: 'top',
    },
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEE2E2',
        padding: 12,
        borderRadius: 10,
        marginBottom: 16,
        gap: 8,
    },
    errorText: {
        color: '#DC2626',
        fontSize: 14,
        flex: 1,
    },
    dangerButton: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 16,
        borderRadius: 12,
        marginBottom: 12,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    dangerButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
    },
    cancelButton: {
        paddingVertical: 16,
        borderRadius: 12,
        borderWidth: 1,
        alignItems: 'center',
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: '500',
    },
    confirmHeader: {
        alignItems: 'center',
        padding: 24,
        borderRadius: 12,
        marginBottom: 20,
    },
    confirmTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#DC2626',
        marginTop: 12,
        marginBottom: 8,
    },
    confirmSubtitle: {
        fontSize: 14,
        color: '#DC2626',
        textAlign: 'center',
        lineHeight: 20,
    },
    confirmInstruction: {
        fontSize: 14,
        marginTop: 16,
        marginBottom: 8,
    },
    confirmInput: {
        padding: 14,
        borderRadius: 10,
        borderWidth: 1,
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
    },
    successContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    successTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        marginTop: 20,
        marginBottom: 12,
    },
    successText: {
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 22,
    },
});

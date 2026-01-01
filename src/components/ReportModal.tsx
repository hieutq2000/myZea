/**
 * ReportModal - Modal báo cáo người dùng hoặc nội dung
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    TextInput,
    FlatList,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { getReportReasons, reportContent, ReportReason, ReportTargetType } from '../utils/api';

interface ReportModalProps {
    visible: boolean;
    onClose: () => void;
    targetId: string;
    targetType: ReportTargetType;
    targetName?: string;
    messageId?: string;
}

export default function ReportModal({
    visible,
    onClose,
    targetId,
    targetType,
    targetName,
    messageId,
}: ReportModalProps) {
    const { colors, isDark } = useTheme();

    const [step, setStep] = useState<'reasons' | 'details' | 'success'>('reasons');
    const [reasons, setReasons] = useState<ReportReason[]>([]);
    const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
    const [details, setDetails] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (visible) {
            loadReasons();
            setStep('reasons');
            setSelectedReason(null);
            setDetails('');
        }
    }, [visible]);

    const loadReasons = async () => {
        try {
            // Use static reasons since API might not be ready
            setReasons([
                { id: 'spam', label: 'Spam hoặc quảng cáo', icon: '🚫' },
                { id: 'harassment', label: 'Quấy rối hoặc bắt nạt', icon: '😠' },
                { id: 'hate_speech', label: 'Ngôn từ thù địch', icon: '🔥' },
                { id: 'violence', label: 'Bạo lực hoặc đe dọa', icon: '⚠️' },
                { id: 'nudity', label: 'Nội dung khiêu dâm', icon: '🔞' },
                { id: 'fake_account', label: 'Tài khoản giả mạo', icon: '👤' },
                { id: 'scam', label: 'Lừa đảo', icon: '💰' },
                { id: 'other', label: 'Lý do khác', icon: '📝' }
            ]);
        } catch (error) {
            console.error('Load reasons error:', error);
        }
    };

    const handleSelectReason = (reason: ReportReason) => {
        setSelectedReason(reason);
        if (reason.id === 'other') {
            setStep('details');
        }
    };

    const handleSubmit = async () => {
        if (!selectedReason) return;

        setLoading(true);
        try {
            await reportContent(
                targetId,
                targetType,
                selectedReason.id,
                details || undefined,
                messageId
            );
            setStep('success');
        } catch (error) {
            Alert.alert('Lỗi', 'Không thể gửi báo cáo. Vui lòng thử lại.');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setStep('reasons');
        setSelectedReason(null);
        setDetails('');
        onClose();
    };

    const getTitle = () => {
        switch (targetType) {
            case 'user': return `Báo cáo ${targetName || 'người dùng'}`;
            case 'message': return 'Báo cáo tin nhắn';
            case 'post': return 'Báo cáo bài viết';
            case 'comment': return 'Báo cáo bình luận';
            default: return 'Báo cáo';
        }
    };

    const renderReasonItem = ({ item }: { item: ReportReason }) => (
        <TouchableOpacity
            style={[
                styles.reasonItem,
                {
                    backgroundColor: selectedReason?.id === item.id
                        ? (isDark ? '#2D2D2D' : '#EEF2FF')
                        : 'transparent',
                    borderColor: selectedReason?.id === item.id
                        ? colors.primary
                        : colors.border
                }
            ]}
            onPress={() => handleSelectReason(item)}
        >
            <Text style={styles.reasonIcon}>{item.icon}</Text>
            <Text style={[styles.reasonLabel, { color: colors.text }]}>{item.label}</Text>
            {selectedReason?.id === item.id && (
                <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
            )}
        </TouchableOpacity>
    );

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent
            onRequestClose={handleClose}
        >
            <KeyboardAvoidingView
                style={styles.overlay}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <TouchableOpacity
                    style={styles.backdrop}
                    activeOpacity={1}
                    onPress={handleClose}
                />

                <View style={[styles.container, { backgroundColor: colors.card }]}>
                    {/* Handle */}
                    <View style={styles.handle} />

                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={[styles.title, { color: colors.text }]}>{getTitle()}</Text>
                        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                            <Ionicons name="close" size={24} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    {step === 'reasons' && (
                        <>
                            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                                Vui lòng chọn lý do báo cáo:
                            </Text>

                            <FlatList
                                data={reasons}
                                renderItem={renderReasonItem}
                                keyExtractor={(item) => item.id}
                                style={styles.reasonsList}
                                contentContainerStyle={{ paddingBottom: 20 }}
                            />

                            {selectedReason && selectedReason.id !== 'other' && (
                                <TouchableOpacity
                                    style={[styles.submitButton, { backgroundColor: colors.primary }]}
                                    onPress={handleSubmit}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <ActivityIndicator color="#FFF" />
                                    ) : (
                                        <Text style={styles.submitButtonText}>Gửi báo cáo</Text>
                                    )}
                                </TouchableOpacity>
                            )}
                        </>
                    )}

                    {step === 'details' && (
                        <>
                            <View style={styles.detailsHeader}>
                                <TouchableOpacity
                                    onPress={() => setStep('reasons')}
                                    style={styles.backButton}
                                >
                                    <Ionicons name="chevron-back" size={24} color={colors.text} />
                                </TouchableOpacity>
                                <Text style={[styles.subtitle, { color: colors.textSecondary, flex: 1 }]}>
                                    Mô tả chi tiết vấn đề:
                                </Text>
                            </View>

                            <TextInput
                                style={[
                                    styles.detailsInput,
                                    {
                                        backgroundColor: isDark ? '#2D2D2D' : '#F9FAFB',
                                        color: colors.text,
                                        borderColor: colors.border
                                    }
                                ]}
                                placeholder="Mô tả chi tiết vấn đề bạn gặp phải..."
                                placeholderTextColor={colors.textSecondary}
                                value={details}
                                onChangeText={setDetails}
                                multiline
                                numberOfLines={4}
                                textAlignVertical="top"
                            />

                            <TouchableOpacity
                                style={[
                                    styles.submitButton,
                                    { backgroundColor: colors.primary },
                                    !details.trim() && { opacity: 0.5 }
                                ]}
                                onPress={handleSubmit}
                                disabled={loading || !details.trim()}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#FFF" />
                                ) : (
                                    <Text style={styles.submitButtonText}>Gửi báo cáo</Text>
                                )}
                            </TouchableOpacity>
                        </>
                    )}

                    {step === 'success' && (
                        <View style={styles.successContainer}>
                            <View style={styles.successIcon}>
                                <Ionicons name="checkmark-circle" size={60} color="#10B981" />
                            </View>
                            <Text style={[styles.successTitle, { color: colors.text }]}>
                                Đã gửi báo cáo!
                            </Text>
                            <Text style={[styles.successText, { color: colors.textSecondary }]}>
                                Cảm ơn bạn đã báo cáo. Chúng tôi sẽ xem xét và xử lý trong thời gian sớm nhất.
                            </Text>
                            <TouchableOpacity
                                style={[styles.submitButton, { backgroundColor: colors.primary }]}
                                onPress={handleClose}
                            >
                                <Text style={styles.submitButtonText}>Đóng</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    container: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 20,
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
        maxHeight: '80%',
    },
    handle: {
        width: 40,
        height: 4,
        backgroundColor: '#E0E0E0',
        borderRadius: 2,
        alignSelf: 'center',
        marginTop: 12,
        marginBottom: 16,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    closeButton: {
        padding: 4,
    },
    subtitle: {
        fontSize: 14,
        marginBottom: 16,
    },
    reasonsList: {
        maxHeight: 350,
    },
    reasonItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 10,
        gap: 12,
    },
    reasonIcon: {
        fontSize: 20,
    },
    reasonLabel: {
        flex: 1,
        fontSize: 15,
        fontWeight: '500',
    },
    detailsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    backButton: {
        marginRight: 8,
    },
    detailsInput: {
        height: 120,
        borderRadius: 12,
        borderWidth: 1,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 15,
        marginBottom: 20,
    },
    submitButton: {
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 8,
    },
    submitButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
    },
    successContainer: {
        alignItems: 'center',
        paddingVertical: 30,
    },
    successIcon: {
        marginBottom: 16,
    },
    successTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    successText: {
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 20,
    },
});

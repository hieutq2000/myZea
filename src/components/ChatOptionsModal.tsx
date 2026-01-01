/**
 * ChatOptionsModal - Modal hiển thị các tùy chọn trong chat 1-1
 * Bao gồm: Search, Block, Report, Clear chat, etc.
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    Platform,
} from 'react-native';
import { Ionicons, Feather, MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { blockUser, unblockUser, checkBlockStatus, BlockStatus } from '../utils/api';
import ReportModal from './ReportModal';

interface ChatOptionsModalProps {
    visible: boolean;
    onClose: () => void;
    partnerId: string;
    partnerName: string;
    onSearch?: () => void;
    onClearChat?: () => void;
    onViewProfile?: () => void;
}

export default function ChatOptionsModal({
    visible,
    onClose,
    partnerId,
    partnerName,
    onSearch,
    onClearChat,
    onViewProfile,
}: ChatOptionsModalProps) {
    const { colors, isDark } = useTheme();

    const [blockStatus, setBlockStatus] = useState<BlockStatus | null>(null);
    const [loading, setLoading] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);

    useEffect(() => {
        if (visible && partnerId) {
            loadBlockStatus();
        }
    }, [visible, partnerId]);

    const loadBlockStatus = async () => {
        try {
            const status = await checkBlockStatus(partnerId);
            setBlockStatus(status);
        } catch (error) {
            console.error('Check block status error:', error);
        }
    };

    const handleBlock = async () => {
        Alert.alert(
            `Chặn ${partnerName}?`,
            `${partnerName} sẽ không thể gửi tin nhắn hoặc gọi cho bạn. Họ sẽ không được thông báo rằng bạn đã chặn.`,
            [
                { text: 'Hủy', style: 'cancel' },
                {
                    text: 'Chặn',
                    style: 'destructive',
                    onPress: async () => {
                        setLoading(true);
                        try {
                            await blockUser(partnerId);
                            setBlockStatus(prev => prev ? { ...prev, blockedByMe: true } : null);
                            Alert.alert('Đã chặn', `${partnerName} đã bị chặn`);
                            onClose();
                        } catch (error) {
                            Alert.alert('Lỗi', 'Không thể chặn người dùng');
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const handleUnblock = async () => {
        Alert.alert(
            `Bỏ chặn ${partnerName}?`,
            `${partnerName} sẽ có thể gửi tin nhắn và gọi cho bạn.`,
            [
                { text: 'Hủy', style: 'cancel' },
                {
                    text: 'Bỏ chặn',
                    onPress: async () => {
                        setLoading(true);
                        try {
                            await unblockUser(partnerId);
                            setBlockStatus(prev => prev ? { ...prev, blockedByMe: false } : null);
                            Alert.alert('Đã bỏ chặn', `${partnerName} đã được bỏ chặn`);
                            onClose();
                        } catch (error) {
                            Alert.alert('Lỗi', 'Không thể bỏ chặn người dùng');
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const handleReport = () => {
        onClose();
        setTimeout(() => setShowReportModal(true), 300);
    };

    const Option = ({
        icon,
        iconPack = 'ionicons',
        label,
        color = colors.text,
        onPress
    }: {
        icon: string;
        iconPack?: 'ionicons' | 'feather' | 'material';
        label: string;
        color?: string;
        onPress: () => void;
    }) => (
        <TouchableOpacity
            style={[styles.optionItem, { borderBottomColor: colors.border }]}
            onPress={onPress}
            disabled={loading}
        >
            <View style={[styles.optionIcon, { backgroundColor: isDark ? '#2D2D2D' : '#F3F4F6' }]}>
                {iconPack === 'feather' && <Feather name={icon as any} size={20} color={color} />}
                {iconPack === 'material' && <MaterialIcons name={icon as any} size={20} color={color} />}
                {iconPack === 'ionicons' && <Ionicons name={icon as any} size={20} color={color} />}
            </View>
            <Text style={[styles.optionLabel, { color }]}>{label}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
    );

    return (
        <>
            <Modal
                visible={visible}
                animationType="slide"
                transparent
                onRequestClose={onClose}
            >
                <View style={styles.overlay}>
                    <TouchableOpacity
                        style={styles.backdrop}
                        activeOpacity={1}
                        onPress={onClose}
                    />

                    <View style={[styles.container, { backgroundColor: colors.card }]}>
                        {/* Handle */}
                        <View style={styles.handle} />

                        {/* Header */}
                        <View style={styles.header}>
                            <Text style={[styles.title, { color: colors.text }]}>Tùy chọn</Text>
                            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                                <Ionicons name="close" size={24} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        {loading && (
                            <ActivityIndicator
                                style={{ marginVertical: 20 }}
                                color={colors.primary}
                            />
                        )}

                        {/* Options */}
                        <View style={styles.optionsList}>
                            {onSearch && (
                                <Option
                                    icon="search"
                                    label="Tìm kiếm tin nhắn"
                                    onPress={() => { onClose(); onSearch(); }}
                                />
                            )}

                            {onViewProfile && (
                                <Option
                                    icon="person-circle-outline"
                                    label="Xem trang cá nhân"
                                    onPress={() => { onClose(); onViewProfile(); }}
                                />
                            )}

                            {/* Block / Unblock */}
                            {blockStatus?.blockedByMe ? (
                                <Option
                                    icon="lock-open-outline"
                                    label={`Bỏ chặn ${partnerName}`}
                                    color="#10B981"
                                    onPress={handleUnblock}
                                />
                            ) : (
                                <Option
                                    icon="ban"
                                    iconPack="feather"
                                    label={`Chặn ${partnerName}`}
                                    color="#EF4444"
                                    onPress={handleBlock}
                                />
                            )}

                            {/* Report */}
                            <Option
                                icon="flag-outline"
                                label="Báo cáo"
                                color="#F59E0B"
                                onPress={handleReport}
                            />

                            {/* Warning if blocked by them */}
                            {blockStatus?.blockedByThem && (
                                <View style={[styles.warningBox, { backgroundColor: isDark ? '#3D2020' : '#FEE2E2' }]}>
                                    <Feather name="alert-triangle" size={16} color="#EF4444" />
                                    <Text style={[styles.warningText, { color: '#EF4444' }]}>
                                        {partnerName} đã chặn bạn. Bạn không thể gửi tin nhắn.
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Report Modal */}
            <ReportModal
                visible={showReportModal}
                onClose={() => setShowReportModal(false)}
                targetId={partnerId}
                targetType="user"
                targetName={partnerName}
            />
        </>
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
        marginBottom: 16,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    closeButton: {
        padding: 4,
    },
    optionsList: {
        paddingBottom: 8,
    },
    optionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    optionIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    optionLabel: {
        flex: 1,
        fontSize: 15,
        fontWeight: '500',
    },
    warningBox: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 10,
        marginTop: 16,
        gap: 10,
    },
    warningText: {
        flex: 1,
        fontSize: 13,
    },
});

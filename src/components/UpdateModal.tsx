import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Modal,
    StyleSheet,
    Image,
    Dimensions,
} from 'react-native';
import { COLORS, BORDER_RADIUS, SHADOWS } from '../utils/theme';

interface UpdateModalProps {
    visible: boolean;
    onUpdate: () => void;
    onClose: () => void;
    isDownloading?: boolean;
}

const { width } = Dimensions.get('window');

export default function UpdateModal({ visible, onUpdate, onClose, isDownloading }: UpdateModalProps) {
    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.container}>
                    {/* Icon */}
                    <View style={styles.iconContainer}>
                        <Text style={styles.iconEmoji}>📢</Text>
                    </View>

                    {/* Title */}
                    <Text style={styles.title}>Ứng dụng đã có phiên bản mới</Text>

                    {/* Description */}
                    <Text style={styles.description}>
                        Bạn vui lòng cập nhật Ứng dụng lên phiên bản mới nhất.{'\n'}
                        Nếu không cập nhật, Bạn sẽ không chạy được phiên bản hiện tại trên điện thoại.
                    </Text>

                    {/* Update Button */}
                    <TouchableOpacity
                        style={[styles.updateButton, isDownloading && styles.updateButtonDisabled]}
                        onPress={onUpdate}
                        disabled={isDownloading}
                    >
                        <Text style={styles.updateButtonText}>
                            {isDownloading ? 'Đang tải xuống...' : 'Cập nhật'}
                        </Text>
                    </TouchableOpacity>

                    {/* Skip Button */}
                    {!isDownloading && (
                        <TouchableOpacity style={styles.skipButton} onPress={onClose}>
                            <Text style={styles.skipButtonText}>Để sau</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    container: {
        width: width - 40,
        backgroundColor: COLORS.white,
        borderRadius: BORDER_RADIUS.xl,
        padding: 24,
        alignItems: 'center',
        ...SHADOWS.lg,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#FFF7ED',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    iconEmoji: {
        fontSize: 40,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.text,
        textAlign: 'center',
        marginBottom: 12,
    },
    description: {
        fontSize: 14,
        color: COLORS.textLight,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 24,
    },
    updateButton: {
        width: '100%',
        backgroundColor: COLORS.primary,
        paddingVertical: 14,
        borderRadius: BORDER_RADIUS.lg,
        alignItems: 'center',
        marginBottom: 12,
    },
    updateButtonDisabled: {
        backgroundColor: COLORS.textMuted,
    },
    updateButtonText: {
        color: COLORS.white,
        fontSize: 16,
        fontWeight: '600',
    },
    skipButton: {
        paddingVertical: 8,
    },
    skipButtonText: {
        color: COLORS.textMuted,
        fontSize: 14,
    },
});

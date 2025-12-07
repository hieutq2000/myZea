import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Modal,
    StyleSheet,
    Dimensions,
    ScrollView,
} from 'react-native';
import { COLORS, BORDER_RADIUS, SHADOWS } from '../utils/theme';
import { getLatestChangelog } from '../utils/changelog';

interface UpdateModalProps {
    visible: boolean;
    onUpdate: () => void;
    onClose: () => void;
    isDownloading?: boolean;
}

const { width } = Dimensions.get('window');

export default function UpdateModal({ visible, onUpdate, onClose, isDownloading }: UpdateModalProps) {
    const changelog = getLatestChangelog();

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

                    {/* Version Badge */}
                    {changelog && (
                        <View style={styles.versionBadge}>
                            <Text style={styles.versionText}>v{changelog.version}</Text>
                        </View>
                    )}

                    {/* Changelog Title */}
                    {changelog && (
                        <Text style={styles.changelogTitle}>{changelog.title}</Text>
                    )}

                    {/* Changes List */}
                    {changelog && changelog.changes.length > 0 && (
                        <ScrollView style={styles.changesList} showsVerticalScrollIndicator={false}>
                            {changelog.changes.map((change, index) => (
                                <View key={index} style={styles.changeItem}>
                                    <Text style={styles.changeText}>{change}</Text>
                                </View>
                            ))}
                        </ScrollView>
                    )}

                    {/* Description */}
                    <Text style={styles.description}>
                        Bạn vui lòng cập nhật để trải nghiệm các tính năng mới nhất.
                    </Text>

                    {/* Update Button */}
                    <TouchableOpacity
                        style={[styles.updateButton, isDownloading && styles.updateButtonDisabled]}
                        onPress={onUpdate}
                        disabled={isDownloading}
                    >
                        <Text style={styles.updateButtonText}>
                            {isDownloading ? 'Đang tải xuống...' : 'Cập nhật ngay'}
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
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    container: {
        width: width - 40,
        maxHeight: '80%',
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
        marginBottom: 8,
    },
    versionBadge: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        marginBottom: 12,
    },
    versionText: {
        color: COLORS.white,
        fontSize: 12,
        fontWeight: '600',
    },
    changelogTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.text,
        textAlign: 'center',
        marginBottom: 12,
    },
    changesList: {
        maxHeight: 120,
        width: '100%',
        marginBottom: 12,
    },
    changeItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: 4,
        paddingHorizontal: 8,
    },
    changeText: {
        fontSize: 13,
        color: COLORS.textLight,
        lineHeight: 20,
    },
    description: {
        fontSize: 13,
        color: COLORS.textMuted,
        textAlign: 'center',
        lineHeight: 18,
        marginBottom: 20,
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

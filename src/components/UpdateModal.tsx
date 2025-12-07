import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Modal,
    StyleSheet,
    Dimensions,
    ScrollView,
    ActivityIndicator,
} from 'react-native';
import { COLORS, BORDER_RADIUS, SHADOWS } from '../utils/theme';
import { getLatestChangelog, ChangelogEntry } from '../utils/changelog';



interface UpdateModalProps {
    visible: boolean;
    onUpdate: () => void;
    onClose: () => void;
    isDownloading?: boolean;
}

const { width } = Dimensions.get('window');

export default function UpdateModal({ visible, onUpdate, onClose, isDownloading }: UpdateModalProps) {
    const [changelog, setChangelog] = useState<ChangelogEntry | null>(null);
    const [loading, setLoading] = useState(true);

    // Load latest changelog
    useEffect(() => {
        if (visible) {
            loadChangelog();
        }
    }, [visible]);

    const loadChangelog = async () => {
        setLoading(true);
        // Simulate a small delay for better UX
        setTimeout(() => {
            const data = getLatestChangelog();
            setChangelog(data);
            setLoading(false);
        }, 500);
    };

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
                    <Text style={styles.title}>Có phiên bản mới!</Text>

                    {loading ? (
                        <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 20 }} />
                    ) : changelog ? (
                        <>
                            {/* Version Badge */}
                            <View style={styles.versionBadge}>
                                <Text style={styles.versionText}>v{changelog.version}</Text>
                            </View>

                            {/* Changelog Title */}
                            <Text style={styles.changelogTitle}>{changelog.title}</Text>

                            {/* Changes List */}
                            {changelog.changes.length > 0 && (
                                <ScrollView style={styles.changesList} showsVerticalScrollIndicator={false}>
                                    {changelog.changes.map((change, index) => (
                                        <View key={index} style={styles.changeItem}>
                                            <Text style={styles.changeText}>{change}</Text>
                                        </View>
                                    ))}
                                </ScrollView>
                            )}
                        </>
                    ) : (
                        <Text style={styles.description}>
                            Phiên bản mới đã sẵn sàng với nhiều cải tiến!
                        </Text>
                    )}

                    {/* Update Button */}
                    <TouchableOpacity
                        style={[styles.updateButton, isDownloading && styles.updateButtonDisabled]}
                        onPress={onUpdate}
                        disabled={isDownloading}
                    >
                        <Text style={styles.updateButtonText}>
                            {isDownloading ? '⏳ Đang tải xuống...' : '🚀 Cập nhật ngay'}
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
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.text,
        textAlign: 'center',
        marginBottom: 12,
    },
    versionBadge: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 16,
        marginBottom: 12,
    },
    versionText: {
        color: COLORS.white,
        fontSize: 14,
        fontWeight: '700',
    },
    changelogTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
        textAlign: 'center',
        marginBottom: 12,
    },
    changesList: {
        maxHeight: 140,
        width: '100%',
        marginBottom: 16,
    },
    changeItem: {
        paddingVertical: 4,
        paddingHorizontal: 8,
    },
    changeText: {
        fontSize: 14,
        color: COLORS.textLight,
        lineHeight: 22,
    },
    description: {
        fontSize: 15,
        color: COLORS.textLight,
        textAlign: 'center',
        lineHeight: 22,
        marginVertical: 16,
    },
    updateButton: {
        width: '100%',
        backgroundColor: COLORS.primary,
        paddingVertical: 16,
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

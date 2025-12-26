import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { COLORS } from '../utils/theme';
import { Feather } from '@expo/vector-icons';

interface Props {
    visible: boolean;
    config: any;
    onUpdate: () => void;
    onClose?: () => void;
}

const { width } = Dimensions.get('window');

export default function ForceUpdateModal({ visible, config, onUpdate, onClose }: Props) {
    if (!config) return null;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={() => {
                if (!config.forceUpdate && onClose) {
                    onClose();
                }
            }}
        >
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <View style={styles.header}>
                        <Image
                            source={require('../../assets/icon-christmas.png')}
                            style={styles.icon}
                        />
                        <View style={styles.badgeContainer}>
                            <Text style={styles.badgeText}>MỚI</Text>
                        </View>
                    </View>

                    <Text style={styles.title}>{config.title || 'Cập nhật ứng dụng'}</Text>

                    <View style={styles.versionContainer}>
                        <Feather name="box" size={14} color={COLORS.primary} />
                        <Text style={styles.version}> Phiên bản v{config.version}</Text>
                    </View>

                    <Text style={styles.message}>
                        {config.message || 'Một phiên bản mới đã sẵn sàng. Vui lòng cập nhật để trải nghiệm các tính năng mới nhất.'}
                    </Text>

                    <TouchableOpacity style={styles.button} onPress={onUpdate}>
                        <Feather name="download-cloud" size={18} color="white" style={{ marginRight: 8 }} />
                        <Text style={styles.buttonText}>Cập nhật ngay</Text>
                    </TouchableOpacity>

                    {!config.forceUpdate && onClose && (
                        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                            <Text style={styles.closeText}>Để sau</Text>
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
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24
    },
    container: {
        backgroundColor: 'white',
        borderRadius: 24,
        padding: 32,
        width: '100%',
        maxWidth: 360,
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 10,
    },
    header: {
        position: 'relative',
        marginBottom: 20
    },
    icon: {
        width: 90,
        height: 90,
        borderRadius: 20,
    },
    badgeContainer: {
        position: 'absolute',
        top: -10,
        right: -10,
        backgroundColor: '#EF4444',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: 'white'
    },
    badgeText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 10
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 8,
        textAlign: 'center',
        color: '#1F2937'
    },
    versionContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#EFF6FF',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        marginBottom: 20
    },
    version: {
        fontSize: 14,
        color: COLORS.primary,
        marginLeft: 6,
        fontWeight: '600'
    },
    message: {
        fontSize: 15,
        color: '#6B7280',
        textAlign: 'center',
        marginBottom: 32,
        lineHeight: 24
    },
    button: {
        backgroundColor: COLORS.primary,
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 100,
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    buttonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16
    },
    closeButton: {
        marginTop: 16,
        padding: 10
    },
    closeText: {
        color: '#9CA3AF',
        fontSize: 15,
        fontWeight: '500'
    }
});

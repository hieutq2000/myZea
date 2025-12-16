/**
 * MaintenanceScreen - Màn hình bảo trì
 * Hiển thị khi app đang bảo trì hoặc có lỗi server
 */

import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    StatusBar,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface MaintenanceScreenProps {
    message?: string;
}

export default function MaintenanceScreen({ message }: MaintenanceScreenProps) {
    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <SafeAreaView style={styles.content}>
                <Ionicons name="construct" size={80} color="#F59E0B" />
                <Text style={styles.title}>Đang bảo trì</Text>
                <Text style={styles.description}>
                    {message || "Hệ thống đang được nâng cấp.\nVui lòng quay lại sau ít phút."}
                </Text>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0F0F23',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    title: {
        color: '#FFF',
        fontSize: 28,
        fontWeight: 'bold',
        marginTop: 24,
        marginBottom: 12,
    },
    description: {
        color: '#9CA3AF',
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 24,
    },
});

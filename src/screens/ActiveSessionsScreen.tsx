import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import { useTheme } from '../context/ThemeContext';

interface Session {
    id: string;
    deviceName: string;
    osName: string;
    loginTime: string;
    lastActive: string;
    isCurrent: boolean;
}

export default function ActiveSessionsScreen() {
    const navigation = useNavigation();
    const { colors, isDark } = useTheme();
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadSessions();
    }, []);

    const formatTimeAgo = (isoString: string) => {
        const date = new Date(isoString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'Vừa xong';
        if (diffMins < 60) return `${diffMins} phút trước`;
        if (diffHours < 24) return `${diffHours} giờ trước`;
        if (diffDays === 1) return 'Hôm qua';
        if (diffDays < 7) return `${diffDays} ngày trước`;

        return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const loadSessions = async () => {
        try {
            setLoading(true);
            const sessionsRaw = await AsyncStorage.getItem('loginSessions');

            if (sessionsRaw) {
                const storedSessions = JSON.parse(sessionsRaw);

                // Format sessions for display
                const formattedSessions = storedSessions.map((s: any, index: number) => ({
                    ...s,
                    lastActive: s.isCurrent ? 'Đang hoạt động' : formatTimeAgo(s.loginTime),
                }));

                setSessions(formattedSessions);
            } else {
                // No sessions stored, show current device only
                const currentSession = {
                    id: 'current',
                    deviceName: Device.modelName || 'Thiết bị này',
                    osName: `${Platform.OS === 'ios' ? 'iOS' : 'Android'} ${Device.osVersion || ''}`,
                    loginTime: new Date().toISOString(),
                    lastActive: 'Đang hoạt động',
                    isCurrent: true,
                };
                setSessions([currentSession]);
            }
        } catch (e) {
            console.log('Error loading sessions:', e);
        } finally {
            setLoading(false);
        }
    };

    const handleLogoutSession = async (sessionId: string) => {
        Alert.alert(
            'Xóa phiên đăng nhập này?',
            'Phiên đăng nhập sẽ bị xóa khỏi lịch sử.',
            [
                { text: 'Hủy', style: 'cancel' },
                {
                    text: 'Xóa',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            // Remove from AsyncStorage
                            const sessionsRaw = await AsyncStorage.getItem('loginSessions');
                            if (sessionsRaw) {
                                const storedSessions = JSON.parse(sessionsRaw);
                                const updatedSessions = storedSessions.filter((s: any) => s.id !== sessionId);
                                await AsyncStorage.setItem('loginSessions', JSON.stringify(updatedSessions));
                            }

                            // Update UI
                            setSessions(prev => prev.filter(s => s.id !== sessionId));
                            Alert.alert('Thành công', 'Đã xóa phiên đăng nhập');
                        } catch (e) {
                            Alert.alert('Lỗi', 'Không thể xóa phiên đăng nhập');
                        }
                    }
                }
            ]
        );
    };

    const handleClearAllSessions = async () => {
        Alert.alert(
            'Xóa tất cả lịch sử?',
            'Điều này sẽ xóa toàn bộ lịch sử đăng nhập (trừ phiên hiện tại).',
            [
                { text: 'Hủy', style: 'cancel' },
                {
                    text: 'Xóa tất cả',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            // Keep only current session
                            const currentSession = sessions.find(s => s.isCurrent);
                            if (currentSession) {
                                await AsyncStorage.setItem('loginSessions', JSON.stringify([currentSession]));
                                setSessions([currentSession]);
                            }
                            Alert.alert('Thành công', 'Đã xóa lịch sử đăng nhập');
                        } catch (e) {
                            Alert.alert('Lỗi', 'Không thể xóa lịch sử');
                        }
                    }
                }
            ]
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <LinearGradient
                colors={['#ffebd9', '#e0f8ff']}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.headerGradient}
            >
                <SafeAreaView>
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                            <Ionicons name="chevron-back" size={28} color="#333" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Thiết bị đã đăng nhập</Text>
                    </View>
                </SafeAreaView>
            </LinearGradient>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 40 }}>
                    <View style={styles.infoBox}>
                        <Ionicons name="shield-checkmark-outline" size={24} color={colors.primary} style={{ marginBottom: 8 }} />
                        <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                            Lịch sử các lần đăng nhập trên thiết bị này. Bao gồm cả đăng nhập bằng mật khẩu và sinh trắc học.
                        </Text>
                    </View>

                    {/* Sessions Count */}
                    <View style={styles.countRow}>
                        <Text style={[styles.countText, { color: colors.text }]}>
                            {sessions.length} phiên đăng nhập
                        </Text>
                        {sessions.length > 1 && (
                            <TouchableOpacity onPress={handleClearAllSessions}>
                                <Text style={{ color: '#EF4444', fontSize: 14 }}>Xóa lịch sử</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* List Sessions */}
                    {sessions.map(session => (
                        <View key={session.id} style={[styles.sessionCard, { backgroundColor: colors.card, borderColor: session.isCurrent ? colors.primary : 'transparent', borderWidth: session.isCurrent ? 1 : 0 }]}>
                            <View style={[styles.iconContainer, { backgroundColor: isDark ? '#2D2D2D' : '#F3F4F6' }]}>
                                <Ionicons name="phone-portrait-outline" size={28} color={session.isCurrent ? colors.primary : '#9CA3AF'} />
                            </View>

                            <View style={styles.sessionInfo}>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Text style={[styles.deviceName, { color: colors.text }]}>{session.deviceName}</Text>
                                    {session.isCurrent && (
                                        <View style={[styles.currentBadge, { backgroundColor: colors.primary + '20' }]}>
                                            <Text style={{ color: colors.primary, fontSize: 10, fontWeight: '600' }}>HIỆN TẠI</Text>
                                        </View>
                                    )}
                                </View>
                                <Text style={[styles.osName, { color: colors.textSecondary }]}>{session.osName}</Text>
                                <Text style={[styles.lastActive, { color: session.isCurrent ? '#10B981' : colors.textSecondary }]}>
                                    {session.lastActive}
                                </Text>
                            </View>

                            {!session.isCurrent && (
                                <TouchableOpacity
                                    style={styles.logoutButton}
                                    onPress={() => handleLogoutSession(session.id)}
                                >
                                    <Ionicons name="trash-outline" size={20} color="#EF4444" />
                                </TouchableOpacity>
                            )}
                        </View>
                    ))}

                    {sessions.length === 0 && (
                        <View style={styles.emptyState}>
                            <Ionicons name="phone-portrait-outline" size={48} color={colors.textSecondary} />
                            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                                Chưa có lịch sử đăng nhập
                            </Text>
                        </View>
                    )}
                </ScrollView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    headerGradient: {
        paddingBottom: 0,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    backButton: {
        marginRight: 12,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        padding: 16,
    },
    infoBox: {
        backgroundColor: 'rgba(249, 115, 22, 0.1)',
        padding: 16,
        borderRadius: 12,
        marginBottom: 16,
        alignItems: 'center',
    },
    infoText: {
        fontSize: 13,
        textAlign: 'center',
        lineHeight: 18,
    },
    countRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        paddingHorizontal: 4,
    },
    countText: {
        fontSize: 14,
        fontWeight: '600',
    },
    sessionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    sessionInfo: {
        flex: 1,
    },
    deviceName: {
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 4,
    },
    currentBadge: {
        marginLeft: 8,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    osName: {
        fontSize: 12,
        marginBottom: 4,
    },
    lastActive: {
        fontSize: 12,
        fontWeight: '500',
    },
    logoutButton: {
        padding: 8,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyText: {
        marginTop: 12,
        fontSize: 14,
    }
});

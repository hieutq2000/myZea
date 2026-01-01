/**
 * BlockedUsersScreen - Quản lý danh sách người dùng đã chặn
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    StatusBar,
    Platform,
    RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { getBlockedUsers, unblockUser, BlockedUser } from '../utils/api';
import { getAvatarUri } from '../utils/media';

export default function BlockedUsersScreen() {
    const navigation = useNavigation();
    const { colors, isDark } = useTheme();

    const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [unblocking, setUnblocking] = useState<string | null>(null);

    useEffect(() => {
        loadBlockedUsers();
    }, []);

    const loadBlockedUsers = async () => {
        try {
            const users = await getBlockedUsers();
            setBlockedUsers(users);
        } catch (error) {
            console.error('Load blocked users error:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleUnblock = (user: BlockedUser) => {
        Alert.alert(
            `Bỏ chặn ${user.name}?`,
            `${user.name} sẽ có thể gửi tin nhắn và gọi cho bạn.`,
            [
                { text: 'Hủy', style: 'cancel' },
                {
                    text: 'Bỏ chặn',
                    onPress: async () => {
                        setUnblocking(user.id);
                        try {
                            await unblockUser(user.id);
                            setBlockedUsers(prev => prev.filter(u => u.id !== user.id));
                        } catch (error) {
                            Alert.alert('Lỗi', 'Không thể bỏ chặn người dùng');
                        } finally {
                            setUnblocking(null);
                        }
                    }
                }
            ]
        );
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    const renderItem = ({ item }: { item: BlockedUser }) => (
        <View style={[styles.userItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Image
                source={{ uri: getAvatarUri(item.avatar, item.name) }}
                style={styles.avatar}
            />
            <View style={styles.userInfo}>
                <Text style={[styles.userName, { color: colors.text }]}>{item.name}</Text>
                <Text style={[styles.userEmail, { color: colors.textSecondary }]}>{item.email}</Text>
                <Text style={[styles.blockedDate, { color: colors.textSecondary }]}>
                    Đã chặn: {formatDate(item.blocked_at)}
                </Text>
            </View>
            <TouchableOpacity
                style={[styles.unblockButton, unblocking === item.id && styles.buttonDisabled]}
                onPress={() => handleUnblock(item)}
                disabled={unblocking === item.id}
            >
                {unblocking === item.id ? (
                    <ActivityIndicator size="small" color="#10B981" />
                ) : (
                    <Text style={styles.unblockText}>Bỏ chặn</Text>
                )}
            </TouchableOpacity>
        </View>
    );

    const renderEmpty = () => (
        <View style={styles.emptyContainer}>
            <Ionicons name="shield-checkmark-outline" size={64} color={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Không có ai bị chặn</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Những người dùng bạn chặn sẽ xuất hiện ở đây.
            </Text>
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

            {/* Header */}
            <LinearGradient
                colors={colors.headerGradient}
                style={styles.header}
            >
                <SafeAreaView>
                    <View style={styles.headerContent}>
                        <TouchableOpacity
                            style={[styles.headerButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
                            onPress={() => navigation.goBack()}
                        >
                            <Ionicons name="chevron-back" size={24} color={isDark ? '#FFF' : '#000'} />
                        </TouchableOpacity>
                        <Text style={[styles.headerTitle, { color: isDark ? '#FFF' : '#000' }]}>
                            Người dùng đã chặn
                        </Text>
                        <View style={{ width: 40 }} />
                    </View>
                </SafeAreaView>
            </LinearGradient>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={blockedUsers}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={[
                        styles.listContent,
                        blockedUsers.length === 0 && { flex: 1 }
                    ]}
                    ListEmptyComponent={renderEmpty}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => {
                                setRefreshing(true);
                                loadBlockedUsers();
                            }}
                            colors={[colors.primary]}
                            tintColor={colors.primary}
                        />
                    }
                />
            )}
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
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        padding: 16,
    },
    userItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 1,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 14,
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 2,
    },
    userEmail: {
        fontSize: 13,
        marginBottom: 2,
    },
    blockedDate: {
        fontSize: 11,
    },
    unblockButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#10B981',
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    unblockText: {
        color: '#10B981',
        fontSize: 13,
        fontWeight: '600',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginTop: 16,
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
    },
});

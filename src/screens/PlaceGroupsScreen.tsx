import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Image,
    StatusBar,
    Platform,
    ActivityIndicator,
    RefreshControl,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { apiRequest } from '../utils/api';
import { getAvatarUri } from '../utils/media';

interface Group {
    id: string;
    name: string;
    description?: string;
    avatar?: string;
    coverImage?: string;
    privacy: 'public' | 'private' | 'secret';
    memberCount: number;
    role?: string;
    isPinned?: boolean;
}

interface PlaceGroupsScreenProps {
    onBack: () => void;
    onOpenGroup: (groupId: string) => void;
    onCreateGroup?: () => void;
}

const formatMemberCount = (count: number): string => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M thành viên`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K thành viên`;
    return `${count} thành viên`;
};

const getPrivacyLabel = (privacy: string): string => {
    switch (privacy) {
        case 'public': return 'Nhóm công khai';
        case 'private': return 'Nhóm riêng tư';
        case 'secret': return 'Nhóm bí mật';
        default: return 'Nhóm';
    }
};

export default function PlaceGroupsScreen({ onBack, onOpenGroup, onCreateGroup }: PlaceGroupsScreenProps) {
    const [pinnedGroups, setPinnedGroups] = useState<Group[]>([]);
    const [myGroups, setMyGroups] = useState<Group[]>([]);
    const [suggestedGroups, setSuggestedGroups] = useState<Group[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isEditingPins, setIsEditingPins] = useState(false);

    useEffect(() => {
        loadGroups();
    }, []);

    const loadGroups = async () => {
        try {
            const data = await apiRequest<{ pinned: Group[]; myGroups: Group[]; suggested: Group[] }>('/api/place/groups');
            setPinnedGroups(data.pinned || []);
            setMyGroups(data.myGroups || []);
            setSuggestedGroups(data.suggested || []);
        } catch (error) {
            console.error('Load groups error:', error);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    const handleRefresh = () => {
        setIsRefreshing(true);
        loadGroups();
    };

    const handleTogglePin = async (group: Group) => {
        try {
            const newPinStatus = !group.isPinned;
            await apiRequest(`/api/place/groups/${group.id}/pin`, {
                method: 'POST',
                body: JSON.stringify({ pin: newPinStatus })
            });

            // Update local state
            if (newPinStatus) {
                // Move to pinned
                setMyGroups(prev => prev.filter(g => g.id !== group.id));
                setPinnedGroups(prev => [...prev, { ...group, isPinned: true }]);
            } else {
                // Move to unpinned
                setPinnedGroups(prev => prev.filter(g => g.id !== group.id));
                setMyGroups(prev => [{ ...group, isPinned: false }, ...prev]);
            }
        } catch (error) {
            Alert.alert('Lỗi', 'Không thể ghim/bỏ ghim nhóm');
        }
    };

    const [joiningGroupId, setJoiningGroupId] = useState<string | null>(null);

    const handleJoinGroup = async (group: Group) => {
        try {
            setJoiningGroupId(group.id);
            await apiRequest(`/api/place/groups/${group.id}/join`, {
                method: 'POST'
            });

            // Move from suggested to myGroups
            setSuggestedGroups(prev => prev.filter(g => g.id !== group.id));
            setMyGroups(prev => [{ ...group, role: 'member' }, ...prev]);

            Alert.alert('Thành công', `Bạn đã tham gia nhóm "${group.name}"`);
        } catch (error) {
            Alert.alert('Lỗi', 'Không thể tham gia nhóm');
        } finally {
            setJoiningGroupId(null);
        }
    };

    const renderGroupItem = ({ item }: { item: Group }) => {
        const avatarUri = getAvatarUri(item.avatar, item.name);

        return (
            <TouchableOpacity
                style={styles.groupItem}
                onPress={() => onOpenGroup(item.id)}
                activeOpacity={0.7}
            >
                <Image source={{ uri: avatarUri }} style={styles.groupAvatar} />
                <View style={styles.groupInfo}>
                    <Text style={styles.groupName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.groupMeta}>
                        {getPrivacyLabel(item.privacy)} • {formatMemberCount(item.memberCount)}
                    </Text>
                </View>
                {isEditingPins && (
                    <TouchableOpacity
                        style={styles.pinButton}
                        onPress={() => handleTogglePin(item)}
                    >
                        <Ionicons
                            name={item.isPinned ? 'pin' : 'pin-outline'}
                            size={22}
                            color={item.isPinned ? '#F97316' : '#999'}
                        />
                    </TouchableOpacity>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

            {/* Header with Gradient */}
            <LinearGradient
                colors={['#ffebd9', '#e0f8ff']}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.headerGradient}
            >
                <SafeAreaView>
                    <View style={[styles.header, { paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }]}>
                        <TouchableOpacity onPress={onBack} style={styles.backButton}>
                            <Ionicons name="arrow-back" size={24} color="#333" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Nhóm</Text>
                        <View style={styles.headerRight}>
                            <TouchableOpacity style={styles.iconButton} onPress={onCreateGroup}>
                                <Ionicons name="add" size={26} color="#333" />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.iconButton}>
                                <Ionicons name="search" size={24} color="#333" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </SafeAreaView>
            </LinearGradient>

            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#F97316" />
                </View>
            ) : (
                <FlatList
                    data={[...pinnedGroups.map(g => ({ ...g, isPinned: true })), ...myGroups]}
                    keyExtractor={item => item.id}
                    renderItem={renderGroupItem}
                    refreshControl={
                        <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
                    }
                    contentContainerStyle={styles.listContent}
                    ListHeaderComponent={() => (
                        <View>
                            {/* Pinned Section */}
                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionTitle}>Nhóm đã ghim</Text>
                                <TouchableOpacity onPress={() => setIsEditingPins(!isEditingPins)}>
                                    <Text style={styles.editButton}>
                                        {isEditingPins ? 'Xong' : 'Chỉnh sửa'}
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            {pinnedGroups.length === 0 && (
                                <View style={styles.emptyPinned}>
                                    <Text style={styles.emptyPinnedText}>
                                        Bạn chưa ghim nhóm nào
                                    </Text>
                                    <Text style={styles.emptyPinnedSubtext}>
                                        Nhấn "Chỉnh sửa" để ghim nhóm
                                    </Text>
                                </View>
                            )}

                            {pinnedGroups.length > 0 && (
                                <View style={styles.pinnedList}>
                                    {pinnedGroups.map(group => (
                                        <View key={group.id}>
                                            {renderGroupItem({ item: { ...group, isPinned: true } })}
                                        </View>
                                    ))}
                                </View>
                            )}

                            {/* My Groups Section */}
                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionTitle}>Nhóm của bạn</Text>
                                <TouchableOpacity>
                                    <Ionicons name="swap-vertical" size={20} color="#666" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                    ListFooterComponent={() => (
                        suggestedGroups.length > 0 ? (
                            <View>
                                {/* Suggested Groups Section */}
                                <View style={styles.sectionHeader}>
                                    <Text style={styles.sectionTitle}>Nhóm gợi ý cho bạn</Text>
                                    <TouchableOpacity>
                                        <Text style={styles.seeAllButton}>Xem tất cả</Text>
                                    </TouchableOpacity>
                                </View>
                                <View style={styles.suggestedList}>
                                    {suggestedGroups.map(group => (
                                        <TouchableOpacity
                                            key={group.id}
                                            style={styles.suggestedItem}
                                            onPress={() => onOpenGroup(group.id)}
                                            activeOpacity={0.7}
                                        >
                                            <Image
                                                source={{ uri: getAvatarUri(group.avatar, group.name) }}
                                                style={styles.suggestedAvatar}
                                            />
                                            <View style={styles.suggestedInfo}>
                                                <Text style={styles.suggestedName} numberOfLines={2}>{group.name}</Text>
                                                <Text style={styles.suggestedMeta}>{formatMemberCount(group.memberCount)}</Text>
                                            </View>
                                            <TouchableOpacity
                                                style={[styles.joinButton, joiningGroupId === group.id && { opacity: 0.6 }]}
                                                onPress={() => handleJoinGroup(group)}
                                                disabled={joiningGroupId === group.id}
                                            >
                                                {joiningGroupId === group.id ? (
                                                    <ActivityIndicator size="small" color="#1877F2" />
                                                ) : (
                                                    <Text style={styles.joinButtonText}>Tham gia</Text>
                                                )}
                                            </TouchableOpacity>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        ) : null
                    )}
                    ListEmptyComponent={() => (
                        myGroups.length === 0 && pinnedGroups.length === 0 ? (
                            <View style={styles.emptyContainer}>
                                <Ionicons name="people-outline" size={60} color="#CCC" />
                                <Text style={styles.emptyText}>Bạn chưa tham gia nhóm nào</Text>
                                <TouchableOpacity style={styles.createButton} onPress={onCreateGroup}>
                                    <Text style={styles.createButtonText}>Tạo nhóm mới</Text>
                                </TouchableOpacity>
                            </View>
                        ) : null
                    )}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5',
    },
    headerGradient: {
        paddingBottom: 0,
    },
    headerSafeArea: {
        backgroundColor: 'transparent',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: 'transparent',
    },
    backButton: {
        padding: 4,
        marginRight: 12,
    },
    headerTitle: {
        flex: 1,
        fontSize: 22,
        fontWeight: 'bold',
        color: '#333',
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F0F0F0',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        paddingBottom: 100,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#FFF',
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
        marginTop: 8,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    editButton: {
        fontSize: 14,
        color: '#F97316',
        fontWeight: '600',
    },
    emptyPinned: {
        backgroundColor: '#FFF',
        padding: 20,
        alignItems: 'center',
    },
    emptyPinnedText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#333',
    },
    emptyPinnedSubtext: {
        fontSize: 13,
        color: '#999',
        marginTop: 4,
    },
    pinnedList: {
        backgroundColor: '#FFF',
    },
    groupItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    groupAvatar: {
        width: 56,
        height: 56,
        borderRadius: 12,
        marginRight: 12,
    },
    groupInfo: {
        flex: 1,
    },
    groupName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4,
    },
    groupMeta: {
        fontSize: 13,
        color: '#666',
    },
    pinButton: {
        padding: 8,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 60,
    },
    emptyText: {
        fontSize: 16,
        color: '#999',
        marginTop: 16,
        marginBottom: 20,
    },
    createButton: {
        backgroundColor: '#F97316',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    createButtonText: {
        color: '#FFF',
        fontSize: 15,
        fontWeight: '600',
    },
    seeAllButton: {
        fontSize: 14,
        color: '#1877F2',
        fontWeight: '600',
    },
    suggestedList: {
        backgroundColor: '#FFF',
    },
    suggestedItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    suggestedAvatar: {
        width: 70,
        height: 70,
        borderRadius: 12,
        marginRight: 12,
    },
    suggestedInfo: {
        flex: 1,
    },
    suggestedName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4,
    },
    suggestedMeta: {
        fontSize: 13,
        color: '#666',
    },
    joinButton: {
        backgroundColor: '#E7F3FF',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 6,
    },
    joinButtonText: {
        color: '#1877F2',
        fontSize: 14,
        fontWeight: '600',
    },
});

import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, FlatList,
    StatusBar, Platform, ScrollView, Alert, TextInput, Modal
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getAvatarUri } from '../utils/media';
import { apiRequest, getCurrentUser } from '../utils/api';
import GroupAvatar from '../components/GroupAvatar';

interface Member {
    id: string;
    name: string;
    avatar?: string;
    email?: string;
    role: string;
    joined_at?: string;
}

interface GroupInfoScreenProps {
    navigation: any;
    route: {
        params: {
            groupId: string;
            groupName: string;
            groupAvatar?: string;
            members?: Member[];
            creatorId?: string;
        };
    };
}

type TabType = 'members' | 'files' | 'media' | 'links';

export default function GroupInfoScreen({ navigation, route }: GroupInfoScreenProps) {
    const { groupId, groupName, groupAvatar, members: initialMembers, creatorId } = route.params;

    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [members, setMembers] = useState<Member[]>(initialMembers || []);
    const [groupInfo, setGroupInfo] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<TabType>('members');
    const [searchText, setSearchText] = useState('');
    const [loading, setLoading] = useState(true);
    const [showAddMemberModal, setShowAddMemberModal] = useState(false);

    useEffect(() => {
        loadCurrentUser();
        loadGroupInfo();
    }, []);

    const loadCurrentUser = async () => {
        const user = await getCurrentUser();
        if (user) setCurrentUserId(user.id);
    };

    const loadGroupInfo = async () => {
        try {
            const data = await apiRequest<any>(`/api/groups/${groupId}`);
            if (data) {
                setGroupInfo(data);
                setMembers(data.members || []);
            }
        } catch (error) {
            console.log('Load group info error:', error);
        } finally {
            setLoading(false);
        }
    };

    const isCreator = currentUserId === (groupInfo?.creator_id || creatorId);
    const isAdmin = members.find(m => m.id === currentUserId)?.role === 'admin' || isCreator;

    // State for add member modal
    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [userSearchText, setUserSearchText] = useState('');
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

    // Load all users when modal opens
    const loadAllUsers = async () => {
        setLoadingUsers(true);
        try {
            const users = await apiRequest<any[]>('/api/users');
            // Filter out existing members
            const memberIds = members.map(m => m.id);
            const availableUsers = (users || []).filter(u => !memberIds.includes(u.id));
            setAllUsers(availableUsers);
        } catch (error) {
            console.log('Load users error:', error);
        } finally {
            setLoadingUsers(false);
        }
    };

    // Add selected users to group
    const handleAddMembers = async () => {
        if (selectedUsers.length === 0) {
            Alert.alert('Thông báo', 'Vui lòng chọn ít nhất một người');
            return;
        }

        try {
            await apiRequest(`/api/groups/${groupId}/members`, {
                method: 'POST',
                body: JSON.stringify({ userIds: selectedUsers })
            });

            // Reload group info
            await loadGroupInfo();
            setShowAddMemberModal(false);
            setSelectedUsers([]);
            Alert.alert('Thành công', 'Đã thêm thành viên vào nhóm');
        } catch (error) {
            Alert.alert('Lỗi', 'Không thể thêm thành viên');
        }
    };

    // Toggle user selection
    const toggleUserSelection = (userId: string) => {
        setSelectedUsers(prev =>
            prev.includes(userId)
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        );
    };

    // Promote member to admin
    const handlePromoteToAdmin = (memberId: string, memberName: string) => {
        if (!isCreator) {
            Alert.alert('Không có quyền', 'Chỉ trưởng nhóm mới có thể phong phó nhóm');
            return;
        }

        Alert.alert(
            'Phong phó nhóm',
            `Bạn có muốn phong ${memberName} làm phó nhóm?`,
            [
                { text: 'Hủy', style: 'cancel' },
                {
                    text: 'Xác nhận',
                    onPress: async () => {
                        try {
                            await apiRequest(`/api/groups/${groupId}/members/${memberId}/role`, {
                                method: 'PUT',
                                body: JSON.stringify({ role: 'admin' })
                            });
                            setMembers(prev => prev.map(m =>
                                m.id === memberId ? { ...m, role: 'admin' } : m
                            ));
                            Alert.alert('Thành công', `Đã phong ${memberName} làm phó nhóm`);
                        } catch (error) {
                            Alert.alert('Lỗi', 'Không thể thay đổi vai trò');
                        }
                    }
                }
            ]
        );
    };

    // Demote admin to member
    const handleDemoteAdmin = (memberId: string, memberName: string) => {
        if (!isCreator) {
            Alert.alert('Không có quyền', 'Chỉ trưởng nhóm mới có thể hạ cấp phó nhóm');
            return;
        }

        Alert.alert(
            'Hạ cấp phó nhóm',
            `Bạn có muốn hạ ${memberName} xuống thành viên?`,
            [
                { text: 'Hủy', style: 'cancel' },
                {
                    text: 'Xác nhận',
                    onPress: async () => {
                        try {
                            await apiRequest(`/api/groups/${groupId}/members/${memberId}/role`, {
                                method: 'PUT',
                                body: JSON.stringify({ role: 'member' })
                            });
                            setMembers(prev => prev.map(m =>
                                m.id === memberId ? { ...m, role: 'member' } : m
                            ));
                            Alert.alert('Thành công', `Đã hạ ${memberName} xuống thành viên`);
                        } catch (error) {
                            Alert.alert('Lỗi', 'Không thể thay đổi vai trò');
                        }
                    }
                }
            ]
        );
    };

    // Delete entire group (creator only)
    const handleDeleteGroup = () => {
        if (!isCreator) {
            Alert.alert('Không có quyền', 'Chỉ trưởng nhóm mới có thể giải tán nhóm');
            return;
        }

        Alert.alert(
            'Giải tán nhóm',
            'Bạn có chắc chắn muốn giải tán nhóm này? Hành động này không thể hoàn tác.',
            [
                { text: 'Hủy', style: 'cancel' },
                {
                    text: 'Giải tán',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await apiRequest(`/api/groups/${groupId}`, { method: 'DELETE' });
                            navigation.navigate('ChatList');
                            Alert.alert('Thành công', 'Đã giải tán nhóm');
                        } catch (error) {
                            Alert.alert('Lỗi', 'Không thể giải tán nhóm');
                        }
                    }
                }
            ]
        );
    };

    // Show member options (for admins)
    const showMemberOptions = (member: Member) => {
        const isMemberCreator = member.id === (groupInfo?.creator_id || creatorId);
        const isMemberAdmin = member.role === 'admin';
        const isMe = member.id === currentUserId;

        if (isMe || isMemberCreator) return; // Can't manage self or creator
        if (!isAdmin) return; // Only admins can manage

        const options: any[] = [{ text: 'Hủy', style: 'cancel' }];

        if (isCreator) {
            if (isMemberAdmin) {
                options.push({
                    text: 'Hạ cấp phó nhóm',
                    onPress: () => handleDemoteAdmin(member.id, member.name)
                });
            } else {
                options.push({
                    text: 'Phong phó nhóm',
                    onPress: () => handlePromoteToAdmin(member.id, member.name)
                });
            }
        }

        options.push({
            text: 'Xóa khỏi nhóm',
            style: 'destructive',
            onPress: () => handleRemoveMember(member.id, member.name)
        });

        Alert.alert(member.name, 'Chọn hành động', options);
    };

    const handleLeaveGroup = () => {
        Alert.alert(
            'Rời nhóm',
            'Bạn có chắc chắn muốn rời khỏi nhóm này?',
            [
                { text: 'Hủy', style: 'cancel' },
                {
                    text: 'Rời nhóm',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await apiRequest(`/api/groups/${groupId}/leave`, { method: 'POST' });
                            navigation.navigate('ChatList');
                        } catch (error) {
                            Alert.alert('Lỗi', 'Không thể rời nhóm');
                        }
                    }
                }
            ]
        );
    };

    const handleRemoveMember = (memberId: string, memberName: string) => {
        if (!isAdmin) return;

        Alert.alert(
            'Xóa thành viên',
            `Bạn có chắc muốn xóa ${memberName} khỏi nhóm?`,
            [
                { text: 'Hủy', style: 'cancel' },
                {
                    text: 'Xóa',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await apiRequest(`/api/groups/${groupId}/members/${memberId}`, { method: 'DELETE' });
                            setMembers(prev => prev.filter(m => m.id !== memberId));
                        } catch (error) {
                            Alert.alert('Lỗi', 'Không thể xóa thành viên');
                        }
                    }
                }
            ]
        );
    };

    const filteredMembers = members.filter(m =>
        m.name?.toLowerCase().includes(searchText.toLowerCase())
    );

    // Sort members: creator first, then admins, then regular members
    const sortedMembers = [...filteredMembers].sort((a, b) => {
        const aIsCreator = a.id === (groupInfo?.creator_id || creatorId);
        const bIsCreator = b.id === (groupInfo?.creator_id || creatorId);
        if (aIsCreator) return -1;
        if (bIsCreator) return 1;
        if (a.role === 'admin' && b.role !== 'admin') return -1;
        if (a.role !== 'admin' && b.role === 'admin') return 1;
        return 0;
    });

    const renderMemberItem = ({ item }: { item: Member }) => {
        const isMemberCreator = item.id === (groupInfo?.creator_id || creatorId);
        const isMemberAdmin = item.role === 'admin';
        const isMe = item.id === currentUserId;

        return (
            <TouchableOpacity
                style={styles.memberItem}
                onPress={() => showMemberOptions(item)}
                onLongPress={() => showMemberOptions(item)}
            >
                <Image
                    source={{ uri: getAvatarUri(item.avatar, item.name) }}
                    style={styles.memberAvatar}
                />
                <View style={styles.memberInfo}>
                    <Text style={styles.memberName} numberOfLines={1}>
                        {item.name} {isMe && '(Bạn)'}
                    </Text>
                    <Text style={styles.memberSubtitle} numberOfLines={1}>
                        {item.email ? item.email.split('@')[0] : item.id?.substring(0, 8) + '...'}
                    </Text>
                </View>
                {isMemberCreator && (
                    <View style={styles.roleBadge}>
                        <Text style={styles.roleBadgeText}>Trưởng nhóm</Text>
                    </View>
                )}
                {!isMemberCreator && isMemberAdmin && (
                    <View style={[styles.roleBadge, { backgroundColor: '#E3F2FD' }]}>
                        <Text style={[styles.roleBadgeText, { color: '#1976D2' }]}>Phó nhóm</Text>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    const renderTabs = () => (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.tabsContainer}
            contentContainerStyle={styles.tabsContent}
        >
            <TouchableOpacity
                style={[styles.tab, activeTab === 'members' && styles.tabActive]}
                onPress={() => setActiveTab('members')}
            >
                <Text style={[styles.tabText, activeTab === 'members' && styles.tabTextActive]}>
                    Thành viên
                </Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.tab, activeTab === 'files' && styles.tabActive]}
                onPress={() => setActiveTab('files')}
            >
                <Text style={[styles.tabText, activeTab === 'files' && styles.tabTextActive]}>
                    Tệp
                </Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.tab, activeTab === 'media' && styles.tabActive]}
                onPress={() => setActiveTab('media')}
            >
                <Text style={[styles.tabText, activeTab === 'media' && styles.tabTextActive]}>
                    Ảnh & Video
                </Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.tab, activeTab === 'links' && styles.tabActive]}
                onPress={() => setActiveTab('links')}
            >
                <Text style={[styles.tabText, activeTab === 'links' && styles.tabTextActive]}>
                    Liên kết
                </Text>
            </TouchableOpacity>
        </ScrollView>
    );

    const renderQuickActions = () => (
        <View style={styles.quickActions}>
            <TouchableOpacity style={styles.quickAction} onPress={() => setShowAddMemberModal(true)}>
                <View style={styles.quickActionIcon}>
                    <Ionicons name="person-add" size={20} color="#fff" />
                </View>
                <Text style={styles.quickActionText}>Thêm</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickAction}>
                <View style={styles.quickActionIcon}>
                    <Ionicons name="search" size={20} color="#fff" />
                </View>
                <Text style={styles.quickActionText}>Tìm kiếm</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickAction}>
                <View style={styles.quickActionIcon}>
                    <Ionicons name="notifications" size={20} color="#fff" />
                </View>
                <Text style={styles.quickActionText}>Bật</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickAction}>
                <View style={styles.quickActionIcon}>
                    <Ionicons name="ellipsis-horizontal" size={20} color="#fff" />
                </View>
                <Text style={styles.quickActionText}>Xem thêm</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />

            {/* Header with light background like Zalo */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>

                {/* Group Avatar */}
                <View style={styles.groupAvatarContainer}>
                    <GroupAvatar
                        members={members}
                        groupAvatar={groupAvatar}
                        groupName={groupName}
                        size={80}
                    />
                    {members.length > 0 && (
                        <View style={styles.memberCountBadge}>
                            <Text style={styles.memberCountText}>{members.length}</Text>
                        </View>
                    )}
                </View>

                {/* Group Name */}
                <Text style={styles.groupName}>{groupName}</Text>
                <Text style={styles.memberCount}>{members.length} thành viên</Text>

                {/* Quick Actions */}
                {renderQuickActions()}
            </View>

            {/* Tabs */}
            {renderTabs()}

            {/* Content */}
            {activeTab === 'members' && (
                <FlatList
                    data={sortedMembers}
                    renderItem={renderMemberItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={[styles.listContent, sortedMembers.length === 0 && { flexGrow: 1 }]}
                    style={{ flex: 1 }}
                    ListHeaderComponent={
                        <View style={styles.searchContainer}>
                            <Ionicons name="search" size={18} color="#999" />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Tìm thành viên"
                                placeholderTextColor="#999"
                                value={searchText}
                                onChangeText={setSearchText}
                                underlineColorAndroid="transparent"
                            />
                        </View>
                    }
                    ListHeaderComponentStyle={{ marginTop: 0 }}
                    ListEmptyComponent={
                        <View style={styles.emptyListContainer}>
                            <Text style={styles.emptyText}>Không có thành viên</Text>
                        </View>
                    }
                />
            )}

            {activeTab === 'files' && (
                <View style={styles.tabContentContainer}>
                    <MaterialIcons name="insert-drive-file" size={60} color="#ccc" />
                    <Text style={styles.emptyText}>Chưa có tệp nào</Text>
                </View>
            )}

            {activeTab === 'media' && (
                <View style={styles.tabContentContainer}>
                    <Ionicons name="images" size={60} color="#ccc" />
                    <Text style={styles.emptyText}>Chưa có ảnh hoặc video</Text>
                </View>
            )}

            {activeTab === 'links' && (
                <View style={styles.tabContentContainer}>
                    <Ionicons name="link" size={60} color="#ccc" />
                    <Text style={styles.emptyText}>Chưa có liên kết nào</Text>
                </View>
            )}

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
                <TouchableOpacity style={styles.leaveButton} onPress={handleLeaveGroup}>
                    <Ionicons name="exit-outline" size={20} color="#ff4444" />
                    <Text style={styles.leaveButtonText}>Rời nhóm</Text>
                </TouchableOpacity>

                {isCreator && (
                    <TouchableOpacity style={[styles.leaveButton, { borderTopWidth: 0 }]} onPress={handleDeleteGroup}>
                        <Ionicons name="trash-outline" size={20} color="#ff4444" />
                        <Text style={styles.leaveButtonText}>Giải tán nhóm</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Add Member Modal */}
            <Modal
                visible={showAddMemberModal}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setShowAddMemberModal(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={() => {
                            setShowAddMemberModal(false);
                            setSelectedUsers([]);
                        }}>
                            <Text style={styles.modalCancelText}>Hủy</Text>
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>Thêm thành viên</Text>
                        <TouchableOpacity onPress={handleAddMembers}>
                            <Text style={[styles.modalCancelText, { color: '#0068FF', fontWeight: '600' }]}>
                                Thêm ({selectedUsers.length})
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.modalSearchContainer}>
                        <Ionicons name="search" size={18} color="#999" />
                        <TextInput
                            style={styles.modalSearchInput}
                            placeholder="Tìm kiếm người dùng"
                            placeholderTextColor="#999"
                            value={userSearchText}
                            onChangeText={setUserSearchText}
                            onFocus={loadAllUsers}
                        />
                    </View>

                    <FlatList
                        data={allUsers.filter(u =>
                            u.name?.toLowerCase().includes(userSearchText.toLowerCase())
                        )}
                        keyExtractor={item => item.id}
                        renderItem={({ item }) => {
                            const isSelected = selectedUsers.includes(item.id);
                            return (
                                <TouchableOpacity
                                    style={styles.userItem}
                                    onPress={() => toggleUserSelection(item.id)}
                                >
                                    <Image
                                        source={{ uri: getAvatarUri(item.avatar, item.name) }}
                                        style={styles.userAvatar}
                                    />
                                    <Text style={styles.userName}>{item.name}</Text>
                                    <View style={[
                                        styles.checkbox,
                                        isSelected && styles.checkboxSelected
                                    ]}>
                                        {isSelected && <Ionicons name="checkmark" size={16} color="#fff" />}
                                    </View>
                                </TouchableOpacity>
                            );
                        }}
                        ListEmptyComponent={
                            <View style={styles.emptyListContainer}>
                                <Text style={styles.emptyText}>
                                    {loadingUsers ? 'Đang tải...' : 'Nhập để tìm kiếm người dùng'}
                                </Text>
                            </View>
                        }
                    />
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        paddingTop: Platform.OS === 'android' ? 40 : 50,
        paddingBottom: 20,
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
    },
    backButton: {
        position: 'absolute',
        top: Platform.OS === 'android' ? 40 : 50,
        left: 16,
        padding: 8,
        zIndex: 10,
    },
    groupAvatarContainer: {
        marginTop: 20,
        position: 'relative',
    },
    memberCountBadge: {
        position: 'absolute',
        bottom: -5,
        right: -5,
        backgroundColor: '#0068FF',
        borderRadius: 12,
        minWidth: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#f5f5f5',
    },
    memberCountText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: 'bold',
    },
    groupName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginTop: 12,
    },
    memberCount: {
        fontSize: 13,
        color: '#666',
        marginTop: 4,
    },
    quickActions: {
        flexDirection: 'row',
        marginTop: 20,
        paddingHorizontal: 20,
    },
    quickAction: {
        alignItems: 'center',
        marginHorizontal: 15,
    },
    quickActionIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#333',
        justifyContent: 'center',
        alignItems: 'center',
    },
    quickActionText: {
        color: '#333',
        fontSize: 12,
        marginTop: 6,
    },
    tabsContainer: {
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    tabsContent: {
        paddingHorizontal: 16,
        paddingVertical: 4,
    },
    tab: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        marginRight: 8,
    },
    tabActive: {
        borderBottomWidth: 2,
        borderBottomColor: '#0068FF',
    },
    tabText: {
        fontSize: 14,
        color: '#666',
    },
    tabTextActive: {
        color: '#0068FF',
        fontWeight: '600',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
        marginTop: 12,
        marginBottom: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        height: 40,
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        fontSize: 15,
        color: '#333',
    },
    listContent: {
        paddingHorizontal: 16,
        paddingTop: 0,
    },
    memberItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 0.5,
        borderBottomColor: '#eee',
    },
    memberAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#e1e1e1',
    },
    memberInfo: {
        flex: 1,
        marginLeft: 12,
    },
    memberName: {
        fontSize: 15,
        fontWeight: '500',
        color: '#333',
    },
    memberSubtitle: {
        fontSize: 13,
        color: '#999',
        marginTop: 2,
    },
    roleBadge: {
        backgroundColor: '#FFF3E0',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    roleBadgeText: {
        fontSize: 11,
        color: '#E65100',
        fontWeight: '600',
    },
    emptyListContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 40,
    },
    tabContentContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 14,
        color: '#999',
        marginTop: 12,
    },
    leaveButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderTopWidth: 1,
        borderTopColor: '#eee',
        backgroundColor: '#fff',
    },
    leaveButtonText: {
        fontSize: 15,
        color: '#ff4444',
        marginLeft: 8,
        fontWeight: '500',
    },
    actionButtons: {
        borderTopWidth: 8,
        borderTopColor: '#f5f5f5',
    },
    // Modal styles
    modalContainer: {
        flex: 1,
        backgroundColor: '#fff',
        paddingTop: Platform.OS === 'android' ? 20 : 0,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    modalTitle: {
        fontSize: 17,
        fontWeight: '600',
        color: '#333',
    },
    modalCancelText: {
        fontSize: 16,
        color: '#666',
    },
    modalSearchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
        marginHorizontal: 16,
        marginVertical: 12,
        paddingHorizontal: 12,
        borderRadius: 8,
        height: 40,
    },
    modalSearchInput: {
        flex: 1,
        marginLeft: 8,
        fontSize: 15,
        color: '#333',
    },
    userItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 0.5,
        borderBottomColor: '#eee',
    },
    userAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#e1e1e1',
    },
    userName: {
        flex: 1,
        marginLeft: 12,
        fontSize: 15,
        color: '#333',
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#ccc',
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxSelected: {
        backgroundColor: '#0068FF',
        borderColor: '#0068FF',
    },
});

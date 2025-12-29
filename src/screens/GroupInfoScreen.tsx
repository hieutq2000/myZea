import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, FlatList,
    StatusBar, Platform, Alert, TextInput, SafeAreaView, Modal, ActivityIndicator
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { getAvatarUri } from '../utils/media';
import { apiRequest, getCurrentUser, uploadImage, getImageUrl } from '../utils/api';
import GroupAvatar from '../components/GroupAvatar';
import { launchImageLibrary } from '../utils/imagePicker';

interface Member {
    id: string;
    name: string;
    avatar?: string;
    email?: string;
    role: string;
}

export default function GroupInfoScreen({ navigation, route }: any) {
    const { groupId, groupName: initialGroupName, groupAvatar: initialGroupAvatar, members: initialMembers, creatorId: paramCreatorId } = route.params;

    const [members, setMembers] = useState<Member[]>(initialMembers || []);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [fetchedCreatorId, setFetchedCreatorId] = useState<string | null>(paramCreatorId || null);
    const [activeTab, setActiveTab] = useState('members');
    const [searchText, setSearchText] = useState('');
    const [isLoading, setIsLoading] = useState(!paramCreatorId); // Only loading if no creatorId passed

    // Edit Group States
    const [isEditModalVisible, setEditModalVisible] = useState(false);
    const [editName, setEditName] = useState(initialGroupName || '');
    const [editAvatar, setEditAvatar] = useState(initialGroupAvatar || '');
    const [isSaving, setSaving] = useState(false);
    const [isUploadingAvatar, setUploadingAvatar] = useState(false);

    // Add Member States  
    const [isAddMemberModalVisible, setAddMemberModalVisible] = useState(false);
    const [addMemberSearch, setAddMemberSearch] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setSearching] = useState(false);
    const [addingMemberId, setAddingMemberId] = useState<string | null>(null);

    // Current group name/avatar for display
    const [displayName, setDisplayName] = useState(initialGroupName || '');
    const [displayAvatar, setDisplayAvatar] = useState(initialGroupAvatar || '');

    // Mute/Pin states
    const [isMuted, setIsMuted] = useState(false);
    const [isPinned, setIsPinned] = useState(false);

    const finalCreatorId = fetchedCreatorId || paramCreatorId;

    useEffect(() => {
        getCurrentUser().then(u => u && setCurrentUserId(u.id));
        loadGroupInfo();
    }, []);

    const loadGroupInfo = async () => {
        try {
            setIsLoading(true);
            const data = await apiRequest<any>(`/api/groups/${groupId}`);
            if (data) {
                if (data.creator_id) setFetchedCreatorId(data.creator_id);
                if (data.members) setMembers(data.members);
                if (data.is_muted !== undefined) setIsMuted(data.is_muted);
                if (data.is_pinned !== undefined) setIsPinned(data.is_pinned);
            }
        } catch (e) {
            console.log(e);
        } finally {
            setIsLoading(false);
        }
    };

    const isMeCreator = currentUserId === finalCreatorId;
    const myRole = members.find(m => m.id === currentUserId)?.role;
    const isMeAdmin = myRole === 'admin' || isMeCreator;

    const sortedMembers = members
        .filter(m => m.name?.toLowerCase().includes(searchText.toLowerCase()))
        .sort((a, b) => {
            const isALeader = a.id === finalCreatorId;
            const isBLeader = b.id === finalCreatorId;

            if (isALeader) return -1;
            if (isBLeader) return 1;

            if (a.role === 'admin' && b.role !== 'admin') return -1;
            if (b.role === 'admin' && a.role !== 'admin') return 1;

            return 0;
        });

    const handlePromote = async (memberId: string, currentRole: string) => {
        const newRole = currentRole === 'admin' ? 'member' : 'admin';
        const actionText = newRole === 'admin' ? 'Phong phó nhóm' : 'Hạ xuống thành viên';

        try {
            await apiRequest(`/api/groups/${groupId}/members/${memberId}/role`, {
                method: 'PUT',
                body: JSON.stringify({ role: newRole })
            });
            setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: newRole } : m));
            Alert.alert('Thành công', `Đã ${actionText} thành công`);
        } catch (e) {
            Alert.alert('Lỗi', 'Không thể thay đổi quyền');
        }
    };

    const handleKick = (memberId: string, memberName: string) => {
        Alert.alert('Xóa thành viên', `Xóa ${memberName} khỏi nhóm?`, [
            { text: 'Hủy', style: 'cancel' },
            {
                text: 'Xóa', style: 'destructive',
                onPress: async () => {
                    try {
                        await apiRequest(`/api/groups/${groupId}/members/${memberId}`, { method: 'DELETE' });
                        setMembers(prev => prev.filter(m => m.id !== memberId));
                    } catch (e) {
                        Alert.alert('Lỗi', 'Không thể xóa thành viên');
                    }
                }
            }
        ]);
    };

    const showMemberOptions = (targetMember: Member) => {
        const isTargetMe = targetMember.id === currentUserId;
        const isTargetCreator = targetMember.id === finalCreatorId;

        if (isTargetMe) return;

        const options: any[] = [];

        if (isMeCreator) {
            options.push({
                text: targetMember.role === 'admin' ? 'Hạ xuống thành viên' : 'Phong phó nhóm',
                onPress: () => handlePromote(targetMember.id, targetMember.role)
            });
            options.push({
                text: 'Xóa khỏi nhóm',
                style: 'destructive',
                onPress: () => handleKick(targetMember.id, targetMember.name)
            });
        }
        else if (isMeAdmin) {
            if (!isTargetCreator && targetMember.role !== 'admin') {
                options.push({
                    text: 'Xóa khỏi nhóm',
                    style: 'destructive',
                    onPress: () => handleKick(targetMember.id, targetMember.name)
                });
            }
        }

        if (options.length > 0) {
            options.push({ text: 'Hủy', style: 'cancel' });
            Alert.alert(targetMember.name, 'Quản lý thành viên', options);
        }
    };

    const handleLeaveGroup = () => {
        const title = isMeCreator ? 'Giải tán nhóm' : 'Rời nhóm';
        const msg = isMeCreator ? 'Bạn là trưởng nhóm. Giải tán nhóm này?' : 'Bạn chắc chắn muốn rời nhóm?';

        Alert.alert(title, msg, [
            { text: 'Hủy', style: 'cancel' },
            {
                text: isMeCreator ? 'Giải tán' : 'Rời nhóm',
                style: 'destructive',
                onPress: async () => {
                    try {
                        const endpoint = isMeCreator ? `/api/groups/${groupId}` : `/api/groups/${groupId}/leave`;
                        const method = isMeCreator ? 'DELETE' : 'POST';
                        await apiRequest(endpoint, { method });
                        navigation.navigate('ChatList');
                    } catch (e) {
                        console.log(e);
                        Alert.alert('Lỗi', 'Không thể thực hiện hành động');
                    }
                }
            }
        ]);
    };

    // Toggle Mute/Pin Functions
    const toggleMute = async () => {
        try {
            const newMuted = !isMuted;
            await apiRequest(`/api/groups/${groupId}/mute`, {
                method: 'POST',
                body: JSON.stringify({ muted: newMuted })
            });
            setIsMuted(newMuted);
        } catch (e) {
            Alert.alert('Lỗi', 'Không thể thay đổi trạng thái thông báo');
        }
    };

    const togglePin = async () => {
        try {
            const newPinned = !isPinned;
            await apiRequest(`/api/groups/${groupId}/pin`, {
                method: 'POST',
                body: JSON.stringify({ pinned: newPinned })
            });
            setIsPinned(newPinned);
        } catch (e) {
            Alert.alert('Lỗi', 'Không thể thay đổi trạng thái ghim');
        }
    };

    // Edit Group Functions
    const openEditModal = () => {
        setEditName(displayName);
        setEditAvatar(displayAvatar);
        setEditModalVisible(true);
    };

    const handlePickAvatar = async () => {
        const result = await launchImageLibrary({ selectionLimit: 1 });
        if (result && result.assets && result.assets.length > 0 && result.assets[0].uri) {
            try {
                setUploadingAvatar(true);
                const uploaded = await uploadImage(result.assets[0].uri);
                setEditAvatar(uploaded.url);
            } catch (error) {
                Alert.alert('Lỗi', 'Không thể upload ảnh');
            } finally {
                setUploadingAvatar(false);
            }
        }
    };

    const handleSaveGroup = async () => {
        if (!editName.trim()) {
            Alert.alert('Lỗi', 'Tên nhóm không được để trống');
            return;
        }

        try {
            setSaving(true);
            await apiRequest(`/api/groups/${groupId}`, {
                method: 'PUT',
                body: JSON.stringify({
                    name: editName.trim(),
                    avatar: editAvatar
                })
            });

            setDisplayName(editName.trim());
            setDisplayAvatar(editAvatar);
            setEditModalVisible(false);
            Alert.alert('Thành công', 'Đã cập nhật thông tin nhóm');
        } catch (error: any) {
            Alert.alert('Lỗi', error.message || 'Không thể cập nhật');
        } finally {
            setSaving(false);
        }
    };

    // Add Member Functions
    const searchUsersToAdd = async (query: string) => {
        if (query.trim().length < 2) {
            setSearchResults([]);
            return;
        }

        try {
            setSearching(true);
            const results = await apiRequest<any[]>(`/api/users/search?q=${encodeURIComponent(query)}`);
            // Filter out existing members
            const existingIds = members.map(m => m.id);
            setSearchResults((results || []).filter(u => !existingIds.includes(u.id)));
        } catch (error) {
            console.log('Search error:', error);
        } finally {
            setSearching(false);
        }
    };

    const handleAddMember = async (userId: string) => {
        try {
            setAddingMemberId(userId);
            await apiRequest(`/api/groups/${groupId}/members`, {
                method: 'POST',
                body: JSON.stringify({ userIds: [userId] })
            });

            // Find the user in search results and add to members
            const user = searchResults.find(u => u.id === userId);
            if (user) {
                setMembers(prev => [...prev, { ...user, role: 'member' }]);
                setSearchResults(prev => prev.filter(u => u.id !== userId));
            }

            Alert.alert('Thành công', 'Đã thêm thành viên');
        } catch (error: any) {
            Alert.alert('Lỗi', error.message || 'Không thể thêm thành viên');
        } finally {
            setAddingMemberId(null);
        }
    };

    const renderMemberItem = ({ item }: { item: Member }) => {
        const isLeader = item.id === finalCreatorId;
        const isAdmin = item.role === 'admin';
        const isMe = item.id === currentUserId;

        let roleText = 'Thành viên';
        let roleColor = '#888';
        let roleWeight: any = 'normal';

        if (isLeader) {
            roleText = 'Trưởng nhóm';
            roleColor = '#E65100'; // Cam đậm
            roleWeight = 'bold';
        } else if (isAdmin) {
            roleText = 'Phó nhóm';
            roleColor = '#1565C0'; // Xanh đậm
            roleWeight = '600';
        }

        const showMenu = !isMe && (isMeCreator || (isMeAdmin && !isLeader && item.role !== 'admin'));

        return (
            <TouchableOpacity
                style={styles.memberItem}
                onPress={() => navigation.navigate('Profile', { userId: item.id })}
                activeOpacity={0.7}
            >
                <Image source={{ uri: getAvatarUri(item.avatar, item.name) }} style={styles.memberAvatar} />
                <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>{item.name} {isMe ? '(Bạn)' : ''}</Text>
                    <Text style={[styles.memberSub, { color: roleColor, fontWeight: roleWeight }]}>{roleText}</Text>
                </View>
                {showMenu && (
                    <TouchableOpacity
                        style={{ padding: 12 }}
                        onPress={(e) => {
                            e.stopPropagation();
                            showMemberOptions(item);
                        }}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Ionicons name="ellipsis-horizontal" size={20} color="#999" />
                    </TouchableOpacity>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />

            <View style={styles.headerSection}>
                <View style={styles.navBar}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color="#333" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Chi tiết nhóm</Text>
                    <View style={{ width: 40 }} />
                </View>

                <View style={styles.groupInfoContainer}>
                    <TouchableOpacity onPress={() => isMeAdmin && setEditModalVisible(true)}>
                        <GroupAvatar members={members} groupAvatar={displayAvatar} groupName={displayName} size={70} />
                        {isMeAdmin && (
                            <View style={styles.editAvatarOverlay}>
                                <Ionicons name="camera" size={16} color="#FFF" />
                            </View>
                        )}
                    </TouchableOpacity>
                    <Text style={styles.groupName}>{displayName}</Text>
                    <Text style={styles.memberCount}>{members.length} thành viên</Text>
                    {isMeAdmin && (
                        <TouchableOpacity style={styles.editNameBtn} onPress={() => setEditModalVisible(true)}>
                            <Ionicons name="pencil" size={14} color="#0084FF" />
                            <Text style={styles.editNameText}>Chỉnh sửa</Text>
                        </TouchableOpacity>
                    )}

                    {/* Quick Actions: Mute & Pin */}
                    <View style={styles.quickActions}>
                        <TouchableOpacity style={styles.quickActionBtn} onPress={toggleMute}>
                            <View style={[styles.quickActionIcon, isMuted && styles.quickActionIconActive]}>
                                <Ionicons name={isMuted ? "notifications-off" : "notifications-outline"} size={20} color={isMuted ? "#FFF" : "#666"} />
                            </View>
                            <Text style={styles.quickActionText}>{isMuted ? "Bật thông báo" : "Tắt thông báo"}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.quickActionBtn} onPress={togglePin}>
                            <View style={[styles.quickActionIcon, isPinned && styles.quickActionIconActive]}>
                                <Ionicons name={isPinned ? "pin" : "pin-outline"} size={20} color={isPinned ? "#FFF" : "#666"} />
                            </View>
                            <Text style={styles.quickActionText}>{isPinned ? "Bỏ ghim" : "Ghim"}</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.tabBar}>
                    {['members', 'files', 'media'].map(tab => (
                        <TouchableOpacity
                            key={tab}
                            style={[styles.tabItem, activeTab === tab && styles.tabActive]}
                            onPress={() => setActiveTab(tab)}
                        >
                            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                                {tab === 'members' ? 'Thành viên' : (tab === 'files' ? 'File' : 'Ảnh/Video')}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            <View style={styles.body}>
                {activeTab === 'members' ? (
                    isLoading ? (
                        <View style={styles.centerView}>
                            <ActivityIndicator size="large" color="#0084FF" />
                        </View>
                    ) : (
                        <FlatList
                            data={sortedMembers}
                            renderItem={renderMemberItem}
                            keyExtractor={item => item.id}
                            contentContainerStyle={styles.listContent}
                            ListHeaderComponent={
                                <View>
                                    <View style={styles.searchBoxContainer}>
                                        <Ionicons name="search" size={18} color="#999" />
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Tìm thành viên trong nhóm"
                                            value={searchText}
                                            onChangeText={setSearchText}
                                        />
                                    </View>
                                    {isMeAdmin && (
                                        <TouchableOpacity
                                            style={styles.addMemberBtn}
                                            onPress={() => {
                                                setAddMemberSearch('');
                                                setSearchResults([]);
                                                setAddMemberModalVisible(true);
                                            }}
                                        >
                                            <View style={styles.addMemberIcon}>
                                                <Ionicons name="person-add" size={20} color="#0084FF" />
                                            </View>
                                            <Text style={styles.addMemberText}>Thêm thành viên</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            }
                        />
                    )) : (
                    <View style={styles.centerView}>
                        <Text style={{ color: '#999' }}>Chưa có dữ liệu</Text>
                    </View>
                )}
            </View>

            <View style={styles.footer}>
                <TouchableOpacity style={styles.leaveBtn} onPress={handleLeaveGroup}>
                    <Ionicons name={isMeCreator ? "trash-outline" : "log-out-outline"} size={20} color="#FF3B30" />
                    <Text style={styles.leaveText}>{isMeCreator ? 'Giải tán nhóm' : 'Rời nhóm'}</Text>
                </TouchableOpacity>
            </View>

            {/* Edit Group Modal */}
            <Modal
                visible={isEditModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setEditModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                                <Text style={styles.modalCancel}>Hủy</Text>
                            </TouchableOpacity>
                            <Text style={styles.modalTitle}>Chỉnh sửa nhóm</Text>
                            <TouchableOpacity onPress={handleSaveGroup} disabled={isSaving}>
                                {isSaving ? (
                                    <ActivityIndicator size="small" color="#0084FF" />
                                ) : (
                                    <Text style={styles.modalSave}>Lưu</Text>
                                )}
                            </TouchableOpacity>
                        </View>

                        <View style={styles.editAvatarSection}>
                            <TouchableOpacity onPress={handlePickAvatar} disabled={isUploadingAvatar}>
                                <View style={styles.editAvatarWrapper}>
                                    {editAvatar ? (
                                        <Image source={{ uri: getImageUrl(editAvatar) }} style={styles.editAvatarImg} />
                                    ) : (
                                        <View style={[styles.editAvatarImg, { backgroundColor: '#E4E6EB', justifyContent: 'center', alignItems: 'center' }]}>
                                            <Ionicons name="people" size={40} color="#999" />
                                        </View>
                                    )}
                                    <View style={styles.cameraOverlay}>
                                        {isUploadingAvatar ? (
                                            <ActivityIndicator size="small" color="#FFF" />
                                        ) : (
                                            <Ionicons name="camera" size={18} color="#FFF" />
                                        )}
                                    </View>
                                </View>
                            </TouchableOpacity>
                            <Text style={styles.editAvatarHint}>Nhấn để thay đổi ảnh nhóm</Text>
                        </View>

                        <View style={styles.editInputGroup}>
                            <Text style={styles.editLabel}>Tên nhóm</Text>
                            <TextInput
                                style={styles.editInput}
                                value={editName}
                                onChangeText={setEditName}
                                placeholder="Nhập tên nhóm"
                            />
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Add Member Modal */}
            <Modal
                visible={isAddMemberModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setAddMemberModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { maxHeight: '80%' }]}>
                        <View style={styles.modalHeader}>
                            <TouchableOpacity onPress={() => setAddMemberModalVisible(false)}>
                                <Text style={styles.modalCancel}>Đóng</Text>
                            </TouchableOpacity>
                            <Text style={styles.modalTitle}>Thêm thành viên</Text>
                            <View style={{ width: 40 }} />
                        </View>

                        <View style={styles.searchBoxContainer}>
                            <Ionicons name="search" size={18} color="#999" />
                            <TextInput
                                style={styles.input}
                                placeholder="Tìm kiếm người dùng..."
                                value={addMemberSearch}
                                onChangeText={(text) => {
                                    setAddMemberSearch(text);
                                    searchUsersToAdd(text);
                                }}
                                autoFocus
                            />
                        </View>

                        {isSearching ? (
                            <View style={styles.centerView}>
                                <ActivityIndicator size="large" color="#0084FF" />
                            </View>
                        ) : searchResults.length > 0 ? (
                            <FlatList
                                data={searchResults}
                                keyExtractor={item => item.id}
                                renderItem={({ item }) => (
                                    <View style={styles.memberItem}>
                                        <Image source={{ uri: getAvatarUri(item.avatar, item.name) }} style={styles.memberAvatar} />
                                        <View style={styles.memberInfo}>
                                            <Text style={styles.memberName}>{item.name}</Text>
                                        </View>
                                        <TouchableOpacity
                                            style={styles.addBtn}
                                            onPress={() => handleAddMember(item.id)}
                                            disabled={addingMemberId === item.id}
                                        >
                                            {addingMemberId === item.id ? (
                                                <ActivityIndicator size="small" color="#FFF" />
                                            ) : (
                                                <Text style={styles.addBtnText}>Thêm</Text>
                                            )}
                                        </TouchableOpacity>
                                    </View>
                                )}
                            />
                        ) : addMemberSearch.length >= 2 ? (
                            <View style={styles.centerView}>
                                <Text style={{ color: '#999' }}>Không tìm thấy người dùng</Text>
                            </View>
                        ) : (
                            <View style={styles.centerView}>
                                <Text style={{ color: '#999' }}>Nhập tên để tìm kiếm</Text>
                            </View>
                        )}
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    headerSection: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
    navBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 50, paddingHorizontal: 10 },
    backBtn: { padding: 8 },
    headerTitle: { fontSize: 16, fontWeight: '600', color: '#333' },
    groupInfoContainer: { alignItems: 'center', paddingVertical: 10 },
    groupName: { fontSize: 18, fontWeight: 'bold', color: '#000', marginTop: 8 },
    memberCount: { fontSize: 13, color: '#666', marginTop: 2 },
    tabBar: { flexDirection: 'row', marginTop: 10, borderTopWidth: 1, borderTopColor: '#f5f5f5' },
    tabItem: { flex: 1, alignItems: 'center', paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
    tabActive: { borderBottomColor: '#0084FF' },
    tabText: { fontSize: 14, color: '#666', fontWeight: '500' },
    tabTextActive: { color: '#0084FF', fontWeight: 'bold' },
    body: { flex: 1, backgroundColor: '#fff' },
    listContent: { paddingBottom: 20 },
    searchBoxContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f2f2f2', margin: 16, paddingHorizontal: 12, height: 40, borderRadius: 8 },
    input: { flex: 1, marginLeft: 8, fontSize: 14, color: '#333' },
    memberItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 16, borderBottomWidth: 0.5, borderBottomColor: '#f0f0f0' },
    memberAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#eee' },
    memberInfo: { flex: 1, marginLeft: 12 },
    memberName: { fontSize: 15, fontWeight: '500', color: '#333' },
    memberSub: { fontSize: 12, color: '#888', marginTop: 2 },
    centerView: { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 100 },
    footer: { padding: 16, borderTopWidth: 1, borderTopColor: '#f0f0f0', backgroundColor: '#fff' },
    leaveBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 12, backgroundColor: '#FFF0F0', borderRadius: 8 },
    leaveText: { marginLeft: 8, color: '#FF3B30', fontWeight: '600' },
    // Edit group header styles
    editAvatarOverlay: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#0084FF', padding: 6, borderRadius: 12 },
    editNameBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 8, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#F0F7FF', borderRadius: 16 },
    editNameText: { marginLeft: 4, color: '#0084FF', fontSize: 13, fontWeight: '500' },
    // Add member button
    addMemberBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: '#f0f0f0' },
    addMemberIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#E7F3FF', justifyContent: 'center', alignItems: 'center' },
    addMemberText: { marginLeft: 12, fontSize: 15, fontWeight: '500', color: '#0084FF' },
    // Modal styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { width: '90%', backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
    modalCancel: { color: '#666', fontSize: 16 },
    modalTitle: { fontSize: 17, fontWeight: '600', color: '#000' },
    modalSave: { color: '#0084FF', fontSize: 16, fontWeight: '600' },
    // Edit avatar section
    editAvatarSection: { alignItems: 'center', paddingVertical: 24 },
    editAvatarWrapper: { position: 'relative' },
    editAvatarImg: { width: 100, height: 100, borderRadius: 50 },
    cameraOverlay: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#0084FF', padding: 8, borderRadius: 16, borderWidth: 2, borderColor: '#fff' },
    editAvatarHint: { marginTop: 12, fontSize: 13, color: '#666' },
    // Edit input
    editInputGroup: { padding: 16 },
    editLabel: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8 },
    editInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, fontSize: 16 },
    // Add button
    addBtn: { backgroundColor: '#0084FF', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16 },
    addBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
    // Quick actions
    quickActions: { flexDirection: 'row', justifyContent: 'center', marginTop: 16, gap: 24 },
    quickActionBtn: { alignItems: 'center' },
    quickActionIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#F2F2F2', justifyContent: 'center', alignItems: 'center' },
    quickActionIconActive: { backgroundColor: '#0084FF' },
    quickActionText: { marginTop: 6, fontSize: 12, color: '#666' }
});

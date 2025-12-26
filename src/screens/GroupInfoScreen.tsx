import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, FlatList,
    StatusBar, Platform, Alert, TextInput, SafeAreaView
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { getAvatarUri } from '../utils/media';
import { apiRequest, getCurrentUser } from '../utils/api';
import GroupAvatar from '../components/GroupAvatar';

interface Member {
    id: string;
    name: string;
    avatar?: string;
    email?: string;
    role: string;
}

export default function GroupInfoScreen({ navigation, route }: any) {
    const { groupId, groupName, groupAvatar, members: initialMembers, creatorId: paramCreatorId } = route.params;

    const [members, setMembers] = useState<Member[]>(initialMembers || []);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [fetchedCreatorId, setFetchedCreatorId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState('members');
    const [searchText, setSearchText] = useState('');

    const finalCreatorId = fetchedCreatorId || paramCreatorId;

    useEffect(() => {
        getCurrentUser().then(u => u && setCurrentUserId(u.id));
        loadGroupInfo();
    }, []);

    const loadGroupInfo = async () => {
        try {
            const data = await apiRequest<any>(`/api/groups/${groupId}`);
            if (data) {
                if (data.creator_id) setFetchedCreatorId(data.creator_id);
                if (data.members) setMembers(data.members);
            }
        } catch (e) {
            console.log(e);
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
                    <GroupAvatar members={members} groupAvatar={groupAvatar} groupName={groupName} size={70} />
                    <Text style={styles.groupName}>{groupName}</Text>
                    <Text style={styles.memberCount}>{members.length} thành viên</Text>
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
                    <FlatList
                        data={sortedMembers}
                        renderItem={renderMemberItem}
                        keyExtractor={item => item.id}
                        contentContainerStyle={styles.listContent}
                        ListHeaderComponent={
                            <View style={styles.searchBoxContainer}>
                                <Ionicons name="search" size={18} color="#999" />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Tìm thành viên trong nhóm"
                                    value={searchText}
                                    onChangeText={setSearchText}
                                />
                            </View>
                        }
                    />
                ) : (
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
    centerView: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    footer: { padding: 16, borderTopWidth: 1, borderTopColor: '#f0f0f0', backgroundColor: '#fff' },
    leaveBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 12, backgroundColor: '#FFF0F0', borderRadius: 8 },
    leaveText: { marginLeft: 8, color: '#FF3B30', fontWeight: '600' }
});

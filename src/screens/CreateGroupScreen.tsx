import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    FlatList,
    Alert,
    ActivityIndicator,
    StatusBar,
    Platform,
    KeyboardAvoidingView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getConversations, apiRequest, getImageUrl } from '../utils/api';
import { getAvatarUri } from '../utils/media';

const BLUE = '#0068FF';

interface User {
    id: string;
    name: string;
    avatar?: string;
}

export default function CreateGroupScreen() {
    const navigation = useNavigation<any>();
    const [groupName, setGroupName] = useState('');
    const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
    const [contacts, setContacts] = useState<User[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        loadContacts();
    }, []);

    const loadContacts = async () => {
        try {
            setLoading(true);
            // Get conversations to extract contacts
            const conversations = await getConversations();
            console.log('CreateGroup - Conversations:', JSON.stringify(conversations?.slice(0, 2)));

            const uniqueUsers: User[] = [];
            const seenIds = new Set<string>();

            conversations.forEach((conv: any) => {
                // Try multiple field name patterns
                const partnerId = conv.partner_id || conv.partnerId;
                const partnerName = conv.name || conv.partnerName || conv.partner_name || 'Người dùng';
                const partnerAvatar = conv.avatar || conv.partnerAvatar || conv.partner_avatar;

                if (partnerId && !seenIds.has(partnerId)) {
                    seenIds.add(partnerId);
                    uniqueUsers.push({
                        id: partnerId,
                        name: partnerName,
                        avatar: partnerAvatar
                    });
                }
            });

            console.log('CreateGroup - Unique users:', uniqueUsers.length);
            setContacts(uniqueUsers);
        } catch (error) {
            console.error('Load contacts error:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleUserSelection = (user: User) => {
        const isSelected = selectedUsers.some(u => u.id === user.id);
        if (isSelected) {
            setSelectedUsers(selectedUsers.filter(u => u.id !== user.id));
        } else {
            setSelectedUsers([...selectedUsers, user]);
        }
    };

    const handleCreateGroup = async () => {
        if (!groupName.trim()) {
            Alert.alert('Thông báo', 'Vui lòng nhập tên nhóm');
            return;
        }
        if (selectedUsers.length < 1) {
            Alert.alert('Thông báo', 'Vui lòng chọn ít nhất 1 thành viên');
            return;
        }

        try {
            setCreating(true);
            console.log('Creating group:', groupName.trim(), 'Members:', selectedUsers.map(u => u.id));

            const response = await apiRequest('/api/groups', {
                method: 'POST',
                body: JSON.stringify({
                    name: groupName.trim(),
                    memberIds: selectedUsers.map(u => u.id)
                })
            }) as { error?: string; id?: string; name?: string; avatar?: string; members?: any[] };

            console.log('Create group response:', JSON.stringify(response));

            if (response.error) {
                Alert.alert('Lỗi', response.error);
                return;
            }

            if (!response.id) {
                console.error('No group ID in response:', response);
                Alert.alert('Lỗi', 'Không nhận được ID nhóm từ server');
                return;
            }

            // Generate default group avatar from members if not provided
            const groupAvatar = response.avatar || null;

            // Navigate to the new group chat
            navigation.replace('ChatDetail', {
                conversationId: undefined,
                partnerId: undefined,
                groupId: response.id,
                userName: response.name || groupName.trim(),
                avatar: groupAvatar,
                isGroup: true,
                members: response.members || selectedUsers
            });

        } catch (error: any) {
            console.error('Create group error:', error);
            const errorMessage = error?.message || 'Không thể tạo nhóm. Vui lòng thử lại.';
            Alert.alert('Lỗi', errorMessage);
        } finally {
            setCreating(false);
        }
    };

    const filteredContacts = contacts.filter(user =>
        user.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const renderUserItem = ({ item }: { item: User }) => {
        const isSelected = selectedUsers.some(u => u.id === item.id);

        return (
            <TouchableOpacity
                style={styles.userItem}
                onPress={() => toggleUserSelection(item)}
                activeOpacity={0.7}
            >
                <View style={styles.userInfo}>
                    {item.avatar ? (
                        <Image
                            source={{ uri: getAvatarUri(item.avatar, item.name) }}
                            style={styles.avatar}
                        />
                    ) : (
                        <View style={[styles.avatar, styles.avatarPlaceholder]}>
                            <Text style={styles.avatarText}>
                                {item.name?.[0]?.toUpperCase() || '?'}
                            </Text>
                        </View>
                    )}
                    <Text style={styles.userName}>{item.name}</Text>
                </View>

                <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                    {isSelected && (
                        <Ionicons name="checkmark" size={16} color="#fff" />
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Tạo nhóm mới</Text>
                <TouchableOpacity
                    style={[styles.createButton, (!groupName.trim() || selectedUsers.length < 1) && styles.createButtonDisabled]}
                    onPress={handleCreateGroup}
                    disabled={!groupName.trim() || selectedUsers.length < 1 || creating}
                >
                    {creating ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <Text style={styles.createButtonText}>Tạo</Text>
                    )}
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                {/* Group Name Input */}
                <View style={styles.groupNameSection}>
                    <View style={styles.groupIconContainer}>
                        <Ionicons name="people" size={28} color={BLUE} />
                    </View>
                    <TextInput
                        style={styles.groupNameInput}
                        placeholder="Tên nhóm"
                        placeholderTextColor="#999"
                        value={groupName}
                        onChangeText={setGroupName}
                        maxLength={50}
                    />
                </View>

                {/* Selected Users */}
                {selectedUsers.length > 0 && (
                    <View style={styles.selectedSection}>
                        <Text style={styles.sectionLabel}>
                            Đã chọn ({selectedUsers.length})
                        </Text>
                        <FlatList
                            horizontal
                            data={selectedUsers}
                            keyExtractor={item => item.id}
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.selectedList}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.selectedUser}
                                    onPress={() => toggleUserSelection(item)}
                                >
                                    {item.avatar ? (
                                        <Image
                                            source={{ uri: getAvatarUri(item.avatar, item.name) }}
                                            style={styles.selectedAvatar}
                                        />
                                    ) : (
                                        <View style={[styles.selectedAvatar, styles.avatarPlaceholder]}>
                                            <Text style={styles.avatarTextSmall}>
                                                {item.name?.[0]?.toUpperCase()}
                                            </Text>
                                        </View>
                                    )}
                                    <View style={styles.removeButton}>
                                        <Ionicons name="close" size={12} color="#fff" />
                                    </View>
                                    <Text style={styles.selectedName} numberOfLines={1}>
                                        {item.name.split(' ').pop()}
                                    </Text>
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                )}

                {/* Search */}
                <View style={styles.searchSection}>
                    <View style={styles.searchContainer}>
                        <Ionicons name="search" size={20} color="#999" />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Tìm kiếm liên hệ..."
                            placeholderTextColor="#999"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery('')}>
                                <Ionicons name="close-circle" size={20} color="#999" />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* Contacts List */}
                <View style={styles.contactsSection}>
                    <Text style={styles.sectionLabel}>Liên hệ gần đây</Text>
                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color={BLUE} />
                        </View>
                    ) : filteredContacts.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="people-outline" size={48} color="#ccc" />
                            <Text style={styles.emptyText}>
                                {searchQuery ? 'Không tìm thấy liên hệ' : 'Chưa có liên hệ nào'}
                            </Text>
                        </View>
                    ) : (
                        <FlatList
                            data={filteredContacts}
                            keyExtractor={item => item.id}
                            renderItem={renderUserItem}
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={styles.contactsList}
                        />
                    )}
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#000',
    },
    createButton: {
        backgroundColor: BLUE,
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 20,
        minWidth: 60,
        alignItems: 'center',
    },
    createButtonDisabled: {
        backgroundColor: '#ccc',
    },
    createButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 15,
    },
    groupNameSection: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderBottomWidth: 8,
        borderBottomColor: '#f5f5f5',
    },
    groupIconContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#E8F4FF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    groupNameInput: {
        flex: 1,
        fontSize: 17,
        color: '#000',
        paddingVertical: 8,
    },
    selectedSection: {
        paddingTop: 12,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    sectionLabel: {
        fontSize: 13,
        color: '#666',
        fontWeight: '500',
        paddingHorizontal: 16,
        marginBottom: 8,
    },
    selectedList: {
        paddingHorizontal: 12,
    },
    selectedUser: {
        alignItems: 'center',
        marginHorizontal: 6,
        width: 60,
    },
    selectedAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
    },
    removeButton: {
        position: 'absolute',
        top: 0,
        right: 6,
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: '#ff4444',
        justifyContent: 'center',
        alignItems: 'center',
    },
    selectedName: {
        fontSize: 12,
        color: '#333',
        marginTop: 4,
        textAlign: 'center',
    },
    searchSection: {
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
        borderRadius: 10,
        paddingHorizontal: 12,
        height: 40,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        color: '#000',
        marginLeft: 8,
    },
    contactsSection: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingBottom: 50,
    },
    emptyText: {
        fontSize: 15,
        color: '#999',
        marginTop: 12,
    },
    contactsList: {
        paddingBottom: 20,
    },
    userItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        marginRight: 12,
    },
    avatarPlaceholder: {
        backgroundColor: '#A0AEC0',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
    avatarTextSmall: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    userName: {
        fontSize: 16,
        color: '#000',
        fontWeight: '500',
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
        backgroundColor: BLUE,
        borderColor: BLUE,
    },
});

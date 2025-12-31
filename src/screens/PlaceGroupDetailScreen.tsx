import React, { useState, useEffect, useRef } from 'react';
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
    TextInput,
    Alert,
    ScrollView,
    Modal,
    KeyboardAvoidingView,
    Animated,
    Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { apiRequest, createGroupPost, uploadImage, getCurrentUser, Post, getImageUrl, toggleLikePost } from '../utils/api';
import { launchImageLibrary } from '../utils/imagePicker';
import InAppBrowser from '../components/InAppBrowser';
import TextWithSeeMore from '../components/TextWithSeeMore';
import VideoPlayer from '../components/VideoPlayer';
import PhotoGrid from '../components/PhotoGrid';
import PostCard from '../components/PostCard';
import { formatTime } from '../utils/formatTime';
import { isVideo, getUri, getAvatarUri } from '../utils/media';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface GroupDetail {
    id: string;
    name: string;
    description?: string;
    avatar?: string;
    coverImage?: string;
    privacy: 'public' | 'private' | 'secret';
    memberCount: number;
    isMember: boolean;
    myRole?: string;
    isPinned: boolean;
    previewMembers: Array<{ id: string; name: string; avatar?: string }>;
}

interface PlaceGroupDetailScreenProps {
    groupId: string;
    onBack: () => void;
}

interface GroupMember {
    id: string;
    name: string;
    avatar?: string;
    role: 'admin' | 'moderator' | 'member';
    joinedAt: string;
}

interface MembersData {
    totalCount: number;
    myRole: string | null;
    isAdmin: boolean;
    adminsAndModerators: GroupMember[];
    newMembers: GroupMember[];
    allMembers: GroupMember[];
}

const formatMemberCount = (count: number): string => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return `${count}`;
};

const getPrivacyLabel = (privacy: string): string => {
    switch (privacy) {
        case 'public': return 'Nhóm công khai';
        case 'private': return 'Nhóm riêng tư';
        case 'secret': return 'Nhóm bí mật';
        default: return 'Nhóm';
    }
};


export default function PlaceGroupDetailScreen({ groupId, onBack }: PlaceGroupDetailScreenProps) {
    const [group, setGroup] = useState<GroupDetail | null>(null);
    const [posts, setPosts] = useState<Post[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState('posts');
    const [browserUrl, setBrowserUrl] = useState<string | null>(null);
    const [isBrowserVisible, setBrowserVisible] = useState(false);

    // Post Creation State
    const [isPostModalVisible, setPostModalVisible] = useState(false);
    const [newPostContent, setNewPostContent] = useState('');
    const [newPostImages, setNewPostImages] = useState<string[]>([]);
    const [isPosting, setIsPosting] = useState(false);
    const [currentUser, setCurrentUser] = useState<any>(null);

    // Reaction State for PostCard
    const [localReactions, setLocalReactions] = useState<{ [postId: string]: string }>({});
    const navigation = useNavigation<any>();

    // Members Modal State
    const [isMembersModalVisible, setMembersModalVisible] = useState(false);
    const [membersData, setMembersData] = useState<MembersData | null>(null);
    const [isMembersLoading, setMembersLoading] = useState(false);
    const [memberSearchQuery, setMemberSearchQuery] = useState('');

    // Safe Area Insets for Modal
    const insets = useSafeAreaInsets();

    // Animated Header State
    const scrollY = useRef(new Animated.Value(0)).current;
    const HEADER_SCROLL_THRESHOLD = 200; // Khi cuộn qua 200px sẽ hiện header thu gọn

    // Calculate header opacity based on scroll
    const headerOpacity = scrollY.interpolate({
        inputRange: [0, HEADER_SCROLL_THRESHOLD - 50, HEADER_SCROLL_THRESHOLD],
        outputRange: [0, 0, 1],
        extrapolate: 'clamp',
    });

    const headerBgOpacity = scrollY.interpolate({
        inputRange: [0, HEADER_SCROLL_THRESHOLD - 50, HEADER_SCROLL_THRESHOLD],
        outputRange: [0, 0.5, 1],
        extrapolate: 'clamp',
    });

    const openLink = (url: string) => {
        setBrowserUrl(url);
        setBrowserVisible(true);
    };

    useEffect(() => {
        fetchCurrentUser();
        loadGroupData();
    }, [groupId]);

    const fetchCurrentUser = async () => {
        const user = await getCurrentUser();
        setCurrentUser(user);
    };

    const handlePickImage = async () => {
        const result = await launchImageLibrary({ mediaType: 'mixed', quality: 0.8, selectionLimit: 10 });
        if (!result.didCancel && !result.error && result.assets) {
            const uris = result.assets.map((a: any) => a.uri);
            setNewPostImages(prev => [...prev, ...uris]);
        }
    };

    const handleCreatePost = async () => {
        if (!newPostContent.trim() && newPostImages.length === 0) return;
        setIsPosting(true);
        try {
            const uploadedImages: any[] = [];
            for (const imgUri of newPostImages) {
                const result = await uploadImage(imgUri);
                uploadedImages.push({
                    uri: result.url,
                    width: result.width,
                    height: result.height
                });
            }

            const newPost = await createGroupPost(groupId, newPostContent, uploadedImages);

            // Add to top of list
            setPosts([newPost, ...posts]);

            // Reset and close
            setNewPostContent('');
            setNewPostImages([]);
            setPostModalVisible(false);
        } catch (error) {
            console.error('Create group post error:', error);
            Alert.alert('Lỗi', 'Không thể đăng bài viết');
        } finally {
            setIsPosting(false);
        }
    };

    const loadGroupData = async () => {
        try {
            const [groupData, postsData] = await Promise.all([
                apiRequest<GroupDetail>(`/api/place/groups/${groupId}`),
                apiRequest<Post[]>(`/api/place/groups/${groupId}/posts`)
            ]);
            setGroup(groupData);
            setPosts(postsData);

            // Initialize localReactions from server data
            const newReactions: { [postId: string]: string } = {};
            postsData.forEach(post => {
                if (post.isLiked) {
                    newReactions[post.id] = 'like';
                }
            });
            setLocalReactions(newReactions);
        } catch (error) {
            console.error('Load group error:', error);
            Alert.alert('Lỗi', 'Không thể tải thông tin nhóm');
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    const handleRefresh = () => {
        setIsRefreshing(true);
        loadGroupData();
    };

    const handleJoinLeave = async () => {
        if (!group) return;

        try {
            if (group.isMember) {
                await apiRequest(`/api/place/groups/${groupId}/leave`, { method: 'POST' });
                setGroup(prev => prev ? { ...prev, isMember: false, memberCount: prev.memberCount - 1 } : null);
            } else {
                await apiRequest(`/api/place/groups/${groupId}/join`, { method: 'POST' });
                setGroup(prev => prev ? { ...prev, isMember: true, memberCount: prev.memberCount + 1 } : null);
            }
        } catch (error) {
            Alert.alert('Lỗi', 'Không thể thực hiện thao tác');
        }
    };

    const loadMembers = async (search?: string) => {
        try {
            setMembersLoading(true);
            const searchParam = search ? `?search=${encodeURIComponent(search)}` : '';
            const data = await apiRequest<MembersData>(`/api/place/groups/${groupId}/members${searchParam}`);
            setMembersData(data);
        } catch (error) {
            console.error('Load members error:', error);
            Alert.alert('Lỗi', 'Không thể tải danh sách thành viên');
        } finally {
            setMembersLoading(false);
        }
    };

    const openMembersModal = () => {
        setMembersModalVisible(true);
        setMemberSearchQuery('');
        loadMembers();
    };

    const getRoleLabel = (role: string): string => {
        switch (role) {
            case 'admin': return 'Quản trị viên';
            case 'moderator': return 'Người kiểm duyệt';
            default: return '';
        }
    };

    // Invite Modal State
    const [isInviteModalVisible, setInviteModalVisible] = useState(false);
    const [inviteSearchQuery, setInviteSearchQuery] = useState('');
    const [inviteSearchResults, setInviteSearchResults] = useState<Array<{ id: string; name: string; avatar?: string }>>([]);
    const [isInviting, setIsInviting] = useState<string | null>(null);

    // Member Action State
    const [selectedMember, setSelectedMember] = useState<GroupMember | null>(null);
    const [isMemberActionVisible, setMemberActionVisible] = useState(false);

    // Edit Group Modal State
    const [isEditGroupModalVisible, setEditGroupModalVisible] = useState(false);
    const [editName, setEditName] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [editPrivacy, setEditPrivacy] = useState<'public' | 'private' | 'secret'>('public');
    const [editCoverImage, setEditCoverImage] = useState('');
    const [editAvatar, setEditAvatar] = useState('');
    const [isSavingGroup, setSavingGroup] = useState(false);

    // Mute Notification State
    const [isMuted, setIsMuted] = useState(false);

    // Load mute status on mount
    useEffect(() => {
        loadMuteStatus();
    }, [groupId]);

    const loadMuteStatus = async () => {
        try {
            const mutedGroups = await AsyncStorage.getItem('mutedGroups');
            if (mutedGroups) {
                const parsed = JSON.parse(mutedGroups);
                setIsMuted(parsed.includes(groupId));
            }
        } catch (e) {
            console.log('Error loading mute status');
        }
    };

    const toggleMuteGroup = async () => {
        try {
            const mutedGroups = await AsyncStorage.getItem('mutedGroups');
            let parsed = mutedGroups ? JSON.parse(mutedGroups) : [];

            if (isMuted) {
                // Unmute - remove from list
                parsed = parsed.filter((id: string) => id !== groupId);
                Alert.alert('Đã bật thông báo', 'Bạn sẽ nhận thông báo từ nhóm này');
            } else {
                // Mute - add to list
                parsed.push(groupId);
                Alert.alert('Đã tắt thông báo', 'Bạn sẽ không nhận thông báo từ nhóm này');
            }

            await AsyncStorage.setItem('mutedGroups', JSON.stringify(parsed));
            setIsMuted(!isMuted);
        } catch (e) {
            console.log('Error toggling mute');
            Alert.alert('Lỗi', 'Không thể thay đổi cài đặt thông báo');
        }
    };

    const openEditGroupModal = () => {
        if (!group) return;
        setEditName(group.name);
        setEditDescription(group.description || '');
        setEditPrivacy(group.privacy);
        setEditCoverImage(group.coverImage || '');
        setEditAvatar(group.avatar || '');
        setEditGroupModalVisible(true);
    };

    const handleSaveGroup = async () => {
        if (!editName.trim()) {
            Alert.alert('Lỗi', 'Tên nhóm không được để trống');
            return;
        }

        try {
            setSavingGroup(true);
            const response = await apiRequest<{ success: boolean; group: any }>(`/api/place/groups/${groupId}`, {
                method: 'PUT',
                body: JSON.stringify({
                    name: editName.trim(),
                    description: editDescription,
                    privacy: editPrivacy,
                    coverImage: editCoverImage,
                    avatar: editAvatar
                })
            });

            if (response.success) {
                // Update local group state
                setGroup(prev => prev ? {
                    ...prev,
                    name: response.group.name,
                    description: response.group.description,
                    privacy: response.group.privacy,
                    coverImage: response.group.coverImage,
                    avatar: response.group.avatar
                } : null);

                setEditGroupModalVisible(false);
                Alert.alert('Thành công', 'Đã cập nhật thông tin nhóm');
            }
        } catch (error: any) {
            Alert.alert('Lỗi', error.message || 'Không thể cập nhật nhóm');
        } finally {
            setSavingGroup(false);
        }
    };

    const handleDeleteGroup = () => {
        Alert.alert(
            'Xóa nhóm',
            'Bạn có chắc chắn muốn xóa nhóm này? Hành động này không thể hoàn tác.',
            [
                { text: 'Hủy', style: 'cancel' },
                {
                    text: 'Xóa',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await apiRequest(`/api/place/groups/${groupId}`, {
                                method: 'DELETE'
                            });
                            Alert.alert('Thành công', 'Đã xóa nhóm');
                            onBack();
                        } catch (error: any) {
                            Alert.alert('Lỗi', error.message || 'Không thể xóa nhóm');
                        }
                    }
                }
            ]
        );
    };

    // Image upload loading state
    const [isUploadingCover, setUploadingCover] = useState(false);
    const [isUploadingAvatar, setUploadingAvatar] = useState(false);

    const pickEditCoverImage = async () => {
        console.log('📷 Picking cover image...');
        const result = await launchImageLibrary({ selectionLimit: 1 });
        console.log('📷 Image picker result:', result);

        if (result && result.assets && result.assets.length > 0) {
            try {
                setUploadingCover(true);
                console.log('📷 Uploading cover image:', result.assets[0]);
                const uploaded = await uploadImage(result.assets[0].uri);
                console.log('📷 Upload result:', uploaded);
                setEditCoverImage(uploaded.url);
                Alert.alert('Thành công', 'Đã tải ảnh bìa lên');
            } catch (error: any) {
                console.error('📷 Upload error:', error);
                Alert.alert('Lỗi', error.message || 'Không thể upload ảnh');
            } finally {
                setUploadingCover(false);
            }
        }
    };

    const pickEditAvatar = async () => {
        console.log('📷 Picking avatar...');
        const result = await launchImageLibrary({ selectionLimit: 1 });
        console.log('📷 Image picker result:', result);

        if (result && result.assets && result.assets.length > 0) {
            try {
                setUploadingAvatar(true);
                console.log('📷 Uploading avatar:', result.assets[0]);
                const uploaded = await uploadImage(result.assets[0].uri);
                console.log('📷 Upload result:', uploaded);
                setEditAvatar(uploaded.url);
                Alert.alert('Thành công', 'Đã tải avatar lên');
            } catch (error: any) {
                console.error('📷 Upload error:', error);
                Alert.alert('Lỗi', error.message || 'Không thể upload ảnh');
            } finally {
                setUploadingAvatar(false);
            }
        }
    };

    const searchUsersToInvite = async (query: string) => {
        if (query.trim().length < 2) {
            setInviteSearchResults([]);
            return;
        }
        try {
            const results = await apiRequest<Array<{ id: string; name: string; avatar?: string }>>(
                `/api/place/groups/${groupId}/invite-search?q=${encodeURIComponent(query)}`
            );
            setInviteSearchResults(results);
        } catch (error) {
            console.error('Search users error:', error);
        }
    };

    const handleInviteUser = async (targetUserId: string) => {
        try {
            setIsInviting(targetUserId);
            await apiRequest(`/api/place/groups/${groupId}/members`, {
                method: 'POST',
                body: JSON.stringify({ targetUserId })
            });

            // Remove from search results
            setInviteSearchResults(prev => prev.filter(u => u.id !== targetUserId));

            // Refresh members and group data
            loadMembers();
            loadGroupData();

            Alert.alert('Thành công', 'Đã thêm thành viên vào nhóm');
        } catch (error: any) {
            Alert.alert('Lỗi', error.message || 'Không thể thêm thành viên');
        } finally {
            setIsInviting(null);
        }
    };

    const handleRemoveMember = async (memberId: string) => {
        Alert.alert(
            'Xác nhận',
            'Bạn có chắc muốn xóa thành viên này khỏi nhóm?',
            [
                { text: 'Hủy', style: 'cancel' },
                {
                    text: 'Xóa',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await apiRequest(`/api/place/groups/${groupId}/members/${memberId}`, {
                                method: 'DELETE'
                            });
                            loadMembers();
                            loadGroupData();
                            setMemberActionVisible(false);
                            Alert.alert('Thành công', 'Đã xóa thành viên');
                        } catch (error: any) {
                            Alert.alert('Lỗi', error.message || 'Không thể xóa thành viên');
                        }
                    }
                }
            ]
        );
    };

    const handleChangeRole = async (memberId: string, newRole: string) => {
        try {
            await apiRequest(`/api/place/groups/${groupId}/members/${memberId}/role`, {
                method: 'PUT',
                body: JSON.stringify({ role: newRole })
            });
            loadMembers();
            setMemberActionVisible(false);
            Alert.alert('Thành công', 'Đã cập nhật vai trò');
        } catch (error: any) {
            Alert.alert('Lỗi', error.message || 'Không thể cập nhật vai trò');
        }
    };

    const openMemberActions = (member: GroupMember) => {
        setSelectedMember(member);
        setMemberActionVisible(true);
    };

    const renderPost = ({ item }: { item: Post }) => (
        <PostCard
            post={item}
            currentUser={currentUser}
            localReaction={localReactions[item.id]}
            onReaction={async (postId, reactionId) => {
                const currentReaction = localReactions[postId];
                const isUnlike = currentReaction === reactionId || reactionId === null;

                setLocalReactions(prev => {
                    const newState = { ...prev };
                    if (isUnlike || !reactionId) delete newState[postId];
                    else newState[postId] = reactionId;
                    return newState;
                });

                setPosts(prev => prev.map(p => {
                    if (p.id === postId) {
                        const wasLiked = !!currentReaction;
                        let newLikes = p.likes;
                        if (!wasLiked && !isUnlike && reactionId) newLikes++;
                        if (wasLiked && isUnlike) newLikes--;
                        return { ...p, likes: newLikes, isLiked: !isUnlike && !!reactionId };
                    }
                    return p;
                }));

                try {
                    await toggleLikePost(postId);
                } catch (error) {
                    console.error('Reaction error', error);
                }
            }}
            onComment={(post) => navigation.navigate('PostDetail', { postId: post.id, post })}
            onShare={(post) => { /* TODO: Implement share modal */ }}
            onViewProfile={(targetUser) => { /* TODO: Implement profile view */ }}
            onImagePress={(post, index) => { /* TODO: Implement image viewer */ }}
            onLinkPress={openLink}
        />
    );

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#F97316" />
            </View>
        );
    }

    if (!group) {
        return (
            <View style={styles.loadingContainer}>
                <Text>Không tìm thấy nhóm</Text>
            </View>
        );
    }

    const coverUri = group.coverImage ? getImageUrl(group.coverImage) : 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&q=80';
    const avatarUri = getAvatarUri(group.avatar, group.name);

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

            {/* Sticky Animated Header - Always visible */}
            <Animated.View style={[
                styles.stickyHeader,
                {
                    backgroundColor: headerBgOpacity.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['transparent', '#FFFFFF'],
                    }),
                }
            ]}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Animated.View style={{
                        backgroundColor: headerBgOpacity.interpolate({
                            inputRange: [0, 1],
                            outputRange: ['rgba(0,0,0,0.3)', 'transparent'],
                        }),
                        borderRadius: 20,
                        width: 40,
                        height: 40,
                        justifyContent: 'center',
                        alignItems: 'center',
                    }}>
                        <Animated.Text style={{
                            color: headerBgOpacity.interpolate({
                                inputRange: [0, 1],
                                outputRange: ['#FFFFFF', '#333333'],
                            }),
                        }}>
                            <Ionicons name="arrow-back" size={24} />
                        </Animated.Text>
                    </Animated.View>
                </TouchableOpacity>

                {/* Group Name - Chỉ hiển thị khi cuộn */}
                <Animated.Text
                    style={[
                        styles.stickyHeaderTitle,
                        { opacity: headerOpacity }
                    ]}
                    numberOfLines={1}
                >
                    {group.name}
                </Animated.Text>

                {/* Right side icons */}
                <Animated.View style={{
                    flexDirection: 'row',
                    opacity: headerOpacity,
                }}>
                    <TouchableOpacity style={styles.headerIconButton}>
                        <Ionicons name="search" size={22} color="#333" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.headerIconButton}>
                        <Ionicons name="ellipsis-horizontal" size={22} color="#333" />
                    </TouchableOpacity>
                </Animated.View>

                {/* Placeholder for right side when not scrolled */}
                <Animated.View style={{
                    width: 80,
                    opacity: headerOpacity.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 0],
                    }),
                    position: 'absolute',
                    right: 16,
                }} />
            </Animated.View>

            <Animated.FlatList
                data={posts}
                extraData={localReactions}
                keyExtractor={item => item.id}
                renderItem={renderPost}
                refreshControl={
                    <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
                }
                contentContainerStyle={styles.listContent}
                removeClippedSubviews={Platform.OS === 'android'}
                initialNumToRender={5}
                maxToRenderPerBatch={5}
                windowSize={5}
                showsVerticalScrollIndicator={false}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                    { useNativeDriver: false }
                )}
                scrollEventThrottle={16}
                ListHeaderComponent={() => (
                    <View>
                        {/* Cover Image */}
                        <Image source={{ uri: coverUri }} style={styles.coverImage} />

                        {/* Group Info */}
                        <View style={styles.groupInfoContainer}>
                            <Image source={{ uri: avatarUri }} style={styles.groupAvatar} />

                            <View style={styles.groupDetails}>
                                <Text style={styles.groupName}>{group.name}</Text>
                                <Text style={styles.groupPrivacy}>
                                    {getPrivacyLabel(group.privacy)}
                                </Text>

                                {/* Member count with avatars - Clickable to show members */}
                                <TouchableOpacity
                                    style={styles.memberRow}
                                    onPress={openMembersModal}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.memberAvatars}>
                                        {group.previewMembers.slice(0, 3).map((member, index) => (
                                            <Image
                                                key={member.id}
                                                source={{ uri: getAvatarUri(member.avatar, member.name) }}
                                                style={[styles.memberAvatarSmall, { marginLeft: index > 0 ? -8 : 0 }]}
                                            />
                                        ))}
                                    </View>
                                    <Text style={styles.memberCount}>
                                        {formatMemberCount(group.memberCount)} thành viên
                                    </Text>
                                    <Ionicons name="chevron-forward" size={16} color="#999" style={{ marginLeft: 4 }} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Action Buttons */}
                        <View style={styles.actionButtons}>
                            <TouchableOpacity
                                style={[styles.joinButton, group.isMember && styles.joinedButton]}
                                onPress={handleJoinLeave}
                            >
                                <Ionicons
                                    name={group.isMember ? 'checkmark' : 'add'}
                                    size={18}
                                    color={group.isMember ? '#666' : '#FFF'}
                                />
                                <Text style={[styles.joinButtonText, group.isMember && styles.joinedButtonText]}>
                                    {group.isMember ? 'Đã tham gia' : 'Tham gia'}
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.inviteButton}>
                                <Ionicons name="person-add" size={18} color="#FFF" />
                                <Text style={styles.inviteButtonText}>Thêm người</Text>
                            </TouchableOpacity>

                            {/* Edit Button - Only for Admin */}
                            {group.myRole === 'admin' && (
                                <TouchableOpacity
                                    style={styles.editGroupButton}
                                    onPress={openEditGroupModal}
                                >
                                    <Ionicons name="settings-outline" size={18} color="#666" />
                                </TouchableOpacity>
                            )}

                            {/* Mute Notification Button - Show for members */}
                            {group.isMember && (
                                <TouchableOpacity
                                    style={[styles.editGroupButton, isMuted && { backgroundColor: '#FEE2E2' }]}
                                    onPress={toggleMuteGroup}
                                >
                                    <Ionicons
                                        name={isMuted ? 'notifications-off' : 'notifications-outline'}
                                        size={18}
                                        color={isMuted ? '#EF4444' : '#666'}
                                    />
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Tabs */}
                        <View style={styles.tabsContainer}>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                {['posts', 'files', 'pinned', 'topics', 'media'].map(tab => (
                                    <TouchableOpacity
                                        key={tab}
                                        style={[styles.tab, activeTab === tab && styles.activeTab]}
                                        onPress={() => setActiveTab(tab)}
                                    >
                                        <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                                            {tab === 'posts' ? 'Bài viết' :
                                                tab === 'files' ? 'File' :
                                                    tab === 'pinned' ? 'Đã ghim' :
                                                        tab === 'topics' ? 'Chủ đề' : 'Phương tiện'}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>

                        {/* Composer - Only show if user is a member */}
                        {group.isMember ? (
                            <TouchableOpacity
                                style={styles.composer}
                                activeOpacity={0.9}
                                onPress={() => setPostModalVisible(true)}
                            >
                                <View style={[styles.composerInput, { justifyContent: 'center' }]}>
                                    <Text style={{ color: '#999' }}>Bạn đang nghĩ gì?</Text>
                                </View>
                                <View style={styles.composerActions}>
                                    <TouchableOpacity style={styles.composerAction}>
                                        <MaterialCommunityIcons name="poll" size={22} color="#666" />
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.composerAction} onPress={handlePickImage}>
                                        <Ionicons name="image-outline" size={22} color="#666" />
                                    </TouchableOpacity>
                                </View>
                            </TouchableOpacity>
                        ) : (
                            <View style={styles.joinPrompt}>
                                <Ionicons name="lock-closed-outline" size={20} color="#666" />
                                <Text style={styles.joinPromptText}>Tham gia nhóm để đăng bài viết</Text>
                            </View>
                        )}

                        {/* Section Header */}
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Bài viết</Text>
                        </View>
                    </View>
                )}
                ListEmptyComponent={() => (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="document-text-outline" size={50} color="#CCC" />
                        <Text style={styles.emptyText}>Chưa có bài viết nào</Text>
                    </View>
                )}
            />
            <InAppBrowser
                visible={isBrowserVisible}
                url={browserUrl}
                onClose={() => setBrowserVisible(false)}
            />

            {/* Members Modal */}
            <Modal
                visible={isMembersModalVisible}
                animationType="slide"
                transparent={false}
                onRequestClose={() => setMembersModalVisible(false)}
            >
                <View style={{ flex: 1, backgroundColor: '#FFF', paddingTop: insets.top }}>
                    {/* Header */}
                    <View style={styles.membersModalHeader}>
                        <TouchableOpacity onPress={() => setMembersModalVisible(false)}>
                            <Ionicons name="arrow-back" size={24} color="#333" />
                        </TouchableOpacity>
                        <Text style={styles.membersModalTitle}>Thành viên</Text>
                        <TouchableOpacity onPress={() => {
                            setMembersModalVisible(false);
                            setInviteModalVisible(true);
                            setInviteSearchQuery('');
                            setInviteSearchResults([]);
                        }}>
                            <Ionicons name="person-add-outline" size={24} color="#F97316" />
                        </TouchableOpacity>
                    </View>

                    {/* Search Bar */}
                    <View style={styles.membersSearchContainer}>
                        <View style={styles.membersSearchBox}>
                            <Ionicons name="search" size={20} color="#999" />
                            <TextInput
                                style={styles.membersSearchInput}
                                placeholder="Tìm kiếm thành viên"
                                value={memberSearchQuery}
                                onChangeText={(text) => {
                                    setMemberSearchQuery(text);
                                    // Debounce search
                                    setTimeout(() => loadMembers(text), 300);
                                }}
                            />
                        </View>
                        <Text style={styles.membersSearchHint}>
                            Xem và tìm kiếm những thành viên mới và cũ trong nhóm.
                        </Text>
                    </View>

                    {isMembersLoading ? (
                        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                            <ActivityIndicator size="large" color="#F97316" />
                        </View>
                    ) : membersData ? (
                        <ScrollView style={{ flex: 1 }}>
                            {/* All Members - Single unified list */}
                            {membersData.allMembers.length > 0 ? (
                                <View>
                                    <View style={styles.membersSectionHeader}>
                                        <Text style={styles.membersSectionTitle}>
                                            Tất cả thành viên ({membersData.totalCount})
                                        </Text>
                                    </View>
                                    {membersData.allMembers.map(member => (
                                        <View key={member.id} style={styles.memberItem}>
                                            <Image
                                                source={{ uri: getAvatarUri(member.avatar, member.name) }}
                                                style={styles.memberItemAvatar}
                                            />
                                            <View style={styles.memberItemInfo}>
                                                <Text style={styles.memberItemName}>{member.name}</Text>
                                                {member.role !== 'member' && (
                                                    <Text style={styles.memberItemRole}>{getRoleLabel(member.role)}</Text>
                                                )}
                                            </View>
                                            {membersData.isAdmin && member.role !== 'admin' && (
                                                <TouchableOpacity
                                                    style={styles.memberItemAction}
                                                    onPress={() => openMemberActions(member)}
                                                >
                                                    <Ionicons name="ellipsis-horizontal" size={20} color="#666" />
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    ))}
                                </View>
                            ) : (
                                <View style={styles.emptyContainer}>
                                    <Ionicons name="people-outline" size={50} color="#CCC" />
                                    <Text style={styles.emptyText}>Chưa có thành viên nào</Text>
                                </View>
                            )}

                            <View style={{ height: 50 }} />
                        </ScrollView>
                    ) : (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="people-outline" size={60} color="#CCC" />
                            <Text style={styles.emptyText}>Không thể tải danh sách thành viên</Text>
                            <Text style={{ color: '#999', fontSize: 13, marginTop: 4 }}>
                                Vui lòng thử lại sau
                            </Text>
                            <TouchableOpacity
                                style={{ marginTop: 16, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: '#F97316', borderRadius: 20 }}
                                onPress={() => loadMembers()}
                            >
                                <Text style={{ color: '#FFF', fontWeight: '600' }}>Thử lại</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </Modal>

            {/* Invite Members Modal */}
            <Modal
                visible={isInviteModalVisible}
                animationType="slide"
                transparent={false}
                onRequestClose={() => setInviteModalVisible(false)}
            >
                <View style={{ flex: 1, backgroundColor: '#FFF', paddingTop: insets.top }}>
                    {/* Header */}
                    <View style={styles.membersModalHeader}>
                        <TouchableOpacity onPress={() => setInviteModalVisible(false)}>
                            <Ionicons name="arrow-back" size={24} color="#333" />
                        </TouchableOpacity>
                        <Text style={styles.membersModalTitle}>Mời thành viên</Text>
                        <View style={{ width: 24 }} />
                    </View>

                    {/* Search Bar */}
                    <View style={styles.membersSearchContainer}>
                        <View style={styles.membersSearchBox}>
                            <Ionicons name="search" size={20} color="#999" />
                            <TextInput
                                style={styles.membersSearchInput}
                                placeholder="Tìm kiếm người dùng..."
                                value={inviteSearchQuery}
                                onChangeText={(text) => {
                                    setInviteSearchQuery(text);
                                    searchUsersToInvite(text);
                                }}
                                autoFocus
                            />
                        </View>
                        <Text style={styles.membersSearchHint}>
                            Nhập ít nhất 2 ký tự để tìm kiếm
                        </Text>
                    </View>

                    {/* Search Results */}
                    <ScrollView style={{ flex: 1 }}>
                        {inviteSearchResults.length > 0 ? (
                            inviteSearchResults.map(user => (
                                <View key={user.id} style={styles.memberItem}>
                                    <Image
                                        source={{ uri: getAvatarUri(user.avatar, user.name) }}
                                        style={styles.memberItemAvatar}
                                    />
                                    <View style={styles.memberItemInfo}>
                                        <Text style={styles.memberItemName}>{user.name}</Text>
                                    </View>
                                    <TouchableOpacity
                                        style={[styles.inviteActionButton, isInviting === user.id && { opacity: 0.6 }]}
                                        onPress={() => handleInviteUser(user.id)}
                                        disabled={isInviting === user.id}
                                    >
                                        {isInviting === user.id ? (
                                            <ActivityIndicator size="small" color="#FFF" />
                                        ) : (
                                            <Text style={styles.inviteActionButtonText}>Thêm</Text>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            ))
                        ) : inviteSearchQuery.length >= 2 ? (
                            <View style={styles.emptyContainer}>
                                <Ionicons name="person-outline" size={50} color="#CCC" />
                                <Text style={styles.emptyText}>Không tìm thấy người dùng</Text>
                            </View>
                        ) : null}
                    </ScrollView>
                </View>
            </Modal>

            {/* Member Action Modal (Admin only) */}
            <Modal
                visible={isMemberActionVisible}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setMemberActionVisible(false)}
            >
                <TouchableOpacity
                    style={styles.actionModalOverlay}
                    activeOpacity={1}
                    onPress={() => setMemberActionVisible(false)}
                >
                    <View style={styles.actionModalContent}>
                        {selectedMember && (
                            <>
                                {/* Member Info */}
                                <View style={styles.actionModalHeader}>
                                    <Image
                                        source={{ uri: getAvatarUri(selectedMember.avatar, selectedMember.name) }}
                                        style={styles.actionModalAvatar}
                                    />
                                    <View>
                                        <Text style={styles.actionModalName}>{selectedMember.name}</Text>
                                        <Text style={styles.actionModalRole}>{getRoleLabel(selectedMember.role) || 'Thành viên'}</Text>
                                    </View>
                                </View>

                                {/* Actions */}
                                <View style={styles.actionModalButtons}>
                                    {/* Change Role Options */}
                                    {selectedMember.role !== 'moderator' && (
                                        <TouchableOpacity
                                            style={styles.actionModalButton}
                                            onPress={() => handleChangeRole(selectedMember.id, 'moderator')}
                                        >
                                            <Ionicons name="shield-checkmark-outline" size={22} color="#1877F2" />
                                            <Text style={styles.actionModalButtonText}>Đặt làm Kiểm duyệt viên</Text>
                                        </TouchableOpacity>
                                    )}

                                    {selectedMember.role !== 'admin' && (
                                        <TouchableOpacity
                                            style={styles.actionModalButton}
                                            onPress={() => handleChangeRole(selectedMember.id, 'admin')}
                                        >
                                            <Ionicons name="star-outline" size={22} color="#F97316" />
                                            <Text style={styles.actionModalButtonText}>Đặt làm Quản trị viên</Text>
                                        </TouchableOpacity>
                                    )}

                                    {selectedMember.role !== 'member' && (
                                        <TouchableOpacity
                                            style={styles.actionModalButton}
                                            onPress={() => handleChangeRole(selectedMember.id, 'member')}
                                        >
                                            <Ionicons name="person-outline" size={22} color="#666" />
                                            <Text style={styles.actionModalButtonText}>Hạ xuống Thành viên</Text>
                                        </TouchableOpacity>
                                    )}

                                    {/* Remove Member */}
                                    <TouchableOpacity
                                        style={[styles.actionModalButton, { borderTopWidth: 1, borderTopColor: '#EEE' }]}
                                        onPress={() => handleRemoveMember(selectedMember.id)}
                                    >
                                        <Ionicons name="person-remove-outline" size={22} color="#FF3B30" />
                                        <Text style={[styles.actionModalButtonText, { color: '#FF3B30' }]}>
                                            Xóa khỏi nhóm
                                        </Text>
                                    </TouchableOpacity>
                                </View>

                                {/* Cancel */}
                                <TouchableOpacity
                                    style={styles.actionModalCancel}
                                    onPress={() => setMemberActionVisible(false)}
                                >
                                    <Text style={styles.actionModalCancelText}>Hủy</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Edit Group Modal */}
            <Modal
                visible={isEditGroupModalVisible}
                animationType="slide"
                transparent={false}
                onRequestClose={() => setEditGroupModalVisible(false)}
            >
                <View style={{ flex: 1, backgroundColor: '#FFF', paddingTop: insets.top }}>
                    {/* Header */}
                    <View style={styles.membersModalHeader}>
                        <TouchableOpacity onPress={() => setEditGroupModalVisible(false)}>
                            <Ionicons name="close" size={24} color="#333" />
                        </TouchableOpacity>
                        <Text style={styles.membersModalTitle}>Chỉnh sửa nhóm</Text>
                        <TouchableOpacity
                            onPress={handleSaveGroup}
                            disabled={isSavingGroup}
                        >
                            {isSavingGroup ? (
                                <ActivityIndicator size="small" color="#F97316" />
                            ) : (
                                <Text style={{ color: '#F97316', fontWeight: '600', fontSize: 16 }}>Lưu</Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
                        {/* Cover Image */}
                        <TouchableOpacity
                            style={styles.editCoverContainer}
                            onPress={pickEditCoverImage}
                            disabled={isUploadingCover}
                        >
                            {editCoverImage ? (
                                <Image
                                    source={{ uri: getImageUrl(editCoverImage) }}
                                    style={styles.editCoverImage}
                                />
                            ) : (
                                <View style={styles.editCoverPlaceholder}>
                                    <Ionicons name="image-outline" size={40} color="#999" />
                                    <Text style={{ color: '#999', marginTop: 8 }}>Thêm ảnh bìa</Text>
                                </View>
                            )}
                            <View style={styles.editCoverOverlay}>
                                {isUploadingCover ? (
                                    <ActivityIndicator size="small" color="#FFF" />
                                ) : (
                                    <Ionicons name="camera" size={24} color="#FFF" />
                                )}
                            </View>
                        </TouchableOpacity>

                        {/* Avatar */}
                        <View style={styles.editAvatarContainer}>
                            <TouchableOpacity onPress={pickEditAvatar} disabled={isUploadingAvatar}>
                                {editAvatar ? (
                                    <Image
                                        source={{ uri: getImageUrl(editAvatar) }}
                                        style={styles.editAvatarImage}
                                    />
                                ) : (
                                    <View style={styles.editAvatarPlaceholder}>
                                        <Ionicons name="people" size={30} color="#999" />
                                    </View>
                                )}
                                <View style={styles.editAvatarOverlay}>
                                    {isUploadingAvatar ? (
                                        <ActivityIndicator size="small" color="#FFF" />
                                    ) : (
                                        <Ionicons name="camera" size={16} color="#FFF" />
                                    )}
                                </View>
                            </TouchableOpacity>
                        </View>

                        {/* Form */}
                        <View style={styles.editFormContainer}>
                            {/* Name */}
                            <View style={styles.editFormGroup}>
                                <Text style={styles.editFormLabel}>Tên nhóm *</Text>
                                <TextInput
                                    style={styles.editFormInput}
                                    value={editName}
                                    onChangeText={setEditName}
                                    placeholder="Nhập tên nhóm"
                                />
                            </View>

                            {/* Description */}
                            <View style={styles.editFormGroup}>
                                <Text style={styles.editFormLabel}>Mô tả</Text>
                                <TextInput
                                    style={[styles.editFormInput, { height: 100, textAlignVertical: 'top' }]}
                                    value={editDescription}
                                    onChangeText={setEditDescription}
                                    placeholder="Mô tả về nhóm..."
                                    multiline
                                />
                            </View>

                            {/* Privacy */}
                            <View style={styles.editFormGroup}>
                                <Text style={styles.editFormLabel}>Quyền riêng tư</Text>
                                <View style={styles.privacyOptions}>
                                    <TouchableOpacity
                                        style={[styles.privacyOption, editPrivacy === 'public' && styles.privacyOptionActive]}
                                        onPress={() => setEditPrivacy('public')}
                                    >
                                        <Ionicons name="globe-outline" size={20} color={editPrivacy === 'public' ? '#F97316' : '#666'} />
                                        <Text style={[styles.privacyOptionText, editPrivacy === 'public' && styles.privacyOptionTextActive]}>
                                            Công khai
                                        </Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[styles.privacyOption, editPrivacy === 'private' && styles.privacyOptionActive]}
                                        onPress={() => setEditPrivacy('private')}
                                    >
                                        <Ionicons name="lock-closed-outline" size={20} color={editPrivacy === 'private' ? '#F97316' : '#666'} />
                                        <Text style={[styles.privacyOptionText, editPrivacy === 'private' && styles.privacyOptionTextActive]}>
                                            Riêng tư
                                        </Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[styles.privacyOption, editPrivacy === 'secret' && styles.privacyOptionActive]}
                                        onPress={() => setEditPrivacy('secret')}
                                    >
                                        <Ionicons name="eye-off-outline" size={20} color={editPrivacy === 'secret' ? '#F97316' : '#666'} />
                                        <Text style={[styles.privacyOptionText, editPrivacy === 'secret' && styles.privacyOptionTextActive]}>
                                            Bí mật
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Delete Group */}
                            <View style={styles.editFormGroup}>
                                <TouchableOpacity
                                    style={styles.deleteGroupButton}
                                    onPress={handleDeleteGroup}
                                >
                                    <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                                    <Text style={styles.deleteGroupButtonText}>Xóa nhóm</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={{ height: 50 }} />
                    </ScrollView>
                </View>
            </Modal>
            {/* Create Post Modal */}
            <Modal
                visible={isPostModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => {
                    // Show confirmation if there's content
                    if (newPostContent.trim() || newPostImages.length > 0) {
                        Alert.alert(
                            'Bạn có muốn lưu bài viết để hoàn thành sau không?',
                            '',
                            [
                                {
                                    text: 'Bỏ bài viết', style: 'destructive', onPress: () => {
                                        setNewPostContent('');
                                        setNewPostImages([]);
                                        setPostModalVisible(false);
                                    }
                                },
                                { text: 'Lưu bản nháp', onPress: () => setPostModalVisible(false) },
                                { text: 'Tiếp tục chỉnh sửa', style: 'cancel' },
                            ]
                        );
                    } else {
                        setPostModalVisible(false);
                    }
                }}
            >
                <View style={styles.modalOverlay}>
                    <KeyboardAvoidingView
                        style={styles.modalContent}
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    >
                        <View style={styles.modalHeader}>
                            <TouchableOpacity onPress={() => {
                                // Show confirmation if there's content
                                if (newPostContent.trim() || newPostImages.length > 0) {
                                    Alert.alert(
                                        'Bạn có muốn lưu bài viết để hoàn thành sau không?',
                                        '',
                                        [
                                            {
                                                text: 'Bỏ bài viết', style: 'destructive', onPress: () => {
                                                    setNewPostContent('');
                                                    setNewPostImages([]);
                                                    setPostModalVisible(false);
                                                }
                                            },
                                            { text: 'Lưu bản nháp', onPress: () => setPostModalVisible(false) },
                                            { text: 'Tiếp tục chỉnh sửa', style: 'cancel' },
                                        ]
                                    );
                                } else {
                                    setPostModalVisible(false);
                                }
                            }}>
                                <Ionicons name="arrow-back" size={24} color="#333" />
                            </TouchableOpacity>
                            <Text style={styles.modalTitle}>Tạo bài viết</Text>
                            <TouchableOpacity
                                onPress={handleCreatePost}
                                disabled={isPosting || (!newPostContent.trim() && newPostImages.length === 0)}
                                style={[styles.postButton, (!newPostContent.trim() && newPostImages.length === 0 || isPosting) && styles.postButtonDisabled]}
                            >
                                {isPosting ? <ActivityIndicator color="white" size="small" /> : <Text style={styles.postButtonText}>Đăng</Text>}
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={[styles.modalBody, { flex: 1 }]} showsVerticalScrollIndicator={false}>
                            <View style={styles.modalUserRow}>
                                <Image
                                    source={{ uri: getAvatarUri(currentUser?.avatar, currentUser?.name || 'User') }}
                                    style={styles.postAvatar}
                                />
                                <View>
                                    <Text style={styles.postAuthor}>{currentUser?.name}</Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                                        <Text style={{ fontSize: 12, color: '#666' }}>Thành viên của </Text>
                                        <Text style={{ fontSize: 12, fontWeight: 'bold' }}>{group?.name}</Text>
                                    </View>
                                </View>
                            </View>
                            <TextInput
                                style={styles.modalInput}
                                placeholder="Bạn đang nghĩ gì?"
                                multiline
                                autoFocus
                                value={newPostContent}
                                onChangeText={setNewPostContent}
                            />

                            {/* Image Preview Grid */}
                            {newPostImages.length > 0 && (
                                <View style={{
                                    flexDirection: 'row',
                                    flexWrap: 'wrap',
                                    marginTop: 12,
                                    gap: 8,
                                }}>
                                    {newPostImages.map((uri, index) => (
                                        <View key={index} style={{
                                            width: newPostImages.length === 1 ? '100%' : '48%',
                                            aspectRatio: newPostImages.length === 1 ? 16 / 9 : 1,
                                            borderRadius: 8,
                                            overflow: 'hidden',
                                            position: 'relative',
                                        }}>
                                            {isVideo(uri) ? (
                                                <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
                                                    <Ionicons name="videocam" size={32} color="white" />
                                                    <Text style={{ color: 'white', marginTop: 4, fontSize: 12 }}>Video</Text>
                                                </View>
                                            ) : (
                                                <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                                            )}
                                            <TouchableOpacity
                                                style={{
                                                    position: 'absolute',
                                                    top: 6,
                                                    right: 6,
                                                    backgroundColor: 'rgba(0,0,0,0.6)',
                                                    borderRadius: 12,
                                                    width: 24,
                                                    height: 24,
                                                    justifyContent: 'center',
                                                    alignItems: 'center',
                                                }}
                                                onPress={() => setNewPostImages(prev => prev.filter((_, i) => i !== index))}
                                            >
                                                <Ionicons name="close" size={16} color="white" />
                                            </TouchableOpacity>
                                        </View>
                                    ))}
                                </View>
                            )}
                        </ScrollView>

                        {/* Modal Footer - Actions */}
                        <View style={styles.modalFooter}>
                            <TouchableOpacity style={styles.footerButton} onPress={handlePickImage}>
                                <Ionicons name="image-outline" size={24} color="#45BD62" />
                                <Text style={styles.footerButtonText}>Ảnh/Video</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.footerButton}>
                                <Ionicons name="person-add-outline" size={24} color="#1877F2" />
                                <Text style={styles.footerButtonText}>Gắn thẻ</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.footerButton}>
                                <Ionicons name="happy-outline" size={24} color="#F7B928" />
                                <Text style={styles.footerButtonText}>Cảm xúc</Text>
                            </TouchableOpacity>
                        </View>
                    </KeyboardAvoidingView>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F5F5F5',
    },
    listContent: {
        paddingBottom: 100,
    },
    headerOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 8 : 50,
        paddingHorizontal: 16,
        paddingBottom: 12,
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    // Sticky Header Styles
    stickyHeader: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 8 : 50,
        paddingHorizontal: 16,
        paddingBottom: 12,
        borderBottomWidth: 0,
        borderBottomColor: '#E0E0E0',
    },
    stickyHeaderTitle: {
        flex: 1,
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginLeft: 12,
    },
    headerIconButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
    backButton: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        flex: 1,
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFF',
        textAlign: 'center',
        marginHorizontal: 12,
    },
    coverImage: {
        width: '100%',
        height: 200,
    },
    groupInfoContainer: {
        flexDirection: 'row',
        backgroundColor: '#FFF',
        padding: 16,
        marginTop: -30,
        marginHorizontal: 16,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    groupAvatar: {
        width: 70,
        height: 70,
        borderRadius: 16,
        borderWidth: 3,
        borderColor: '#FFF',
    },
    groupDetails: {
        flex: 1,
        marginLeft: 12,
    },
    groupName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    groupPrivacy: {
        fontSize: 13,
        color: '#666',
        marginTop: 2,
    },
    memberRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
    },
    memberAvatars: {
        flexDirection: 'row',
        marginRight: 8,
    },
    memberAvatarSmall: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#FFF',
    },
    memberCount: {
        fontSize: 13,
        color: '#666',
    },
    actionButtons: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 12,
    },
    joinButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F97316',
        paddingVertical: 10,
        borderRadius: 8,
        gap: 6,
    },
    joinedButton: {
        backgroundColor: '#E5E5E5',
    },
    joinButtonText: {
        color: '#FFF',
        fontSize: 15,
        fontWeight: '600',
    },
    joinedButtonText: {
        color: '#666',
    },
    inviteButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F97316',
        paddingVertical: 10,
        borderRadius: 8,
        gap: 6,
    },
    inviteButtonText: {
        color: '#FFF',
        fontSize: 15,
        fontWeight: '600',
    },
    tabsContainer: {
        backgroundColor: '#FFF',
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
    },
    tab: {
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    activeTab: {
        borderBottomWidth: 2,
        borderBottomColor: '#F97316',
    },
    tabText: {
        fontSize: 14,
        color: '#666',
    },
    activeTabText: {
        color: '#F97316',
        fontWeight: '600',
    },
    composer: {
        backgroundColor: '#FFF',
        marginTop: 8,
        padding: 12,
        flexDirection: 'row',
        alignItems: 'center',
    },
    composerInput: {
        flex: 1,
        backgroundColor: '#F5F5F5',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 10,
        fontSize: 14,
    },
    composerActions: {
        flexDirection: 'row',
        marginLeft: 8,
    },
    composerAction: {
        padding: 8,
    },
    sectionHeader: {
        padding: 16,
        backgroundColor: '#FFF',
        marginTop: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    postCard: {
        backgroundColor: '#FFF',
        marginTop: 8,
        padding: 16,
    },
    postHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    postAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 12,
    },
    postInfo: {
        flex: 1,
    },
    postAuthor: {
        fontSize: 15,
        fontWeight: '600',
        color: '#333',
    },
    postTime: {
        fontSize: 12,
        color: '#999',
    },
    postContent: {
        fontSize: 15,
        color: '#333',
        lineHeight: 22,
        marginBottom: 12,
    },
    postImage: {
        width: '100%',
        height: 200,
        borderRadius: 8,
        marginBottom: 12,
    },
    postStats: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 8,
        borderTopWidth: 1,
        borderTopColor: '#EEE',
    },
    statsText: {
        fontSize: 13,
        color: '#666',
    },
    postActions: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#EEE',
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        gap: 6,
    },
    actionText: {
        fontSize: 14,
        color: '#666',
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyText: {
        fontSize: 14,
        color: '#999',
        marginTop: 12,
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: 'white',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        height: '90%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    modalBody: {
        padding: 16,
    },
    modalUserRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    modalInput: {
        fontSize: 18,
        color: '#333',
        minHeight: 100,
        textAlignVertical: 'top',
    },
    modalFooter: {
        flexDirection: 'row',
        padding: 12,
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
    footerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 20,
        padding: 8,
    },
    footerButtonText: {
        marginLeft: 8,
        color: '#333',
        fontWeight: '500',
    },
    postButton: {
        backgroundColor: '#F97316',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    postButtonDisabled: {
        backgroundColor: '#B0B0B0',
    },
    postButtonText: {
        color: 'white',
        fontWeight: 'bold',
    },
    joinPrompt: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F5F5F5',
        padding: 16,
        marginHorizontal: 16,
        marginVertical: 8,
        borderRadius: 12,
        gap: 8,
    },
    joinPromptText: {
        color: '#666',
        fontSize: 14,
        fontWeight: '500',
    },
    // Members Modal Styles
    membersModalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
    },
    membersModalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    membersSearchContainer: {
        padding: 16,
        backgroundColor: '#FFF',
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
    },
    membersSearchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F0F2F5',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    membersSearchInput: {
        flex: 1,
        marginLeft: 10,
        fontSize: 15,
        color: '#333',
    },
    membersSearchHint: {
        fontSize: 12,
        color: '#999',
        marginTop: 8,
    },
    membersSectionHeader: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#F5F5F5',
    },
    membersSectionTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#333',
    },
    membersSectionDesc: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        fontSize: 13,
        color: '#666',
        backgroundColor: '#FFF',
    },
    memberItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#FFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    memberItemAvatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 12,
    },
    memberItemInfo: {
        flex: 1,
    },
    memberItemName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    memberItemRole: {
        fontSize: 13,
        color: '#F97316',
        marginTop: 2,
    },
    memberItemAction: {
        padding: 8,
    },
    // Invite Modal Styles
    inviteActionButton: {
        backgroundColor: '#F97316',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    inviteActionButtonText: {
        color: '#FFF',
        fontWeight: '600',
        fontSize: 14,
    },
    // Action Modal Styles
    actionModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    actionModalContent: {
        backgroundColor: '#FFF',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingBottom: 30,
    },
    actionModalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
    },
    actionModalAvatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 12,
    },
    actionModalName: {
        fontSize: 17,
        fontWeight: '600',
        color: '#333',
    },
    actionModalRole: {
        fontSize: 14,
        color: '#666',
        marginTop: 2,
    },
    actionModalButtons: {
        paddingVertical: 8,
    },
    actionModalButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 20,
    },
    actionModalButtonText: {
        marginLeft: 16,
        fontSize: 16,
        color: '#333',
    },
    actionModalCancel: {
        alignItems: 'center',
        paddingVertical: 16,
        marginTop: 8,
        marginHorizontal: 20,
        backgroundColor: '#F0F2F5',
        borderRadius: 10,
    },
    actionModalCancelText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#666',
    },
    // Edit Group Button
    editGroupButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#F0F2F5',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
    // Edit Group Modal Styles
    editCoverContainer: {
        height: 180,
        backgroundColor: '#F0F2F5',
        position: 'relative',
    },
    editCoverImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    editCoverPlaceholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    editCoverOverlay: {
        position: 'absolute',
        bottom: 12,
        right: 12,
        backgroundColor: 'rgba(0,0,0,0.5)',
        padding: 10,
        borderRadius: 20,
    },
    editAvatarContainer: {
        alignItems: 'center',
        marginTop: -40,
        marginBottom: 20,
    },
    editAvatarImage: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 3,
        borderColor: '#FFF',
    },
    editAvatarPlaceholder: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#E4E6EB',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#FFF',
    },
    editAvatarOverlay: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#F97316',
        padding: 6,
        borderRadius: 12,
    },
    editFormContainer: {
        padding: 16,
    },
    editFormGroup: {
        marginBottom: 20,
    },
    editFormLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    editFormInput: {
        borderWidth: 1,
        borderColor: '#DDD',
        borderRadius: 10,
        padding: 12,
        fontSize: 16,
        backgroundColor: '#FAFAFA',
    },
    privacyOptions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    privacyOption: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        borderRadius: 10,
        backgroundColor: '#F0F2F5',
        marginHorizontal: 4,
    },
    privacyOptionActive: {
        backgroundColor: '#FFF3E0',
        borderWidth: 1,
        borderColor: '#F97316',
    },
    privacyOptionText: {
        marginLeft: 6,
        fontSize: 13,
        color: '#666',
    },
    privacyOptionTextActive: {
        color: '#F97316',
        fontWeight: '600',
    },
    deleteGroupButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 14,
        borderRadius: 10,
        backgroundColor: '#FFF',
        borderWidth: 1,
        borderColor: '#FF3B30',
    },
    deleteGroupButtonText: {
        marginLeft: 8,
        fontSize: 16,
        color: '#FF3B30',
        fontWeight: '600',
    },
});

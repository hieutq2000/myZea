import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Image,
    SafeAreaView,
    StatusBar,
    Platform,
    ActivityIndicator,
    RefreshControl,
    TextInput,
    Alert,
    ScrollView,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { apiRequest } from '../utils/api';
import InAppBrowser from '../components/InAppBrowser';
import TextWithSeeMore from '../components/TextWithSeeMore';
import VideoPlayer from '../components/VideoPlayer';

const isVideo = (url: string) => {
    return url?.match(/\.(mp4|mov|avi|wmv|flv|webm|m4v|3gp)$/i);
};

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

interface Post {
    id: string;
    author: { id: string; name: string; avatar?: string };
    content: string;
    images?: string[];
    createdAt: string;
    likes: number;
    comments: number;
    isLiked: boolean;
}

interface PlaceGroupDetailScreenProps {
    groupId: string;
    onBack: () => void;
}

const formatMemberCount = (count: number): string => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return `${count}`;
};

const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = (now.getTime() - date.getTime()) / 1000;
    if (diff < 60) return 'Vừa xong';
    if (diff < 3600) return `${Math.floor(diff / 60)} phút`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} giờ`;
    return date.toLocaleDateString('vi-VN');
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

    const openLink = (url: string) => {
        setBrowserUrl(url);
        setBrowserVisible(true);
    };

    useEffect(() => {
        loadGroupData();
    }, [groupId]);

    const loadGroupData = async () => {
        try {
            const [groupData, postsData] = await Promise.all([
                apiRequest<GroupDetail>(`/api/place/groups/${groupId}`),
                apiRequest<Post[]>(`/api/place/groups/${groupId}/posts`)
            ]);
            setGroup(groupData);
            setPosts(postsData);
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

    const renderPost = ({ item }: { item: Post }) => {
        const avatarUri = item.author.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.author.name)}`;

        return (
            <View style={styles.postCard}>
                <View style={styles.postHeader}>
                    <Image source={{ uri: avatarUri }} style={styles.postAvatar} />
                    <View style={styles.postInfo}>
                        <Text style={styles.postAuthor}>{item.author.name}</Text>
                        <Text style={styles.postTime}>{formatTime(item.createdAt)}</Text>
                    </View>
                    <TouchableOpacity>
                        <Ionicons name="ellipsis-horizontal" size={20} color="#666" />
                    </TouchableOpacity>
                </View>



                <View style={{ paddingHorizontal: 16 }}>
                    <TextWithSeeMore text={item.content} onLinkPress={openLink} />
                </View>

                {
                    item.images && item.images.length > 0 && (
                        (isVideo(item.images[0])) ? (
                            <VideoPlayer source={item.images[0]} style={{ width: '100%', height: 350, marginTop: 8 }} />
                        ) : (
                            <Image source={{ uri: item.images[0] }} style={styles.postImage} resizeMode="cover" />
                        )
                    )
                }

                <View style={styles.postStats}>
                    <Text style={styles.statsText}>{item.likes} lượt thích</Text>
                    <Text style={styles.statsText}>{item.comments} bình luận</Text>
                </View>

                <View style={styles.postActions}>
                    <TouchableOpacity style={styles.actionButton}>
                        <Ionicons name={item.isLiked ? 'heart' : 'heart-outline'} size={20} color={item.isLiked ? '#E91E63' : '#666'} />
                        <Text style={styles.actionText}>Thích</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton}>
                        <Ionicons name="chatbubble-outline" size={20} color="#666" />
                        <Text style={styles.actionText}>Bình luận</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton}>
                        <Ionicons name="share-outline" size={20} color="#666" />
                        <Text style={styles.actionText}>Chia sẻ</Text>
                    </TouchableOpacity>
                </View>
            </View >
        );
    };

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

    const coverUri = group.coverImage || 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&q=80';
    const avatarUri = group.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(group.name)}&background=F97316&color=fff&size=100`;

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

            <FlatList
                data={posts}
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
                ListHeaderComponent={() => (
                    <View>
                        {/* Header with back button */}
                        <View style={styles.headerOverlay}>
                            <TouchableOpacity onPress={onBack} style={styles.backButton}>
                                <Ionicons name="arrow-back" size={24} color="#FFF" />
                            </TouchableOpacity>
                            <Text style={styles.headerTitle} numberOfLines={1}>{group.name}</Text>
                            <View style={{ width: 40 }} />
                        </View>

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

                                {/* Member count with avatars */}
                                <View style={styles.memberRow}>
                                    <View style={styles.memberAvatars}>
                                        {group.previewMembers.slice(0, 3).map((member, index) => (
                                            <Image
                                                key={member.id}
                                                source={{ uri: member.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}` }}
                                                style={[styles.memberAvatarSmall, { marginLeft: index > 0 ? -8 : 0 }]}
                                            />
                                        ))}
                                    </View>
                                    <Text style={styles.memberCount}>
                                        {formatMemberCount(group.memberCount)} thành viên
                                    </Text>
                                </View>
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

                        {/* Composer */}
                        <View style={styles.composer}>
                            <TextInput
                                style={styles.composerInput}
                                placeholder="Bạn đang nghĩ gì?"
                                placeholderTextColor="#999"
                            />
                            <View style={styles.composerActions}>
                                <TouchableOpacity style={styles.composerAction}>
                                    <MaterialCommunityIcons name="poll" size={22} color="#666" />
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.composerAction}>
                                    <Ionicons name="image-outline" size={22} color="#666" />
                                </TouchableOpacity>
                            </View>
                        </View>

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
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.3)',
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
});

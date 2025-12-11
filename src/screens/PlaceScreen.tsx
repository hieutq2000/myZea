import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Image,
    TouchableOpacity,
    FlatList,
    SafeAreaView,
    StatusBar,
    Modal,
    TextInput,
    Alert,
    ActivityIndicator,
    Dimensions,
    RefreshControl,
    ScrollView,
    Platform,
    Share,
} from 'react-native';
import { Ionicons, FontAwesome, MaterialIcons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getPosts, createPost, toggleLikePost, Post, uploadImage, trackPostView, searchUsers } from '../utils/api';
import { launchImageLibrary } from '../utils/imagePicker';
import { useNavigation } from '@react-navigation/native';
import FacebookImageViewer from '../components/FacebookImageViewer';
import PhotoGrid from '../components/PhotoGrid';
import PlaceBottomBar, { PlaceTabType } from '../components/PlaceBottomBar';
import PlaceNotificationsScreen from './PlaceNotificationsScreen';
import PlaceMenuScreen from './PlaceMenuScreen';
import PlaceGroupsScreen from './PlaceGroupsScreen';
import PlaceGroupDetailScreen from './PlaceGroupDetailScreen';
import PlaceProfileScreen from './PlaceProfileScreen';
import InAppBrowser from '../components/InAppBrowser';
import TextWithSeeMore from '../components/TextWithSeeMore';
import VideoPlayer from '../components/VideoPlayer';
import CreateGroupModal from '../components/CreateGroupModal';

const { width } = Dimensions.get('window');

// --- Helper Date ---
const formatTime = (dateString: string) => {
    if (!dateString) return '';

    // Parse the date from server (could be UTC or local depending on server config)
    let date = new Date(dateString);

    // If the date string doesn't have timezone info, MySQL returns local time
    // So we don't need to adjust, just compare with local now
    const now = new Date();
    const diff = (now.getTime() - date.getTime()) / 1000; // seconds

    // Handle negative diff (future dates, likely timezone issue)
    if (diff < 0) return 'Vừa xong';

    if (diff < 60) return 'Vừa xong';
    if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} ngày trước`; // 7 days
    return date.toLocaleDateString('vi-VN');
};

// Helper function to get avatar URI (handles base64 and URL)
const getAvatarUri = (avatar: string | undefined, name: string = 'User'): string => {
    if (!avatar) {
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;
    }
    // If already a URL, return as-is
    if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
        return avatar;
    }
    // If already has data prefix, return as-is
    if (avatar.startsWith('data:image/')) {
        return avatar;
    }
    // Otherwise, assume it's base64 and add prefix
    return `data:image/jpeg;base64,${avatar}`;
};

// ... imports

// Helper to get URI from string or ImageObj
const getUri = (img: string | any | undefined): string => {
    if (!img) return '';
    return typeof img === 'string' ? img : img.uri;
};

const isVideo = (url: string | any) => {
    const uri = getUri(url);
    return uri?.match(/\.(mp4|mov|avi|wmv|flv|webm|m4v|3gp)$/i);
};

// ... existing code ...


const REACTIONS = [
    { id: 'like', emoji: '👍', bgColor: '#1877F2', label: 'Thích', color: '#1877F2' },
    { id: 'love', emoji: '❤️', bgColor: '#F33E58', label: 'Yêu thích', color: '#F33E58' },
    { id: 'care', emoji: '🥰', bgColor: '#F7B928', label: 'Thương thương', color: '#F7B928' },
    { id: 'haha', emoji: '😆', bgColor: '#F7B928', label: 'Haha', color: '#F7B928' },
    { id: 'wow', emoji: '😮', bgColor: '#F7B928', label: 'Wow', color: '#F7B928' },
    { id: 'sad', emoji: '😢', bgColor: '#F7B928', label: 'Buồn', color: '#F7B928' },
    { id: 'angry', emoji: '😠', bgColor: '#E9710F', label: 'Phẫn nộ', color: '#E9710F' },
];

interface PlaceScreenProps {
    user: any;
    onGoHome?: () => void;
}

interface LocalPostState {
    [postId: string]: string; // reactionId
}

export default function PlaceScreen({ user, onGoHome }: PlaceScreenProps) {
    const navigation = useNavigation<any>();
    const [posts, setPosts] = useState<Post[]>([]);
    const [isImageViewerVisible, setIsImageViewerVisible] = useState(false);

    // Browser State
    const [browserUrl, setBrowserUrl] = useState<string | null>(null);
    const [isBrowserVisible, setBrowserVisible] = useState(false);

    const openLink = (url: string) => {
        setBrowserUrl(url);
        setBrowserVisible(true);
    };
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);
    const [selectedPost, setSelectedPost] = useState<Post | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isPostModalVisible, setPostModalVisible] = useState(false);
    const [newPostContent, setNewPostContent] = useState('');
    const [newPostImages, setNewPostImages] = useState<string[]>([]);
    const [isPosting, setIsPosting] = useState(false);
    const [activeReactionPostId, setActiveReactionPostId] = useState<string | null>(null);
    const [localReactions, setLocalReactions] = useState<LocalPostState>({});
    // Share State
    const [isShareModalVisible, setShareModalVisible] = useState(false);
    const [postToShare, setPostToShare] = useState<Post | null>(null);
    // Place Bottom Tab State
    const [placeActiveTab, setPlaceActiveTab] = useState<PlaceTabType>('HOME');
    // Group Navigation State
    const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
    const [isCreateGroupModalVisible, setCreateGroupModalVisible] = useState(false);
    const [groupsKey, setGroupsKey] = useState(0); // Refresh trigger
    const [showProfileScreen, setShowProfileScreen] = useState(false);
    // Tag People State
    const [taggedUsers, setTaggedUsers] = useState<{ id: string; name: string; avatar?: string }[]>([]);
    const [isTagModalVisible, setTagModalVisible] = useState(false);
    const [tagSearchQuery, setTagSearchQuery] = useState('');
    const [tagSearchResults, setTagSearchResults] = useState<{ id: string; name: string; avatar?: string }[]>([]);

    useEffect(() => {
        loadPosts();
    }, []);

    const loadPosts = async () => {
        setIsLoading(true);
        try {
            const data = await getPosts();
            setPosts(data);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    const handleRefresh = () => {
        setIsRefreshing(true);
        loadPosts();
    };

    const handlePickImage = async () => {
        // Allow selecting up to 10 images or mixed media
        const result = await launchImageLibrary({ mediaType: 'mixed', quality: 0.8, selectionLimit: 10 });
        if (!result.didCancel && !result.error && result.assets) {
            const uris = result.assets.map((a: any) => a.uri);
            setNewPostImages(prev => [...prev, ...uris]);
        } else if (result.error) {
            Alert.alert('Lỗi', 'Không thể chọn ảnh/video');
        }
    };

    const handleSearchUsers = async (query: string) => {
        setTagSearchQuery(query);
        if (query.length < 2) {
            setTagSearchResults([]);
            return;
        }
        try {
            const results = await searchUsers(query);
            // Filter out already tagged users
            const filtered = results.filter(u => !taggedUsers.find(t => t.id === u.id));
            setTagSearchResults(filtered);
        } catch (e) {
            console.error('Search users error:', e);
        }
    };

    const handleTagUser = (user: { id: string; name: string; avatar?: string }) => {
        if (!taggedUsers.find(u => u.id === user.id)) {
            setTaggedUsers([...taggedUsers, user]);
        }
        setTagSearchQuery('');
        setTagSearchResults([]);
    };

    const handleRemoveTag = (userId: string) => {
        setTaggedUsers(taggedUsers.filter(u => u.id !== userId));
    };

    const handleCreatePost = async () => {
        if (!newPostContent.trim() && newPostImages.length === 0) return;
        setIsPosting(true);
        try {
            const uploadedImages: any[] = [];

            // Upload all images sequentially (or Promise.all)
            for (const imgUri of newPostImages) {
                const result = await uploadImage(imgUri);
                // Result is now { url, width, height }
                uploadedImages.push({
                    uri: result.url,
                    width: result.width,
                    height: result.height
                });
            }

            // Pass the array of image objects directly + tagged users
            const taggedUserIds = taggedUsers.map(u => u.id);
            const newPost = await createPost(newPostContent, undefined, uploadedImages, undefined, taggedUserIds);

            setPosts([newPost, ...posts]);
            setNewPostContent('');
            setNewPostImages([]);
            setTaggedUsers([]); // Reset tagged users
            setPostModalVisible(false);
        } catch (error) {
            console.error('Create post error:', error);
            Alert.alert('Lỗi', 'Không thể đăng bài viết. Vui lòng thử lại.');
        } finally {
            setIsPosting(false);
        }
    };

    const handleReaction = async (postId: string, reactionId: string = 'like') => {
        setActiveReactionPostId(null);

        // Optimistic Update
        const currentReaction = localReactions[postId];
        const isUnlike = currentReaction === reactionId; // If clicking same, toggle off

        setLocalReactions(prev => {
            const newState = { ...prev };
            if (isUnlike) delete newState[postId];
            else newState[postId] = reactionId;
            return newState;
        });

        // Update Post UI State (Like count, isLiked bool)
        setPosts(prev => prev.map(p => {
            if (p.id === postId) {
                const wasLiked = !!currentReaction;
                let newLikes = p.likes;
                if (!wasLiked && !isUnlike) newLikes++; // None -> Like
                if (wasLiked && isUnlike) newLikes--;   // Like -> None

                return { ...p, likes: newLikes, isLiked: !isUnlike };
            }
            return p;
        }));

        try {
            // Backend only understands "Like" toggle for now
            await toggleLikePost(postId);
        } catch (error) {
            console.error('Reaction error', error);
        }
    };

    const openImageViewer = (post: Post, index: number) => {
        setSelectedPost(post);
        setSelectedImageIndex(index);
        setIsImageViewerVisible(true);
    };

    const handleShare = (post: Post) => {
        setPostToShare(post);
        setShareModalVisible(true);
    };

    const onShareNow = async () => {
        if (!postToShare) return;
        setShareModalVisible(false);
        setIsLoading(true);
        try {
            const originalId = postToShare.originalPost ? postToShare.originalPost.id : postToShare.id;
            const newPost = await createPost('', undefined, undefined, originalId);
            setPosts([newPost, ...posts]);
            Alert.alert('Thành công', 'Đã chia sẻ bài viết lên dòng thời gian của bạn.');
        } catch (error) {
            console.error(error);
            Alert.alert('Lỗi', 'Không thể chia sẻ bài viết.');
        } finally {
            setIsLoading(false);
        }
    };

    const onShareExternal = async () => {
        if (!postToShare) return;
        setShareModalVisible(false);
        try {
            await Share.share({
                message: `Xem bài viết của ${postToShare.author.name} trên Zyea Place:\n${postToShare.content || 'Bài viết thú vị!'}`,
                url: getUri(postToShare.image) || '',
            });
        } catch (error) {
            console.error(error);
        }
    };


    const renderHeaderAndComposer = () => (
        <LinearGradient
            colors={['#ffebd9', '#e0f8ff']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.headerGradient}
        >
            <SafeAreaView>
                <View style={[styles.headerContent, { paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }]}>
                    <View style={styles.headerLogoContainer}>
                        <LinearGradient
                            colors={['#00C6FF', '#0072FF']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.logoBadge}
                        >
                            <Text style={styles.logoText}>P</Text>
                        </LinearGradient>
                        <Text style={styles.headerTitle}>Zyea Place</Text>
                    </View>
                    <View style={styles.headerIcons}>
                        {/* Home button - go back to main tabs */}
                        {onGoHome && (
                            <TouchableOpacity
                                style={[styles.circleButton, { backgroundColor: 'rgba(255,255,255,0.5)' }]}
                                onPress={onGoHome}
                            >
                                <Ionicons name="home-outline" size={22} color="#333" />
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity style={[styles.circleButton, { marginLeft: 12, backgroundColor: 'rgba(255,255,255,0.5)' }]}>
                            <Ionicons name="search" size={22} color="#333" />
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.circleButton, { marginLeft: 12, backgroundColor: 'rgba(255,255,255,0.5)' }]}>
                            <MaterialIcons name="notifications-none" size={24} color="#FF5722" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Composer inside Gradient */}
                <View style={styles.composerContainer}>
                    <Image
                        source={{ uri: user?.avatar || `https://ui-avatars.com/api/?name=${user?.name || 'User'}` }}
                        style={styles.composerAvatar}
                    />
                    <TouchableOpacity
                        style={styles.composerInput}
                        onPress={() => setPostModalVisible(true)}
                    >
                        <Text style={styles.composerPlaceholder}>Bạn đang nghĩ gì?</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.composerImageBtn}>
                        <Ionicons name="image-outline" size={24} color="#666" />
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </LinearGradient>
    );



    const renderPost = ({ item }: { item: Post }) => (
        <View
            style={styles.postCard}
            onLayout={() => {
                // Track view when post becomes visible
                trackPostView(item.id);
            }}
        >
            {/* Post Header */}
            <View style={styles.postHeader}>
                <Image
                    source={{ uri: item.author.avatar || `https://ui-avatars.com/api/?name=${item.author.name}` }}
                    style={styles.postAvatar}
                />
                <View style={styles.postInfo}>
                    <Text style={styles.postAuthor}>
                        {item.author.name}
                        {item.taggedUsers && item.taggedUsers.length > 0 && (
                            <Text style={{ fontWeight: '400', color: '#333' }}>
                                {' cùng với '}
                                <Text style={{ fontWeight: '600' }}>{item.taggedUsers[0].name}</Text>
                                {item.taggedUsers.length > 1 && (
                                    <Text style={{ fontWeight: '400' }}>
                                        {' và '}
                                        <Text style={{ fontWeight: '600' }}>{item.taggedUsers.length - 1} người khác</Text>
                                    </Text>
                                )}
                            </Text>
                        )}
                    </Text>
                    <View style={styles.postMeta}>
                        <Text style={styles.postTime}>{formatTime(item.createdAt)}</Text>
                        <Text style={styles.dot}>•</Text>
                        <Ionicons name="earth" size={12} color="#666" />
                    </View>
                </View>
                <TouchableOpacity>
                    <Feather name="more-horizontal" size={20} color="#666" />
                </TouchableOpacity>
            </View>

            {/* Post Content */}
            <View style={styles.postContent}>
                <TextWithSeeMore text={item.content} onLinkPress={openLink} />
            </View>

            {/* Post Image/Video */}
            {/* Post Images Grid OR Shared Post Content */}
            {item.originalPost ? (
                // SHARED POST VIEW
                <View style={styles.sharedContainer}>
                    <View style={styles.sharedHeader}>
                        <Image
                            source={{ uri: item.originalPost.author.avatar || `https://ui-avatars.com/api/?name=${item.originalPost.author.name}` }}
                            style={styles.sharedAvatar}
                        />
                        <View>
                            <Text style={styles.sharedAuthor}>{item.originalPost.author.name}</Text>
                            <Text style={styles.sharedTime}>{formatTime(item.originalPost.createdAt)}</Text>
                        </View>
                    </View>
                    {item.originalPost.content ? <Text style={styles.sharedContent}>{item.originalPost.content}</Text> : null}
                    {/* Reuse Grid for shared images */}
                    <PhotoGrid
                        images={item.originalPost.images && item.originalPost.images.length > 0 ? item.originalPost.images : (item.originalPost.image ? [item.originalPost.image] : [])}
                        onPressImage={(index) => openImageViewer(item.originalPost!, index)}
                    />
                </View>
            ) : (
                // NORMAL POST VIEW
                <View style={styles.postImagesContainer}>
                    {/* Check if single video */}
                    {(item.images?.length === 1 || (!item.images?.length && item.image)) && isVideo(item.images?.[0] || item.image || '') ? (
                        <VideoPlayer source={getUri(item.images?.[0] || item.image)} style={{ width: '100%' }} />
                    ) : (
                        <PhotoGrid
                            images={item.images && item.images.length > 0 ? item.images : (item.image ? [item.image] : [])}
                            onPressImage={(index) => openImageViewer(item, index)}
                        />
                    )}
                </View>
            )}

            {/* Post Stats */}
            <View style={styles.postStats}>
                {/* Left Side: Like Icon + Count */}
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    {item.likes > 0 && (
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <View style={{ backgroundColor: '#1877F2', width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginRight: 6 }}>
                                <FontAwesome name="thumbs-up" size={10} color="white" />
                            </View>
                            <Text style={styles.reactionCount}>{item.likes}</Text>
                        </View>
                    )}
                </View>

                {/* Right Side: Comments + Views */}
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {item.comments > 0 && (
                        <Text style={styles.statsText}>{item.comments} bình luận</Text>
                    )}
                    {item.comments > 0 && item.views > 0 && <Text style={styles.statsText}> • </Text>}
                    {item.views > 0 && (
                        <Text style={styles.statsText}>{item.views} người đã xem</Text>
                    )}
                </View>
            </View>

            {/* Post Actions */}
            <View style={styles.actionContainer}>
                {/* Reaction Popup Dock - only show when long pressed */}
                {activeReactionPostId === item.id && (
                    <View style={styles.reactionDock}>
                        {REACTIONS.map((reaction) => (
                            <TouchableOpacity
                                key={reaction.id}
                                onPress={() => handleReaction(item.id, reaction.id)}
                                style={styles.reactionButton}
                            >
                                <Text style={styles.reactionEmoji}>{reaction.emoji}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleReaction(item.id, 'like')}
                    onLongPress={() => setActiveReactionPostId(item.id)}
                    delayLongPress={300}
                >
                    {localReactions[item.id] ? (
                        // Show selected reaction with emoji
                        <>
                            <Text style={{ fontSize: 20, marginRight: 6 }}>
                                {REACTIONS.find(r => r.id === localReactions[item.id])?.emoji}
                            </Text>
                            <Text style={[styles.actionText, { color: REACTIONS.find(r => r.id === localReactions[item.id])?.color || '#1877F2', fontWeight: 'bold' }]}>
                                {REACTIONS.find(r => r.id === localReactions[item.id])?.label}
                            </Text>
                        </>
                    ) : (
                        // Default Gray Like
                        <>
                            <FontAwesome name="thumbs-o-up" size={18} color="#666" />
                            <Text style={styles.actionText}>Thích</Text>
                        </>
                    )}
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => navigation.navigate('PostDetail', { postId: item.id, post: item })}
                >
                    <FontAwesome name="comment-o" size={18} color="#666" />
                    <Text style={styles.actionText}>Bình luận</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton} onPress={() => handleShare(item)}>
                    <FontAwesome name="share-square-o" size={18} color="#666" />
                    <Text style={styles.actionText}>Chia sẻ</Text>
                </TouchableOpacity>
            </View>
        </View >
    );

    const mainContent = (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

            {renderHeaderAndComposer()}

            <FlatList
                data={posts}
                keyExtractor={item => item.id}
                renderItem={renderPost}
                refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
                ListHeaderComponent={() => (
                    <View style={styles.feedFilter}>
                        <View>
                            <Text style={styles.feedTitle}>Bảng Feed</Text>
                            <Text style={styles.feedSubtitle}>Phù hợp nhất</Text>
                        </View>
                        <TouchableOpacity>
                            <Ionicons name="options-outline" size={20} color="#666" />
                        </TouchableOpacity>
                    </View>
                )}
                contentContainerStyle={{ paddingBottom: 100 }}
                removeClippedSubviews={Platform.OS === 'android'}
                initialNumToRender={5}
                maxToRenderPerBatch={5}
                windowSize={5}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={() => (
                    <View style={{ padding: 20, alignItems: 'center' }}>
                        {isLoading ? <ActivityIndicator color="#0068FF" /> : <Text style={{ color: '#666' }}>Chưa có bài viết nào</Text>}
                    </View>
                )}
            />

            {/* Create Post Modal */}
            <Modal
                // ... existing modal content
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
                    <View style={styles.modalContent}>
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

                        <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                            <View style={styles.modalUserRow}>
                                <Image
                                    source={{ uri: user?.avatar || `https://ui-avatars.com/api/?name=${user?.name || 'User'}` }}
                                    style={styles.postAvatar}
                                />
                                <Text style={styles.postAuthor}>{user?.name}</Text>
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

                            {/* Tagged Users Display */}
                            {taggedUsers.length > 0 && (
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 12, gap: 8, marginBottom: 20 }}>
                                    {taggedUsers.map(user => (
                                        <View key={user.id} style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            backgroundColor: '#E4E6EB',
                                            borderRadius: 16,
                                            paddingHorizontal: 10,
                                            paddingVertical: 6,
                                        }}>
                                            <Image
                                                source={{ uri: user.avatar || `https://ui-avatars.com/api/?name=${user.name}` }}
                                                style={{ width: 20, height: 20, borderRadius: 10, marginRight: 6 }}
                                            />
                                            <Text style={{ fontSize: 13, color: '#333' }}>{user.name}</Text>
                                            <TouchableOpacity onPress={() => handleRemoveTag(user.id)} style={{ marginLeft: 6 }}>
                                                <Ionicons name="close-circle" size={16} color="#666" />
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
                            <TouchableOpacity style={styles.footerButton} onPress={() => {
                                setPostModalVisible(false);
                                setTimeout(() => setTagModalVisible(true), 100);
                            }}>
                                <Ionicons name="person-add-outline" size={24} color="#1877F2" />
                                <Text style={styles.footerButtonText}>Gắn thẻ</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.footerButton}>
                                <Ionicons name="happy-outline" size={24} color="#F7B928" />
                                <Text style={styles.footerButtonText}>Cảm xúc</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Tag People Modal */}
            <Modal
                visible={isTagModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => {
                    setTagModalVisible(false);
                    setTimeout(() => setPostModalVisible(true), 100);
                }}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { maxHeight: '80%' }]}>
                        <View style={styles.modalHeader}>
                            <TouchableOpacity onPress={() => {
                                setTagModalVisible(false);
                                setTimeout(() => setPostModalVisible(true), 100);
                            }}>
                                <Ionicons name="arrow-back" size={24} color="#333" />
                            </TouchableOpacity>
                            <Text style={styles.modalTitle}>Gắn thẻ người khác</Text>
                            <TouchableOpacity onPress={() => {
                                setTagModalVisible(false);
                                setTimeout(() => setPostModalVisible(true), 100);
                            }}>
                                <Text style={{ color: '#1877F2', fontWeight: '600' }}>Xong</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Search Input */}
                        <View style={{ padding: 16 }}>
                            <View style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                backgroundColor: '#F0F2F5',
                                borderRadius: 20,
                                paddingHorizontal: 16,
                            }}>
                                <Ionicons name="search" size={20} color="#65676B" />
                                <TextInput
                                    style={{ flex: 1, paddingVertical: 10, paddingHorizontal: 10, fontSize: 15 }}
                                    placeholder="Tìm kiếm bạn bè..."
                                    value={tagSearchQuery}
                                    onChangeText={handleSearchUsers}
                                    autoFocus
                                />
                            </View>
                        </View>

                        {/* Search Results */}
                        <ScrollView style={{ flex: 1 }}>
                            {tagSearchResults.map(user => (
                                <TouchableOpacity
                                    key={user.id}
                                    onPress={() => handleTagUser(user)}
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        padding: 12,
                                        borderBottomWidth: 1,
                                        borderBottomColor: '#E4E6EB',
                                    }}
                                >
                                    <Image
                                        source={{ uri: user.avatar || `https://ui-avatars.com/api/?name=${user.name}` }}
                                        style={{ width: 44, height: 44, borderRadius: 22, marginRight: 12 }}
                                    />
                                    <Text style={{ fontSize: 15, fontWeight: '500' }}>{user.name}</Text>
                                </TouchableOpacity>
                            ))}

                            {/* Already Tagged Users */}
                            {taggedUsers.length > 0 && (
                                <View style={{ padding: 16 }}>
                                    <Text style={{ fontSize: 13, color: '#65676B', marginBottom: 8 }}>Đã gắn thẻ</Text>
                                    {taggedUsers.map(user => (
                                        <View key={user.id} style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            padding: 8,
                                            backgroundColor: '#E7F3FF',
                                            borderRadius: 8,
                                            marginBottom: 6,
                                        }}>
                                            <Image
                                                source={{ uri: user.avatar || `https://ui-avatars.com/api/?name=${user.name}` }}
                                                style={{ width: 32, height: 32, borderRadius: 16, marginRight: 10 }}
                                            />
                                            <Text style={{ flex: 1, fontSize: 14, fontWeight: '500' }}>{user.name}</Text>
                                            <TouchableOpacity onPress={() => handleRemoveTag(user.id)}>
                                                <Ionicons name="close-circle" size={20} color="#1877F2" />
                                            </TouchableOpacity>
                                        </View>
                                    ))}
                                </View>
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Facebook Image Viewer */}
            {selectedPost && (
                <FacebookImageViewer
                    visible={isImageViewerVisible}
                    images={
                        selectedPost.images && selectedPost.images.length > 0
                            ? selectedPost.images.map(getUri)
                            : (selectedPost.image ? [getUri(selectedPost.image)] : [])
                    }
                    imageIndex={selectedImageIndex}
                    onClose={() => setIsImageViewerVisible(false)}
                    post={selectedPost}
                    onLike={() => handleReaction(selectedPost.id, 'like')}
                    onComment={() => {
                        setIsImageViewerVisible(false); // Close viewer to navigate
                        navigation.navigate('PostDetail', { postId: selectedPost.id, post: selectedPost });
                    }}
                />
            )}

            {/* Share Options Modal (Bottom Sheet Style) */}
            <Modal
                visible={isShareModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShareModalVisible(false)}
            >
                <TouchableOpacity
                    style={styles.shareOverlay}
                    activeOpacity={1}
                    onPress={() => setShareModalVisible(false)}
                >
                    <View style={styles.shareSheet}>
                        <View style={styles.shareIndicator} />
                        <Text style={styles.shareTitle}>Chia sẻ bài viết này</Text>

                        <TouchableOpacity style={styles.shareOption} onPress={onShareNow}>
                            <View style={[styles.shareIconParams, { backgroundColor: '#E7F3FF' }]}>
                                <MaterialIcons name="share" size={24} color="#1877F2" />
                            </View>
                            <View>
                                <Text style={styles.shareOptionTitle}>Chia sẻ ngay</Text>
                                <Text style={styles.shareOptionSub}>Đăng ngay lên dòng thời gian của bạn</Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.shareOption} onPress={onShareExternal}>
                            <View style={[styles.shareIconParams, { backgroundColor: '#F0F2F5' }]}>
                                <Ionicons name="ellipsis-horizontal" size={24} color="#333" />
                            </View>
                            <View>
                                <Text style={styles.shareOptionTitle}>Tùy chọn khác...</Text>
                                <Text style={styles.shareOptionSub}>Gửi qua Zalo, Messenger, v.v.</Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
            {selectedPost && (
                <FacebookImageViewer
                    visible={isImageViewerVisible}
                    images={
                        selectedPost.images && selectedPost.images.length > 0
                            ? selectedPost.images.map(getUri)
                            : (selectedPost.image ? [getUri(selectedPost.image)] : [])
                    }
                    imageIndex={selectedImageIndex}
                    onClose={() => setIsImageViewerVisible(false)}
                    post={selectedPost}
                    onLike={() => handleReaction(selectedPost.id, 'like')}
                    onComment={() => {
                        setIsImageViewerVisible(false); // Close viewer to navigate
                        navigation.navigate('PostDetail', { postId: selectedPost.id, post: selectedPost });
                    }}
                />
            )}

            <InAppBrowser
                visible={isBrowserVisible}
                url={browserUrl}
                onClose={() => setBrowserVisible(false)}
            />

            {/* Place Bottom Bar */}
            <PlaceBottomBar
                activeTab={placeActiveTab}
                onTabChange={setPlaceActiveTab}
            />
        </View>
    );

    // Render Notifications Screen if tab is NOTIFICATIONS
    if (placeActiveTab === 'NOTIFICATIONS') {
        return (
            <View style={{ flex: 1 }}>
                <PlaceNotificationsScreen
                    onBack={() => setPlaceActiveTab('HOME')}
                    onOpenPost={(postId) => {
                        // TODO: Navigate to post detail
                        setPlaceActiveTab('HOME');
                    }}
                />
                <PlaceBottomBar
                    activeTab={placeActiveTab}
                    onTabChange={setPlaceActiveTab}
                />
            </View>
        );
    }

    // Render Menu Screen if tab is MENU
    if (placeActiveTab === 'MENU') {
        // If showing profile screen
        if (showProfileScreen) {
            return (
                <PlaceProfileScreen
                    user={user}
                    onBack={() => setShowProfileScreen(false)}
                    onEditProfile={() => {
                        // Navigate to main Profile settings
                        if (onGoHome) onGoHome();
                    }}
                />
            );
        }

        return (
            <View style={{ flex: 1 }}>
                <PlaceMenuScreen
                    user={user}
                    onBack={() => setPlaceActiveTab('HOME')}
                    onGoToSettings={() => {
                        // Navigate to Settings
                        if (onGoHome) onGoHome();
                        navigation.navigate('Settings');
                    }}
                    onGoToGroups={() => {
                        setPlaceActiveTab('GROUPS');
                    }}
                    onGoToDrafts={() => {
                        // TODO: Drafts feature
                    }}
                    onViewProfile={() => {
                        // Show Place Profile Screen
                        setShowProfileScreen(true);
                    }}
                />
                <PlaceBottomBar
                    activeTab={placeActiveTab}
                    onTabChange={setPlaceActiveTab}
                />
            </View>
        );
    }

    // Render Groups List Screen if tab is GROUPS
    if (placeActiveTab === 'GROUPS') {
        // If a group is selected, show group detail
        if (selectedGroupId) {
            return (
                <PlaceGroupDetailScreen
                    groupId={selectedGroupId}
                    onBack={() => setSelectedGroupId(null)}
                />
            );
        }

        // Otherwise show groups list
        return (
            <View style={{ flex: 1 }}>
                <PlaceGroupsScreen
                    key={groupsKey} // Force re-render/refetch on change
                    onBack={() => setPlaceActiveTab('HOME')}
                    onOpenGroup={(groupId) => setSelectedGroupId(groupId)}
                    onCreateGroup={() => setCreateGroupModalVisible(true)}
                />
                <CreateGroupModal
                    visible={isCreateGroupModalVisible}
                    onClose={() => setCreateGroupModalVisible(false)}
                    onGroupCreated={() => {
                        setCreateGroupModalVisible(false);
                        setGroupsKey(prev => prev + 1); // Trigger refresh
                    }}
                />
                <PlaceBottomBar
                    activeTab={placeActiveTab}
                    onTabChange={(tab) => {
                        setSelectedGroupId(null); // Clear selected group when changing tabs
                        setPlaceActiveTab(tab);
                    }}
                />
            </View>
        );
    }

    return mainContent;
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F0F2F5', // Light gray background for feed
    },
    headerGradient: {
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
        paddingBottom: 8,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    headerLogoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    logoBadge: {
        width: 34,
        height: 34,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    logoText: {
        color: 'white',
        fontWeight: '900',
        fontSize: 20,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#1A1A1A',
    },
    headerIcons: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    circleButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F0F2F5',
        justifyContent: 'center',
        alignItems: 'center',
    },
    // Removed unused icons styles
    /*
    iconButton: {
        marginLeft: 16,
    },
    headerAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
    },
    */

    // Composer
    composerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        // backgroundColor: '#fff', // Removed since it's on gradient now
        // marginTop: 8, // Removed
    },
    composerAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 12,
    },
    composerInput: {
        flex: 1,
    },
    composerPlaceholder: {
        fontSize: 16,
        color: '#666',
    },
    composerImageBtn: {
        padding: 4,
    },

    // Feed Filter
    feedFilter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#fff',
        marginTop: 0, // Removed top margin so it connects smoothly
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    feedTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    feedSubtitle: {
        fontSize: 12,
        color: '#999',
    },

    // Post Card
    postCard: {
        backgroundColor: '#fff',
        marginTop: 8,
        paddingBottom: 4,
    },
    postHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
    },
    postAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 10,
    },
    postInfo: {
        flex: 1,
    },
    postAuthor: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#333',
    },
    postMeta: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    postTime: {
        fontSize: 12,
        color: '#666',
    },
    dot: {
        marginHorizontal: 4,
        color: '#666',
        fontSize: 12,
    },
    postContent: {
        paddingHorizontal: 12,
        paddingBottom: 12,
    },
    postText: {
        fontSize: 15,
        color: '#333',
        lineHeight: 22,
    },
    seeMoreText: {
        color: '#666',
        fontWeight: 'bold',
    },
    postWith: {
        fontSize: 14,
        color: '#666',
        marginTop: 4,
    },
    postImage: {
        width: '100%',
        height: 250,
    },
    postStats: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    viewCount: {
        fontSize: 12,
        color: '#666',
    },
    reactionCount: {
        fontSize: 13,
        color: '#666',
    },
    statsText: {
        fontSize: 13,
        color: '#666',
    },
    actionContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 10,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 4,
        paddingHorizontal: 12,
    },
    actionText: {
        marginLeft: 6,
        color: '#666',
        fontSize: 14,
        fontWeight: '500',
    },
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
    postButton: {
        backgroundColor: '#0068FF',
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
    previewContainer: {
        marginTop: 12,
        position: 'relative',
    },
    previewImage: {
        width: '100%',
        height: 200,
        borderRadius: 8,
    },
    removeImageBtn: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: 'rgba(0,0,0,0.6)',
        borderRadius: 12,
        padding: 4,
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
    reactionDock: {
        position: 'absolute',
        bottom: 50,
        left: 10,
        right: 10,
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        backgroundColor: 'white',
        borderRadius: 30,
        paddingVertical: 8,
        paddingHorizontal: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 8,
        zIndex: 100,
    },
    reactionButton: {
        padding: 4,
    },
    reactionEmoji: {
        fontSize: 28,
    },
    reactionIconImage: {
        width: 40,
        height: 40,
    },
    // Shared Post Styles
    sharedContainer: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        marginHorizontal: 15,
        marginTop: 10,
        overflow: 'hidden',
    },
    sharedHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        backgroundColor: '#F9F9F9',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    sharedAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        marginRight: 8,
    },
    sharedAuthor: {
        fontWeight: 'bold',
        fontSize: 14,
        color: '#333',
    },
    sharedTime: {
        fontSize: 11,
        color: '#666',
    },
    sharedContent: {
        fontSize: 14,
        color: '#333',
        padding: 10,
        lineHeight: 20,
    },
    // Share Modal Styles
    shareOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    shareSheet: {
        backgroundColor: 'white',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    },
    shareIndicator: {
        width: 40,
        height: 5,
        backgroundColor: '#ccc',
        borderRadius: 3,
        alignSelf: 'center',
        marginBottom: 15,
    },
    shareTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
        color: '#333',
    },
    shareOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    shareIconParams: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    shareOptionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 2,
    },
    shareOptionSub: {
        fontSize: 12,
        color: '#666',
    },
    postImagesContainer: {
        marginTop: 8,
    },
});

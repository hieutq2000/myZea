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
    ScrollView
} from 'react-native';
import { Ionicons, FontAwesome, MaterialIcons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getPosts, createPost, toggleLikePost, Post, uploadImage } from '../utils/api';
import { launchImageLibrary } from '../utils/imagePicker';

const { width } = Dimensions.get('window');

// --- Helper Date ---
const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = (now.getTime() - date.getTime()) / 1000; // seconds
    if (diff < 60) return 'Vừa xong';
    if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
    return date.toLocaleDateString('vi-VN');
};

interface PlaceScreenProps {
    user: any;
}

export default function PlaceScreen({ user }: PlaceScreenProps) {
    const [posts, setPosts] = useState<Post[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isPostModalVisible, setPostModalVisible] = useState(false);
    const [newPostContent, setNewPostContent] = useState('');
    const [newPostImage, setNewPostImage] = useState<string | null>(null);
    const [isPosting, setIsPosting] = useState(false);

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
        const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.8 });
        if (!result.didCancel && !result.error && result.assets && result.assets[0]) {
            setNewPostImage(result.assets[0].uri);
        } else if (result.error) {
            Alert.alert('Lỗi', 'Không thể chọn ảnh');
        }
    };

    const handleCreatePost = async () => {
        if (!newPostContent.trim() && !newPostImage) return;
        setIsPosting(true);
        try {
            let imageUrl = null;
            if (newPostImage) {
                imageUrl = await uploadImage(newPostImage);
            }

            const newPost = await createPost(newPostContent, imageUrl || undefined);
            setPosts([newPost, ...posts]);
            setNewPostContent('');
            setNewPostImage(null);
            setPostModalVisible(false);
        } catch (error) {
            console.error('Create post error:', error);
            Alert.alert('Lỗi', 'Không thể đăng bài viết. Vui lòng thử lại.');
        } finally {
            setIsPosting(false);
        }
    };

    const handleLike = async (postId: string) => {
        // Optimistic UI update
        setPosts(prev => prev.map(p => {
            if (p.id === postId) {
                return {
                    ...p,
                    likes: p.isLiked ? p.likes - 1 : p.likes + 1,
                    isLiked: !p.isLiked
                };
            }
            return p;
        }));

        try {
            await toggleLikePost(postId);
        } catch (error) {
            console.error('Like error', error);
        }
    };

    const renderHeader = () => (
        <LinearGradient
            colors={['#ffebd9', '#e0f8ff']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.header}
        >
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
                <TouchableOpacity style={[styles.circleButton, { backgroundColor: 'rgba(255,255,255,0.5)' }]}>
                    <Ionicons name="search" size={22} color="#333" />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.circleButton, { marginLeft: 12, backgroundColor: 'rgba(255,255,255,0.5)' }]}>
                    <MaterialIcons name="notifications-none" size={24} color="#FF5722" />
                </TouchableOpacity>
            </View>
        </LinearGradient>
    );

    const renderComposer = () => (
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
    );

    const renderPost = ({ item }: { item: Post }) => (
        <View style={styles.postCard}>
            {/* Post Header */}
            <View style={styles.postHeader}>
                <Image
                    source={{ uri: item.author.avatar || `https://ui-avatars.com/api/?name=${item.author.name}` }}
                    style={styles.postAvatar}
                />
                <View style={styles.postInfo}>
                    <Text style={styles.postAuthor}>{item.author.name}</Text>
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
                <Text style={styles.postText}>{item.content}</Text>
            </View>

            {/* Post Image */}
            {item.image && (
                <Image source={{ uri: item.image }} style={styles.postImage} resizeMode="cover" />
            )}

            {/* Post Stats */}
            <View style={styles.postStats}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ backgroundColor: '#1877F2', borderRadius: 10, padding: 2, marginRight: 4 }}>
                        <FontAwesome name="thumbs-up" size={10} color="white" />
                    </View>
                    <Text style={styles.viewCount}>{item.likes}</Text>
                </View>
                <Text style={styles.viewCount}>{item.comments} bình luận</Text>
            </View>

            {/* Post Actions */}
            <View style={styles.actionContainer}>
                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleLike(item.id)}
                >
                    <FontAwesome name={item.isLiked ? "thumbs-up" : "thumbs-o-up"} size={18} color={item.isLiked ? "#1877F2" : "#666"} />
                    <Text style={[styles.actionText, item.isLiked && { color: '#1877F2', fontWeight: 'bold' }]}>Thích</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton}>
                    <FontAwesome name="comment-o" size={18} color="#666" />
                    <Text style={styles.actionText}>Bình luận</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton}>
                    <FontAwesome name="share-square-o" size={18} color="#666" />
                    <Text style={styles.actionText}>Chia sẻ</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <SafeAreaView style={{ backgroundColor: '#fff' }}>
                <StatusBar barStyle="dark-content" backgroundColor="#fff" />
            </SafeAreaView>

            {renderHeader()}

            <FlatList
                data={posts}
                keyExtractor={item => item.id}
                renderItem={renderPost}
                refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
                ListHeaderComponent={() => (
                    <>
                        {renderComposer()}
                        <View style={styles.feedFilter}>
                            <View>
                                <Text style={styles.feedTitle}>Bảng Feed</Text>
                                <Text style={styles.feedSubtitle}>Phù hợp nhất</Text>
                            </View>
                            <TouchableOpacity>
                                <Ionicons name="options-outline" size={20} color="#666" />
                            </TouchableOpacity>
                        </View>
                    </>
                )}
                contentContainerStyle={{ paddingBottom: 20 }}
                ListEmptyComponent={() => (
                    <View style={{ padding: 20, alignItems: 'center' }}>
                        {isLoading ? <ActivityIndicator color="#0068FF" /> : <Text style={{ color: '#666' }}>Chưa có bài viết nào</Text>}
                    </View>
                )}
            />

            {/* Create Post Modal */}
            <Modal
                visible={isPostModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setPostModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <TouchableOpacity onPress={() => setPostModalVisible(false)}>
                                <Ionicons name="close" size={24} color="#333" />
                            </TouchableOpacity>
                            <Text style={styles.modalTitle}>Tạo bài viết</Text>
                            <TouchableOpacity
                                onPress={handleCreatePost}
                                disabled={isPosting || !newPostContent.trim()}
                                style={[styles.postButton, (!newPostContent.trim() || isPosting) && styles.postButtonDisabled]}
                            >
                                {isPosting ? <ActivityIndicator color="white" size="small" /> : <Text style={styles.postButtonText}>Đăng</Text>}
                            </TouchableOpacity>
                        </View>

                        <View style={styles.modalBody}>
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
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F0F2F5', // Light gray background for feed
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        // backgroundColor: '#fff', // Removed for gradient
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)', // Softer border
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
        padding: 16,
        backgroundColor: '#fff',
        marginTop: 8,
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
        marginTop: 8,
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
});

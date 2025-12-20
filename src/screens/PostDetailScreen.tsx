import React, { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Image,
    TouchableOpacity,
    FlatList,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Alert,
    Keyboard,
    ImageBackground,
    ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome, Feather } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { RootStackParamList } from '../navigation/types';
import { Post, Comment, getComments, createComment, toggleLikePost, getCurrentUser } from '../utils/api';
import { useTheme } from '../context/ThemeContext';
import { formatTime } from '../utils/formatTime';
import FacebookImageViewer from '../components/FacebookImageViewer';
import TextWithSeeMore from '../components/TextWithSeeMore';
import * as ImagePicker from 'expo-image-picker';
import VideoPlayer from '../components/VideoPlayer';
import { isVideo, getAvatarUri } from '../utils/media';

const REACTIONS = [
    { id: 'like', icon: 'https://media.giphy.com/media/l4pTfx2qLszoacZRS/giphy.gif', label: 'Thích', color: '#1877F2' },
    { id: 'love', icon: 'https://media.giphy.com/media/26AHIbtfGwc723iq4/giphy.gif', label: 'Yêu thích', color: '#F63459' },
    { id: 'care', icon: 'https://media.giphy.com/media/1HpM3Zt6n8M8vXN6/giphy.gif', label: 'Thương thương', color: '#F7B928' },
    { id: 'haha', icon: 'https://media.giphy.com/media/f9EmLg7q3f3Q2f3Q2/giphy.gif', label: 'Haha', color: '#F7B928' },
    { id: 'wow', icon: 'https://media.giphy.com/media/3o7TKr3nzbh5WgCFxe/giphy.gif', label: 'Wow', color: '#F7B928' },
    { id: 'sad', icon: 'https://media.giphy.com/media/l2Jhr7o2c0V2M/giphy.gif', label: 'Buồn', color: '#F7B928' },
    { id: 'angry', icon: 'https://media.giphy.com/media/3o9bJX4O9ShW1L/giphy.gif', label: 'Phẫn nộ', color: '#E4605E' },
];

type PostDetailRouteProp = RouteProp<RootStackParamList, 'PostDetail'>;

export default function PostDetailScreen() {
    const navigation = useNavigation();
    const route = useRoute<PostDetailRouteProp>();
    const { postId } = route.params;
    const { colors, isDark } = useTheme();

    // State
    const [post, setPost] = useState<Post | null>(null); // In real app, pass full post or fetch
    // For now, we assume we fetch it or pass it. To keep it simple, we fetch comments only, 
    // but ideally we should pass the post object via params or context store.
    // Let's rely on params passing full post object OR fetch again? 
    // Since we only passed postId, let's fetch the single post details?
    // Actually, usually we pass the post object to avoid loading.
    // For this demo, let's assume we navigate with params.post (need to update type) 
    // OR we just fetch the post list again and find it? (Inefficient).
    // Let's Update navigation type to accept 'post' object optionally.
    // But user asked for simple flow. I'll mock the post retrieval by fetching all and finding (not ideal but works for now without backend change).

    // Correction: We already have 'getPosts'. I'll use a hack to find from 'getPosts' cache if possible, or just fetch all.
    // BETTER approach: The user wants "just like facebook". 
    // Let's fetch comments.

    // TEMPORARY: Since I didn't add 'getSinglePost' API, and I don't want to overcomplicate,
    // I will modify 'PlaceScreen' to pass the ENTIRE post object in navigation.
    // But 'RootStackParamList' is defined as { postId: string }.
    // Let's use route.params as any for flexibility now to access 'post' object if passed.

    const passedPost = (route.params as any).post as Post;

    const [comments, setComments] = useState<Comment[]>([]);
    const [isLoadingComments, setIsLoadingComments] = useState(true);
    const [commentText, setCommentText] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [currentUser, setCurrentUser] = useState<any>(null);

    const flatListRef = useRef<FlatList>(null);

    // Image Viewer State
    const [isImageViewerVisible, setIsImageViewerVisible] = useState(false);
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);
    // Comment Input Images
    const [commentImages, setCommentImages] = useState<string[]>([]); // Preview uris

    // Wrapper for viewing comment images vs post images
    const [viewerImages, setViewerImages] = useState<string[]>([]);

    // Pick Images for Comment - memoized to prevent re-render
    const handlePickCommentImages = useCallback(async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.8,
            allowsMultipleSelection: true, // Expo 46+
        });

        if (!result.canceled && result.assets) {
            setCommentImages(prev => [...prev, ...result.assets.map(a => a.uri)]);
        }
    }, []);

    const removeCommentImage = useCallback((index: number) => {
        setCommentImages(prev => prev.filter((_, i) => i !== index));
    }, []);

    // Prepare images for viewer - memoized to prevent re-render on text input
    const postImages = useMemo(() => {
        if (!passedPost) return [];
        if (passedPost.images && passedPost.images.length > 0) {
            return passedPost.images.map(img => typeof img === 'string' ? img : img.uri);
        }
        if (passedPost.image) {
            return [typeof passedPost.image === 'string' ? passedPost.image : passedPost.image.uri];
        }
        return [];
    }, [passedPost]);

    const openImageViewer = useCallback((index: number) => {
        setSelectedImageIndex(index);
        setIsImageViewerVisible(true);
    }, []);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const user = await getCurrentUser();
        setCurrentUser(user);

        try {
            const data = await getComments(postId);
            setComments(data);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoadingComments(false);
        }
    };

    const handleSendComment = useCallback(async () => {
        if (!commentText.trim() && commentImages.length === 0) return;

        setIsSending(true);
        try {
            // Note: API createComment currently mostly supports text. 
            // We simulate image attach by sending text or mocking response update

            // TODO: Upload images to server here using formData
            // const uploadedImages = await uploadImages(commentImages);

            const newComment = await createComment(postId, commentText);

            // Mock adding images to the local comment object purely for UI demo
            // In real app, backend returns the comment with images
            const commentWithImages = {
                ...newComment,
                images: commentImages.length > 0 ? [...commentImages] : undefined
            };

            setComments(prev => [...prev, commentWithImages]);
            setCommentText('');
            setCommentImages([]); // Clear images
            Keyboard.dismiss();

            // Scroll to bottom
            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);

        } catch (error) {
            Alert.alert('Lỗi', 'Không thể gửi bình luận');
        } finally {
            setIsSending(false);
        }
    }, [postId, commentText, commentImages]);

    // --- Render Items ---

    const renderHeader = () => (
        <LinearGradient
            colors={colors.headerGradient}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.header}
        >
            <SafeAreaView>
                <View style={styles.headerContent}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="chevron-back" size={28} color={isDark ? '#FFF' : '#000'} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: isDark ? '#FFF' : '#000' }]}>Bình luận</Text>
                    <TouchableOpacity style={styles.headerRightButton}>
                        <Ionicons name="search" size={24} color={isDark ? '#FFF' : '#000'} />
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </LinearGradient>
    );

    // Memoized post content to prevent re-render when typing in comment input
    const postContentMemo = useMemo(() => {
        if (!passedPost) return null;
        return (
            <View style={[styles.postCard, { backgroundColor: colors.card }]}>
                {/* Post Header */}
                <View style={styles.postHeader}>
                    <Image
                        source={{ uri: getAvatarUri(passedPost.author.avatar, passedPost.author.name) }}
                        style={styles.postAvatar}
                    />
                    <View style={styles.postInfo}>
                        <Text style={[styles.postAuthor, { color: colors.text }]}>{passedPost.author.name}</Text>
                        <View style={styles.postMeta}>
                            <Text style={styles.postTime}>{formatTime(passedPost.createdAt)}</Text>
                            <Text style={styles.dot}>•</Text>
                            <Ionicons name="earth" size={12} color="#666" />
                        </View>
                    </View>
                </View>

                {/* Post Content */}
                <View style={styles.postContent}>
                    <TextWithSeeMore text={passedPost.content} style={StyleSheet.flatten([styles.postText, { color: colors.text }])} />
                </View>

                {/* Post Media (Video or Images) */}
                {postImages.length > 0 && (
                    <View style={styles.mediaContainer}>
                        {/* Check if first item is video */}
                        {isVideo(postImages[0]) ? (
                            <VideoPlayer
                                source={postImages[0]}
                                style={{ width: '100%', height: 300 }}
                                paused={true}
                                useNativeControls={false}
                                showFullscreenButton={true}
                            />
                        ) : (
                            // Existing Image Grid Logic
                            <>
                                {postImages.length === 1 && (
                                    <TouchableOpacity onPress={() => openImageViewer(0)}>
                                        <Image source={{ uri: postImages[0] }} style={[styles.postImage, { height: 300 }]} resizeMode="cover" />
                                    </TouchableOpacity>
                                )}
                                {postImages.length === 2 && (
                                    <View style={{ flexDirection: 'row', height: 300 }}>
                                        <TouchableOpacity style={{ flex: 1, marginRight: 2 }} onPress={() => openImageViewer(0)}>
                                            <Image source={{ uri: postImages[0] }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                                        </TouchableOpacity>
                                        <TouchableOpacity style={{ flex: 1, marginLeft: 2 }} onPress={() => openImageViewer(1)}>
                                            <Image source={{ uri: postImages[1] }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                                        </TouchableOpacity>
                                    </View>
                                )}
                                {postImages.length === 3 && (
                                    <View style={{ flexDirection: 'row', height: 300 }}>
                                        <TouchableOpacity style={{ flex: 2, marginRight: 2 }} onPress={() => openImageViewer(0)}>
                                            <Image source={{ uri: postImages[0] }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                                        </TouchableOpacity>
                                        <View style={{ flex: 1, marginLeft: 2 }}>
                                            <TouchableOpacity style={{ flex: 1, marginBottom: 2 }} onPress={() => openImageViewer(1)}>
                                                <Image source={{ uri: postImages[1] }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                                            </TouchableOpacity>
                                            <TouchableOpacity style={{ flex: 1, marginTop: 2 }} onPress={() => openImageViewer(2)}>
                                                <Image source={{ uri: postImages[2] }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                )}
                                {postImages.length >= 4 && (
                                    <View style={{ flexDirection: 'row', height: 300 }}>
                                        <View style={{ flex: 2, marginRight: 2 }}>
                                            <TouchableOpacity style={{ flex: 1 }} onPress={() => openImageViewer(0)}>
                                                <Image source={{ uri: postImages[0] }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                                            </TouchableOpacity>
                                        </View>
                                        <View style={{ flex: 1, marginLeft: 2 }}>
                                            <TouchableOpacity style={{ flex: 1, marginBottom: 2 }} onPress={() => openImageViewer(1)}>
                                                <Image source={{ uri: postImages[1] }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                                            </TouchableOpacity>
                                            <TouchableOpacity style={{ flex: 1, marginVertical: 2 }} onPress={() => openImageViewer(2)}>
                                                <Image source={{ uri: postImages[2] }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                                            </TouchableOpacity>
                                            <TouchableOpacity style={{ flex: 1, marginTop: 2 }} onPress={() => openImageViewer(3)}>
                                                <ImageBackground source={{ uri: postImages[3] }} style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' }} resizeMode="cover">
                                                    {postImages.length > 4 && (
                                                        <View style={{ backgroundColor: 'rgba(0,0,0,0.5)', ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' }}>
                                                            <Text style={{ color: '#fff', fontSize: 20, fontWeight: 'bold' }}>+{postImages.length - 4}</Text>
                                                        </View>
                                                    )}
                                                </ImageBackground>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                )}
                            </>
                        )}
                    </View>
                )}

                {/* Minimal Stats */}
                <View style={styles.postStats}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={{ backgroundColor: '#1877F2', width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 4 }}>
                            <FontAwesome name="thumbs-up" size={9} color="white" />
                        </View>
                        <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{passedPost.likes}</Text>
                    </View>
                    <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{comments.length} bình luận</Text>
                </View>
            </View>
        );
    }, [passedPost, postImages, colors, isDark, comments.length]);

    const renderPostContent = useCallback(() => postContentMemo, [postContentMemo]);

    const renderCommentItem = useCallback(({ item }: { item: any }) => ( // Use any to support temporary 'images' prop
        <View style={styles.commentItem}>
            <Image
                source={{ uri: getAvatarUri(item.user.avatar, item.user.name) }}
                style={styles.commentAvatar}
            />
            <View style={styles.commentRight}>
                <View style={[styles.commentBubble, { backgroundColor: isDark ? '#3A3B3C' : '#F0F2F5' }]}>
                    <Text style={[styles.commentAuthor, { color: colors.text }]}>{item.user.name}</Text>
                    {item.content ? <TextWithSeeMore text={item.content} style={StyleSheet.flatten([styles.commentContent, { color: colors.text }])} /> : null}

                    {/* Comment Images */}
                    {item.images && item.images.length > 0 && (
                        <View style={{ marginTop: 8 }}>
                            <TouchableOpacity onPress={() => {
                                setViewerImages(item.images);
                                setSelectedImageIndex(0);
                                setIsImageViewerVisible(true);
                            }}>
                                <Image
                                    source={{ uri: item.images[0] }}
                                    style={{ width: 200, height: 200, borderRadius: 8 }}
                                    resizeMode="cover"
                                />
                                {item.images.length > 1 && (
                                    <View style={{
                                        position: 'absolute', right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)',
                                        padding: 4, borderTopLeftRadius: 8, borderBottomRightRadius: 8
                                    }}>
                                        <Text style={{ color: '#fff', fontSize: 12 }}>+{item.images.length - 1}</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
                <View style={styles.commentActions}>
                    <Text style={styles.commentTime}>{formatTime(item.createdAt)}</Text>
                    <TouchableOpacity><Text style={styles.commentActionBtn}>Thích</Text></TouchableOpacity>
                    <TouchableOpacity><Text style={styles.commentActionBtn}>Phản hồi</Text></TouchableOpacity>
                </View>
            </View>
        </View>
    ), [isDark, colors.text]);

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {renderHeader()}

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            >
                <FlatList
                    ref={flatListRef}
                    data={comments}
                    keyExtractor={item => item.id}
                    renderItem={renderCommentItem}
                    ListHeaderComponent={renderPostContent}
                    contentContainerStyle={{ paddingBottom: 20 }}
                    ListEmptyComponent={() => (
                        <View style={{ padding: 20, alignItems: 'center' }}>
                            {isLoadingComments ? (
                                <ActivityIndicator color={colors.primary} />
                            ) : (
                                <Text style={{ color: colors.textSecondary }}>Chưa có bình luận nào.</Text>
                            )}
                        </View>
                    )}
                    style={{ flex: 1 }}
                    removeClippedSubviews={true}
                    keyboardShouldPersistTaps="handled"
                    maxToRenderPerBatch={10}
                    windowSize={5}
                    initialNumToRender={10}
                    updateCellsBatchingPeriod={50}
                />

                {/* Input Bar - Fixed at bottom */}
                <View style={[styles.inputContainer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
                    {/* Image Preview in Input */}
                    {commentImages.length > 0 && (
                        <View style={{ flexDirection: 'row', paddingHorizontal: 10, paddingBottom: 10 }}>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                {commentImages.map((uri, index) => (
                                    <View key={index} style={{ marginRight: 8 }}>
                                        <Image source={{ uri }} style={{ width: 60, height: 60, borderRadius: 8 }} />
                                        <TouchableOpacity
                                            onPress={() => removeCommentImage(index)}
                                            style={{ position: 'absolute', top: -5, right: -5, backgroundColor: '#ddd', borderRadius: 10 }}
                                        >
                                            <Ionicons name="close-circle" size={20} color="#333" />
                                        </TouchableOpacity>
                                    </View>
                                ))}
                            </ScrollView>
                        </View>
                    )}

                    <View style={styles.footerInputContainer}>
                        <TouchableOpacity style={styles.footerIconBtn} onPress={handlePickCommentImages}>
                            <Ionicons name="camera-outline" size={24} color={isDark ? '#FFF' : '#666'} />
                        </TouchableOpacity>
                        <View style={[styles.inputWrapper, { backgroundColor: isDark ? '#3A3B3C' : '#F0F2F5' }]}>
                            <TextInput
                                style={[styles.input, { color: colors.text }]}
                                placeholder="Viết bình luận..."
                                placeholderTextColor={colors.textSecondary}
                                value={commentText}
                                onChangeText={setCommentText}
                                multiline
                            />
                        </View>
                        <TouchableOpacity
                            style={[styles.sendButton, (!commentText.trim() && commentImages.length === 0) && styles.sendButtonDisabled]}
                            onPress={handleSendComment}
                            disabled={(!commentText.trim() && commentImages.length === 0) || isSending}
                        >
                            {isSending ? (
                                <ActivityIndicator size="small" color="#1877F2" />
                            ) : (
                                <Ionicons name="send" size={22} color="#1877F2" />
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>

            {/* Image Viewer */}
            {isImageViewerVisible && (
                <FacebookImageViewer
                    images={viewerImages.length > 0 ? viewerImages : postImages}
                    visible={isImageViewerVisible}
                    onClose={() => {
                        setIsImageViewerVisible(false);
                        setViewerImages([]);
                    }}
                    imageIndex={selectedImageIndex}
                    post={passedPost}
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
        paddingTop: Platform.OS === 'android' ? 30 : 0,
        backgroundColor: 'transparent',
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingVertical: 12,
    },
    backButton: {
        padding: 4,
    },
    headerRightButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    postCard: {
        paddingBottom: 12,
        marginBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
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
        lineHeight: 22,
    },
    postImage: {
        width: '100%',
        height: 250,
    },
    mediaContainer: {
        marginTop: 8,
    },
    postStats: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 12,
        paddingHorizontal: 12,
    },
    // Footer Styles
    footer: {
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderTopWidth: 1,
    },
    footerInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    footerIconBtn: {
        padding: 8,
    },
    sendButton: {
        padding: 8,
        marginLeft: 4,
    },
    sendButtonDisabled: {
        opacity: 0.5,
    },
    // Comments
    commentItem: {
        flexDirection: 'row',
        paddingHorizontal: 12,
        marginBottom: 12,
    },
    commentAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        marginRight: 8,
    },
    commentRight: {
        flex: 1,
    },
    commentBubble: {
        borderRadius: 18,
        paddingHorizontal: 12,
        paddingVertical: 8,
        alignSelf: 'flex-start',
    },
    commentAuthor: {
        fontWeight: 'bold',
        fontSize: 13,
        marginBottom: 2,
    },
    commentContent: {
        fontSize: 15,
        lineHeight: 20,
    },
    commentActions: {
        flexDirection: 'row',
        marginTop: 4,
        marginLeft: 12,
    },
    commentTime: {
        fontSize: 12,
        color: '#666',
        marginRight: 12,
    },
    commentActionBtn: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#666',
        marginRight: 12,
    },
    // Input
    inputContainer: {
        paddingHorizontal: 8,
        paddingVertical: 8,
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
    inputAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        marginRight: 8,
        marginBottom: 4,
    },
    inputWrapper: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 20,
        paddingHorizontal: 12,
        minHeight: 40,
    },
    input: {
        flex: 1,
        fontSize: 15,
        maxHeight: 100,
        paddingVertical: 8,
    },
    emojiBtn: {
        padding: 4,
    },
    sendBtn: {
        padding: 8,
        marginLeft: 4,
        marginBottom: 0,
    },
});

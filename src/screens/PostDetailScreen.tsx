import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Image,
    TouchableOpacity,
    FlatList,
    SafeAreaView,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Alert,
    Keyboard
} from 'react-native';
import { Ionicons, FontAwesome, Feather } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { RootStackParamList } from '../navigation/types';
import { Post, Comment, getComments, createComment, toggleLikePost, getCurrentUser } from '../utils/api';
import { useTheme } from '../context/ThemeContext';

// --- Helper Functions ---
const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = (now.getTime() - date.getTime()) / 1000;
    if (diff < 60) return 'Vừa xong';
    if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
    return date.toLocaleDateString('vi-VN');
};

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

    const handleSendComment = async () => {
        if (!commentText.trim()) return;

        setIsSending(true);
        try {
            const newComment = await createComment(postId, commentText);
            setComments([...comments, newComment]);
            setCommentText('');
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
    };

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

    const renderPostContent = () => {
        if (!passedPost) return null;
        return (
            <View style={[styles.postCard, { backgroundColor: colors.card }]}>
                {/* Post Header */}
                <View style={styles.postHeader}>
                    <Image
                        source={{ uri: passedPost.author.avatar || `https://ui-avatars.com/api/?name=${passedPost.author.name}` }}
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
                    <Text style={[styles.postText, { color: colors.text }]}>{passedPost.content}</Text>
                </View>

                {/* Post Image */}
                {passedPost.image && (
                    <Image source={{ uri: passedPost.image }} style={styles.postImage} resizeMode="cover" />
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
    };

    const renderCommentItem = ({ item }: { item: Comment }) => (
        <View style={styles.commentItem}>
            <Image
                source={{ uri: item.user.avatar || `https://ui-avatars.com/api/?name=${item.user.name}` }}
                style={styles.commentAvatar}
            />
            <View style={styles.commentRight}>
                <View style={[styles.commentBubble, { backgroundColor: isDark ? '#3A3B3C' : '#F0F2F5' }]}>
                    <Text style={[styles.commentAuthor, { color: colors.text }]}>{item.user.name}</Text>
                    <Text style={[styles.commentContent, { color: colors.text }]}>{item.content}</Text>
                </View>
                <View style={styles.commentActions}>
                    <Text style={styles.commentTime}>{formatTime(item.createdAt)}</Text>
                    <Text style={styles.commentActionBtn}>Thích</Text>
                    <Text style={styles.commentActionBtn}>Phản hồi</Text>
                </View>
            </View>
        </View>
    );

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
                    contentContainerStyle={{ paddingBottom: 80 }}
                    ListEmptyComponent={() => (
                        <View style={{ padding: 20, alignItems: 'center' }}>
                            {isLoadingComments ? (
                                <ActivityIndicator color={colors.primary} />
                            ) : (
                                <Text style={{ color: colors.textSecondary }}>Chưa có bình luận nào.</Text>
                            )}
                        </View>
                    )}
                />

                {/* Input Bar */}
                <View style={[styles.inputContainer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
                    <Image
                        source={{ uri: currentUser?.avatar || `https://ui-avatars.com/api/?name=${currentUser?.name || 'Me'}` }}
                        style={styles.inputAvatar}
                    />
                    <View style={[styles.inputWrapper, { backgroundColor: isDark ? '#3A3B3C' : '#F0F2F5' }]}>
                        <TextInput
                            style={[styles.input, { color: colors.text }]}
                            placeholder="Viết bình luận..."
                            placeholderTextColor={colors.textSecondary}
                            multiline
                            value={commentText}
                            onChangeText={setCommentText}
                        />
                        <TouchableOpacity style={styles.emojiBtn}>
                            <Ionicons name="happy-outline" size={24} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>
                    <TouchableOpacity
                        onPress={handleSendComment}
                        disabled={!commentText.trim() || isSending}
                        style={[styles.sendBtn]}
                    >
                        <Ionicons
                            name="send"
                            size={24}
                            color={commentText.trim() ? '#0084FF' : colors.textSecondary}
                        />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
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
    postStats: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingTop: 12,
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
        flexDirection: 'row',
        alignItems: 'flex-end',
        padding: 8,
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

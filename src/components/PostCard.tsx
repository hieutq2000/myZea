import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Image,
    TouchableOpacity,
    Dimensions,
} from 'react-native';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import { Post } from '../utils/api';
import { formatTime } from '../utils/formatTime';
import { isVideo, getUri, getAvatarUri } from '../utils/media';
import VideoPlayer from './VideoPlayer';
import PhotoGrid from './PhotoGrid';
import TextWithSeeMore from './TextWithSeeMore';
import { ReactionButton, getReactionById, REACTIONS, Reaction } from './FacebookReactions';

const { width } = Dimensions.get('window');

interface PostCardProps {
    post: Post;
    currentUser: any;
    localReaction?: string; // Current user's reaction to this post
    onReaction: (postId: string, reactionId: string | null) => void;
    onComment: (post: Post) => void;
    onShare: (post: Post) => void;
    onViewProfile?: (user: any) => void;
    onViewGroup?: (groupId: string) => void;
    onImagePress?: (post: Post, index: number) => void;
    onLinkPress?: (url: string) => void;
}

export default function PostCard({
    post,
    currentUser,
    localReaction,
    onReaction,
    onComment,
    onShare,
    onViewProfile,
    onViewGroup,
    onImagePress,
    onLinkPress,
}: PostCardProps) {
    // Get current reaction object from ID
    const selectedReaction = localReaction ? getReactionById(localReaction) || null : null;

    // Get images array
    const postImages = post.images && post.images.length > 0
        ? post.images
        : (post.image ? [post.image] : []);

    // Check if single video
    const isSingleVideo = (postImages.length === 1 || (!postImages.length && post.image))
        && isVideo(getUri(postImages[0] || post.image || ''));

    return (
        <View style={styles.postCard}>
            {/* Post Header */}
            <View style={styles.postHeader}>
                {post.group ? (
                    // GROUP POST HEADER
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                        <View style={{ marginRight: 12 }}>
                            <TouchableOpacity onPress={() => onViewGroup?.(post.group!.id)}>
                                <Image
                                    source={{ uri: getAvatarUri(post.group.avatar, post.group.name) }}
                                    style={styles.groupAvatar}
                                />
                            </TouchableOpacity>
                            <Image
                                source={{ uri: getAvatarUri(post.author.avatar, post.author.name) }}
                                style={styles.groupUserAvatar}
                            />
                        </View>
                        <View style={{ flex: 1 }}>
                            <TouchableOpacity onPress={() => onViewGroup?.(post.group!.id)}>
                                <Text style={styles.postAuthor}>{post.group.name}</Text>
                            </TouchableOpacity>
                            <View style={styles.postMeta}>
                                <TouchableOpacity onPress={() => post.author.id !== currentUser?.id && onViewProfile?.(post.author)}>
                                    <Text style={styles.groupAuthorName}>{post.author.name}</Text>
                                </TouchableOpacity>
                                <Text style={styles.dot}>•</Text>
                                <Text style={styles.postTime}>{formatTime(post.createdAt)}</Text>
                                <Text style={styles.dot}>•</Text>
                                <Ionicons name="earth" size={12} color="#65676B" />
                            </View>
                        </View>
                        <TouchableOpacity style={styles.moreButton}>
                            <Ionicons name="ellipsis-horizontal" size={20} color="#666" />
                        </TouchableOpacity>
                    </View>
                ) : (
                    // NORMAL POST HEADER
                    <>
                        <TouchableOpacity onPress={() => post.author.id !== currentUser?.id && onViewProfile?.(post.author)}>
                            <Image
                                source={{ uri: getAvatarUri(post.author.avatar, post.author.name) }}
                                style={styles.postAvatar}
                            />
                        </TouchableOpacity>
                        <View style={styles.postInfo}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                                <TouchableOpacity onPress={() => post.author.id !== currentUser?.id && onViewProfile?.(post.author)}>
                                    <Text style={styles.postAuthor}>{post.author.name}</Text>
                                </TouchableOpacity>
                                {post.taggedUsers && post.taggedUsers.length > 0 && (
                                    <Text style={{ fontWeight: '400', color: '#333' }}>
                                        {' cùng với '}
                                        <Text style={{ fontWeight: 'bold' }}>{post.taggedUsers[0].name}</Text>
                                        {post.taggedUsers.length > 1 && (
                                            <Text style={{ fontWeight: '400' }}>
                                                {' và '}
                                                <Text style={{ fontWeight: 'bold' }}>{post.taggedUsers.length - 1} người khác</Text>
                                            </Text>
                                        )}
                                    </Text>
                                )}
                            </View>
                            <View style={styles.postMeta}>
                                <Text style={styles.postTime}>{formatTime(post.createdAt)}</Text>
                                <Text style={styles.dot}>•</Text>
                                <Ionicons name="earth" size={12} color="#666" />
                            </View>
                        </View>
                        <TouchableOpacity style={styles.moreButton}>
                            <Ionicons name="ellipsis-horizontal" size={20} color="#666" />
                        </TouchableOpacity>
                    </>
                )}
            </View>

            {/* Post Content */}
            <View style={styles.postContent}>
                <TextWithSeeMore text={post.content} onLinkPress={onLinkPress} />
            </View>

            {/* Post Media */}
            {post.originalPost ? (
                // SHARED POST
                <View style={styles.sharedContainer}>
                    <View style={styles.sharedHeader}>
                        <Image
                            source={{ uri: getAvatarUri(post.originalPost.author.avatar, post.originalPost.author.name) }}
                            style={styles.sharedAvatar}
                        />
                        <View>
                            <Text style={styles.sharedAuthor}>{post.originalPost.author.name}</Text>
                            <Text style={styles.sharedTime}>{formatTime(post.originalPost.createdAt)}</Text>
                        </View>
                    </View>
                    {post.originalPost.content && <Text style={styles.sharedContent}>{post.originalPost.content}</Text>}
                    <PhotoGrid
                        images={post.originalPost.images && post.originalPost.images.length > 0
                            ? post.originalPost.images
                            : (post.originalPost.image ? [post.originalPost.image] : [])}
                        onPressImage={(index) => onImagePress?.(post.originalPost!, index)}
                    />
                </View>
            ) : (
                // NORMAL POST MEDIA
                <View style={styles.postImagesContainer}>
                    {isSingleVideo ? (
                        (() => {
                            const videoSource = postImages[0] || post.image;
                            const videoUri = getUri(videoSource);
                            const videoDimensions = typeof videoSource === 'object' ? videoSource : null;
                            return (
                                <VideoPlayer
                                    source={videoUri}
                                    style={{ width: '100%' }}
                                    videoWidth={videoDimensions?.width}
                                    videoHeight={videoDimensions?.height}
                                />
                            );
                        })()
                    ) : (
                        <PhotoGrid
                            images={postImages}
                            onPressImage={(index) => onImagePress?.(post, index)}
                        />
                    )}
                </View>
            )}

            {/* Post Stats */}
            <View style={styles.postStats}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    {post.likes > 0 && (
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <View style={{ flexDirection: 'row', marginRight: 6 }}>
                                <View style={styles.likeIcon}>
                                    <FontAwesome name="thumbs-up" size={9} color="white" />
                                </View>
                                {post.likes > 1 && (
                                    <View style={styles.heartIcon}>
                                        <FontAwesome name="heart" size={9} color="white" />
                                    </View>
                                )}
                            </View>
                            <Text style={styles.reactionCount}>{post.likes}</Text>
                        </View>
                    )}
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {post.comments > 0 && <Text style={styles.statsText}>{post.comments} bình luận</Text>}
                    {post.comments > 0 && post.views > 0 && <Text style={styles.statsText}> • </Text>}
                    {post.views > 0 && <Text style={styles.statsText}>{post.views} người đã xem</Text>}
                </View>
            </View>

            {/* Post Actions */}
            <View style={styles.actionContainer}>
                <ReactionButton
                    selectedReaction={selectedReaction}
                    onReactionSelect={(reaction) => {
                        onReaction(post.id, reaction?.id || null);
                    }}
                    buttonStyle={styles.actionButton}
                />

                <TouchableOpacity style={styles.actionButton} onPress={() => onComment(post)}>
                    <FontAwesome name="comment-o" size={18} color="#666" />
                    <Text style={styles.actionText}>Bình luận</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionButton} onPress={() => onShare(post)}>
                    <FontAwesome name="share-square-o" size={18} color="#666" />
                    <Text style={styles.actionText}>Chia sẻ</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    postCard: {
        backgroundColor: '#fff',
        marginBottom: 8,
        paddingVertical: 12,
    },
    postHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        marginBottom: 8,
    },
    postAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 10,
    },
    groupAvatar: {
        width: 40,
        height: 40,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#eee',
    },
    groupUserAvatar: {
        width: 20,
        height: 20,
        borderRadius: 10,
        position: 'absolute',
        bottom: -2,
        right: -4,
        borderWidth: 1.5,
        borderColor: 'white',
    },
    postInfo: {
        flex: 1,
    },
    postAuthor: {
        fontWeight: '600',
        fontSize: 15,
        color: '#1C1E21',
    },
    groupAuthorName: {
        fontSize: 12,
        color: '#65676B',
        fontWeight: '500',
    },
    postMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
    },
    postTime: {
        fontSize: 12,
        color: '#65676B',
    },
    dot: {
        marginHorizontal: 4,
        color: '#65676B',
    },
    moreButton: {
        padding: 4,
    },
    postContent: {
        paddingHorizontal: 12,
        marginBottom: 8,
    },
    postImagesContainer: {
        // Container for images/videos
    },
    sharedContainer: {
        marginHorizontal: 12,
        borderWidth: 1,
        borderColor: '#E4E6EB',
        borderRadius: 8,
        overflow: 'hidden',
    },
    sharedHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
    },
    sharedAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        marginRight: 8,
    },
    sharedAuthor: {
        fontWeight: '600',
        fontSize: 14,
        color: '#1C1E21',
    },
    sharedTime: {
        fontSize: 12,
        color: '#65676B',
    },
    sharedContent: {
        paddingHorizontal: 12,
        paddingBottom: 8,
        fontSize: 14,
        color: '#1C1E21',
    },
    postStats: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderBottomWidth: 0.5,
        borderBottomColor: '#E4E6EB',
    },
    likeIcon: {
        backgroundColor: '#1877F2',
        width: 18,
        height: 18,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: 'white',
    },
    heartIcon: {
        backgroundColor: '#F33E58',
        width: 18,
        height: 18,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: -6,
        borderWidth: 1.5,
        borderColor: 'white',
    },
    reactionCount: {
        fontSize: 14,
        color: '#65676B',
    },
    statsText: {
        fontSize: 13,
        color: '#65676B',
    },
    actionContainer: {
        flexDirection: 'row',
        paddingHorizontal: 4,
        paddingTop: 4,
        position: 'relative',
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
    },
    actionText: {
        marginLeft: 6,
        fontSize: 13,
        color: '#65676B',
        fontWeight: '500',
    },
});

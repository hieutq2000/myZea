import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions, Platform } from 'react-native';
import ImageViewing from 'react-native-image-viewing';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Post } from '../utils/api';

const { width, height } = Dimensions.get('window');

interface FacebookImageViewerProps {
    visible: boolean;
    images: string[];
    imageIndex: number;
    onClose: () => void;
    post: Post; // To display stats and handle actions
    onLike?: () => void;
    onComment?: () => void;
}

export default function FacebookImageViewer({ visible, images, imageIndex, onClose, post, onLike, onComment }: FacebookImageViewerProps) {

    const renderHeader = () => (
        <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={28} color="white" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuButton}>
                <Ionicons name="ellipsis-horizontal" size={24} color="white" />
            </TouchableOpacity>
        </View>
    );

    const renderFooter = () => (
        <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.9)']}
            style={styles.footer}
        >
            {/* Top Comments Preview (Fake/Simulated for visual match) */}
            <View style={styles.topComments}>
                <View style={styles.commentRow}>
                    <Image
                        source={{ uri: `https://ui-avatars.com/api/?name=Huy+Nguyen&background=random` }}
                        style={styles.commentAvatar}
                    />
                    <View style={styles.commentContent}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={styles.commentAuthor}>Huy Nguyen <Text style={styles.commentTime}>• 8 phút</Text></Text>
                        </View>
                        <Text style={styles.commentText}>Ảnh đẹp quá bạn ơi! 😍</Text>
                        <View style={styles.commentActions}>
                            <Text style={styles.commentActionText}>Trả lời</Text>
                            <View style={styles.commentLikeBadge}>
                                <FontAwesome name="thumbs-up" size={10} color="#1877F2" />
                                <Text style={styles.commentLikeCount}>1</Text>
                            </View>
                        </View>
                    </View>
                </View>
            </View>

            {/* Post Info */}
            <View style={styles.postInfoContainer}>
                {/* Author */}
                <View style={styles.authorRow}>
                    <Text style={styles.authorName}>{post.author.name}</Text>
                    <Text style={styles.postTime}> • 1 giờ</Text>
                </View>

                {/* Caption */}
                <Text style={styles.caption} numberOfLines={2}>
                    {post.content}
                </Text>

                {/* Stats */}
                <View style={styles.statsRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <FontAwesome name="thumbs-up" size={14} color="#1877F2" />
                        <Text style={styles.statsText}>{post.likes}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <FontAwesome name="comment" size={14} color="#fff" />
                        <Text style={styles.statsText}>{post.comments}</Text>
                        <FontAwesome name="share" size={14} color="#fff" style={{ marginLeft: 12 }} />
                    </View>
                </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionRow}>
                <TouchableOpacity style={styles.actionButton} onPress={onLike}>
                    <FontAwesome name={post.isLiked ? "thumbs-up" : "thumbs-o-up"} size={20} color={post.isLiked ? "#1877F2" : "white"} />
                    <Text style={[styles.actionBtnText, post.isLiked && { color: '#1877F2' }]}>Thích</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton} onPress={onComment}>
                    <FontAwesome name="comment-o" size={20} color="white" />
                    <Text style={styles.actionBtnText}>Bình luận</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton}>
                    <FontAwesome name="share-square-o" size={20} color="white" />
                    <Text style={styles.actionBtnText}>Chia sẻ</Text>
                </TouchableOpacity>
            </View>
        </LinearGradient>
    );

    return (
        <ImageViewing
            images={images.map(uri => ({ uri }))}
            imageIndex={imageIndex}
            visible={visible}
            onRequestClose={onClose}
            HeaderComponent={renderHeader}
            FooterComponent={renderFooter}
            presentationStyle="overFullScreen"
            backgroundColor="#000"
        />
    );
}

const styles = StyleSheet.create({
    header: {
        position: 'absolute',
        top: 40,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        zIndex: 10,
    },
    closeButton: {
        padding: 8,
    },
    menuButton: {
        padding: 8,
    },
    footer: {
        width: width,
        paddingHorizontal: 16,
        paddingBottom: Platform.OS === 'ios' ? 40 : 20,
        paddingTop: 40,
        position: 'absolute',
        bottom: 0,
    },
    // Top Comments
    topComments: {
        marginBottom: 16,
        opacity: 0.9,
    },
    commentRow: {
        flexDirection: 'row',
        marginBottom: 12,
        backgroundColor: 'rgba(255,255,255,0.1)',
        padding: 8,
        borderRadius: 12,
    },
    commentAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        marginRight: 8,
    },
    commentContent: {
        flex: 1,
    },
    commentAuthor: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 13,
    },
    commentTime: {
        fontWeight: 'normal',
        color: '#ccc',
        fontSize: 12,
    },
    commentText: {
        color: '#eee',
        fontSize: 14,
        marginVertical: 2,
    },
    commentActions: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    commentActionText: {
        color: '#ccc',
        fontSize: 12,
        marginRight: 10,
    },
    commentLikeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 10,
        paddingHorizontal: 4,
        paddingVertical: 1,
    },
    commentLikeCount: {
        color: '#333',
        fontSize: 10,
        marginLeft: 2,
    },
    // Post Info
    postInfoContainer: {
        marginBottom: 16,
    },
    authorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    authorName: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 15,
    },
    postTime: {
        color: '#ccc',
        fontSize: 12,
    },
    caption: {
        color: 'white',
        fontSize: 14,
        marginBottom: 10,
        lineHeight: 20,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.2)',
    },
    statsText: {
        color: 'white',
        marginLeft: 6,
        fontSize: 13,
    },
    // Action Buttons
    actionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingTop: 12,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
    },
    actionBtnText: {
        color: 'white',
        marginLeft: 8,
        fontWeight: '600',
        fontSize: 14,
    },
});

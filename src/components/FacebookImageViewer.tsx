import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    Dimensions,
    Platform,
    Modal,
    FlatList,
    StatusBar,
    SafeAreaView,
    Alert,
    Share,
    ActionSheetIOS,
} from 'react-native';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Post } from '../utils/api';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as Clipboard from 'expo-clipboard';

const { width, height } = Dimensions.get('window');

// ... (imports)

interface FacebookImageViewerProps {
    visible: boolean;
    images: string[];
    imageIndex?: number; // Made optional
    onClose: () => void;
    post?: Post; // Made optional
    onLike?: () => void;
    onComment?: () => void;
}

export default function FacebookImageViewer({
    visible,
    images,
    imageIndex = 0,
    onClose,
    post,
    onLike,
    onComment,
}: FacebookImageViewerProps) {
    // ... (logic)

    return (
        <Modal ...>
            <View style={styles.container}>
                {/* ... (Header) ... */}

                {/* Image Gallery */}
                <FlatList ... />

                {/* Footer - Only show if post exists */}
                {post && (
                    <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.9)']}
                        style={styles.footer}
                    >
                        {/* Post Info */}
                        <View style={styles.postInfoContainer}>
                            <View style={styles.authorRow}>
                                <Text style={styles.authorName}>{post.author.name}</Text>
                                <Text style={styles.postTime}> • 1 giờ</Text>
                            </View>

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
                                <FontAwesome
                                    name={post.isLiked ? 'thumbs-up' : 'thumbs-o-up'}
                                    size={20}
                                    color={post.isLiked ? '#1877F2' : 'white'}
                                />
                                <Text style={[styles.actionBtnText, post.isLiked && { color: '#1877F2' }]}>
                                    Thích
                                </Text>
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
                )}
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    header: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'android' ? 40 : 0,
        zIndex: 10,
    },
    closeButton: {
        padding: 8,
    },
    menuButton: {
        padding: 8,
    },
    pageIndicator: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    menuOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    menuBottomSheet: {
        backgroundColor: 'white',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        paddingBottom: 30,
        maxHeight: '80%',
    },
    menuHandle: {
        width: 40,
        height: 5,
        backgroundColor: '#E0E0E0',
        borderRadius: 3,
        alignSelf: 'center',
        marginTop: 10,
        marginBottom: 10,
    },
    menuContent: {
        paddingHorizontal: 16,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
    },
    menuIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#F0F2F5', // Light gray background for icon
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    menuItemText: {
        fontSize: 16,
        color: '#050505',
        fontWeight: '500',
    },
    imageContainer: {
        width: width,
        height: height,
        justifyContent: 'center',
        alignItems: 'center',
    },
    image: {
        width: width,
        height: height * 0.7,
    },
    footer: {
        width: width,
        paddingHorizontal: 16,
        paddingBottom: Platform.OS === 'ios' ? 40 : 20,
        paddingTop: 40,
        position: 'absolute',
        bottom: 0,
    },
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

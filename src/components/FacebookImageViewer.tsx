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
import { formatTime } from '../utils/formatTime';
import * as FileSystem from 'expo-file-system/legacy';
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
    const [currentIndex, setCurrentIndex] = useState(imageIndex);
    const [isMenuVisible, setMenuVisible] = useState(false);
    const flatListRef = useRef<FlatList>(null);

    // Reset index when opening
    React.useEffect(() => {
        if (visible) {
            setCurrentIndex(imageIndex);
            setTimeout(() => {
                flatListRef.current?.scrollToIndex({ index: imageIndex, animated: false });
            }, 100);
        }
    }, [visible, imageIndex]);

    const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
        if (viewableItems.length > 0) {
            setCurrentIndex(viewableItems[0].index);
        }
    }).current;

    const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

    // Save image to gallery
    const handleSaveImage = async () => {
        try {
            const { status } = await MediaLibrary.requestPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Quyền bị từ chối', 'Cần quyền truy cập thư viện để lưu ảnh.');
                return;
            }

            const imageUrl = images[currentIndex];
            const filename = `image_${Date.now()}.jpg`;
            const fileUri = FileSystem.documentDirectory + filename;

            const downloadResult = await FileSystem.downloadAsync(imageUrl, fileUri);
            await MediaLibrary.saveToLibraryAsync(downloadResult.uri);

            Alert.alert('Thành công', 'Đã lưu ảnh vào thư viện!');
        } catch (error) {
            console.error('Save image error:', error);
            Alert.alert('Lỗi', 'Không thể lưu ảnh.');
        }
        setMenuVisible(false);
    };

    // Share image
    const handleShareImage = async () => {
        try {
            const imageUrl = images[currentIndex];
            await Share.share({
                message: post?.content || 'Xem ảnh này!',
                url: imageUrl,
            });
        } catch (error) {
            console.error('Share error:', error);
        }
        setMenuVisible(false);
    };

    // Copy link
    const handleCopyLink = async () => {
        try {
            const imageUrl = images[currentIndex];
            await Clipboard.setStringAsync(imageUrl);
            Alert.alert('Đã sao chép', 'Liên kết ảnh đã được sao chép!');
        } catch (error) {
            console.error('Copy error:', error);
        }
        setMenuVisible(false);
    };

    // Show menu
    const handleShowMenu = () => {
        setMenuVisible(true);
    };

    const renderMenuItem = (icon: any, label: string, onPress: () => void, isDestructive = false) => (
        <TouchableOpacity style={styles.menuItem} onPress={onPress}>
            <View style={styles.menuIconContainer}>
                <Ionicons name={icon} size={24} color={isDestructive ? "#000" : "#000"} />
            </View>
            <Text style={styles.menuItemText}>{label}</Text>
        </TouchableOpacity>
    );

    const renderImage = ({ item }: { item: string }) => (
        <View style={styles.imageContainer}>
            <Image
                source={{ uri: item }}
                style={styles.image}
                resizeMode="contain"
            />
        </View>
    );

    return (
        <Modal
            visible={visible}
            transparent={false}
            animationType="fade"
            onRequestClose={onClose}
            statusBarTranslucent
        >
            <View style={styles.container}>
                <StatusBar barStyle="light-content" backgroundColor="#000" />

                {/* Header */}
                <SafeAreaView style={styles.header}>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <Ionicons name="close" size={28} color="white" />
                    </TouchableOpacity>
                    {images.length > 1 && (
                        <Text style={styles.pageIndicator}>
                            {currentIndex + 1} / {images.length}
                        </Text>
                    )}
                    <TouchableOpacity style={styles.menuButton} onPress={handleShowMenu}>
                        <Ionicons name="ellipsis-horizontal" size={24} color="white" />
                    </TouchableOpacity>
                </SafeAreaView>

                {/* Custom Bottom Sheet Menu */}
                <Modal
                    visible={isMenuVisible}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setMenuVisible(false)}
                >
                    <TouchableOpacity
                        style={styles.menuOverlay}
                        activeOpacity={1}
                        onPress={() => setMenuVisible(false)}
                    >
                        <View style={styles.menuBottomSheet}>
                            <View style={styles.menuHandle} />

                            <View style={styles.menuContent}>
                                {renderMenuItem("link-outline", "Sao chép liên kết", handleCopyLink)}
                                {renderMenuItem("download-outline", "Tải ảnh", handleSaveImage)}
                                {renderMenuItem("time-outline", "Xem lịch sử chỉnh sửa", () => setMenuVisible(false))}
                                {renderMenuItem("notifications-outline", "Bật thông báo về bài viết này", () => setMenuVisible(false))}
                                {renderMenuItem("alert-circle-outline", "Báo cáo bài viết", () => setMenuVisible(false))}
                                {renderMenuItem("close-circle-outline", "Ẩn bài viết", () => setMenuVisible(false))}
                                {post && renderMenuItem("time-outline", `Tạm thời ẩn ${post.author.name} trong 30 ngày`, () => setMenuVisible(false))}
                                {post && renderMenuItem("remove-circle-outline", `Ẩn tất cả từ ${post.author.name}`, () => setMenuVisible(false))}
                            </View>
                        </View>
                    </TouchableOpacity>
                </Modal>

                {/* Image Gallery */}
                <FlatList
                    ref={flatListRef}
                    data={images}
                    renderItem={renderImage}
                    keyExtractor={(item, index) => index.toString()}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    onViewableItemsChanged={onViewableItemsChanged}
                    viewabilityConfig={viewabilityConfig}
                    initialScrollIndex={imageIndex}
                    getItemLayout={(data, index) => ({
                        length: width,
                        offset: width * index,
                        index,
                    })}
                />

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
                                <Text style={styles.postTime}> • {formatTime(post.createdAt)}</Text>
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

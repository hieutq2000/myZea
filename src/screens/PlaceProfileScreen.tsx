import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    SafeAreaView,
    StatusBar,
    Platform,
    ScrollView,
    TextInput,
    Dimensions,
    ImageBackground,
    Modal,
    Animated,
    TouchableWithoutFeedback,
    Alert,
} from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons, FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { getUserPosts, followUser, unfollowUser, Post } from '../utils/api';
import FacebookImageViewer from '../components/FacebookImageViewer';

const { width } = Dimensions.get('window');
const COVER_HEIGHT = 200;
const AVATAR_SIZE = 130;
const AVATAR_OVERLAP = 50;

// Facebook colors
const FB_BLUE = '#1877F2';
const FB_ORANGE = '#F97316';

interface PlaceProfileScreenProps {
    user: any;
    isOwnProfile?: boolean;
    onBack: () => void;
    onEditProfile?: () => void;
    onMessage?: () => void;
}

export default function PlaceProfileScreen({
    user,
    isOwnProfile = true, // Default to true for backward compatibility
    onBack,
    onEditProfile,
    onMessage,
}: PlaceProfileScreenProps) {
    // Mock follow state (should be from user prop or API)
    const [isFollowing, setIsFollowing] = useState(user?.isFollowing ?? true);
    // Defaulting to true to match the 'Đang theo dõi' screenshot example
    const [newPostText, setNewPostText] = useState('');
    const [modalVisible, setModalVisible] = useState(false);
    const [modalType, setModalType] = useState<'AVATAR' | 'COVER'>('AVATAR');

    // Local state for images to update immediately
    const [avatarSource, setAvatarSource] = useState(user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=F97316&color=fff&size=200`);
    const [coverSource, setCoverSource] = useState(user?.coverImage || 'https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?w=800&q=80');

    const userName = user?.name || 'Người dùng';
    const userEmail = user?.email || 'email@example.com';

    // Real Data State
    const [userPosts, setUserPosts] = useState<Post[]>([]);
    const [loadingPosts, setLoadingPosts] = useState(false);

    // Image Viewer State
    const [isImageViewerVisible, setIsImageViewerVisible] = useState(false);
    const [viewingImageIndex, setViewingImageIndex] = useState(0);
    const [galleryImages, setGalleryImages] = useState<string[]>([]);

    const openImageViewer = (imageUri: string, defaultType: 'AVATAR' | 'COVER' = 'AVATAR') => {
        let uri = imageUri;
        if (!uri) {
            if (defaultType === 'COVER') uri = 'https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?w=800&q=80';
            else uri = `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}`;
        }
        setGalleryImages([uri]);
        setViewingImageIndex(0);
        setIsImageViewerVisible(true);
    };

    // ... (useEffect hook)

    // ...

    // Slide animation for modal
    const slideAnim = React.useRef(new Animated.Value(300)).current;

    const openModal = (type: 'AVATAR' | 'COVER') => {
        setModalType(type);
        setModalVisible(true);
        Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
        }).start();
    };

    const closeModal = () => {
        Animated.timing(slideAnim, {
            toValue: 300,
            duration: 200,
            useNativeDriver: true,
        }).start(() => setModalVisible(false));
    };

    // ...

    return (
        <View style={styles.container}>
            {/* ... */}
            {/* Cover Photo Section */}
            <View style={styles.coverContainer}>
                <TouchableWithoutFeedback onPress={() => {
                    if (isOwnProfile) openModal('COVER');
                    else openImageViewer(coverSource || '', 'COVER');
                }}>
                    {/* ... */}
                </TouchableWithoutFeedback>
            </View>

            {/* Profile Section */}
            <View style={styles.profileSection}>
                {/* Avatar - overlapping cover photo */}
                <View style={styles.avatarWrapper}>
                    <TouchableOpacity onPress={() => {
                        if (isOwnProfile) openModal('AVATAR');
                        else openImageViewer(avatarSource || '', 'AVATAR');
                    }}>
                        {/* ... */}
                    </TouchableOpacity>
                </View>
                {/* ... */}

                {/* Bottom Sheet Modal for Image Actions */}
                <Modal
                    transparent={true}
                    visible={modalVisible}
                    onRequestClose={closeModal}
                    animationType="none"
                >
                    <TouchableWithoutFeedback onPress={closeModal}>
                        <View style={styles.modalOverlay}>
                            <TouchableWithoutFeedback>
                                <Animated.View
                                    style={[
                                        styles.bottomSheet,
                                        { transform: [{ translateY: slideAnim }] }
                                    ]}
                                >
                                    <View style={styles.btmSheetHandle} />
                                    <TouchableOpacity
                                        style={styles.btmSheetOption}
                                        onPress={() => {
                                            closeModal();
                                            // Open viewer after closing modal
                                            setTimeout(() => {
                                                openImageViewer(
                                                    modalType === 'AVATAR' ? (avatarSource || '') : (coverSource || ''),
                                                    modalType
                                                );
                                            }, 100);
                                        }}
                                    >
                                        {/* ... */}
                                        <View style={styles.btmSheetIconCtx}>
                                            <Ionicons name="image-outline" size={24} color="#000" />
                                        </View>
                                        <Text style={styles.btmSheetText}>Xem ảnh {modalType === 'AVATAR' ? 'đại diện' : 'bìa'}</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.btmSheetOption} onPress={handlePickImage}>
                                        <View style={styles.btmSheetIconCtx}>
                                            <Ionicons name="images-outline" size={24} color="#000" />
                                        </View>
                                        <Text style={styles.btmSheetText}>Chọn ảnh {modalType === 'AVATAR' ? 'đại diện' : 'bìa'}</Text>
                                    </TouchableOpacity>
                                </Animated.View>
                            </TouchableWithoutFeedback>
                        </View>
                    </TouchableWithoutFeedback>
                </Modal>

                {/* Full Screen Image Viewer */}
                {isImageViewerVisible && (
                    <FacebookImageViewer
                        images={galleryImages}
                        visible={isImageViewerVisible}
                        onClose={() => setIsImageViewerVisible(false)}
                    />
                )}
            </View>
            );
}

            const styles = StyleSheet.create({
                container: {
                flex: 1,
            backgroundColor: '#F0F2F5',
    },
            scrollView: {
                flex: 1,
    },

            // Cover Photo
            coverContainer: {
                height: COVER_HEIGHT,
            backgroundColor: '#E4E6EB',
    },
            coverImage: {
                width: '100%',
            height: '100%',
    },
            // coverGradient removed
            headerContainer: {
                backgroundColor: '#fff',
            paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0,
            borderBottomWidth: 1,
            borderBottomColor: '#f0f2f5',
            zIndex: 100,
    },
            topNav: {
                flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 12,
            height: 50,
    },
            navButton: {
                width: 36,
            height: 36,
            justifyContent: 'center',
            alignItems: 'center',
    },
            navTitle: {
                fontSize: 18,
            fontWeight: 'bold',
            color: '#000',
            marginLeft: 8,
            flex: 1, // Let title take available space
    },
            coverCameraBtn: {
                position: 'absolute',
            bottom: 12,
            right: 12,
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: '#fff',
            justifyContent: 'center',
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: {width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 4,
            elevation: 4,
    },

            // Profile Section
            profileSection: {
                backgroundColor: '#fff',
            paddingBottom: 16,
    },
            avatarWrapper: {
                alignItems: 'flex-start',
            marginTop: -AVATAR_OVERLAP,
    },
            avatarContainer: {
                position: 'relative',
            marginLeft: 16,
    },
            avatar: {
                width: AVATAR_SIZE,
            height: AVATAR_SIZE,
            borderRadius: AVATAR_SIZE / 2,
            borderWidth: 4,
            borderColor: '#fff',
    },
            avatarCameraBtn: {
                position: 'absolute',
            bottom: 5,
            right: 5,
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: '#E4E6EB',
            justifyContent: 'center',
            alignItems: 'center',
            borderWidth: 3,
            borderColor: '#fff',
    },
            userName: {
                fontSize: 24,
            fontWeight: 'bold',
            color: '#1C1E21',
            textAlign: 'left',
            marginTop: 12,
            marginBottom: 16,
            marginLeft: 16,
    },

            // Action Row
            actionRow: {
                flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'flex-start',
            paddingHorizontal: 16,
            marginBottom: 16,
    },
            editButton: {
                flex: 1,
            height: 36,
            backgroundColor: '#E4E6EB',
            borderRadius: 6,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 8,
    },
            editButtonText: {
                marginLeft: 6,
            fontWeight: '600',
            color: '#050505',
    },
            // Follow/Message Buttons
            followButton: {
                flex: 1,
            height: 36,
            backgroundColor: '#1877F2',
            borderRadius: 6,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 8,
    },
            followingButton: {
                backgroundColor: '#FEF0E6', // Light orange bg
    },
            followText: {
                color: '#fff',
            fontWeight: '600',
            marginLeft: 6,
    },
            followingText: {
                color: '#F97316',
            fontWeight: '600',
            marginLeft: 6,
    },
            messageButton: {
                width: 48,
            height: 36,
            backgroundColor: '#E4E6EB',
            borderRadius: 6,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 8,
    },
            moreButton: {
                width: 48,
            height: 36,
            backgroundColor: '#E4E6EB',
            borderRadius: 6,
            alignItems: 'center',
            justifyContent: 'center',
    },
            // Divider
            divider: {
                height: 1,
            backgroundColor: '#E4E6EB',
            marginHorizontal: 16,
    },

            // Details Section
            detailsSection: {
                paddingHorizontal: 16,
            paddingTop: 16,
    },
            sectionTitle: {
                fontSize: 16,
            fontWeight: '600',
            color: '#1C1E21',
            marginBottom: 12,
    },
            detailRow: {
                flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 8,
    },
            detailIcon: {
                width: 28,
            marginRight: 12,
    },
            detailText: {
                fontSize: 15,
            color: '#1C1E21',
            flex: 1,
    },
            orgChartLink: {
                flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 8,
    },
            orgChartText: {
                fontSize: 15,
            color: FB_BLUE,
            marginLeft: 12,
            fontWeight: '500',
    },

            // Create Post Card
            createPostCard: {
                backgroundColor: '#fff',
            marginTop: 8,
            paddingVertical: 12,
    },
            createPostInputRow: {
                flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingBottom: 12,
    },
            smallAvatar: {
                width: 40,
            height: 40,
            borderRadius: 20,
            marginRight: 12,
    },
            postInput: {
                flex: 1,
            fontSize: 16,
            color: '#1C1E21',
    },
            createPostDivider: {
                height: 1,
            backgroundColor: '#E4E6EB',
            marginBottom: 8,
    },
            mediaButton: {
                flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 8,
    },
            mediaButtonText: {
                marginLeft: 8,
            fontSize: 14,
            fontWeight: '500',
            color: '#65676B',
    },

            // Post Card
            postCard: {
                backgroundColor: '#fff',
            marginTop: 8,
            padding: 16,
    },
            postHeader: {
                flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 12,
    },
            postAvatarContainer: {
                width: 48,
            height: 48,
            marginRight: 12,
    },
            postGroupAvatar: {
                width: 40,
            height: 40,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: '#E4E6EB',
    },
            postUserAvatar: {
                width: 24,
            height: 24,
            borderRadius: 12,
            borderWidth: 2,
            borderColor: '#fff',
            position: 'absolute',
            bottom: -4,
            right: -4,
    },
            postInfo: {
                flex: 1,
    },
            postGroupName: {
                fontSize: 15,
            fontWeight: '600',
            color: '#1C1E21',
    },
            postMeta: {
                flexDirection: 'row',
            alignItems: 'center',
            marginTop: 2,
    },
            postAuthor: {
                fontSize: 13,
            color: '#65676B',
    },
            postDot: {
                fontSize: 13,
            color: '#65676B',
            marginHorizontal: 4,
    },
            postTime: {
                fontSize: 13,
            color: '#65676B',
    },
            postMoreBtn: {
                padding: 4,
    },
            postContent: {
                fontSize: 15,
            color: '#1C1E21',
            lineHeight: 22,
    },
            seeMore: {
                fontSize: 15,
            color: '#65676B',
            fontWeight: '500',
            marginTop: 4,
    },

            // Empty State
            emptyStateContainer: {
                backgroundColor: '#fff',
            marginTop: 8,
            padding: 16,
    },
            emptyStateHeader: {
                flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 20,
    },
            emptyStateTitle: {
                fontSize: 18,
            fontWeight: 'bold',
            color: '#050505',
    },
            emptyFilterBtn: {
                flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#E4E6EB',
            borderRadius: 4,
            paddingHorizontal: 8,
            paddingVertical: 4,
    },
            emptyFilterText: {
                fontSize: 14,
            color: '#65676B',
            marginLeft: 4,
            fontWeight: '500',
    },
            emptyStateContent: {
                alignItems: 'center',
            paddingVertical: 20,
    },
            emptyIconBg: {
                width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: '#F0F2F5',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 12,
    },
            emptyStateText: {
                fontSize: 17,
            fontWeight: 'bold',
            color: '#050505',
            marginBottom: 8,
    },
            emptyStateSubtext: {
                fontSize: 15,
            color: '#65676B',
            textAlign: 'center',
            paddingHorizontal: 30,
            lineHeight: 20,
    },

            // Post Item Styles (New)
            postUserAvatarOnly: {
                width: 40,
            height: 40,
            borderRadius: 20,
    },
            postImage: {
                width: '100%',
            height: 300,
            marginTop: 8,
    },
            postActionsDivider: {
                height: 1,
            backgroundColor: '#E4E6EB',
            marginVertical: 10,
    },
            postActions: {
                flexDirection: 'row',
            justifyContent: 'space-between',
    },
            actionBtn: {
                flexDirection: 'row',
            alignItems: 'center',
            flex: 1,
            justifyContent: 'center',
    },
            actionText: {
                marginLeft: 6,
            color: '#65676B',
            fontSize: 14,
            fontWeight: '500',
    },

            // Modal Styles
            modalOverlay: {
                flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'flex-end',
    },
            bottomSheet: {
                backgroundColor: '#fff',
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            paddingBottom: 20,
            paddingTop: 8,
    },
            btmSheetHandle: {
                width: 40,
            height: 4,
            backgroundColor: '#E4E6EB',
            borderRadius: 2,
            alignSelf: 'center',
            marginBottom: 16,
            marginTop: 4,
    },
            btmSheetOption: {
                flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 12,
            paddingHorizontal: 16,
    },
            btmSheetIconCtx: {
                width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: '#E4E6EB',
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 12,
    },
            btmSheetText: {
                fontSize: 16,
            fontWeight: '500',
            color: '#050505',
    },
});

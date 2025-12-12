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
} from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons, FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const COVER_HEIGHT = 200;
const AVATAR_SIZE = 130;
const AVATAR_OVERLAP = 50;

// Facebook colors
const FB_BLUE = '#1877F2';
const FB_ORANGE = '#F97316';

interface PlaceProfileScreenProps {
    user: any;
    onBack: () => void;
    onEditProfile?: () => void;
}

export default function PlaceProfileScreen({
    user,
    onBack,
    onEditProfile,
}: PlaceProfileScreenProps) {
    const [newPostText, setNewPostText] = useState('');

    const avatarUri = user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=F97316&color=fff&size=200`;
    const coverUri = user?.coverImage || 'https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?w=800&q=80';
    const userName = user?.name || 'Người dùng';
    const userEmail = user?.email || 'email@example.com';

    // Profile info items
    const profileInfo = [
        { icon: 'clock-outline', label: `${new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} sáng Giờ địa phương` },
        { icon: 'map-marker-outline', label: 'LC HN1 15 Hoàng Như Tiếp' },
        { icon: 'email-outline', label: userEmail },
        { icon: 'account-group-outline', label: 'Có 2 người theo dõi' },
    ];

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

            <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
                bounces={false}
            >
                {/* Cover Photo Section */}
                <View style={styles.coverContainer}>
                    <ImageBackground
                        source={{ uri: coverUri }}
                        style={styles.coverImage}
                        resizeMode="cover"
                    >
                        {/* Gradient overlay at top for status bar */}
                        <LinearGradient
                            colors={['rgba(0,0,0,0.4)', 'transparent']}
                            style={styles.coverGradient}
                        />

                        {/* Top Navigation */}
                        <SafeAreaView style={styles.topNavSafe}>
                            <View style={[styles.topNav, { marginTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0 }]}>
                                <TouchableOpacity onPress={onBack} style={styles.navButton}>
                                    <Ionicons name="chevron-back" size={24} color="#fff" />
                                </TouchableOpacity>
                                <Text style={styles.navTitle}>{userName}</Text>
                                <TouchableOpacity style={styles.navButton}>
                                    <Ionicons name="search" size={22} color="#fff" />
                                </TouchableOpacity>
                            </View>
                        </SafeAreaView>

                        {/* Camera button for cover photo */}
                        <TouchableOpacity style={styles.coverCameraBtn}>
                            <Ionicons name="camera" size={18} color="#000" />
                        </TouchableOpacity>
                    </ImageBackground>
                </View>

                {/* Profile Info Section */}
                <View style={styles.profileSection}>
                    {/* Avatar - overlapping cover photo */}
                    <View style={styles.avatarWrapper}>
                        <View style={styles.avatarContainer}>
                            <Image source={{ uri: avatarUri }} style={styles.avatar} />
                            <TouchableOpacity style={styles.avatarCameraBtn}>
                                <Ionicons name="camera" size={16} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* User Name */}
                    <Text style={styles.userName}>{userName}</Text>

                    {/* Action Buttons Row */}
                    <View style={styles.actionRow}>
                        <TouchableOpacity style={styles.editButton} onPress={onEditProfile}>
                            <Feather name="edit-2" size={16} color="#333" />
                            <Text style={styles.editButtonText}>Chỉnh sửa thông tin</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.moreButton}>
                            <Ionicons name="ellipsis-horizontal" size={20} color="#333" />
                        </TouchableOpacity>
                    </View>

                    {/* Divider */}
                    <View style={styles.divider} />

                    {/* Profile Details */}
                    <View style={styles.detailsSection}>
                        <Text style={styles.sectionTitle}>File phương tiện</Text>

                        {profileInfo.map((item, index) => (
                            <View key={index} style={styles.detailRow}>
                                <MaterialCommunityIcons
                                    name={item.icon as any}
                                    size={20}
                                    color="#65676B"
                                    style={styles.detailIcon}
                                />
                                <Text style={styles.detailText}>{item.label}</Text>
                            </View>
                        ))}

                        {/* See Organization Chart Link */}
                        <TouchableOpacity style={styles.orgChartLink}>
                            <MaterialCommunityIcons name="sitemap" size={20} color="#65676B" />
                            <Text style={styles.orgChartText}>Sơ đồ tổ chức</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Create Post Section */}
                <View style={styles.createPostCard}>
                    <View style={styles.createPostInputRow}>
                        <Image source={{ uri: avatarUri }} style={styles.smallAvatar} />
                        <TextInput
                            style={styles.postInput}
                            placeholder="Bạn đang nghĩ gì?"
                            placeholderTextColor="#65676B"
                            value={newPostText}
                            onChangeText={setNewPostText}
                        />
                    </View>
                    <View style={styles.createPostDivider} />
                    <TouchableOpacity style={styles.mediaButton}>
                        <Ionicons name="images" size={22} color="#45BD62" />
                        <Text style={styles.mediaButtonText}>Hình ảnh / Video</Text>
                    </TouchableOpacity>
                </View>

                {/* Sample Post from Group */}
                <View style={styles.postCard}>
                    <View style={styles.postHeader}>
                        <View style={styles.postAvatarContainer}>
                            <Image
                                source={{ uri: 'https://images.unsplash.com/photo-1519125323398-675f0ddb6308?w=100' }}
                                style={styles.postGroupAvatar}
                            />
                            <Image
                                source={{ uri: avatarUri }}
                                style={styles.postUserAvatar}
                            />
                        </View>
                        <View style={styles.postInfo}>
                            <Text style={styles.postGroupName}>FPT Chat support zone</Text>
                            <View style={styles.postMeta}>
                                <Text style={styles.postAuthor}>{userName}</Text>
                                <Text style={styles.postDot}>•</Text>
                                <Text style={styles.postTime}>18 phút</Text>
                            </View>
                        </View>
                        <TouchableOpacity style={styles.postMoreBtn}>
                            <Ionicons name="ellipsis-horizontal" size={20} color="#65676B" />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.postContent}>
                        Dear anh/chị{'\n\n'}
                        Hiện e không thể truy cập vào fptchat bằng điện thoại được ạ .Vì hiện tại yêu cầu mã pin , nhưng em...
                    </Text>

                    <TouchableOpacity>
                        <Text style={styles.seeMore}>Xem thêm</Text>
                    </TouchableOpacity>
                </View>

                {/* Bottom spacing */}
                <View style={{ height: 100 }} />
            </ScrollView>
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
    coverGradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 80,
    },
    topNavSafe: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
    },
    topNav: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    navButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    navTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#fff',
        textShadowColor: 'rgba(0,0,0,0.3)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
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
        shadowOffset: { width: 0, height: 2 },
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
        alignItems: 'center',
        marginTop: -AVATAR_OVERLAP,
    },
    avatarContainer: {
        position: 'relative',
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
        textAlign: 'center',
        marginTop: 12,
        marginBottom: 16,
    },

    // Action Row
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16,
        marginBottom: 16,
    },
    editButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: FB_ORANGE,
        paddingVertical: 10,
        borderRadius: 8,
        marginRight: 8,
    },
    editButtonText: {
        marginLeft: 8,
        fontSize: 15,
        fontWeight: '600',
        color: '#fff',
    },
    moreButton: {
        width: 40,
        height: 40,
        borderRadius: 8,
        backgroundColor: '#E4E6EB',
        justifyContent: 'center',
        alignItems: 'center',
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
});

import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Image,
    TouchableOpacity,
    FlatList,
    SafeAreaView,
    StatusBar,
    ScrollView,
    Dimensions
} from 'react-native';
import { Ionicons, FontAwesome, MaterialIcons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

// --- Mock Data ---
const MOCK_POSTS = [
    {
        id: '1',
        author: {
            name: 'Vinalive News',
            avatar: 'https://ui-avatars.com/api/?name=Vinalive+News&background=0D8ABC&color=fff',
            time: '5 giờ trước'
        },
        content: '[Livestream] TRẠNG NGUYÊN 2025 - VÒNG THI BIỆN LUẬN CHÍNH THỨC LÊN SÓNG\n\n35 sĩ tử đang tranh luận trí tuệ để tìm ra Top 13. Đội nào sẽ có màn thể hiện bứt phá? ... Xem thêm',
        image: 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?q=80&w=2070&auto=format&fit=crop',
        views: '581 người đã xem',
        likes: 120,
        comments: 45,
        shares: 12
    },
    {
        id: '2',
        author: {
            name: 'Vinalive News',
            avatar: 'https://ui-avatars.com/api/?name=Vinalive+News&background=0D8ABC&color=fff',
            time: 'Hôm qua lúc 17:20'
        },
        content: 'Lộ diện 4 ứng cử viên sáng giá cho cúp Vô Địch khu vực HCM\n\nVòng bảng đã khép lại với 4 đội hạt giống mạnh nhất: FEDU, SOFT1 ở bảng A, và FTEL, Liên quân SENDO-FO ở bảng B giống kết quả được dự đoán từ các vòng đấu trước.... Xem thêm',
        image: 'https://images.unsplash.com/photo-1579952363873-27f3bade0f55?q=80&w=2070&auto=format&fit=crop',
        with: 'Khoa Nguyen Van và 3 người khác',
        views: '1.2k người đã xem',
        likes: 340,
        comments: 89,
        shares: 56
    },
    {
        id: '3',
        author: {
            name: 'Cộng đồng AI',
            avatar: 'https://ui-avatars.com/api/?name=AI+Community&background=FF5722&color=fff',
            time: '2 giờ trước'
        },
        content: 'Chia sẻ bộ tài liệu học Machine Learning cơ bản cho người mới bắt đầu. Link tải bên dưới phần bình luận nhé mọi người! 👇',
        views: '300 người đã xem',
        likes: 85,
        comments: 20,
        shares: 5
    }
];

interface PlaceScreenProps {
    user: any;
}

export default function PlaceScreen({ user }: PlaceScreenProps) {
    const renderHeader = () => (
        <View style={styles.header}>
            <View style={styles.headerLogoContainer}>
                {/* Logo Placeholder - using text/icon to match screenshot "FPT Place" style */}
                <View style={styles.logoIcon}>
                    <Ionicons name="school" size={24} color="#0068FF" />
                </View>
                <Text style={styles.headerTitle}>Vinalive Place</Text>
            </View>
            <View style={styles.headerIcons}>
                <TouchableOpacity style={styles.iconButton}>
                    <Ionicons name="search" size={24} color="#666" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconButton}>
                    <Image
                        source={{ uri: user?.avatar || `https://ui-avatars.com/api/?name=${user?.name || 'User'}` }}
                        style={styles.headerAvatar}
                    />
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderComposer = () => (
        <View style={styles.composerContainer}>
            <Image
                source={{ uri: user?.avatar || `https://ui-avatars.com/api/?name=${user?.name || 'User'}` }}
                style={styles.composerAvatar}
            />
            <TouchableOpacity style={styles.composerInput}>
                <Text style={styles.composerPlaceholder}>Tạo bài viết...</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.composerImageBtn}>
                <Ionicons name="image-outline" size={24} color="#666" />
            </TouchableOpacity>
        </View>
    );

    const renderPost = ({ item }: { item: any }) => (
        <View style={styles.postCard}>
            {/* Post Header */}
            <View style={styles.postHeader}>
                <Image source={{ uri: item.author.avatar }} style={styles.postAvatar} />
                <View style={styles.postInfo}>
                    <Text style={styles.postAuthor}>{item.author.name}</Text>
                    <View style={styles.postMeta}>
                        <Text style={styles.postTime}>{item.author.time}</Text>
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
                {item.with && (
                    <Text style={styles.postWith}>
                        — cùng với <Text style={{ fontWeight: 'bold' }}>{item.with}</Text>
                    </Text>
                )}
            </View>

            {/* Post Image */}
            {item.image && (
                <Image source={{ uri: item.image }} style={styles.postImage} resizeMode="cover" />
            )}

            {/* Post Stats */}
            <View style={styles.postStats}>
                {/* Left side stats (if any) */}
                <View />
                {/* View count */}
                <Text style={styles.viewCount}>{item.views}</Text>
            </View>

            {/* Post Actions */}
            <View style={styles.actionContainer}>
                <TouchableOpacity style={styles.actionButton}>
                    <FontAwesome name="thumbs-o-up" size={18} color="#666" />
                    <Text style={styles.actionText}>Thích</Text>
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
                data={MOCK_POSTS}
                keyExtractor={item => item.id}
                renderItem={renderPost}
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
            />
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
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    headerLogoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    logoIcon: {
        marginRight: 8,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },
    headerIcons: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconButton: {
        marginLeft: 16,
    },
    headerAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
    },

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
});

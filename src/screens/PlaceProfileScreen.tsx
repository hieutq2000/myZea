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
} from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

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
    const userName = user?.name || 'Người dùng';
    const userEmail = user?.email || 'email@example.com';

    // Mock data for profile info
    const profileInfo = [
        { icon: 'clock-outline', iconType: 'material', label: `${new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} sáng Giờ địa phương` },
        { icon: 'map-marker-outline', iconType: 'material', label: 'LC HN1 15 Hoàng Như Tiếp' },
        { icon: 'email-outline', iconType: 'material', label: userEmail },
        { icon: 'account-group-outline', iconType: 'material', label: 'Có 2 người theo dõi' },
    ];

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

            {/* Header with gradient background pattern */}
            <LinearGradient
                colors={['#FFE4D4', '#FFD4B8']}
                style={styles.headerGradient}
            >
                {/* Top Navigation */}
                <SafeAreaView>
                    <View style={[styles.topNav, { paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }]}>
                        <TouchableOpacity onPress={onBack} style={styles.backButton}>
                            <Ionicons name="chevron-back" size={24} color="#333" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>{userName}</Text>
                        <TouchableOpacity style={styles.searchButton}>
                            <Ionicons name="search" size={22} color="#333" />
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>

                {/* Decorative background elements */}
                <View style={styles.decorativeElements}>
                    <View style={[styles.decorCircle, { top: 60, right: 30, width: 100, height: 100, backgroundColor: 'rgba(255,255,255,0.3)' }]} />
                    <View style={[styles.decorCircle, { top: 100, right: 80, width: 60, height: 60, backgroundColor: 'rgba(255,255,255,0.2)' }]} />
                </View>
            </LinearGradient>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Profile Card - Overlapping the header */}
                <View style={styles.profileCard}>
                    {/* Avatar */}
                    <View style={styles.avatarContainer}>
                        <Image source={{ uri: avatarUri }} style={styles.avatar} />
                        <TouchableOpacity style={styles.cameraButton}>
                            <Ionicons name="camera" size={16} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    {/* Name */}
                    <Text style={styles.userName}>{userName}</Text>

                    {/* Action Buttons */}
                    <View style={styles.actionRow}>
                        <TouchableOpacity style={styles.editButton} onPress={onEditProfile}>
                            <Feather name="edit-2" size={16} color="#333" />
                            <Text style={styles.editButtonText}>Chỉnh sửa thông tin</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.moreButton}>
                            <Ionicons name="ellipsis-horizontal" size={20} color="#333" />
                        </TouchableOpacity>
                    </View>

                    {/* Profile Info List */}
                    <View style={styles.infoSection}>
                        <Text style={styles.sectionTitle}>File phương tiện</Text>
                        {profileInfo.map((item, index) => (
                            <View key={index} style={styles.infoRow}>
                                <MaterialCommunityIcons name={item.icon as any} size={20} color="#666" style={styles.infoIcon} />
                                <Text style={styles.infoText}>{item.label}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Create Post Section */}
                <View style={styles.createPostCard}>
                    <View style={styles.createPostHeader}>
                        <Image source={{ uri: avatarUri }} style={styles.smallAvatar} />
                        <TextInput
                            style={styles.postInput}
                            placeholder="Bạn đang nghĩ gì?"
                            placeholderTextColor="#999"
                            value={newPostText}
                            onChangeText={setNewPostText}
                        />
                    </View>
                    <TouchableOpacity style={styles.mediaButton}>
                        <Ionicons name="images-outline" size={20} color="#666" />
                        <Text style={styles.mediaButtonText}>Hình ảnh / Video</Text>
                    </TouchableOpacity>
                </View>

                {/* Empty Posts State */}
                <View style={styles.emptyState}>
                    <Text style={styles.emptyTitle}>Đã xem hết các bài viết</Text>
                    <Text style={styles.emptySubtitle}>
                        Bạn đã xem hết các bài viết hiện có. Tải lại trang để khám phá thêm!
                    </Text>
                    <TouchableOpacity style={styles.reloadButton}>
                        <Text style={styles.reloadButtonText}>Quay lại đầu trang</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5',
    },
    headerGradient: {
        height: 180,
        position: 'relative',
    },
    topNav: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    backButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
    },
    searchButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    decorativeElements: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    decorCircle: {
        position: 'absolute',
        borderRadius: 999,
    },
    content: {
        flex: 1,
        marginTop: -80,
    },
    profileCard: {
        backgroundColor: '#FFF',
        marginHorizontal: 16,
        borderRadius: 16,
        padding: 20,
        paddingTop: 60,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
    },
    avatarContainer: {
        position: 'absolute',
        top: -50,
        alignSelf: 'center',
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 4,
        borderColor: '#FFF',
    },
    cameraButton: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#F97316',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#FFF',
    },
    userName: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#333',
        marginTop: 10,
        marginBottom: 16,
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    editButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F0F0F0',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        marginRight: 10,
    },
    editButtonText: {
        marginLeft: 8,
        fontSize: 14,
        fontWeight: '500',
        color: '#333',
    },
    moreButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F0F0F0',
        justifyContent: 'center',
        alignItems: 'center',
    },
    infoSection: {
        width: '100%',
        borderTopWidth: 1,
        borderTopColor: '#EEE',
        paddingTop: 16,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 12,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
    },
    infoIcon: {
        marginRight: 12,
        width: 24,
    },
    infoText: {
        fontSize: 14,
        color: '#666',
    },
    createPostCard: {
        backgroundColor: '#FFF',
        marginHorizontal: 16,
        marginTop: 16,
        borderRadius: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    createPostHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    smallAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        marginRight: 12,
    },
    postInput: {
        flex: 1,
        fontSize: 15,
        color: '#333',
    },
    mediaButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderTopWidth: 1,
        borderTopColor: '#EEE',
    },
    mediaButtonText: {
        marginLeft: 8,
        fontSize: 14,
        color: '#666',
    },
    emptyState: {
        backgroundColor: '#FFF',
        marginHorizontal: 16,
        marginTop: 16,
        marginBottom: 100,
        borderRadius: 12,
        padding: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        marginBottom: 16,
        lineHeight: 20,
    },
    reloadButton: {
        borderWidth: 1,
        borderColor: '#DDD',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
    },
    reloadButtonText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#333',
    },
});

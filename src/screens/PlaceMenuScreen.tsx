import React from 'react';
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
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getAvatarUri } from '../utils/media';

interface PlaceMenuScreenProps {
    user: any;
    onBack: () => void;
    onGoToSettings?: () => void;
    onGoToGroups?: () => void;
    onGoToDrafts?: () => void;
    onViewProfile?: () => void;
}

interface MenuItem {
    id: string;
    icon: string;
    iconType: 'ionicon' | 'material' | 'feather';
    label: string;
    onPress?: () => void;
}

export default function PlaceMenuScreen({
    user,
    onBack,
    onGoToSettings,
    onGoToGroups,
    onGoToDrafts,
    onViewProfile
}: PlaceMenuScreenProps) {

    const menuItems: MenuItem[] = [
        {
            id: 'groups',
            icon: 'people-outline',
            iconType: 'ionicon',
            label: 'Nhóm',
            onPress: onGoToGroups,
        },
        {
            id: 'drafts',
            icon: 'document-text-outline',
            iconType: 'ionicon',
            label: 'Bản nháp đã lưu',
            onPress: onGoToDrafts,
        },
    ];

    const avatarUri = getAvatarUri(user?.avatar, user?.name || 'User');

    const renderMenuItem = (item: MenuItem) => {
        const IconComponent = item.iconType === 'material' ? MaterialCommunityIcons :
            item.iconType === 'feather' ? Feather : Ionicons;

        return (
            <TouchableOpacity
                key={item.id}
                style={styles.menuItem}
                onPress={item.onPress}
                activeOpacity={0.7}
            >
                <View style={styles.menuIconContainer}>
                    <IconComponent name={item.icon as any} size={24} color="#333" />
                </View>
                <Text style={styles.menuLabel}>{item.label}</Text>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

            {/* Header */}
            <SafeAreaView style={styles.headerSafeArea}>
                <View style={[styles.header, { paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }]}>
                    <Text style={styles.headerTitle}>Menu</Text>
                    <TouchableOpacity style={styles.searchButton}>
                        <Ionicons name="search" size={24} color="#333" />
                    </TouchableOpacity>
                </View>
            </SafeAreaView>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Profile Card */}
                <TouchableOpacity
                    style={styles.profileCard}
                    onPress={onViewProfile}
                    activeOpacity={0.8}
                >
                    <LinearGradient
                        colors={['#F97316', '#FB923C']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.profileGradient}
                    >
                        <View style={styles.profileContent}>
                            <View style={styles.profileAvatarContainer}>
                                <Image source={{ uri: avatarUri }} style={styles.profileAvatar} />
                            </View>
                            <View style={styles.profileInfo}>
                                <Text style={styles.profileName}>{user?.name || 'Người dùng'}</Text>
                                <Text style={styles.profileSubtext}>Xem trang cá nhân của bạn</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={24} color="rgba(255,255,255,0.8)" />
                        </View>
                    </LinearGradient>
                </TouchableOpacity>

                {/* Menu Grid */}
                <View style={styles.menuGrid}>
                    {menuItems.map(renderMenuItem)}
                </View>

                {/* Settings Section */}
                <TouchableOpacity
                    style={styles.settingsRow}
                    onPress={onGoToSettings}
                    activeOpacity={0.7}
                >
                    <View style={styles.settingsIcon}>
                        <Ionicons name="settings-outline" size={22} color="#666" />
                    </View>
                    <Text style={styles.settingsText}>Cài đặt và quyền riêng tư</Text>
                    <Ionicons name="chevron-forward" size={20} color="#999" />
                </TouchableOpacity>

            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5',
    },
    headerSafeArea: {
        backgroundColor: '#FFF',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#FFF',
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
    },
    searchButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F0F0F0',
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        flex: 1,
        padding: 16,
    },
    profileCard: {
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 6,
    },
    profileGradient: {
        padding: 16,
    },
    profileContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    profileAvatarContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#FFF',
        padding: 2,
    },
    profileAvatar: {
        width: '100%',
        height: '100%',
        borderRadius: 23,
    },
    profileInfo: {
        flex: 1,
        marginLeft: 12,
    },
    profileName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFF',
    },
    profileSubtext: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 2,
    },
    menuGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 16,
    },
    menuItem: {
        width: '48%',
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 14,
        marginBottom: 12,
        marginRight: '4%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
    },
    menuIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#F5F5F5',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    menuLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
    settingsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 14,
        marginTop: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
    },
    settingsIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#F5F5F5',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    settingsText: {
        flex: 1,
        fontSize: 15,
        fontWeight: '500',
        color: '#333',
    },
});

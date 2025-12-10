import React from 'react';
import {
    View,
    TouchableOpacity,
    StyleSheet,
    Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

export type PlaceTabType = 'HOME' | 'GROUPS' | 'CHAT' | 'NOTIFICATIONS' | 'MENU';

interface PlaceBottomBarProps {
    activeTab: PlaceTabType;
    onTabChange: (tab: PlaceTabType) => void;
}

export default function PlaceBottomBar({ activeTab, onTabChange }: PlaceBottomBarProps) {
    const navigation = useNavigation<any>();

    const handleTabPress = (tab: PlaceTabType) => {
        if (tab === 'CHAT') {
            // Navigate to ChatList screen
            navigation.navigate('ChatList');
        } else {
            onTabChange(tab);
        }
    };

    const tabs = [
        { id: 'HOME' as PlaceTabType, icon: 'home-outline', activeIcon: 'home', label: 'Home' },
        { id: 'GROUPS' as PlaceTabType, icon: 'people-outline', activeIcon: 'people', label: 'Nhóm' },
        { id: 'CHAT' as PlaceTabType, icon: 'chatbubble-outline', activeIcon: 'chatbubble', label: 'Tin nhắn' },
        { id: 'NOTIFICATIONS' as PlaceTabType, icon: 'notifications-outline', activeIcon: 'notifications', label: 'Thông báo' },
        { id: 'MENU' as PlaceTabType, icon: 'menu-outline', activeIcon: 'menu', label: 'Menu' },
    ];

    return (
        <View style={styles.container}>
            <View style={styles.tabBar}>
                {tabs.map((tab) => {
                    const isActive = activeTab === tab.id;
                    return (
                        <TouchableOpacity
                            key={tab.id}
                            style={styles.tabItem}
                            onPress={() => handleTabPress(tab.id)}
                            activeOpacity={0.7}
                        >
                            <View style={styles.iconContainer}>
                                <Ionicons
                                    name={isActive ? tab.activeIcon as any : tab.icon as any}
                                    size={26}
                                    color={isActive ? '#F97316' : '#6B7280'}
                                />
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#FFFFFF',
        paddingBottom: Platform.OS === 'ios' ? 24 : 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 10,
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
    },
    tabBar: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingHorizontal: 8,
    },
    tabItem: {
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        paddingVertical: 4,
    },
    iconContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
});

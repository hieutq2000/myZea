import React from 'react';
import {
    View,
    TouchableOpacity,
    Text,
    StyleSheet,
    Platform,
} from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SHADOWS } from '../utils/theme';

export type TabType = 'HOME' | 'HISTORY' | 'PROFILE' | 'PLACE' | 'CHAT_TAB';

interface BottomTabBarProps {
    activeTab: TabType;
    onTabChange: (tab: TabType) => void;
    unreadChatCount?: number;
    unreadNotifCount?: number;
}

interface TabItem {
    key: TabType;
    icon: any;
    iconSet: any;
    label: string;
}

const tabs: TabItem[] = [
    { key: 'HOME', icon: 'planet-outline', iconSet: Ionicons, label: 'My Home' },
    { key: 'HISTORY', icon: 'clipboard-list-outline', iconSet: MaterialCommunityIcons, label: 'My Tasks' },
    { key: 'PLACE', icon: 'at-circle-outline', iconSet: Ionicons, label: 'Z-Feed' },
    { key: 'CHAT_TAB', icon: 'chatbubble-ellipses-outline', iconSet: Ionicons, label: 'Chats' },
    { key: 'PROFILE', icon: 'grid-outline', iconSet: Ionicons, label: 'Store' },
];

export default function BottomTabBar({ activeTab, onTabChange, unreadChatCount = 0, unreadNotifCount = 0 }: BottomTabBarProps) {
    return (
        <View style={styles.container}>
            <View style={styles.tabBar}>
                {tabs.map((tab) => {
                    const isActive = activeTab === tab.key;
                    let iconName = tab.icon;
                    if (isActive) {
                        if (tab.key === 'HOME') iconName = 'planet';
                        if (tab.key === 'PLACE') iconName = 'at-circle';
                        if (tab.key === 'CHAT_TAB') iconName = 'chatbubble-ellipses';
                        if (tab.key === 'PROFILE') iconName = 'grid';
                    }

                    let badgeCount = 0;
                    if (tab.key === 'CHAT_TAB') badgeCount = unreadChatCount;
                    if (tab.key === 'PLACE') badgeCount = unreadNotifCount;

                    return (
                        <TouchableOpacity
                            key={tab.key}
                            style={styles.tabItem}
                            onPress={() => onTabChange(tab.key)}
                            activeOpacity={0.7}
                        >
                            <View style={styles.iconContainer}>
                                <tab.iconSet
                                    name={iconName}
                                    size={24}
                                    color={isActive ? '#F97316' : '#94A3B8'}
                                />
                                {badgeCount > 0 && (
                                    <View style={styles.badge}>
                                        <Text style={styles.badgeText}>
                                            {badgeCount > 99 ? '99+' : badgeCount}
                                        </Text>
                                    </View>
                                )}
                            </View>
                            <Text style={[
                                styles.label,
                                isActive && styles.labelActive
                            ]}>
                                {tab.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: COLORS.white,
        paddingBottom: Platform.OS === 'ios' ? 24 : 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
        ...SHADOWS.sm,
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        elevation: 200,
    },
    tabBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
    },
    tabItem: {
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
    },
    iconContainer: {
        marginBottom: 4,
        position: 'relative',
    },
    label: {
        fontSize: 10,
        color: '#94A3B8',
        fontWeight: '500',
    },
    labelActive: {
        color: '#F97316',
        fontWeight: '600',
    },
    badge: {
        position: 'absolute',
        top: -6,
        right: -10,
        backgroundColor: '#EF4444',
        borderRadius: 10,
        minWidth: 18,
        height: 18,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
        borderWidth: 1.5,
        borderColor: 'white',
    },
    badgeText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
    },
});

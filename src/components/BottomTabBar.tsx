import React from 'react';
import {
    View,
    TouchableOpacity,
    Text,
    StyleSheet,
    Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { COLORS, SHADOWS } from '../utils/theme';

export type TabType = 'HOME' | 'HISTORY' | 'PROFILE';

interface BottomTabBarProps {
    activeTab: TabType;
    onTabChange: (tab: TabType) => void;
}

interface TabItem {
    key: TabType;
    icon: string;
    label: string;
}

const tabs: TabItem[] = [
    { key: 'HOME', icon: 'home', label: 'Trang chủ' },
    { key: 'HISTORY', icon: 'bar-chart-2', label: 'Lịch sử' },
    { key: 'PROFILE', icon: 'user', label: 'Hồ sơ' },
];

export default function BottomTabBar({ activeTab, onTabChange }: BottomTabBarProps) {
    return (
        <View style={styles.container}>
            <View style={styles.tabBar}>
                {tabs.map((tab) => {
                    const isActive = activeTab === tab.key;
                    return (
                        <TouchableOpacity
                            key={tab.key}
                            style={styles.tabItem}
                            onPress={() => onTabChange(tab.key)}
                            activeOpacity={0.7}
                        >
                            <View style={[
                                styles.iconContainer,
                                isActive && styles.iconContainerActive
                            ]}>
                                <Feather
                                    name={tab.icon as any}
                                    size={22}
                                    color={isActive ? COLORS.white : COLORS.textMuted}
                                />
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
        paddingBottom: Platform.OS === 'ios' ? 20 : 10,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        ...SHADOWS.sm,
    },
    tabBar: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingTop: 10,
    },
    tabItem: {
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
    },
    iconContainer: {
        width: 44,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 4,
    },
    iconContainerActive: {
        backgroundColor: COLORS.primary,
    },
    label: {
        fontSize: 11,
        color: COLORS.textMuted,
        fontWeight: '500',
    },
    labelActive: {
        color: COLORS.primary,
        fontWeight: '600',
    },
});

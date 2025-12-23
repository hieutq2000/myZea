import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { getAvatarUri } from '../utils/media';
import { Ionicons } from '@expo/vector-icons';

interface Member {
    id: string;
    name: string;
    avatar?: string;
}

interface GroupAvatarProps {
    members?: Member[];
    groupAvatar?: string;
    groupName?: string;
    size?: number;
}

export default function GroupAvatar({
    members = [],
    groupAvatar,
    groupName = 'Group',
    size = 52
}: GroupAvatarProps) {
    if (groupAvatar) {
        return (
            <Image
                source={{ uri: getAvatarUri(groupAvatar, groupName) }}
                style={[styles.singleAvatar, { width: size, height: size, borderRadius: size / 2 }]}
            />
        );
    }

    if (!members || members.length === 0) {
        return (
            <LinearGradient
                colors={['#667eea', '#764ba2']}
                style={[styles.singleAvatar, { width: size, height: size, borderRadius: size / 2 }]}
            >
                <Ionicons name="people" size={size * 0.45} color="#fff" />
            </LinearGradient>
        );
    }

    const displayMembers = members.slice(0, 4);
    const count = displayMembers.length;

    const renderImg = (member: Member, w: number, h: number, style: any) => (
        <Image
            key={member.id}
            source={{ uri: getAvatarUri(member.avatar, member.name) }}
            style={[{ width: w, height: h, borderWidth: 1.5, borderColor: '#fff', backgroundColor: '#e1e1e1' }, style]}
        />
    );

    if (count === 1) {
        return (
            <Image
                source={{ uri: getAvatarUri(displayMembers[0].avatar, displayMembers[0].name) }}
                style={[styles.singleAvatar, { width: size, height: size, borderRadius: size / 2 }]}
            />
        );
    }

    if (count === 2) {
        // Facebook style: Diagonal overlap
        const subSize = size * 0.7;
        return (
            <View style={[styles.container, { width: size, height: size, borderRadius: size / 2 }]}>
                {renderImg(displayMembers[1], subSize, subSize, {
                    position: 'absolute',
                    top: -2,
                    right: -2,
                    borderRadius: subSize / 2,
                    zIndex: 1
                })}
                {renderImg(displayMembers[0], subSize, subSize, {
                    position: 'absolute',
                    bottom: -2,
                    left: -2,
                    borderRadius: subSize / 2,
                    zIndex: 2
                })}
            </View>
        );
    }

    if (count === 3) {
        // Facebook style: 1 Left (Big), 2 Right (Small stacked)
        const leftW = (size / 2) + 1; // Slight overlap fix
        const leftH = size;
        const rightW = size / 2;
        const rightH = size / 2;

        return (
            <View style={[styles.container, { width: size, height: size, borderRadius: size / 2, backgroundColor: '#fff', overflow: 'hidden' }]}>
                <Image
                    source={{ uri: getAvatarUri(displayMembers[0].avatar, displayMembers[0].name) }}
                    style={{ position: 'absolute', left: 0, top: 0, width: leftW, height: leftH, borderRightWidth: 1, borderColor: '#fff' }}
                    contentFit="cover"
                />
                <Image
                    source={{ uri: getAvatarUri(displayMembers[1].avatar, displayMembers[1].name) }}
                    style={{ position: 'absolute', right: 0, top: 0, width: rightW, height: rightH, borderBottomWidth: 1, borderColor: '#fff' }}
                    contentFit="cover"
                />
                <Image
                    source={{ uri: getAvatarUri(displayMembers[2].avatar, displayMembers[2].name) }}
                    style={{ position: 'absolute', right: 0, bottom: 0, width: rightW, height: rightH, borderTopWidth: 0, borderColor: '#fff' }}
                    contentFit="cover"
                />
            </View>
        );
    }

    // 4 members - 2x2 Grid with slight spacing/border simulating separation
    const quarter = size / 2;
    return (
        <View style={[styles.container, { width: size, height: size, borderRadius: size / 2, backgroundColor: '#fff', overflow: 'hidden' }]}>
            <Image
                source={{ uri: getAvatarUri(displayMembers[0].avatar, displayMembers[0].name) }}
                style={{ position: 'absolute', left: 0, top: 0, width: quarter, height: quarter, borderRightWidth: 1, borderBottomWidth: 1, borderColor: '#fff' }}
            />
            <Image
                source={{ uri: getAvatarUri(displayMembers[1].avatar, displayMembers[1].name) }}
                style={{ position: 'absolute', right: 0, top: 0, width: quarter, height: quarter, borderLeftWidth: 0, borderBottomWidth: 1, borderColor: '#fff' }}
            />
            <Image
                source={{ uri: getAvatarUri(displayMembers[2].avatar, displayMembers[2].name) }}
                style={{ position: 'absolute', left: 0, bottom: 0, width: quarter, height: quarter, borderRightWidth: 1, borderTopWidth: 0, borderColor: '#fff' }}
            />
            <Image
                source={{ uri: getAvatarUri(displayMembers[3].avatar, displayMembers[3].name) }}
                style={{ position: 'absolute', right: 0, bottom: 0, width: quarter, height: quarter, borderLeftWidth: 0, borderTopWidth: 0, borderColor: '#fff' }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    singleAvatar: {
        justifyContent: 'center',
        alignItems: 'center',
    },
});

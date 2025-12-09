import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Image,
    Animated,
    Dimensions,
    Platform,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface IncomingCallModalProps {
    visible: boolean;
    callerName?: string;
    callerAvatar?: string;
    isVideo: boolean;
    onAccept: () => void;
    onReject: () => void;
}

export default function IncomingCallModal({
    visible,
    callerName = 'Unknown',
    callerAvatar,
    isVideo,
    onAccept,
    onReject,
}: IncomingCallModalProps) {
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const slideAnim = useRef(new Animated.Value(-100)).current;

    useEffect(() => {
        if (visible) {
            // Slide in animation
            Animated.spring(slideAnim, {
                toValue: 0,
                useNativeDriver: true,
                tension: 50,
                friction: 8,
            }).start();

            // Pulse animation for avatar
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.1,
                        duration: 500,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 500,
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        } else {
            slideAnim.setValue(-100);
        }
    }, [visible]);

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            statusBarTranslucent
        >
            <View style={styles.container}>
                {/* Blur Background */}
                <BlurView intensity={30} style={StyleSheet.absoluteFill} tint="dark" />

                <Animated.View
                    style={[
                        styles.card,
                        { transform: [{ translateY: slideAnim }] }
                    ]}
                >
                    {/* Top Bar */}
                    <View style={styles.topBar}>
                        <View style={styles.appInfo}>
                            <Ionicons
                                name={isVideo ? "videocam" : "call"}
                                size={16}
                                color="#00D26A"
                            />
                            <Text style={styles.appName}>
                                Vinalive AI • {isVideo ? 'Video' : 'Cuộc gọi'}
                            </Text>
                        </View>
                        <Text style={styles.callType}>Đến...</Text>
                    </View>

                    {/* Caller Info */}
                    <View style={styles.callerInfo}>
                        <Animated.View
                            style={[
                                styles.avatarContainer,
                                { transform: [{ scale: pulseAnim }] }
                            ]}
                        >
                            <View style={styles.avatarRing}>
                                {callerAvatar ? (
                                    <Image
                                        source={{ uri: callerAvatar }}
                                        style={styles.avatar}
                                    />
                                ) : (
                                    <View style={styles.avatarPlaceholder}>
                                        <Text style={styles.avatarText}>
                                            {callerName?.[0]?.toUpperCase()}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </Animated.View>

                        <Text style={styles.callerName}>{callerName}</Text>
                        <Text style={styles.callLabel}>
                            {isVideo ? 'Cuộc gọi video đến' : 'Cuộc gọi thoại đến'}
                        </Text>
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.actions}>
                        {/* Reject Button */}
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={onReject}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.iconCircle, styles.rejectCircle]}>
                                <MaterialIcons name="call-end" size={28} color="white" />
                            </View>
                            <Text style={styles.actionLabel}>Từ chối</Text>
                        </TouchableOpacity>

                        {/* Accept Button */}
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={onAccept}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.iconCircle, styles.acceptCircle]}>
                                <Ionicons
                                    name={isVideo ? "videocam" : "call"}
                                    size={28}
                                    color="white"
                                />
                            </View>
                            <Text style={styles.actionLabel}>Trả lời</Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'flex-start',
        alignItems: 'center',
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
    },
    card: {
        width: SCREEN_WIDTH - 32,
        backgroundColor: 'rgba(30, 30, 40, 0.95)',
        borderRadius: 20,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 20,
    },
    topBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    appInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    appName: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 13,
        fontWeight: '500',
    },
    callType: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 13,
    },
    callerInfo: {
        alignItems: 'center',
        marginBottom: 24,
    },
    avatarContainer: {
        marginBottom: 12,
    },
    avatarRing: {
        width: 90,
        height: 90,
        borderRadius: 45,
        borderWidth: 3,
        borderColor: '#00D26A',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 3,
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
    },
    avatarPlaceholder: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#0068FF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 36,
        fontWeight: 'bold',
        color: 'white',
    },
    callerName: {
        fontSize: 22,
        fontWeight: '600',
        color: 'white',
        marginBottom: 4,
    },
    callLabel: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.6)',
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingHorizontal: 20,
    },
    actionButton: {
        alignItems: 'center',
        gap: 8,
    },
    iconCircle: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
    },
    rejectCircle: {
        backgroundColor: '#FF3B30',
    },
    acceptCircle: {
        backgroundColor: '#34C759',
    },
    actionLabel: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 13,
        fontWeight: '500',
    },
});

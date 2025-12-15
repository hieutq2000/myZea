import React, { useEffect, useRef, useState } from 'react';
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
    Vibration,
    ImageBackground,
} from 'react-native';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { getAvatarUri } from '../utils/media';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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
    const soundRef = useRef<Audio.Sound | null>(null);

    // Animations
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

    useEffect(() => {
        let isMounted = true;

        const startRinging = async () => {
            try {
                // Configure audio mode
                await Audio.setAudioModeAsync({
                    allowsRecordingIOS: false,
                    playsInSilentModeIOS: true,
                    shouldDuckAndroid: true,
                    playThroughEarpieceAndroid: false,
                    staysActiveInBackground: true,
                });

                // In a real app, use a local asset like require('../assets/ringtone.mp3')
                // For this demo, we use a standard ringtone URL or fallback to vibration
                const { sound } = await Audio.Sound.createAsync(
                    { uri: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3' }, // Standard Ringtone
                    { shouldPlay: true, isLooping: true }
                );

                if (isMounted) {
                    soundRef.current = sound;
                    // Start Vibration pattern (1s on, 1s off)
                    Vibration.vibrate([1000, 1000, 1000, 1000], true);
                } else {
                    // If component unmounted while loading sound, stop it immediately
                    await sound.stopAsync();
                    await sound.unloadAsync();
                }

            } catch (error) {
                console.log('Error playing sound, falling back to vibration only', error);
                if (isMounted) Vibration.vibrate([1000, 1000, 1000, 1000], true);
            }
        };

        const stopRinging = async () => {
            if (soundRef.current) {
                try {
                    await soundRef.current.stopAsync();
                    await soundRef.current.unloadAsync();
                } catch (e) {
                    // Ignore unload errors
                }
                soundRef.current = null;
            }
            Vibration.cancel();
        };

        if (visible) {
            startRinging();

            // Slide up animation
            Animated.spring(slideAnim, {
                toValue: 0,
                useNativeDriver: true,
                tension: 40,
                friction: 8,
            }).start();

            // Avatar Pulse Animation
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.2,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                ])
            ).start();

        } else {
            stopRinging();
            slideAnim.setValue(SCREEN_HEIGHT);
        }

        return () => {
            isMounted = false;
            stopRinging();
        };
    }, [visible]);

    const handleReject = async () => {
        Vibration.cancel();
        if (soundRef.current) {
            try {
                await soundRef.current.stopAsync();
                await soundRef.current.unloadAsync();
            } catch (e) { }
            soundRef.current = null;
        }
        onReject();
    };

    const handleAccept = async () => {
        Vibration.cancel();
        if (soundRef.current) {
            try {
                await soundRef.current.stopAsync();
                await soundRef.current.unloadAsync();
            } catch (e) { }
            soundRef.current = null;
        }
        onAccept();
    };

    return (
        <Modal
            visible={visible}
            transparent={false}
            animationType="none"
            statusBarTranslucent
        >
            <View style={{ flex: 1, backgroundColor: 'black' }}>
                <ImageBackground
                    source={{ uri: getAvatarUri(callerAvatar, callerName) }}
                    style={styles.container}
                    blurRadius={30}
                    resizeMode="cover"
                >
                    <LinearGradient
                        colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.6)', '#000000']}
                        style={styles.gradientOverlay}
                    >
                        <Animated.View
                            style={[
                                styles.contentContainer,
                                { transform: [{ translateY: slideAnim }] }
                            ]}
                        >
                            {/* Top Section: Info */}
                            <View style={styles.topSection}>
                                <View style={styles.appBadge}>
                                    <Ionicons name="chatbubble" size={16} color="white" />
                                    <Text style={styles.appName}>Vinalive AI</Text>
                                </View>

                                <View style={styles.avatarWrapper}>
                                    <Animated.View style={[styles.avatarPulse, { transform: [{ scale: pulseAnim }] }]} />
                                    <View style={styles.avatarContainer}>
                                        {callerAvatar ? (
                                            <Image source={{ uri: getAvatarUri(callerAvatar, callerName) }} style={styles.avatar} />
                                        ) : (
                                            <Text style={styles.avatarText}>{callerName[0]?.toUpperCase()}</Text>
                                        )}
                                    </View>
                                </View>

                                <Text style={styles.callerName}>{callerName}</Text>
                                <Text style={styles.callStatus}>
                                    {isVideo ? 'Cuộc gọi video đến...' : 'Cuộc gọi thoại đến...'}
                                </Text>
                            </View>

                            {/* Bottom Section: Actions */}
                            <View style={styles.bottomSection}>
                                {/* Quick Actions */}
                                <View style={styles.optionsRow}>
                                    <TouchableOpacity style={styles.optionBtn}>
                                        <MaterialIcons name="message" size={24} color="rgba(255,255,255,0.7)" />
                                        <Text style={styles.optionText}>Nhắn tin</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.optionBtn}>
                                        <MaterialIcons name="alarm" size={24} color="rgba(255,255,255,0.7)" />
                                        <Text style={styles.optionText}>Nhắc tôi</Text>
                                    </TouchableOpacity>
                                </View>

                                {/* Answer / Decline Buttons */}
                                <View style={styles.actionsRow}>
                                    <View style={styles.actionColumn}>
                                        <TouchableOpacity
                                            style={[styles.actionButton, styles.declineButton]}
                                            onPress={handleReject}
                                            activeOpacity={0.8}
                                        >
                                            <MaterialIcons name="call-end" size={32} color="white" />
                                        </TouchableOpacity>
                                        <Text style={styles.actionText}>Từ chối</Text>
                                    </View>

                                    <View style={styles.actionColumn}>
                                        <TouchableOpacity
                                            style={[styles.actionButton, styles.acceptButton]}
                                            onPress={handleAccept}
                                            activeOpacity={0.8}
                                        >

                                            <Animated.View
                                                style={{
                                                    transform: [{
                                                        rotate: pulseAnim.interpolate({
                                                            inputRange: [1, 1.2],
                                                            outputRange: ['0deg', '-15deg']
                                                        })
                                                    }]
                                                }}
                                            >
                                                <Ionicons name={isVideo ? "videocam" : "call"} size={32} color="white" />
                                            </Animated.View>
                                        </TouchableOpacity>
                                        <Text style={styles.actionText}>Trả lời</Text>
                                    </View>
                                </View>
                            </View>
                        </Animated.View>
                    </LinearGradient>
                </ImageBackground>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    gradientOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    contentContainer: {
        flex: 1,
        width: '100%',
        justifyContent: 'space-between',
        paddingVertical: 80,
    },
    topSection: {
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    appBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(255,255,255,0.15)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginBottom: 50,
        backdropFilter: 'blur(10px)',
    },
    appName: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 14,
        fontWeight: '600',
    },
    avatarWrapper: {
        position: 'relative',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 30,
    },
    avatarPulse: {
        position: 'absolute',
        width: 180,
        height: 180,
        borderRadius: 90,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    avatarContainer: {
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: '#333',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: 'white',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
        elevation: 10,
    },
    avatar: {
        width: '100%',
        height: '100%',
    },
    avatarText: {
        fontSize: 48,
        color: 'white',
        fontWeight: 'bold',
    },
    callerName: {
        fontSize: 34,
        fontWeight: '700',
        color: 'white',
        marginBottom: 8,
        textAlign: 'center',
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    callStatus: {
        fontSize: 18,
        color: 'rgba(255,255,255,0.7)',
        fontWeight: '500',
    },
    bottomSection: {
        width: '100%',
        paddingHorizontal: 40,
        gap: 60,
    },
    optionsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
    },
    optionBtn: {
        alignItems: 'center',
        gap: 8,
    },
    optionText: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 12,
    },
    actionsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    actionColumn: {
        alignItems: 'center',
        gap: 12,
    },
    actionButton: {
        width: 75,
        height: 75,
        borderRadius: 37.5,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    declineButton: {
        backgroundColor: '#FF3B30',
    },
    acceptButton: {
        backgroundColor: '#34C759',
    },
    actionText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '500',
    },
});

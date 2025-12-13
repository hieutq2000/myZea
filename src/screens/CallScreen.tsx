import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
    Platform,
    Image,
    Dimensions,
    Alert,
    ImageBackground,
    Animated,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/types';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import { getSocket } from '../utils/socket';
import { getCurrentUser } from '../utils/api';
import createAgoraRtcEngine, {
    ChannelProfileType,
    ClientRoleType,
    IRtcEngine,
    RtcSurfaceView,
} from 'react-native-agora';
import { Camera } from 'expo-camera';
import { Audio } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';

type CallScreenRouteProp = RouteProp<RootStackParamList, 'Call'>;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Agora App ID from https://console.agora.io
const AGORA_APP_ID = 'f1c136b8ee414b18b2881df02f8da179';

export default function CallScreen() {
    const route = useRoute<CallScreenRouteProp>();
    const navigation = useNavigation();
    const { partnerId, userName, avatar, isVideo, isIncoming, channelName, conversationId } = route.params;

    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [isJoined, setIsJoined] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isSpeakerOn, setIsSpeakerOn] = useState(true);
    const [isVideoEnabled, setIsVideoEnabled] = useState(isVideo);
    const [remoteUid, setRemoteUid] = useState<number | null>(null);
    const [callStatus, setCallStatus] = useState<'calling' | 'ringing' | 'connected' | 'ended'>('calling');
    const [callDuration, setCallDuration] = useState(0);
    const [dialTone, setDialTone] = useState<Audio.Sound | null>(null);

    const agoraEngineRef = useRef<IRtcEngine | null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const socket = getSocket();
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        initCall();

        // Socket listeners
        if (socket) {
            socket.on('callAccepted', handleCallAccepted);
            socket.on('callRejected', handleCallRejected);
            socket.on('callEnded', handleCallEnded);
        }

        return () => {
            cleanup();
            if (socket) {
                socket.off('callAccepted');
                socket.off('callRejected');
                socket.off('callEnded');
            }
        };
    }, []);

    // Pulse Animation for Avatar when ringing
    useEffect(() => {
        if (callStatus === 'ringing' || callStatus === 'calling') {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.15,
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
            pulseAnim.setValue(1);
        }
    }, [callStatus]);

    // Handle Dial Tone Sound
    useEffect(() => {
        const manageAudio = async () => {
            if (isIncoming || callStatus === 'connected' || callStatus === 'ended') {
                // Stop dial tone if connected, ended or incoming (incoming has ringtone where handled)
                if (dialTone) {
                    try {
                        await dialTone.stopAsync();
                        await dialTone.unloadAsync();
                    } catch (e) { }
                    setDialTone(null);
                }
                return;
            }

            if ((callStatus === 'calling' || callStatus === 'ringing') && !dialTone) {
                try {
                    console.log('🔊 Playing Dial Tone...');
                    const { sound } = await Audio.Sound.createAsync(
                        { uri: 'https://assets.mixkit.co/active_storage/sfx/2359/2359-preview.mp3' },
                        { shouldPlay: true, isLooping: true }
                    );
                    setDialTone(sound);
                } catch (error) {
                    console.log('Error playing dial tone:', error);
                }
            }
        };
        manageAudio();
    }, [callStatus, isIncoming]);

    const initCall = async () => {
        const user = await getCurrentUser();
        if (!user) {
            Alert.alert('Lỗi', 'Không thể lấy thông tin người dùng');
            navigation.goBack();
            return;
        }
        const userId = user.id;
        setCurrentUserId(userId);

        let channel = channelName;
        if (!channel) {
            const safeUserId = userId.slice(0, 15);
            const safePartnerId = partnerId.slice(0, 15);
            channel = `call_${safeUserId}_${safePartnerId}`;
        }

        if (isIncoming) {
            setCallStatus('connected');
            startCallTimer();
        } else {
            if (socket) {
                socket.emit('callRequest', {
                    callerId: userId,
                    receiverId: partnerId,
                    channelName: channel,
                    isVideo: isVideo,
                });
                setCallStatus('ringing');
            }
        }

        try {
            await setupAgora(userId, channel);
        } catch (e: any) {
            console.error('Agora setup failed:', e);
            Alert.alert('Lỗi', 'Không thể kết nối cuộc gọi');
        }
    };

    const setupAgora = async (userId: string, channel: string) => {
        try {
            if (Platform.OS === 'android' || Platform.OS === 'ios') {
                await Camera.requestCameraPermissionsAsync();
                await Camera.requestMicrophonePermissionsAsync();
            }

            const engine = createAgoraRtcEngine();
            agoraEngineRef.current = engine;

            engine.registerEventHandler({
                onJoinChannelSuccess: () => {
                    setIsJoined(true);
                },
                onUserJoined: (_connection, uid) => {
                    setRemoteUid(uid);
                    setCallStatus('connected');
                    startCallTimer();
                },
                onUserOffline: (_connection, uid) => {
                    setRemoteUid(null);
                    endCall();
                },
                onError: (err, msg) => {
                    console.log('Agora Error:', err, msg);
                },
            });

            engine.initialize({
                appId: AGORA_APP_ID,
                channelProfile: ChannelProfileType.ChannelProfileCommunication,
            });

            if (isVideo) {
                engine.enableVideo();
                engine.startPreview();
            }

            engine.setClientRole(ClientRoleType.ClientRoleBroadcaster);
            engine.setEnableSpeakerphone(true);
            const result = await engine.joinChannel('', channel, 0, {});
        } catch (error) {
            console.error('Agora error:', error);
        }
    };

    const handleCallAccepted = (data: any) => {
        setCallStatus('connected');
        startCallTimer();
    };

    const handleCallRejected = () => {
        sendCallMessage('call_missed');
        cleanup();
        navigation.goBack();
        Alert.alert('Cuộc gọi', 'Người nhận đang bận.');
    };

    const handleCallEnded = () => {
        cleanup();
        navigation.goBack();
    };

    const startCallTimer = () => {
        if (!timerRef.current) {
            setCallDuration(0);
            timerRef.current = setInterval(() => {
                setCallDuration(prev => prev + 1);
            }, 1000);
        }
    };

    const sendCallMessage = (type: 'call_missed' | 'call_ended', duration?: string) => {
        if (socket && currentUserId) {
            const text = type === 'call_missed' ? 'Cuộc gọi thoại bị nhỡ' : `Cuộc gọi thoại ${duration}`;
            socket.emit('sendMessage', {
                conversationId: conversationId,
                senderId: currentUserId,
                receiverId: partnerId,
                message: text,
                type: type,
                callDuration: duration,
                tempId: Date.now().toString()
            });
        }
    };

    const cleanup = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        if (agoraEngineRef.current) {
            agoraEngineRef.current.leaveChannel();
            agoraEngineRef.current.release();
            agoraEngineRef.current = null;
        }
        if (dialTone) {
            dialTone.stopAsync();
            dialTone.unloadAsync();
        }
    };

    const endCall = () => {
        if (socket) {
            socket.emit('endCall', {
                callerId: currentUserId,
                receiverId: partnerId,
            });
        }

        // Send Chat Message Log
        if (!isIncoming) {
            if (callStatus === 'connected') {
                sendCallMessage('call_ended', formatDuration(callDuration));
            } else if (callStatus === 'calling' || callStatus === 'ringing') {
                sendCallMessage('call_missed');
            }
        }

        cleanup();
        navigation.goBack();
    };

    const toggleMute = () => {
        if (agoraEngineRef.current) {
            agoraEngineRef.current.muteLocalAudioStream(!isMuted);
            setIsMuted(!isMuted);
        }
    };

    const toggleSpeaker = () => {
        if (agoraEngineRef.current) {
            agoraEngineRef.current.setEnableSpeakerphone(!isSpeakerOn);
            setIsSpeakerOn(!isSpeakerOn);
        }
    };

    const toggleVideo = () => {
        if (agoraEngineRef.current) {
            if (isVideoEnabled) {
                agoraEngineRef.current.disableVideo();
            } else {
                agoraEngineRef.current.enableVideo();
                agoraEngineRef.current.startPreview();
            }
            setIsVideoEnabled(!isVideoEnabled);
        }
    };

    const switchCamera = () => {
        if (agoraEngineRef.current && isVideoEnabled) {
            agoraEngineRef.current.switchCamera();
        }
    };

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const getStatusText = () => {
        switch (callStatus) {
            case 'calling': return 'Đang kết nối...';
            case 'ringing': return 'Đang đổ chuông...';
            case 'connected': return formatDuration(callDuration);
            case 'ended': return 'Cuộc gọi kết thúc';
            default: return '';
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

            {isVideoEnabled && remoteUid ? (
                <View style={styles.videoContainer}>
                    <RtcSurfaceView style={styles.remoteVideo} canvas={{ uid: remoteUid }} />
                    <View style={styles.localVideoContainer}>
                        <RtcSurfaceView style={styles.localVideo} canvas={{ uid: 0 }} />
                    </View>
                </View>
            ) : (
                <ImageBackground
                    source={{ uri: avatar || 'https://images.unsplash.com/photo-1557683316-973673baf926?w=800&q=80' }}
                    style={styles.backgroundImage}
                    blurRadius={20}
                >
                    <LinearGradient
                        colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.7)', '#000000']}
                        style={styles.gradientOverlay}
                    >
                        <View style={styles.audioCallContent}>
                            <View style={styles.avatarWrapper}>
                                <Animated.View style={[styles.avatarPulse, { transform: [{ scale: pulseAnim }] }]} />
                                <View style={styles.avatarContainer}>
                                    {avatar ? (
                                        <Image source={{ uri: avatar }} style={styles.avatarImage} />
                                    ) : (
                                        <Text style={styles.avatarText}>{userName?.[0]?.toUpperCase()}</Text>
                                    )}
                                </View>
                            </View>
                            <Text style={styles.userName}>{userName}</Text>
                            <Text style={styles.callStatus}>{getStatusText()}</Text>
                        </View>
                    </LinearGradient>
                </ImageBackground>
            )}

            <SafeAreaView style={styles.controlsContainer}>
                <View style={styles.topControls}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.minimizeBtn}>
                        <Ionicons name="chevron-down" size={28} color="white" />
                    </TouchableOpacity>
                </View>

                <View style={styles.bottomControls}>
                    <View style={styles.controlsRow}>
                        <TouchableOpacity style={[styles.controlButton, isMuted && styles.controlButtonActive]} onPress={toggleMute}>
                            <Ionicons name={isMuted ? "mic-off-outline" : "mic-outline"} size={28} color="white" />
                            <Text style={styles.controlLabel}>Mic</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.controlButton, isSpeakerOn && styles.controlButtonActive]} onPress={toggleSpeaker}>
                            <Ionicons name={isSpeakerOn ? "volume-high-outline" : "volume-low-outline"} size={28} color="white" />
                            <Text style={styles.controlLabel}>Loa ngoài</Text>
                        </TouchableOpacity>

                        {isVideo && (
                            <TouchableOpacity style={[styles.controlButton, !isVideoEnabled && styles.controlButtonActive]} onPress={toggleVideo}>
                                <Ionicons name={isVideoEnabled ? "videocam-outline" : "videocam-off-outline"} size={28} color="white" />
                                <Text style={styles.controlLabel}>Camera</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    <View style={styles.endCallRow}>
                        <TouchableOpacity style={styles.endCallButton} onPress={endCall}>
                            <MaterialIcons name="call-end" size={32} color="white" />
                        </TouchableOpacity>
                    </View>
                </View>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    backgroundImage: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    gradientOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    videoContainer: {
        flex: 1,
    },
    remoteVideo: {
        flex: 1,
    },
    localVideoContainer: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 60 : 40,
        right: 20,
        width: 100,
        height: 150,
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: 'white',
        backgroundColor: 'black',
        shadowColor: '#000',
        elevation: 5,
    },
    localVideo: {
        flex: 1,
    },
    audioCallContent: {
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 80,
    },
    avatarWrapper: {
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    avatarPulse: {
        position: 'absolute',
        width: 150,
        height: 150,
        borderRadius: 75,
        backgroundColor: 'rgba(255,255,255,0.15)',
    },
    avatarContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#333',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'white',
        overflow: 'hidden',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
    avatarText: {
        fontSize: 48,
        fontWeight: 'bold',
        color: 'white',
    },
    userName: {
        fontSize: 28,
        fontWeight: '600',
        color: 'white',
        marginBottom: 8,
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    callStatus: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.8)',
        fontWeight: '500',
    },
    controlsContainer: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        justifyContent: 'space-between',
        paddingVertical: 20,
    },
    topControls: {
        paddingTop: Platform.OS === 'ios' ? 20 : 40,
        paddingHorizontal: 20,
        flexDirection: 'row',
    },
    minimizeBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    bottomControls: {
        paddingBottom: 40,
        gap: 30,
        paddingHorizontal: 30,
    },
    controlsRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 40,
        alignItems: 'flex-start',
    },
    controlButton: {
        alignItems: 'center',
        gap: 8,
    },
    controlButtonActive: {
        opacity: 0.7,
    },
    controlLabel: {
        color: 'white',
        fontSize: 12,
        fontWeight: '500',
    },
    endCallRow: {
        alignItems: 'center',
        marginTop: 10,
    },
    endCallButton: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: '#FF3B30',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        elevation: 5,
    },
});

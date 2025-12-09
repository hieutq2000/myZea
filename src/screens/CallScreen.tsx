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
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/types';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { getSocket } from '../utils/socket';
import { getCurrentUser } from '../utils/api';
import createAgoraRtcEngine, {
    ChannelProfileType,
    ClientRoleType,
    IRtcEngine,
    RtcSurfaceView,
} from 'react-native-agora';

type CallScreenRouteProp = RouteProp<RootStackParamList, 'Call'>;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Agora App ID from https://console.agora.io
const AGORA_APP_ID = 'd3eb86aa867f4fa2b049b15b24978fba';

export default function CallScreen() {
    const route = useRoute<CallScreenRouteProp>();
    const navigation = useNavigation();
    const { partnerId, userName, avatar, isVideo, isIncoming, channelName } = route.params;

    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [isJoined, setIsJoined] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isSpeakerOn, setIsSpeakerOn] = useState(true);
    const [isVideoEnabled, setIsVideoEnabled] = useState(isVideo);
    const [remoteUid, setRemoteUid] = useState<number | null>(null);
    const [callStatus, setCallStatus] = useState<'calling' | 'ringing' | 'connected' | 'ended'>('calling');
    const [callDuration, setCallDuration] = useState(0);

    const agoraEngineRef = useRef<IRtcEngine | null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const socket = getSocket();

    useEffect(() => {
        initCall();

        // Socket listeners for call signaling
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

    const initCall = async () => {
        // First get current user ID
        const user = await getCurrentUser();
        if (!user) {
            Alert.alert('Lỗi', 'Không thể lấy thông tin người dùng');
            navigation.goBack();
            return;
        }
        const userId = user.id;
        setCurrentUserId(userId);

        // Then setup Agora with the user ID
        await setupAgora(userId);
    };

    const setupAgora = async (userId: string) => {
        try {



            const engine = createAgoraRtcEngine();
            agoraEngineRef.current = engine;

            engine.registerEventHandler({
                onJoinChannelSuccess: () => {
                    console.log('✅ Joined channel successfully');
                    setIsJoined(true);
                    if (!isIncoming) {
                        setCallStatus('ringing');
                        // Emit call request to partner
                        if (socket) {
                            console.log('📞 Emitting callRequest to', partnerId);
                            socket.emit('callRequest', {
                                callerId: userId,
                                receiverId: partnerId,
                                channelName: channelName || `call_${userId}_${partnerId}`,
                                isVideo: isVideo,
                            });
                        }
                    }
                },
                onUserJoined: (_connection, uid) => {
                    console.log('👤 Remote user joined:', uid);
                    setRemoteUid(uid);
                    setCallStatus('connected');
                    startCallTimer();
                },
                onUserOffline: (_connection, uid) => {
                    console.log('👤 Remote user left:', uid);
                    setRemoteUid(null);
                    endCall();
                },
                onError: (err) => {
                    console.error('❌ Agora Error:', err);
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

            // Join channel
            const channel = channelName || `call_${userId}_${partnerId}`;
            await engine.joinChannel('', channel, parseInt(userId || '0', 10), {});

        } catch (error) {
            console.error('Agora setup error:', error);
            Alert.alert('Lỗi', 'Không thể khởi tạo cuộc gọi');
            navigation.goBack();
        }
    };

    const handleCallAccepted = () => {
        setCallStatus('connected');
        startCallTimer();
    };

    const handleCallRejected = () => {
        Alert.alert('Cuộc gọi', 'Người dùng từ chối cuộc gọi');
        cleanup();
        navigation.goBack();
    };

    const handleCallEnded = () => {
        cleanup();
        navigation.goBack();
    };

    const startCallTimer = () => {
        timerRef.current = setInterval(() => {
            setCallDuration(prev => prev + 1);
        }, 1000);
    };

    const cleanup = () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
        }
        if (agoraEngineRef.current) {
            agoraEngineRef.current.leaveChannel();
            agoraEngineRef.current.release();
            agoraEngineRef.current = null;
        }
    };

    const endCall = () => {
        if (socket) {
            socket.emit('endCall', {
                callerId: currentUserId,
                receiverId: partnerId,
            });
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
            case 'calling':
                return 'Đang kết nối...';
            case 'ringing':
                return 'Đang đổ chuông...';
            case 'connected':
                return formatDuration(callDuration);
            case 'ended':
                return 'Cuộc gọi kết thúc';
            default:
                return '';
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#000" />

            {/* Video View */}
            {isVideoEnabled && remoteUid ? (
                <View style={styles.videoContainer}>
                    {/* Remote Video (Full screen) */}
                    <RtcSurfaceView
                        style={styles.remoteVideo}
                        canvas={{ uid: remoteUid }}
                    />

                    {/* Local Video (Small) */}
                    <View style={styles.localVideoContainer}>
                        <RtcSurfaceView
                            style={styles.localVideo}
                            canvas={{ uid: 0 }}
                        />
                    </View>
                </View>
            ) : (
                /* Audio Call / Waiting Screen */
                <View style={styles.audioCallContainer}>
                    <View style={styles.avatarLarge}>
                        {avatar ? (
                            <Image source={{ uri: avatar }} style={styles.avatarImage} />
                        ) : (
                            <View style={styles.avatarPlaceholder}>
                                <Text style={styles.avatarText}>{userName?.[0]?.toUpperCase()}</Text>
                            </View>
                        )}
                    </View>
                    <Text style={styles.userName}>{userName}</Text>
                    <Text style={styles.callStatus}>{getStatusText()}</Text>
                </View>
            )}

            {/* Controls */}
            <SafeAreaView style={styles.controlsContainer}>
                <View style={styles.controlsRow}>
                    {/* Mute */}
                    <TouchableOpacity
                        style={[styles.controlButton, isMuted && styles.controlButtonActive]}
                        onPress={toggleMute}
                    >
                        <Ionicons
                            name={isMuted ? "mic-off" : "mic"}
                            size={28}
                            color="white"
                        />
                        <Text style={styles.controlLabel}>{isMuted ? 'Bật mic' : 'Tắt mic'}</Text>
                    </TouchableOpacity>

                    {/* End Call */}
                    <TouchableOpacity style={styles.endCallButton} onPress={endCall}>
                        <MaterialIcons name="call-end" size={36} color="white" />
                    </TouchableOpacity>

                    {/* Speaker */}
                    <TouchableOpacity
                        style={[styles.controlButton, isSpeakerOn && styles.controlButtonActive]}
                        onPress={toggleSpeaker}
                    >
                        <Ionicons
                            name={isSpeakerOn ? "volume-high" : "volume-low"}
                            size={28}
                            color="white"
                        />
                        <Text style={styles.controlLabel}>Loa</Text>
                    </TouchableOpacity>
                </View>

                {/* Video Controls */}
                {isVideo && (
                    <View style={styles.videoControlsRow}>
                        <TouchableOpacity
                            style={[styles.controlButton, !isVideoEnabled && styles.controlButtonActive]}
                            onPress={toggleVideo}
                        >
                            <Ionicons
                                name={isVideoEnabled ? "videocam" : "videocam-off"}
                                size={28}
                                color="white"
                            />
                            <Text style={styles.controlLabel}>Camera</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.controlButton} onPress={switchCamera}>
                            <Ionicons name="camera-reverse" size={28} color="white" />
                            <Text style={styles.controlLabel}>Đổi cam</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1a1a2e',
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
        width: 120,
        height: 160,
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: 'white',
    },
    localVideo: {
        flex: 1,
    },
    audioCallContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarLarge: {
        marginBottom: 24,
    },
    avatarImage: {
        width: 150,
        height: 150,
        borderRadius: 75,
        borderWidth: 4,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    avatarPlaceholder: {
        width: 150,
        height: 150,
        borderRadius: 75,
        backgroundColor: '#0068FF',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 4,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    avatarText: {
        fontSize: 60,
        fontWeight: 'bold',
        color: 'white',
    },
    userName: {
        fontSize: 28,
        fontWeight: '600',
        color: 'white',
        marginBottom: 8,
    },
    callStatus: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.7)',
    },
    controlsContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingBottom: Platform.OS === 'ios' ? 40 : 30,
        paddingHorizontal: 20,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    controlsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingVertical: 20,
    },
    videoControlsRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 40,
        paddingBottom: 10,
    },
    controlButton: {
        alignItems: 'center',
        padding: 12,
        borderRadius: 50,
        backgroundColor: 'rgba(255,255,255,0.2)',
        minWidth: 70,
    },
    controlButtonActive: {
        backgroundColor: 'rgba(255,255,255,0.4)',
    },
    controlLabel: {
        color: 'white',
        fontSize: 12,
        marginTop: 4,
    },
    endCallButton: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: '#FF3B30',
        justifyContent: 'center',
        alignItems: 'center',
    },
});

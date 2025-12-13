import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Dimensions,
    Modal,
    StatusBar,
    Platform,
    SafeAreaView,
    Text
} from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus, Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';

interface VideoPlayerProps {
    source: string;
    style?: any;
    paused?: boolean;
    useNativeControls?: boolean;
    showFullscreenButton?: boolean;
}

const MAX_VIDEO_HEIGHT = 450; // Max height like Facebook
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function VideoPlayer({
    source,
    style,
    paused = true,
    useNativeControls = false,
    showFullscreenButton = true
}: VideoPlayerProps) {
    const video = useRef<Video>(null);
    const fullscreenVideo = useRef<Video>(null);
    const [isPlaying, setIsPlaying] = useState(!paused);
    const [status, setStatus] = useState<AVPlaybackStatus | {}>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isMuted, setIsMuted] = useState(false);
    const [videoRatio, setVideoRatio] = useState(16 / 9);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const [duration, setDuration] = useState(0);
    const [position, setPosition] = useState(0);
    const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        setIsPlaying(!paused);
    }, [paused]);

    useEffect(() => {
        // Enable audio playback in silent mode
        const enableAudio = async () => {
            try {
                await Audio.setAudioModeAsync({
                    playsInSilentModeIOS: true,
                    staysActiveInBackground: false,
                    shouldDuckAndroid: true,
                });
            } catch (e) {
                console.error('Audio setup error:', e);
            }
        };
        enableAudio();
    }, []);

    // Auto-hide controls after 3 seconds
    useEffect(() => {
        if (isFullscreen && showControls) {
            if (controlsTimeoutRef.current) {
                clearTimeout(controlsTimeoutRef.current);
            }
            controlsTimeoutRef.current = setTimeout(() => {
                if (isPlaying) {
                    setShowControls(false);
                }
            }, 3000);
        }
        return () => {
            if (controlsTimeoutRef.current) {
                clearTimeout(controlsTimeoutRef.current);
            }
        };
    }, [isFullscreen, showControls, isPlaying]);

    const handlePlayPause = async () => {
        setIsPlaying(!isPlaying);
        setShowControls(true);
    };

    const handleSeek = async (value: number) => {
        const videoRef = isFullscreen ? fullscreenVideo : video;
        if (videoRef.current && duration > 0) {
            await videoRef.current.setPositionAsync(value * duration);
        }
    };

    const formatTime = (ms: number) => {
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const openFullscreen = async () => {
        // Get current position before switching
        if (video.current) {
            const currentStatus = await video.current.getStatusAsync();
            if (currentStatus.isLoaded) {
                setPosition(currentStatus.positionMillis || 0);
            }
            // Explicitly pause the small video before opening fullscreen
            // This is a safety measure in case prop update is slow
            await video.current.pauseAsync();
        }
        setIsFullscreen(true);
        setIsPlaying(true); // Ensure it plays in fullscreen
        setShowControls(true);
    };

    const closeFullscreen = async () => {
        // Sync position back to main player
        if (fullscreenVideo.current && video.current) {
            const currentStatus = await fullscreenVideo.current.getStatusAsync();
            if (currentStatus.isLoaded) {
                await video.current.setPositionAsync(currentStatus.positionMillis || 0);
            }
        }
        setIsFullscreen(false);
        // isPlaying state persists, so if user paused in fullscreen, it remains paused
    };

    const handleStatusUpdate = (s: AVPlaybackStatus) => {
        setStatus(s);
        if (s.isLoaded) {
            setDuration(s.durationMillis || 0);
            setPosition(s.positionMillis || 0);

            // Sync internal state if playback finished or external factors changed it
            if (s.didJustFinish) {
                setIsPlaying(false);
            }
        }
    };

    // Calculate height with max limit
    const calculatedHeight = SCREEN_WIDTH / videoRatio;
    const finalHeight = Math.min(calculatedHeight, MAX_VIDEO_HEIGHT);

    return (
        <>
            <View style={[styles.container, style, { width: '100%', height: finalHeight }]}>
                <Video
                    ref={video}
                    style={styles.video}
                    source={{ uri: source }}
                    useNativeControls={useNativeControls}
                    resizeMode={ResizeMode.CONTAIN}
                    isLooping
                    isMuted={isMuted}
                    volume={1.0}
                    shouldPlay={isPlaying && !isFullscreen}
                    onPlaybackStatusUpdate={handleStatusUpdate}
                    onLoad={(status: any) => {
                        if (status.naturalSize && status.naturalSize.height > 0) {
                            const r = status.naturalSize.width / status.naturalSize.height;
                            setVideoRatio(r);
                        }
                        setIsLoading(false);
                    }}
                    onLoadStart={() => setIsLoading(true)}
                />

                {/* Loading Indicator */}
                {isLoading && (
                    <View style={styles.loadingOverlay}>
                        <ActivityIndicator size="large" color="#FFF" />
                    </View>
                )}

                {/* Custom Overlay */}
                {!useNativeControls && !isLoading && (
                    <View style={styles.controlsOverlay}>
                        <TouchableOpacity style={styles.centerButton} onPress={handlePlayPause}>
                            {!isPlaying && (
                                <View style={styles.playButtonCircle}>
                                    <Ionicons name="play" size={30} color="white" style={{ marginLeft: 4 }} />
                                </View>
                            )}
                            {isPlaying && (
                                <View style={{ width: '100%', height: '100%' }} />
                            )}
                        </TouchableOpacity>

                        {/* Bottom Bar Controls (Facebook style) */}
                        <View style={styles.inlineControlsContainer}>
                            <View style={styles.inlineProgressContainer}>
                                <Text style={styles.inlineTimeText}>{formatTime(position)}</Text>
                                <Slider
                                    style={styles.inlineSlider}
                                    minimumValue={0}
                                    maximumValue={1}
                                    value={duration > 0 ? position / duration : 0}
                                    onSlidingComplete={handleSeek}
                                    minimumTrackTintColor="#1877F2" // Facebook Blue
                                    maximumTrackTintColor="rgba(255,255,255,0.3)"
                                    thumbTintColor="#1877F2"
                                />
                                <Text style={styles.inlineTimeText}>{formatTime(duration)}</Text>
                            </View>

                            <View style={styles.inlineRightControls}>
                                <TouchableOpacity style={styles.iconButton} onPress={() => setIsMuted(!isMuted)}>
                                    <Ionicons name={isMuted ? "volume-mute" : "volume-high"} size={20} color="white" />
                                </TouchableOpacity>

                                {showFullscreenButton && (
                                    <TouchableOpacity style={styles.iconButton} onPress={openFullscreen}>
                                        <Ionicons name="expand" size={20} color="white" />
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    </View>
                )}
            </View>

            {/* Fullscreen Modal */}
            <Modal
                visible={isFullscreen}
                animationType="fade"
                statusBarTranslucent
                supportedOrientations={['portrait', 'landscape']}
                onRequestClose={closeFullscreen}
            >
                <StatusBar hidden />
                <TouchableOpacity
                    style={styles.fullscreenContainer}
                    activeOpacity={1}
                    onPress={() => setShowControls(!showControls)}
                >
                    <Video
                        ref={fullscreenVideo}
                        style={styles.fullscreenVideo}
                        source={{ uri: source }}
                        resizeMode={ResizeMode.CONTAIN}
                        isLooping
                        isMuted={isMuted}
                        volume={1.0}
                        shouldPlay={isPlaying}
                        onLoad={() => {
                            if (fullscreenVideo.current) {
                                fullscreenVideo.current.setPositionAsync(position);
                            }
                        }}
                        onPlaybackStatusUpdate={handleStatusUpdate}
                    />

                    {/* Fullscreen Controls */}
                    {showControls && (
                        <SafeAreaView style={styles.fullscreenControls}>
                            {/* Top Bar */}
                            <View style={styles.topBar}>
                                <TouchableOpacity onPress={closeFullscreen} style={styles.closeButton}>
                                    <Ionicons name="close" size={28} color="white" />
                                </TouchableOpacity>
                            </View>

                            {/* Center Play/Pause */}
                            <TouchableOpacity style={styles.centerPlayButton} onPress={handlePlayPause}>
                                <View style={styles.bigPlayButton}>
                                    <Ionicons
                                        name={isPlaying ? "pause" : "play"}
                                        size={40}
                                        color="white"
                                    />
                                </View>
                            </TouchableOpacity>

                            {/* Bottom Bar */}
                            <View style={styles.bottomBar}>
                                {/* Progress Bar */}
                                <View style={styles.progressContainer}>
                                    <Text style={styles.timeText}>{formatTime(position)}</Text>
                                    <Slider
                                        style={styles.slider}
                                        minimumValue={0}
                                        maximumValue={1}
                                        value={duration > 0 ? position / duration : 0}
                                        onSlidingComplete={handleSeek}
                                        minimumTrackTintColor="#1877F2"
                                        maximumTrackTintColor="rgba(255,255,255,0.3)"
                                        thumbTintColor="#1877F2"
                                    />
                                    <Text style={styles.timeText}>{formatTime(duration)}</Text>
                                </View>

                                {/* Bottom Controls */}
                                <View style={styles.bottomControls}>
                                    <TouchableOpacity onPress={() => setIsMuted(!isMuted)} style={styles.controlButton}>
                                        <Ionicons name={isMuted ? "volume-mute" : "volume-high"} size={24} color="white" />
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={closeFullscreen} style={styles.controlButton}>
                                        <Ionicons name="contract" size={24} color="white" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </SafeAreaView>
                    )}
                </TouchableOpacity>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'black',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    video: {
        width: '100%',
        height: '100%',
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    controlsOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
    },
    // Inline Controls (Facebook Style)
    inlineControlsContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingBottom: 6,
        paddingTop: 6,
    },
    inlineProgressContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 10,
    },
    inlineSlider: {
        flex: 1,
        marginHorizontal: 8,
        height: 30,
    },
    inlineTimeText: {
        color: 'white',
        fontSize: 10,
        fontWeight: '600',
        minWidth: 35,
        textAlign: 'center',
    },
    inlineRightControls: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconButton: {
        padding: 5,
        marginLeft: 5,
    },
    centerButton: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    playButtonCircle: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'white'
    },
    volumeButton: {
        position: 'absolute',
        bottom: 15,
        right: 55,
        padding: 8,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 20,
    },
    fullscreenButton: {
        position: 'absolute',
        bottom: 15,
        right: 15,
        padding: 8,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 20,
    },
    // Fullscreen styles
    fullscreenContainer: {
        flex: 1,
        backgroundColor: 'black',
        justifyContent: 'center',
    },
    fullscreenVideo: {
        width: '100%',
        height: '100%',
    },
    fullscreenControls: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'space-between',
    },
    topBar: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'android' ? 40 : 10,
    },
    closeButton: {
        padding: 8,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 20,
    },
    centerPlayButton: {
        alignSelf: 'center',
    },
    bigPlayButton: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'white',
    },
    bottomBar: {
        paddingHorizontal: 16,
        paddingBottom: Platform.OS === 'android' ? 20 : 10,
    },
    progressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    slider: {
        flex: 1,
        marginHorizontal: 10,
    },
    timeText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '600',
    },
    bottomControls: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    controlButton: {
        padding: 8,
    },
});

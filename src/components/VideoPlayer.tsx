import React, { useState, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';

interface VideoPlayerProps {
    source: string;
    style?: any;
    paused?: boolean;
    useNativeControls?: boolean;
}

export default function VideoPlayer({ source, style, paused = true, useNativeControls = false }: VideoPlayerProps) {
    const video = useRef<Video>(null);
    const [status, setStatus] = useState<AVPlaybackStatus | {}>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isMuted, setIsMuted] = useState(false);
    const [videoRatio, setVideoRatio] = useState(16 / 9); // Default aspect ratio

    // Tính toán nếu đang paused từ prop
    // Nếu source change, component remounts or updates

    // Auto handle play/pause via prop is tricky if user manually paused.
    // For now, simple implementation: default paused.

    const handlePlayPause = async () => {
        if (!video.current) return;

        if ((status as any).isPlaying) {
            await video.current.pauseAsync();
        } else {
            await video.current.playAsync();
        }
    };

    return (
        <View style={[styles.container, style, { width: '100%', aspectRatio: videoRatio, maxHeight: 600 }]}>
            <Video
                ref={video}
                style={styles.video}
                source={{ uri: source }}
                useNativeControls={useNativeControls}
                resizeMode={ResizeMode.CONTAIN}
                isLooping
                isMuted={isMuted}
                shouldPlay={!paused}
                onPlaybackStatusUpdate={(s) => {
                    setStatus(s);
                }}
                onLoad={(status: any) => {
                    // Check naturalSize to adjust aspect ratio
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

            {/* Custom Overlay (Only shown if native controls off) */}
            {!useNativeControls && !isLoading && (
                <View style={styles.controlsOverlay}>
                    <TouchableOpacity style={styles.centerButton} onPress={handlePlayPause}>
                        {!(status as any).isPlaying && (
                            <View style={styles.playButtonCircle}>
                                <Ionicons name="play" size={30} color="white" style={{ marginLeft: 4 }} />
                            </View>
                        )}
                        {/* Invisible hit area for pause if playing */}
                        {(status as any).isPlaying && (
                            <View style={{ width: '100%', height: '100%' }} />
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.volumeButton} onPress={() => setIsMuted(!isMuted)}>
                        <Ionicons name={isMuted ? "volume-mute" : "volume-high"} size={20} color="white" />
                    </TouchableOpacity>
                </View>
            )}
        </View>
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
        right: 15,
        padding: 8,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 20,
    }
});

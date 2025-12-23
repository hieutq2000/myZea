import React, { useState, useEffect, useMemo } from 'react';
import { View, Dimensions, TouchableOpacity, Text, StyleSheet, Animated } from 'react-native';
import { Image } from 'expo-image';
import { getImageUrl } from '../utils/api';
import { Video, ResizeMode } from 'expo-av';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MAX_BUBBLE_WIDTH = SCREEN_WIDTH * 0.65;
const MIN_BUBBLE_WIDTH = 150;
const MAX_BUBBLE_HEIGHT = SCREEN_WIDTH * 0.8;
const MIN_BUBBLE_HEIGHT = 100;

// Default 4:3 aspect ratio for better appearance
const DEFAULT_WIDTH = MAX_BUBBLE_WIDTH;
const DEFAULT_HEIGHT = MAX_BUBBLE_WIDTH * 0.75; // 4:3 ratio

interface ChatMediaProps {
    source: string;
    type?: 'image' | 'video';
    caption?: string;
    time?: string;
    isMe?: boolean;
    width?: number;  // Original image width from server
    height?: number; // Original image height from server
    onPress?: () => void;
    onLongPress?: () => void;
}

// Helper function to calculate dimensions
const calculateDimensions = (w: number, h: number) => {
    if (w <= 0 || h <= 0) return { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT };

    const aspectRatio = w / h;
    let newWidth = MAX_BUBBLE_WIDTH;
    let newHeight = newWidth / aspectRatio;

    // Constrain height
    if (newHeight > MAX_BUBBLE_HEIGHT) {
        newHeight = MAX_BUBBLE_HEIGHT;
        newWidth = newHeight * aspectRatio;
    }
    if (newHeight < MIN_BUBBLE_HEIGHT) {
        newHeight = MIN_BUBBLE_HEIGHT;
        newWidth = newHeight * aspectRatio;
    }

    // Constrain width  
    if (newWidth > MAX_BUBBLE_WIDTH) {
        newWidth = MAX_BUBBLE_WIDTH;
        newHeight = newWidth / aspectRatio;
    }
    if (newWidth < MIN_BUBBLE_WIDTH) {
        newWidth = MIN_BUBBLE_WIDTH;
        newHeight = newWidth / aspectRatio;
    }

    return { width: newWidth, height: newHeight };
};

export default function ChatMedia({
    source,
    type = 'image',
    caption,
    time,
    isMe = true,
    width: propWidth,
    height: propHeight,
    onPress,
    onLongPress
}: ChatMediaProps) {
    // Calculate initial dimensions from props if available
    const initialDimensions = useMemo(() => {
        if (propWidth && propHeight && propWidth > 0 && propHeight > 0) {
            return calculateDimensions(propWidth, propHeight);
        }
        // Default 4:3 ratio
        return { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT };
    }, [propWidth, propHeight]);

    const [dimensions, setDimensions] = useState(initialDimensions);
    const hasPropDimensions = propWidth && propHeight && propWidth > 0 && propHeight > 0;

    useEffect(() => {
        // If we already have dimensions from props, use them
        if (hasPropDimensions) {
            setDimensions(initialDimensions);
            return;
        }

        if (!source || type === 'video') {
            return;
        }

        const uri = getImageUrl(source);

        // Get image size to calculate aspect ratio
        const { Image: RNImage } = require('react-native');
        RNImage.getSize(
            uri,
            (w: number, h: number) => {
                if (w > 0 && h > 0) {
                    setDimensions(calculateDimensions(w, h));
                }
            },
            (error: any) => {
                console.log('ChatMedia getSize error:', error);
            }
        );
    }, [source, type, hasPropDimensions, initialDimensions]);

    const bubbleStyle = [
        styles.bubble,
        isMe ? styles.bubbleMe : styles.bubbleOther,
        { width: dimensions.width }
    ];

    const renderMedia = () => {
        if (type === 'video') {
            return (
                <View style={[styles.mediaContainer, { width: dimensions.width, height: 200 }]}>
                    <Video
                        source={{ uri: getImageUrl(source) }}
                        style={styles.video}
                        useNativeControls
                        resizeMode={ResizeMode.CONTAIN}
                        isLooping={false}
                    />
                </View>
            );
        }

        return (
            <View style={[styles.mediaContainer, { width: dimensions.width, height: dimensions.height }]}>
                <Image
                    source={{ uri: getImageUrl(source) }}
                    style={styles.image}
                    contentFit="cover"
                    transition={300}
                />
            </View>
        );
    };

    return (
        <TouchableOpacity
            style={bubbleStyle}
            onPress={onPress}
            onLongPress={onLongPress}
            delayLongPress={500}
            activeOpacity={0.9}
        >
            {renderMedia()}

            {/* Caption */}
            {caption && caption.trim() !== '' && (
                <View style={styles.captionContainer}>
                    <Text style={[styles.captionText, { color: isMe ? '#FFFFFF' : '#000000' }]}>
                        {caption}
                    </Text>
                </View>
            )}

            {/* Time */}
            {time && (
                <Text style={[styles.timeText, { color: isMe ? 'rgba(255,255,255,0.7)' : '#9CA3AF' }]}>
                    {time}
                </Text>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    bubble: {
        borderRadius: 16,
        overflow: 'hidden',
        maxWidth: MAX_BUBBLE_WIDTH,
    },
    bubbleMe: {
        backgroundColor: '#5C3C5D',
    },
    bubbleOther: {
        backgroundColor: '#F2F4F5',
    },
    mediaContainer: {
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: '#E5E5E5',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    video: {
        width: '100%',
        height: '100%',
    },
    captionContainer: {
        paddingHorizontal: 12,
        paddingTop: 8,
        paddingBottom: 4,
    },
    captionText: {
        fontSize: 15,
        lineHeight: 20,
    },
    timeText: {
        fontSize: 10,
        alignSelf: 'flex-end',
        paddingHorizontal: 12,
        paddingBottom: 8,
    },
});

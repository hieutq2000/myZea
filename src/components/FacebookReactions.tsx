/**
 * FacebookReactions.tsx
 * 
 * A production-ready, Facebook-style animated reaction component for React Native.
 * 
 * Features:
 * - Long press to reveal reaction bar with spring animations
 * - Each emoji floats and bounces when appearing (staggered)
 * - Finger tracking: hovered emoji scales up (1.4x), others scale down (0.9x)
 * - Haptic feedback on selection
 * - Selected reaction animates to button position
 * - Fully reusable and well-commented
 * 
 * Dependencies:
 * - react-native-reanimated v3
 * - react-native-gesture-handler
 * - expo-haptics (for haptic feedback)
 */

import React, { useCallback, useMemo } from 'react';
import {

    View,
    Text,
    StyleSheet,
    Dimensions,
    Platform,
    Image,
} from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    withDelay,
    withSequence,
    interpolate,
    Extrapolation,
    runOnJS,
    FadeIn,
    FadeOut,
} from 'react-native-reanimated';
import {
    Gesture,
    GestureDetector,
    GestureHandlerRootView,
} from 'react-native-gesture-handler';
import { FontAwesome } from '@expo/vector-icons';

// Try to import haptics, but make it optional for OTA compatibility
let Haptics: any = null;
try {
    Haptics = require('expo-haptics');
} catch (e) {
    // expo-haptics not available in current build
    console.log('Haptics not available');
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================================
// CONSTANTS & TYPES
// ============================================================

// Animation timing constants
const LONG_PRESS_DURATION = 500; // ms to trigger long press
const EMOJI_SIZE = 40; // Size of each emoji
const EMOJI_SPACING = 8; // Spacing between emojis
const BAR_PADDING = 12; // Padding inside reaction bar
const HOVER_SCALE = 1.4; // Scale when hovering
const DEFAULT_SCALE = 1.0; // Default emoji scale
const SHRINK_SCALE = 0.85; // Scale for non-hovered emojis
const SPRING_CONFIG = {
    damping: 12,
    stiffness: 180,
    mass: 0.8,
};

/**
 * Reaction data structure
 */
export interface Reaction {
    id: string;
    emoji: string;
    label: string;
    color: string;
    icon: string; // URL for animated GIF
}

/**
 * Available reactions - matches Facebook's reaction set with GIFs
 */
export const REACTIONS: Reaction[] = [
    {
        id: 'like',
        emoji: '👍',
        label: 'Thích',
        color: '#1877F2',
        icon: 'https://raw.githubusercontent.com/duongdam/react-native-facebook-reactions/master/images/like.gif'
    },
    {
        id: 'love',
        emoji: '❤️',
        label: 'Yêu thích',
        color: '#F33E58',
        icon: 'https://raw.githubusercontent.com/duongdam/react-native-facebook-reactions/master/images/love.gif'
    },
    {
        id: 'care',
        emoji: '🥰',
        label: 'Thương thương',
        color: '#F7B928',
        icon: 'https://raw.githubusercontent.com/vorillaz/react-facebook-reactions/master/src/icons/care.gif'
    },
    {
        id: 'haha',
        emoji: '😂',
        label: 'Haha',
        color: '#F7B928',
        icon: 'https://raw.githubusercontent.com/duongdam/react-native-facebook-reactions/master/images/haha.gif'
    },
    {
        id: 'wow',
        emoji: '😮',
        label: 'Wow',
        color: '#F7B928',
        icon: 'https://raw.githubusercontent.com/duongdam/react-native-facebook-reactions/master/images/wow.gif'
    },
    {
        id: 'sad',
        emoji: '😢',
        label: 'Buồn',
        color: '#F7B928',
        icon: 'https://raw.githubusercontent.com/duongdam/react-native-facebook-reactions/master/images/sad.gif'
    },
    {
        id: 'angry',
        emoji: '😡',
        label: 'Phẫn nộ',
        color: '#E9710F',
        icon: 'https://raw.githubusercontent.com/duongdam/react-native-facebook-reactions/master/images/angry.gif'
    },
];

// ... (keep existing constants)

// ============================================================
// EMOJI ITEM COMPONENT
// ============================================================

interface EmojiItemProps {
    reaction: Reaction;
    index: number;
    isHovered: boolean;
    isVisible: boolean;
    anyHovered: boolean;
}

/**
 * Individual emoji item with hover animations
 */
const EmojiItem = React.memo(({
    reaction,
    index,
    isHovered,
    isVisible,
    anyHovered,
}: EmojiItemProps) => {
    // Shared values for animations
    const scale = useSharedValue(0);
    const translateY = useSharedValue(20);

    // Animate in when visible
    React.useEffect(() => {
        if (isVisible) {
            // Staggered entrance animation
            const delay = index * 50;
            scale.value = withDelay(
                delay,
                withSpring(1, { ...SPRING_CONFIG, stiffness: 200 })
            );
            translateY.value = withDelay(
                delay,
                withSequence(
                    withSpring(-8, { damping: 8, stiffness: 300 }), // Bounce up
                    withSpring(0, SPRING_CONFIG) // Settle
                )
            );
        } else {
            scale.value = withTiming(0, { duration: 150 });
            translateY.value = withTiming(20, { duration: 150 });
        }
    }, [isVisible, index]);

    // Hover effect
    React.useEffect(() => {
        if (isHovered) {
            scale.value = withSpring(HOVER_SCALE, SPRING_CONFIG);
            translateY.value = withSpring(-15, SPRING_CONFIG);
        } else if (anyHovered) {
            // Shrink when another emoji is hovered
            scale.value = withSpring(SHRINK_SCALE, SPRING_CONFIG);
            translateY.value = withSpring(0, SPRING_CONFIG);
        } else if (isVisible) {
            // Return to normal
            scale.value = withSpring(DEFAULT_SCALE, SPRING_CONFIG);
            translateY.value = withSpring(0, SPRING_CONFIG);
        }
    }, [isHovered, anyHovered, isVisible]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { scale: scale.value },
            { translateY: translateY.value },
        ],
    }));

    return (
        <Animated.View style={[styles.emojiContainer, animatedStyle]}>
            <Image
                source={{ uri: reaction.icon }}
                style={styles.emojiImage}
                resizeMode="contain"
            />
            {/* Show label on hover */}
            {isHovered && (
                <Animated.View
                    entering={FadeIn.duration(150)}
                    exiting={FadeOut.duration(100)}
                    style={styles.labelContainer}
                >
                    <Text style={styles.label}>{reaction.label}</Text>
                </Animated.View>
            )}
        </Animated.View>
    );
});

// ... (keep existing ReactionBar and ReactionButton components)

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({
    container: {
        position: 'relative',
        alignItems: 'center',
    },
    // ... (keep existing button styles)
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
        minWidth: 80,
    },
    buttonText: {
        marginLeft: 6,
        fontSize: 14,
        fontWeight: '600',
        color: '#65676B',
    },
    selectedEmoji: {
        fontSize: 18,
    },
    reactionBar: {
        position: 'absolute',
        bottom: 50,
        alignItems: 'center',
        zIndex: 1000,
    },
    reactionBarInner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 30,
        paddingVertical: BAR_PADDING,
        paddingHorizontal: BAR_PADDING,
        gap: EMOJI_SPACING,
        // Shift bar right so arrow points to first emoji (Like)
        // This fixes "too far left" issue for Like button
        marginLeft: 110,
        // Shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 10,
    },
    arrow: {
        width: 0,
        height: 0,
        borderLeftWidth: 10,
        borderRightWidth: 10,
        borderTopWidth: 10,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderTopColor: '#FFFFFF',
        marginTop: -1,
    },
    emojiContainer: {
        width: EMOJI_SIZE,
        height: EMOJI_SIZE,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emojiImage: {
        width: 40,
        height: 40,
    },
    labelContainer: {
        position: 'absolute',
        top: -30,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        minWidth: 60,
        alignItems: 'center',
    },
    label: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600',
    },
});

// ... (keep default export using the modified components)
export default ReactionButton;
export { ReactionBar };

/**
 * Helper to get reaction by ID
 */
export const getReactionById = (id: string): Reaction | undefined => {
    return REACTIONS.find(r => r.id === id);
};

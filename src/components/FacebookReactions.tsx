/**
 * FacebookReactions.tsx
 * 
 * A production-ready, Facebook-style animated reaction component for React Native.
 * 
 * Features:
 * - Long press to reveal reaction bar with spring animations
 * - Each emoji floats and bounces when appearing (staggered)
 * - Finger tracking: hovered emoji scales up, others scale down
 * - Haptic feedback on selection
 * - SELECTED EMOJI FLIES TO BUTTON POSITION (like real Facebook!)
 * - Fully reusable and well-commented
 * 
 * Dependencies:
 * - react-native-reanimated v3
 * - react-native-gesture-handler
 * - expo-haptics (for haptic feedback)
 * - lottie-react-native
 */

import React, { useCallback, useMemo, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Platform,
    LayoutChangeEvent,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
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
    Easing,
} from 'react-native-reanimated';
import {
    Gesture,
    GestureDetector,
} from 'react-native-gesture-handler';
import LottieView from 'lottie-react-native';

// Try to import haptics, but make it optional for OTA compatibility
let Haptics: any = null;
try {
    Haptics = require('expo-haptics');
} catch (e) {
    // expo-haptics not available in current build
    console.log('Haptics not available');
}

// ============================================================
// CONSTANTS & TYPES
// ============================================================

// Animation timing constants
const LONG_PRESS_DURATION = 300; // Nhanh hơn để phản hồi tốt
const EMOJI_SIZE = 40; // Size of each emoji
const EMOJI_SPACING = 4; // Khoảng cách nhỏ hơn giống Facebook
const BAR_PADDING = 6; // Padding nhỏ hơn
const HOVER_SCALE = 1.5; // Scale when hovering
const DEFAULT_SCALE = 1.0; // Default emoji scale
const SHRINK_SCALE = 0.85; // Scale for non-hovered emojis

// Spring config nhanh và bouncy giống Facebook
const SPRING_CONFIG = {
    damping: 12,
    stiffness: 400,
    mass: 0.5,
};

// Spring config cho entrance animation - rất nhanh
const ENTRANCE_SPRING = {
    damping: 10,
    stiffness: 500,
    mass: 0.4,
};

// Spring config cho fly animation
const FLY_SPRING = {
    damping: 15,
    stiffness: 300,
    mass: 0.6,
};

/**
 * Reaction data structure
 */
export interface Reaction {
    id: string;
    emoji: string;
    label: string;
    color: string;
    icon: any; // Lottie source
}

/**
 * Available reactions - using local Lottie files
 */
export const REACTIONS: Reaction[] = [
    {
        id: 'like',
        emoji: '👍',
        label: 'Thích',
        color: '#1877F2',
        icon: require('../assets/lottie/like.json')
    },
    {
        id: 'love',
        emoji: '❤️',
        label: 'Yêu thích',
        color: '#F33E58',
        icon: require('../assets/lottie/love.json')
    },
    {
        id: 'care',
        emoji: '🥰',
        label: 'Thương thương',
        color: '#F7B928',
        icon: require('../assets/lottie/care.json')
    },
    {
        id: 'haha',
        emoji: '😂',
        label: 'Haha',
        color: '#F7B928',
        icon: require('../assets/lottie/haha.json')
    },
    {
        id: 'wow',
        emoji: '😮',
        label: 'Wow',
        color: '#F7B928',
        icon: require('../assets/lottie/wow.json')
    },
    {
        id: 'sad',
        emoji: '😢',
        label: 'Buồn',
        color: '#F7B928',
        icon: require('../assets/lottie/sad.json')
    },
    {
        id: 'angry',
        emoji: '😡',
        label: 'Phẫn nộ',
        color: '#E9710F',
        icon: require('../assets/lottie/angry.json')
    },
];

// ============================================================
// HELPER FUNCTIONS
// ============================================================

const triggerHaptic = () => {
    if (Platform.OS !== 'web' && Haptics) {
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch (e) { }
    }
};

const triggerSelectionHaptic = () => {
    if (Platform.OS !== 'web' && Haptics) {
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        } catch (e) { }
    }
};

// ============================================================
// EMOJI ITEM COMPONENT - Có animation bay về nút
// ============================================================

interface EmojiItemProps {
    reaction: Reaction;
    index: number;
    isHovered: boolean;
    isVisible: boolean;
    anyHovered: boolean;
    isSelected: boolean; // New: emoji được chọn
    isOtherSelected: boolean; // New: emoji khác được chọn (để fade out)
}

const EmojiItem = React.memo(({
    reaction,
    index,
    isHovered,
    isVisible,
    anyHovered,
    isSelected,
    isOtherSelected,
}: EmojiItemProps) => {
    // Animation values
    const scale = useSharedValue(0);
    const translateY = useSharedValue(20);
    const translateX = useSharedValue(0);
    const opacity = useSharedValue(1);

    // Entrance animation
    React.useEffect(() => {
        if (isVisible && !isSelected && !isOtherSelected) {
            const delay = index * 15;

            // Reset position
            translateX.value = 0;
            opacity.value = 1;

            scale.value = withDelay(
                delay,
                withSequence(
                    withSpring(1.15, ENTRANCE_SPRING),
                    withSpring(1, { damping: 15, stiffness: 300 })
                )
            );
            translateY.value = withDelay(
                delay,
                withSequence(
                    withSpring(-15, ENTRANCE_SPRING),
                    withSpring(0, { damping: 12, stiffness: 250 })
                )
            );
        } else if (!isVisible && !isSelected) {
            scale.value = withTiming(0, { duration: 100 });
            translateY.value = withTiming(10, { duration: 100 });
        }
    }, [isVisible, index, isSelected, isOtherSelected]);

    // Hover effect
    React.useEffect(() => {
        if (isSelected || isOtherSelected) return; // Skip hover if selecting

        if (isHovered) {
            scale.value = withSpring(HOVER_SCALE, SPRING_CONFIG);
            translateY.value = withSpring(-20, SPRING_CONFIG);
        } else if (anyHovered) {
            scale.value = withSpring(SHRINK_SCALE, SPRING_CONFIG);
            translateY.value = withSpring(0, SPRING_CONFIG);
        } else if (isVisible) {
            scale.value = withSpring(DEFAULT_SCALE, SPRING_CONFIG);
            translateY.value = withSpring(0, SPRING_CONFIG);
        }
    }, [isHovered, anyHovered, isVisible, isSelected, isOtherSelected]);

    // FLY TO BUTTON animation khi được chọn!
    React.useEffect(() => {
        if (isSelected) {
            // Bay về vị trí nút (xuống dưới và về giữa)
            const targetX = -index * (EMOJI_SIZE + EMOJI_SPACING); // Bay về giữa (index 0)
            const targetY = 60; // Bay xuống nút

            translateX.value = withSpring(targetX, FLY_SPRING);
            translateY.value = withSpring(targetY, FLY_SPRING);
            scale.value = withSequence(
                withSpring(1.8, { damping: 8, stiffness: 400 }), // Phóng to
                withSpring(0, { damping: 15, stiffness: 200 }) // Thu nhỏ biến mất
            );
            opacity.value = withDelay(200, withTiming(0, { duration: 150 }));
        }
    }, [isSelected, index]);

    // Fade out animation cho các emoji khác khi có emoji được chọn
    React.useEffect(() => {
        if (isOtherSelected) {
            scale.value = withTiming(0.5, { duration: 150 });
            opacity.value = withTiming(0, { duration: 150 });
        }
    }, [isOtherSelected]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { scale: scale.value },
            { translateY: translateY.value },
            { translateX: translateX.value },
        ],
        opacity: opacity.value,
        zIndex: isHovered || isSelected ? 100 : 1,
    }));

    return (
        <Animated.View style={[styles.emojiContainer, animatedStyle]}>
            <LottieView
                source={reaction.icon}
                style={styles.emojiImage}
                autoPlay={isVisible}
                loop
            />
            {isHovered && !isSelected && (
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

// ============================================================
// REACTION BAR COMPONENT
// ============================================================

interface ReactionBarProps {
    isVisible: boolean;
    hoveredIndex: number;
    selectedIndex: number; // New: index của emoji được chọn
}

const ReactionBar = React.memo(({
    isVisible,
    hoveredIndex,
    selectedIndex,
}: ReactionBarProps) => {
    const containerScale = useSharedValue(0);
    const containerOpacity = useSharedValue(0);

    React.useEffect(() => {
        if (isVisible) {
            containerScale.value = withSpring(1, {
                damping: 12,
                stiffness: 300,
            });
            containerOpacity.value = withTiming(1, { duration: 100 });
        } else {
            containerScale.value = withTiming(0.8, { duration: 100 });
            containerOpacity.value = withTiming(0, { duration: 100 });
        }
    }, [isVisible]);

    const containerStyle = useAnimatedStyle(() => ({
        opacity: containerOpacity.value,
        transform: [
            { scale: containerScale.value },
            {
                translateY: interpolate(
                    containerScale.value,
                    [0, 1],
                    [15, 0],
                    Extrapolation.CLAMP
                ),
            },
        ],
    }));

    if (!isVisible && selectedIndex < 0) return null;

    return (
        <Animated.View style={[styles.reactionBar, containerStyle]}>
            <View style={styles.reactionBarInner}>
                {REACTIONS.map((reaction, index) => (
                    <EmojiItem
                        key={reaction.id}
                        reaction={reaction}
                        index={index}
                        isHovered={hoveredIndex === index}
                        isVisible={isVisible || selectedIndex >= 0}
                        anyHovered={hoveredIndex >= 0}
                        isSelected={selectedIndex === index}
                        isOtherSelected={selectedIndex >= 0 && selectedIndex !== index}
                    />
                ))}
            </View>
        </Animated.View>
    );
});

// ============================================================
// MAIN REACTION BUTTON COMPONENT
// ============================================================

interface ReactionButtonProps {
    selectedReaction: Reaction | null;
    onReactionSelect: (reaction: Reaction | null) => void;
    buttonStyle?: object;
    textStyle?: object;
}

export function ReactionButton({
    selectedReaction,
    onReactionSelect,
    buttonStyle,
    textStyle,
}: ReactionButtonProps) {
    const [isBarVisible, setIsBarVisible] = React.useState(false);
    const [hoveredIndex, setHoveredIndex] = React.useState(-1);
    const [selectedIndex, setSelectedIndex] = React.useState(-1); // New: tracking selected emoji for fly animation

    const fingerX = useSharedValue(0);
    const fingerY = useSharedValue(0);
    const isLongPressing = useSharedValue(false);
    const buttonWidth = useSharedValue(0);

    const onLayout = useCallback((event: LayoutChangeEvent) => {
        buttonWidth.value = event.nativeEvent.layout.width;
    }, []);

    const calcHoveredIndex = useCallback((x: number, y: number, btnWidth: number) => {
        'worklet';
        const totalBarWidth = REACTIONS.length * (EMOJI_SIZE + EMOJI_SPACING) + BAR_PADDING * 2 - EMOJI_SPACING;
        const centerX = btnWidth / 2;
        const relativeX = x - centerX;
        const barLeftEdge = -totalBarWidth / 2;

        // Mở rộng vùng detection - y > 50 (dưới nút) hoặc y < -250 (quá xa phía trên)
        if (y > 50 || y < -250) {
            return -1;
        }

        const xInBar = relativeX - barLeftEdge;
        const contentStart = BAR_PADDING;

        // Mở rộng hitbox cho dễ chọn hơn
        for (let i = 0; i < REACTIONS.length; i++) {
            const emojiCenter = contentStart + i * (EMOJI_SIZE + EMOJI_SPACING) + EMOJI_SIZE / 2;
            const hitBox = EMOJI_SIZE + EMOJI_SPACING + 8; // Thêm 8px cho dễ chọn

            if (xInBar >= emojiCenter - hitBox / 2 && xInBar <= emojiCenter + hitBox / 2) {
                return i;
            }
        }

        return -1;
    }, []);

    // Handle reaction selection với fly animation
    const handleSelect = useCallback((index: number) => {
        if (index >= 0 && index < REACTIONS.length) {
            const reaction = REACTIONS[index];

            // Trigger fly animation
            setSelectedIndex(index);
            triggerSelectionHaptic();

            // Delay để animation fly hoàn thành rồi mới update state
            setTimeout(() => {
                if (selectedReaction?.id === reaction.id) {
                    onReactionSelect(null);
                } else {
                    onReactionSelect(reaction);
                }
                setIsBarVisible(false);
                setHoveredIndex(-1);
                setSelectedIndex(-1);
            }, 350); // Đợi animation fly xong
        } else {
            setIsBarVisible(false);
            setHoveredIndex(-1);
        }
    }, [selectedReaction, onReactionSelect]);

    const handleTap = useCallback(() => {
        if (selectedReaction) {
            onReactionSelect(null);
        } else {
            onReactionSelect(REACTIONS[0]);
        }
        triggerHaptic();
    }, [selectedReaction, onReactionSelect]);

    const showBar = useCallback(() => {
        setIsBarVisible(true);
        setSelectedIndex(-1); // Reset
        triggerHaptic();
    }, []);

    const hideBar = useCallback(() => {
        if (selectedIndex < 0) { // Chỉ ẩn nếu không có fly animation
            setIsBarVisible(false);
            setHoveredIndex(-1);
        }
    }, [selectedIndex]);

    const updateHovered = useCallback((index: number) => {
        setHoveredIndex(prev => {
            if (prev !== index && index >= 0) {
                triggerHaptic();
            }
            return index;
        });
    }, []);

    const gesture = useMemo(() =>
        Gesture.Pan()
            .activateAfterLongPress(LONG_PRESS_DURATION)
            .onStart((e) => {
                'worklet';
                isLongPressing.value = true;
                fingerX.value = e.x;
                fingerY.value = e.y;
                runOnJS(showBar)();
            })
            .onUpdate((e) => {
                'worklet';
                fingerX.value = e.x;
                fingerY.value = e.y;
                const w = buttonWidth.value || 80;
                const idx = calcHoveredIndex(e.x, e.y, w);
                runOnJS(updateHovered)(idx);
            })
            .onEnd((e) => {
                'worklet';
                isLongPressing.value = false;
                const w = buttonWidth.value || 80;
                const idx = calcHoveredIndex(e.x, e.y, w);
                runOnJS(handleSelect)(idx);
            })
            .onFinalize(() => {
                'worklet';
                if (!isLongPressing.value) {
                    runOnJS(hideBar)();
                }
            }),
        [calcHoveredIndex, showBar, hideBar, handleSelect, updateHovered, buttonWidth]
    );

    const tapGesture = useMemo(() =>
        Gesture.Tap()
            .maxDuration(LONG_PRESS_DURATION - 50)
            .onEnd(() => {
                'worklet';
                runOnJS(handleTap)();
            }),
        [handleTap]
    );

    const combinedGesture = Gesture.Race(gesture, tapGesture);

    const buttonScale = useSharedValue(1);

    React.useEffect(() => {
        buttonScale.value = withSequence(
            withSpring(0.9, { damping: 10, stiffness: 400 }),
            withSpring(1, SPRING_CONFIG)
        );
    }, [selectedReaction]);

    const buttonAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: buttonScale.value }],
    }));

    return (
        <View style={styles.container}>
            <ReactionBar
                isVisible={isBarVisible}
                hoveredIndex={hoveredIndex}
                selectedIndex={selectedIndex}
            />

            <GestureDetector gesture={combinedGesture}>
                <Animated.View
                    style={[styles.button, buttonAnimatedStyle, buttonStyle]}
                    onLayout={onLayout}
                >
                    {selectedReaction ? (
                        <>
                            <Text style={styles.selectedEmoji}>{selectedReaction.emoji}</Text>
                            <Text style={[styles.buttonText, { color: selectedReaction.color }, textStyle]}>
                                {selectedReaction.label}
                            </Text>
                        </>
                    ) : (
                        <>
                            <FontAwesome name="thumbs-o-up" size={18} color="#65676B" />
                            <Text style={[styles.buttonText, textStyle]}>Thích</Text>
                        </>
                    )}
                </Animated.View>
            </GestureDetector>
        </View>
    );
}

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({
    container: {
        position: 'relative',
        alignItems: 'center',
        zIndex: 10,
    },
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
        bottom: 60,
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
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
    },
    emojiContainer: {
        width: EMOJI_SIZE,
        height: EMOJI_SIZE,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emojiImage: {
        width: 50,
        height: 50,
    },
    labelContainer: {
        position: 'absolute',
        top: -35,
        backgroundColor: 'rgba(0,0,0,0.8)',
        paddingHorizontal: 8,
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

export default ReactionButton;
export { ReactionBar };

export const getReactionById = (id: string): Reaction | undefined => {
    return REACTIONS.find(r => r.id === id);
};

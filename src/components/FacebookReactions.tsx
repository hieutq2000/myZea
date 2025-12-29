/**
 * FacebookReactions.tsx
 * 
 * A production-ready, Facebook-style animated reaction component for React Native.
 * 
 * Features:
 * - Long press to reveal reaction bar with staggered spring animations
 * - Each emoji pops up one by one with bounce effect
 * - Drag-to-select: hovered emoji scales up (1.5x), others scale down
 * - Haptic feedback on hover change
 * - Clean final selection on release
 * - Tap outside to dismiss
 * - Works with both drag-select AND tap-to-select after bar is shown
 * 
 * Dependencies:
 * - react-native-reanimated v3
 * - react-native-gesture-handler
 * - expo-haptics (optional)
 */

import React, { useCallback, useMemo, useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Platform,
    LayoutChangeEvent,
    TouchableOpacity,
    Pressable,
    Modal,
    Dimensions,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    withDelay,
    withSequence,
    runOnJS,
} from 'react-native-reanimated';
import {
    Gesture,
    GestureDetector,
} from 'react-native-gesture-handler';

// Try to import haptics, but make it optional
let Haptics: any = null;
try {
    Haptics = require('expo-haptics');
} catch (e) {
    console.log('Haptics not available');
}

// ============================================================
// CONSTANTS
// ============================================================

const LONG_PRESS_DURATION = 400; // ms to trigger long press
const EMOJI_SIZE = 42;
const EMOJI_SPACING = 6;
const BAR_PADDING = 10;
const HOVER_SCALE = 1.6;
const DEFAULT_SCALE = 1.0;
const SHRINK_SCALE = 0.8;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Spring configs
const SPRING_CONFIG = {
    damping: 12,
    stiffness: 180,
    mass: 0.8,
};

const ENTRANCE_SPRING = {
    damping: 8,
    stiffness: 200,
    mass: 0.6,
};

// ============================================================
// TYPES
// ============================================================

export interface Reaction {
    id: string;
    emoji: string;
    label: string;
    color: string;
}

// ============================================================
// REACTIONS DATA
// ============================================================

export const REACTIONS: Reaction[] = [
    { id: 'like', emoji: '👍', label: 'Thích', color: '#1877F2' },
    { id: 'love', emoji: '❤️', label: 'Yêu thích', color: '#F33E58' },
    { id: 'care', emoji: '🥰', label: 'Thương thương', color: '#F7B928' },
    { id: 'haha', emoji: '😂', label: 'Haha', color: '#F7B928' },
    { id: 'wow', emoji: '😮', label: 'Wow', color: '#F7B928' },
    { id: 'sad', emoji: '😢', label: 'Buồn', color: '#F7B928' },
    { id: 'angry', emoji: '😡', label: 'Phẫn nộ', color: '#E9710F' },
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
// SINGLE EMOJI COMPONENT
// ============================================================

interface EmojiItemProps {
    reaction: Reaction;
    index: number;
    isHovered: boolean;
    isVisible: boolean;
    anyHovered: boolean;
    onPress: () => void;
}

const EmojiItem = React.memo(({
    reaction,
    index,
    isHovered,
    isVisible,
    anyHovered,
    onPress,
}: EmojiItemProps) => {
    const scale = useSharedValue(0);
    const translateY = useSharedValue(30);

    // Entrance animation - staggered pop up
    useEffect(() => {
        if (isVisible) {
            const delay = index * 50; // 50ms stagger between each emoji

            scale.value = withDelay(
                delay,
                withSequence(
                    withSpring(1.2, ENTRANCE_SPRING),
                    withSpring(1, { damping: 12, stiffness: 200 })
                )
            );
            translateY.value = withDelay(
                delay,
                withSequence(
                    withSpring(-12, ENTRANCE_SPRING),
                    withSpring(0, { damping: 10, stiffness: 180 })
                )
            );
        } else {
            scale.value = withTiming(0, { duration: 100 });
            translateY.value = withTiming(20, { duration: 100 });
        }
    }, [isVisible, index]);

    // Hover effect
    useEffect(() => {
        if (!isVisible) return;

        if (isHovered) {
            scale.value = withSpring(HOVER_SCALE, SPRING_CONFIG);
            translateY.value = withSpring(-25, SPRING_CONFIG);
        } else if (anyHovered) {
            scale.value = withSpring(SHRINK_SCALE, SPRING_CONFIG);
            translateY.value = withSpring(0, SPRING_CONFIG);
        } else {
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
        <Pressable onPress={onPress}>
            <Animated.View style={[styles.emojiContainer, animatedStyle]}>
                <Text style={styles.emojiText}>{reaction.emoji}</Text>

                {/* Label tooltip on hover */}
                {isHovered && (
                    <View style={styles.labelContainer}>
                        <Text style={styles.labelText}>{reaction.label}</Text>
                    </View>
                )}
            </Animated.View>
        </Pressable>
    );
});

// ============================================================
// REACTION BAR (shown in modal)
// ============================================================

interface ReactionBarProps {
    visible: boolean;
    hoveredIndex: number;
    onSelect: (index: number) => void;
    onDismiss: () => void;
    buttonPosition: { x: number; y: number; width: number; height: number };
}

const ReactionBar = React.memo(({
    visible,
    hoveredIndex,
    onSelect,
    onDismiss,
    buttonPosition,
}: ReactionBarProps) => {
    const barOpacity = useSharedValue(0);
    const barScale = useSharedValue(0.8);

    useEffect(() => {
        if (visible) {
            barOpacity.value = withTiming(1, { duration: 150 });
            barScale.value = withSpring(1, { damping: 15, stiffness: 200 });
        } else {
            barOpacity.value = withTiming(0, { duration: 100 });
            barScale.value = withTiming(0.8, { duration: 100 });
        }
    }, [visible]);

    const barAnimatedStyle = useAnimatedStyle(() => ({
        opacity: barOpacity.value,
        transform: [{ scale: barScale.value }],
    }));

    // Calculate bar position (above the button)
    const barWidth = REACTIONS.length * (EMOJI_SIZE + EMOJI_SPACING) + BAR_PADDING * 2;
    const barLeft = Math.max(10, Math.min(buttonPosition.x + buttonPosition.width / 2 - barWidth / 2, SCREEN_WIDTH - barWidth - 10));
    const barBottom = buttonPosition.y - 10;

    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={onDismiss}
        >
            <Pressable style={styles.modalOverlay} onPress={onDismiss}>
                <Animated.View
                    style={[
                        styles.reactionBar,
                        barAnimatedStyle,
                        {
                            position: 'absolute',
                            left: barLeft,
                            bottom: Dimensions.get('window').height - barBottom,
                        }
                    ]}
                >
                    <View style={styles.reactionBarInner}>
                        {REACTIONS.map((reaction, index) => (
                            <EmojiItem
                                key={reaction.id}
                                reaction={reaction}
                                index={index}
                                isHovered={hoveredIndex === index}
                                isVisible={visible}
                                anyHovered={hoveredIndex >= 0}
                                onPress={() => onSelect(index)}
                            />
                        ))}
                    </View>
                </Animated.View>
            </Pressable>
        </Modal>
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
    const [isBarVisible, setIsBarVisible] = useState(false);
    const [hoveredIndex, setHoveredIndex] = useState(-1);
    const [buttonLayout, setButtonLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });

    const buttonScale = useSharedValue(1);
    const isLongPressing = useSharedValue(false);
    const fingerX = useSharedValue(0);

    // Measure button position
    const onLayout = useCallback((event: LayoutChangeEvent) => {
        event.target.measure((x, y, width, height, pageX, pageY) => {
            setButtonLayout({ x: pageX, y: pageY, width, height });
        });
    }, []);

    // Calculate which emoji is being hovered based on finger X position
    const calcHoveredIndex = useCallback((x: number): number => {
        const barWidth = REACTIONS.length * (EMOJI_SIZE + EMOJI_SPACING) + BAR_PADDING * 2;
        const barLeft = buttonLayout.x + buttonLayout.width / 2 - barWidth / 2;
        const relativeX = x - barLeft - BAR_PADDING;

        if (relativeX < 0 || relativeX > barWidth - BAR_PADDING * 2) {
            return -1;
        }

        const index = Math.floor(relativeX / (EMOJI_SIZE + EMOJI_SPACING));
        return Math.max(-1, Math.min(index, REACTIONS.length - 1));
    }, [buttonLayout]);

    // Handle final selection
    const handleSelect = useCallback((index: number) => {
        if (index >= 0 && index < REACTIONS.length) {
            const reaction = REACTIONS[index];
            triggerSelectionHaptic();

            if (selectedReaction?.id === reaction.id) {
                onReactionSelect(null); // Toggle off
            } else {
                onReactionSelect(reaction);
            }
        }

        setIsBarVisible(false);
        setHoveredIndex(-1);
    }, [selectedReaction, onReactionSelect]);

    // Simple tap - toggle like
    const handleTap = useCallback(() => {
        if (selectedReaction) {
            onReactionSelect(null);
        } else {
            onReactionSelect(REACTIONS[0]); // Default to "Like"
        }
        triggerHaptic();
    }, [selectedReaction, onReactionSelect]);

    // Show reaction bar
    const showBar = useCallback(() => {
        setIsBarVisible(true);
        triggerHaptic();
    }, []);

    // Update hovered index
    const updateHovered = useCallback((index: number) => {
        setHoveredIndex(prev => {
            if (prev !== index && index >= 0) {
                triggerHaptic();
            }
            return index;
        });
    }, []);

    // Gesture: Long press + Pan
    const gesture = useMemo(() =>
        Gesture.Pan()
            .activateAfterLongPress(LONG_PRESS_DURATION)
            .onStart(() => {
                'worklet';
                isLongPressing.value = true;
                runOnJS(showBar)();
            })
            .onUpdate((e) => {
                'worklet';
                fingerX.value = e.absoluteX;
                const idx = runOnJS(calcHoveredIndex)(e.absoluteX);
                runOnJS(updateHovered)(idx as any);
            })
            .onEnd((e) => {
                'worklet';
                isLongPressing.value = false;
                const idx = runOnJS(calcHoveredIndex)(e.absoluteX);
                if (typeof idx === 'number' && idx >= 0) {
                    runOnJS(handleSelect)(idx);
                }
                // If not selecting anything, bar stays visible for tap selection
            }),
        [calcHoveredIndex, showBar, handleSelect, updateHovered]
    );

    // Gesture: Simple tap
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

    // Button animation on selection change
    useEffect(() => {
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
            {/* Reaction Bar Modal */}
            <ReactionBar
                visible={isBarVisible}
                hoveredIndex={hoveredIndex}
                onSelect={handleSelect}
                onDismiss={() => {
                    setIsBarVisible(false);
                    setHoveredIndex(-1);
                }}
                buttonPosition={buttonLayout}
            />

            {/* Main Button */}
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
    modalOverlay: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    reactionBar: {
        alignItems: 'center',
    },
    reactionBarInner: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        backgroundColor: '#FFFFFF',
        borderRadius: 28,
        paddingVertical: BAR_PADDING,
        paddingHorizontal: BAR_PADDING,
        gap: EMOJI_SPACING,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
        elevation: 12,
    },
    emojiContainer: {
        width: EMOJI_SIZE,
        height: EMOJI_SIZE,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emojiText: {
        fontSize: 32,
        textAlign: 'center',
    },
    labelContainer: {
        position: 'absolute',
        top: -32,
        backgroundColor: 'rgba(0,0,0,0.85)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 14,
        minWidth: 70,
        alignItems: 'center',
    },
    labelText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600',
    },
});

// ============================================================
// EXPORTS
// ============================================================

export default ReactionButton;

export const getReactionById = (id: string): Reaction | undefined => {
    return REACTIONS.find(r => r.id === id);
};

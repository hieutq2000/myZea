import React, { useEffect, useRef } from 'react';
import { View, TouchableOpacity, Animated, StyleSheet, Text, Platform } from 'react-native';
import LottieView from 'lottie-react-native';

// Import Lottie animations
const LOTTIE_ANIMATIONS = {
    like: require('../assets/lottie/like.json'),
    love: require('../assets/lottie/love.json'),
    care: require('../assets/lottie/care.json'),
    haha: require('../assets/lottie/haha.json'),
    wow: require('../assets/lottie/wow.json'),
    sad: require('../assets/lottie/sad.json'),
    angry: require('../assets/lottie/angry.json'),
};

// Facebook-style animated reactions
export interface Reaction {
    id: string;
    emoji: string;
    label: string;
    color: string;
}

export const REACTIONS: Reaction[] = [
    { id: 'like', emoji: '👍', label: 'Thích', color: '#1877F2' },
    { id: 'love', emoji: '❤️', label: 'Yêu thích', color: '#F33E58' },
    { id: 'care', emoji: '🥰', label: 'Thương thương', color: '#F7B928' },
    { id: 'haha', emoji: '😆', label: 'Haha', color: '#F7B928' },
    { id: 'wow', emoji: '😮', label: 'Wow', color: '#F7B928' },
    { id: 'sad', emoji: '😢', label: 'Buồn', color: '#F7B928' },
    { id: 'angry', emoji: '😡', label: 'Phẫn nộ', color: '#E9710F' },
];

interface AnimatedReactionItemProps {
    reaction: Reaction;
    index: number;
    onSelect: (reaction: Reaction) => void;
    visible: boolean;
}

const AnimatedReactionItem = ({ reaction, index, onSelect, visible }: AnimatedReactionItemProps) => {
    const scaleAnim = useRef(new Animated.Value(0)).current;
    const translateYAnim = useRef(new Animated.Value(30)).current;
    const lottieRef = useRef<LottieView>(null);

    useEffect(() => {
        if (visible) {
            // Staggered animation - each item appears with delay
            Animated.sequence([
                Animated.delay(index * 60), // 60ms delay between each
                Animated.parallel([
                    Animated.spring(scaleAnim, {
                        toValue: 1,
                        friction: 4,
                        tension: 120,
                        useNativeDriver: true,
                    }),
                    Animated.spring(translateYAnim, {
                        toValue: 0,
                        friction: 4,
                        tension: 120,
                        useNativeDriver: true,
                    }),
                ]),
            ]).start(() => {
                // Play Lottie animation when item appears
                lottieRef.current?.play();
            });
        } else {
            scaleAnim.setValue(0);
            translateYAnim.setValue(30);
        }
    }, [visible, index]);

    const handlePressIn = () => {
        Animated.spring(scaleAnim, {
            toValue: 1.5,
            friction: 3,
            tension: 150,
            useNativeDriver: true,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 3,
            tension: 150,
            useNativeDriver: true,
        }).start();
    };

    const lottieSource = LOTTIE_ANIMATIONS[reaction.id as keyof typeof LOTTIE_ANIMATIONS];

    return (
        <Animated.View
            style={[
                styles.reactionItem,
                {
                    transform: [
                        { scale: scaleAnim },
                        { translateY: translateYAnim },
                    ],
                },
            ]}
        >
            <TouchableOpacity
                onPress={() => onSelect(reaction)}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                activeOpacity={1}
                style={styles.reactionTouchable}
            >
                {lottieSource ? (
                    <LottieView
                        ref={lottieRef}
                        source={lottieSource}
                        style={styles.lottieEmoji}
                        autoPlay
                        loop
                        speed={0.8}
                    />
                ) : (
                    <Text style={styles.reactionEmoji}>{reaction.emoji}</Text>
                )}
            </TouchableOpacity>
            {/* Label tooltip on press */}
        </Animated.View>
    );
};

interface ReactionDockProps {
    visible: boolean;
    onSelect: (reaction: Reaction) => void;
}

export function ReactionDock({ visible, onSelect }: ReactionDockProps) {
    const containerAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.spring(containerAnim, {
            toValue: visible ? 1 : 0,
            friction: 5,
            tension: 100,
            useNativeDriver: true,
        }).start();
    }, [visible]);

    if (!visible) return null;

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    opacity: containerAnim,
                    transform: [
                        {
                            scale: containerAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0.5, 1],
                            })
                        },
                        {
                            translateY: containerAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [20, 0],
                            })
                        },
                    ],
                },
            ]}
        >
            {REACTIONS.map((reaction, index) => (
                <AnimatedReactionItem
                    key={reaction.id}
                    reaction={reaction}
                    index={index}
                    onSelect={onSelect}
                    visible={visible}
                />
            ))}
        </Animated.View>
    );
}

// Get reaction display for showing selected reaction
export const getReactionDisplay = (reactionId: string): Reaction | undefined => {
    return REACTIONS.find(r => r.id === reactionId);
};

// Component to display a single reaction icon (for showing in posts)
interface ReactionIconProps {
    reactionId: string;
    size?: number;
    autoPlay?: boolean;
}

export function ReactionIcon({ reactionId, size = 20, autoPlay = false }: ReactionIconProps) {
    const reaction = getReactionDisplay(reactionId);
    if (!reaction) return null;

    const lottieSource = LOTTIE_ANIMATIONS[reaction.id as keyof typeof LOTTIE_ANIMATIONS];

    if (lottieSource) {
        return (
            <LottieView
                source={lottieSource}
                style={{ width: size, height: size }}
                autoPlay={autoPlay}
                loop={autoPlay}
            />
        );
    }

    return <Text style={{ fontSize: size * 0.8 }}>{reaction.emoji}</Text>;
}

export default ReactionDock;

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 45,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'white',
        borderRadius: 30,
        paddingVertical: 6,
        paddingHorizontal: 6,
        marginHorizontal: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 12,
        zIndex: 100,
    },
    reactionItem: {
        alignItems: 'center',
        marginHorizontal: 1,
    },
    reactionTouchable: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    lottieEmoji: {
        width: 40,
        height: 40,
    },
    reactionEmoji: {
        fontSize: 28,
    },
});

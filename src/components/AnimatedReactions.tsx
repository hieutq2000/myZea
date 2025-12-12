import React, { useEffect, useRef } from 'react';
import { View, TouchableOpacity, Animated, StyleSheet, Text, Image } from 'react-native';

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
    const bounceAnim = useRef(new Animated.Value(1)).current;

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
            ]).start();

            // Continuous subtle bounce animation
            const bounceLoop = Animated.loop(
                Animated.sequence([
                    Animated.timing(bounceAnim, {
                        toValue: 1.1,
                        duration: 600,
                        useNativeDriver: true,
                    }),
                    Animated.timing(bounceAnim, {
                        toValue: 1,
                        duration: 600,
                        useNativeDriver: true,
                    }),
                ])
            );
            bounceLoop.start();

            return () => bounceLoop.stop();
        } else {
            scaleAnim.setValue(0);
            translateYAnim.setValue(30);
        }
    }, [visible, index]);

    const handlePressIn = () => {
        Animated.spring(scaleAnim, {
            toValue: 1.8,
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

    return (
        <Animated.View
            style={[
                styles.reactionItem,
                {
                    transform: [
                        { scale: Animated.multiply(scaleAnim, bounceAnim) },
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
                <Text style={styles.reactionEmoji}>{reaction.emoji}</Text>
            </TouchableOpacity>
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
        paddingVertical: 8,
        paddingHorizontal: 8,
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
        marginHorizontal: 2,
    },
    reactionTouchable: {
        width: 42,
        height: 42,
        justifyContent: 'center',
        alignItems: 'center',
    },
    reactionEmoji: {
        fontSize: 30,
    },
});

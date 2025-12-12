import React, { useEffect, useRef } from 'react';
import { View, TouchableOpacity, Animated, StyleSheet, Text, Image } from 'react-native';

// Facebook-style animated reactions
export interface Reaction {
    id: string;
    emoji: string;
    label: string;
    color: string;
    // Animated GIF URLs for each reaction
    gifUrl?: string;
}

export const REACTIONS: Reaction[] = [
    {
        id: 'like',
        emoji: '👍',
        label: 'Thích',
        color: '#1877F2',
        gifUrl: 'https://raw.githubusercontent.com/nickytonline/facebook-reactions/main/like.gif'
    },
    {
        id: 'love',
        emoji: '❤️',
        label: 'Yêu thích',
        color: '#F33E58',
        gifUrl: 'https://raw.githubusercontent.com/nickytonline/facebook-reactions/main/love.gif'
    },
    {
        id: 'care',
        emoji: '🥰',
        label: 'Thương thương',
        color: '#F7B928',
        gifUrl: 'https://raw.githubusercontent.com/nickytonline/facebook-reactions/main/care.gif'
    },
    {
        id: 'haha',
        emoji: '😆',
        label: 'Haha',
        color: '#F7B928',
        gifUrl: 'https://raw.githubusercontent.com/nickytonline/facebook-reactions/main/haha.gif'
    },
    {
        id: 'wow',
        emoji: '😮',
        label: 'Wow',
        color: '#F7B928',
        gifUrl: 'https://raw.githubusercontent.com/nickytonline/facebook-reactions/main/wow.gif'
    },
    {
        id: 'sad',
        emoji: '😢',
        label: 'Buồn',
        color: '#F7B928',
        gifUrl: 'https://raw.githubusercontent.com/nickytonline/facebook-reactions/main/sad.gif'
    },
    {
        id: 'angry',
        emoji: '😡',
        label: 'Phẫn nộ',
        color: '#E9710F',
        gifUrl: 'https://raw.githubusercontent.com/nickytonline/facebook-reactions/main/angry.gif'
    },
];

interface AnimatedReactionItemProps {
    reaction: Reaction;
    index: number;
    onSelect: (reaction: Reaction) => void;
    visible: boolean;
}

const AnimatedReactionItem = ({ reaction, index, onSelect, visible }: AnimatedReactionItemProps) => {
    const scaleAnim = useRef(new Animated.Value(0)).current;
    const translateYAnim = useRef(new Animated.Value(20)).current;

    useEffect(() => {
        if (visible) {
            // Staggered animation - each item appears with delay
            Animated.sequence([
                Animated.delay(index * 50), // 50ms delay between each
                Animated.parallel([
                    Animated.spring(scaleAnim, {
                        toValue: 1,
                        friction: 5,
                        tension: 100,
                        useNativeDriver: true,
                    }),
                    Animated.spring(translateYAnim, {
                        toValue: 0,
                        friction: 5,
                        tension: 100,
                        useNativeDriver: true,
                    }),
                ]),
            ]).start();
        } else {
            scaleAnim.setValue(0);
            translateYAnim.setValue(20);
        }
    }, [visible, index]);

    const handlePressIn = () => {
        Animated.spring(scaleAnim, {
            toValue: 1.5,
            friction: 3,
            tension: 100,
            useNativeDriver: true,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 3,
            tension: 100,
            useNativeDriver: true,
        }).start();
    };

    return (
        <Animated.View
            style={[
                styles.reactionContainer,
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
                style={styles.reactionButton}
            >
                {reaction.gifUrl ? (
                    <Image
                        source={{ uri: reaction.gifUrl }}
                        style={styles.reactionGif}
                        resizeMode="contain"
                    />
                ) : (
                    <Text style={styles.reactionEmoji}>{reaction.emoji}</Text>
                )}
            </TouchableOpacity>
            {/* Label shown on hover/press */}
            <Animated.View style={[styles.labelContainer, { opacity: scaleAnim }]}>
                <Text style={styles.labelText}>{reaction.label}</Text>
            </Animated.View>
        </Animated.View>
    );
};

interface AnimatedReactionsProps {
    visible: boolean;
    onSelect: (reaction: Reaction) => void;
    onClose: () => void;
}

export default function AnimatedReactions({ visible, onSelect, onClose }: AnimatedReactionsProps) {
    const containerAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.spring(containerAnim, {
            toValue: visible ? 1 : 0,
            friction: 6,
            tension: 100,
            useNativeDriver: true,
        }).start();
    }, [visible]);

    if (!visible) return null;

    return (
        <TouchableOpacity
            style={styles.overlay}
            activeOpacity={1}
            onPress={onClose}
        >
            <Animated.View
                style={[
                    styles.container,
                    {
                        opacity: containerAnim,
                        transform: [
                            {
                                scale: containerAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [0.8, 1],
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
        </TouchableOpacity>
    );
}

// Get reaction icon for display (static emoji or small indicator)
export const getReactionDisplay = (reactionId: string): { emoji: string; color: string } => {
    const reaction = REACTIONS.find(r => r.id === reactionId);
    return reaction
        ? { emoji: reaction.emoji, color: reaction.color }
        : { emoji: '👍', color: '#1877F2' };
};

const styles = StyleSheet.create({
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1000,
    },
    container: {
        position: 'absolute',
        bottom: 50,
        left: 10,
        right: 10,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'white',
        borderRadius: 30,
        paddingVertical: 8,
        paddingHorizontal: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 10,
    },
    reactionContainer: {
        alignItems: 'center',
        marginHorizontal: 4,
    },
    reactionButton: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    reactionGif: {
        width: 40,
        height: 40,
    },
    reactionEmoji: {
        fontSize: 32,
    },
    labelContainer: {
        position: 'absolute',
        top: -28,
        backgroundColor: 'rgba(0,0,0,0.8)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    labelText: {
        color: 'white',
        fontSize: 11,
        fontWeight: '600',
    },
});

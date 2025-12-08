import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Text } from 'react-native';

interface TypingIndicatorProps {
    userName?: string;
}

const TypingIndicator: React.FC<TypingIndicatorProps> = ({ userName }) => {
    const dotAnim1 = React.useRef(new Animated.Value(0)).current;
    const dotAnim2 = React.useRef(new Animated.Value(0)).current;
    const dotAnim3 = React.useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
        const animate = (anim: Animated.Value, delay: number) => {
            Animated.loop(
                Animated.sequence([
                    Animated.delay(delay),
                    Animated.timing(anim, {
                        toValue: 1,
                        duration: 300,
                        useNativeDriver: true,
                    }),
                    Animated.timing(anim, {
                        toValue: 0,
                        duration: 300,
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        };

        animate(dotAnim1, 0);
        animate(dotAnim2, 150);
        animate(dotAnim3, 300);
    }, []);

    const dotStyle = (anim: Animated.Value) => ({
        transform: [
            {
                translateY: anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -4],
                }),
            },
        ],
    });

    return (
        <View style={styles.container}>
            <Text style={styles.text}>
                {userName ? `${userName} đang nhập` : 'Đang nhập'}
            </Text>
            <View style={styles.dotsContainer}>
                <Animated.View style={[styles.dot, dotStyle(dotAnim1)]} />
                <Animated.View style={[styles.dot, dotStyle(dotAnim2)]} />
                <Animated.View style={[styles.dot, dotStyle(dotAnim3)]} />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    text: {
        fontSize: 13,
        color: '#6B7280',
        fontStyle: 'italic',
    },
    dotsContainer: {
        flexDirection: 'row',
        marginLeft: 4,
        alignItems: 'center',
    },
    dot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#6B7280',
        marginHorizontal: 1,
    },
});

export default TypingIndicator;

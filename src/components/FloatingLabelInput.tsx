import React, { useRef, useState, useEffect } from 'react';
import { View, TextInput, Animated, StyleSheet, TextInputProps, TouchableOpacity, Text } from 'react-native';
import { COLORS, SPACING, BORDER_RADIUS, FONTS } from '../utils/theme';
import { Feather } from '@expo/vector-icons';

interface FloatingLabelInputProps extends TextInputProps {
    label: string;
    error?: string | null;
    isPassword?: boolean;
}

const FloatingLabelInput = ({
    label,
    value,
    error,
    isPassword,
    style,
    ...props
}: FloatingLabelInputProps) => {
    const [isFocused, setIsFocused] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Animation value: 0 = placeholder state, 1 = floating label state
    const animatedValue = useRef(new Animated.Value(value ? 1 : 0)).current;

    useEffect(() => {
        Animated.timing(animatedValue, {
            toValue: (isFocused || value) ? 1 : 0,
            duration: 200,
            useNativeDriver: false,
        }).start();
    }, [isFocused, value]);

    const labelStyle = {
        position: 'absolute' as 'absolute',
        left: 10,
        top: animatedValue.interpolate({
            inputRange: [0, 1],
            outputRange: [16, -10], // Moves from center-ish to top border
        }),
        fontSize: animatedValue.interpolate({
            inputRange: [0, 1],
            outputRange: [16, 12],
        }),
        color: animatedValue.interpolate({
            inputRange: [0, 1],
            outputRange: [COLORS.textLight, COLORS.primary],
        }),
        zIndex: 1,
        backgroundColor: COLORS.white, // Covers the border to create the "gap"
        paddingHorizontal: 4,
    };

    const containerBorderColor = error
        ? COLORS.error
        : isFocused
            ? COLORS.primary
            : COLORS.border;

    return (
        <View style={[styles.container, style]}>
            <Animated.Text style={[labelStyle, { fontWeight: '500' }]}>
                {label}
            </Animated.Text>

            <View style={[
                styles.inputContainer,
                { borderColor: containerBorderColor }
            ]}>
                <TextInput
                    style={styles.input}
                    value={value}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    secureTextEntry={isPassword && !showPassword}
                    placeholder=""
                    placeholderTextColor={isFocused ? COLORS.textMuted : 'transparent'}
                    {...props}
                />

                {isPassword && (
                    <TouchableOpacity
                        style={styles.eyeIcon}
                        onPress={() => setShowPassword(!showPassword)}
                    >
                        <Feather
                            name={showPassword ? "eye" : "eye-off"}
                            size={20}
                            color={COLORS.textMuted}
                        />
                    </TouchableOpacity>
                )}
            </View>

            {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: SPACING.md,
        paddingTop: 6, // Space for the floating label
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        borderRadius: BORDER_RADIUS.lg,
        backgroundColor: 'transparent', // Transparent to show background if needed, but label needs matching bg
        height: 56,
    },
    input: {
        flex: 1,
        paddingHorizontal: SPACING.md,
        height: '100%',
        fontSize: 16,
        color: COLORS.text,
    },
    eyeIcon: {
        padding: SPACING.md,
    },
    errorText: {
        color: COLORS.error,
        fontSize: 12,
        marginTop: 4,
        marginLeft: 4,
    }
});

export default FloatingLabelInput;

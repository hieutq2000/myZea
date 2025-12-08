import React, { useRef, useState, useEffect } from 'react';
import { View, TextInput, Animated, StyleSheet, TextInputProps, TouchableOpacity, Text } from 'react-native';
import { COLORS, SPACING, BORDER_RADIUS, FONTS } from '../utils/theme';
import { Feather } from '@expo/vector-icons';

interface FloatingLabelInputProps extends TextInputProps {
    label: string;
    error?: string | null;
    isPassword?: boolean;
    icon?: keyof typeof Feather.glyphMap;
}

const FloatingLabelInput = React.memo(({
    label,
    value,
    error,
    isPassword,
    icon,
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
            duration: 150, // Faster animation for snappier feel
            useNativeDriver: false,
        }).start();
    }, [isFocused, value]);

    const labelStartLeft = icon ? 48 : 10;

    const labelStyle = {
        position: 'absolute' as 'absolute',
        left: animatedValue.interpolate({
            inputRange: [0, 1],
            outputRange: [labelStartLeft, 10], // Moves from right-of-icon to left-aligned on border
        }),
        top: animatedValue.interpolate({
            inputRange: [0, 1],
            outputRange: [18, -2], // Adjusted to -2 to vertically center on the border (y=6)
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
        backgroundColor: COLORS.white,
        paddingHorizontal: 8,
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
                {icon && (
                    <View style={styles.leftIconContainer}>
                        <Feather
                            name={icon}
                            size={20}
                            color={isFocused ? COLORS.primary : COLORS.textMuted}
                        />
                    </View>
                )}
                <TextInput
                    style={[styles.input, { paddingLeft: icon ? 48 : SPACING.md }]}
                    value={value}
                    onFocus={(e) => {
                        setIsFocused(true);
                        props.onFocus && props.onFocus(e);
                    }}
                    onBlur={(e) => {
                        setIsFocused(false);
                        props.onBlur && props.onBlur(e);
                    }}
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
});

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
        backgroundColor: 'transparent',
        height: 56,
        position: 'relative',
    },
    leftIconContainer: {
        position: 'absolute',
        left: 16,
        zIndex: 1,
    },
    input: {
        flex: 1,
        height: '100%',
        fontSize: 16,
        color: COLORS.text,
        paddingRight: SPACING.md,
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

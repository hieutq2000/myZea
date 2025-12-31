import React, { createContext, useContext, useState, useEffect } from 'react';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Định nghĩa các loại theme
type ThemeType = 'light' | 'dark' | 'system';

// Định nghĩa bảng màu
interface ColorPalette {
    background: string;
    card: string;
    text: string;
    textSecondary: string;
    border: string;
    primary: string;
    headerGradient: readonly [string, string];
    statusBar: 'dark-content' | 'light-content';
    icon: string;
    inputBackground: string;
    placeholder: string;
}

import { COLORS, NEUTRAL, BACKGROUND, TEXT, BORDER, BRAND } from '../theme/colors';

// Bảng màu Sáng (Based on Design System)
export const lightColors: ColorPalette = {
    background: BACKGROUND.primary,
    card: '#FFFFFF',
    text: TEXT.primary,
    textSecondary: TEXT.secondary,
    border: BORDER.default,
    primary: BRAND.orange, // Brand Core
    headerGradient: ['#FFF0E6', '#F0F9FF'], // Pastel Peach -> Light Blue (Aligned with Chats Screen)
    statusBar: 'dark-content',
    icon: NEUTRAL.gray600,
    inputBackground: NEUTRAL.gray100,
    placeholder: NEUTRAL.gray400,
};

// Bảng màu Tối (Dark Mode)
export const darkColors: ColorPalette = {
    background: BACKGROUND.dark,   // #121212
    card: BACKGROUND.darkCard,     // #1F1F1F
    text: NEUTRAL.gray200,         // Light gray for softer contrast
    textSecondary: NEUTRAL.gray400,
    border: '#2D2D2D',
    primary: BRAND.orange,         // Keep brand identity
    headerGradient: ['#2A1810', '#0F1A24'], // Dark version of the gradient
    statusBar: 'light-content',
    icon: NEUTRAL.gray400,
    inputBackground: '#2C2C2C',
    placeholder: NEUTRAL.gray500,
};

interface ThemeContextType {
    theme: ThemeType;
    colors: ColorPalette;
    setTheme: (theme: ThemeType) => void;
    isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_KEY = 'user_theme_preference';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [theme, setThemeState] = useState<ThemeType>('system');
    const [currentSystemScheme, setCurrentSystemScheme] = useState<'light' | 'dark'>(() => {
        // Get initial system scheme directly from Appearance API
        return Appearance.getColorScheme() || 'light';
    });

    // Function to get current system theme
    const getSystemTheme = (): 'light' | 'dark' => {
        return Appearance.getColorScheme() || 'light';
    };

    // Listen for system appearance changes
    useEffect(() => {
        // Update immediately on mount
        setCurrentSystemScheme(getSystemTheme());

        const subscription = Appearance.addChangeListener(({ colorScheme }) => {
            console.log('🎨 System color scheme changed:', colorScheme);
            setCurrentSystemScheme(colorScheme || 'light');
        });

        return () => {
            subscription.remove();
        };
    }, []);

    // Polling fallback: check system theme every second when theme is 'system'
    // This helps on devices where Appearance.addChangeListener doesn't fire
    useEffect(() => {
        if (theme !== 'system') return;

        const checkSystemTheme = () => {
            const newScheme = getSystemTheme();
            setCurrentSystemScheme(prev => {
                if (prev !== newScheme) {
                    console.log('🔄 Polling detected theme change:', newScheme);
                    return newScheme;
                }
                return prev;
            });
        };

        // Check immediately
        checkSystemTheme();

        // Poll every 1 second
        const interval = setInterval(checkSystemTheme, 1000);

        return () => clearInterval(interval);
    }, [theme]);

    // Load saved theme on startup
    useEffect(() => {
        const loadTheme = async () => {
            try {
                const savedTheme = await AsyncStorage.getItem(THEME_KEY);
                if (savedTheme) {
                    setThemeState(savedTheme as ThemeType);
                }
                // Update system scheme after loading saved theme
                setCurrentSystemScheme(getSystemTheme());
            } catch (error) {
                console.error('Failed to load theme preference', error);
            }
        };
        loadTheme();
    }, []);

    const setTheme = async (newTheme: ThemeType) => {
        setThemeState(newTheme);
        // If switching to system, immediately get the current system theme
        if (newTheme === 'system') {
            setCurrentSystemScheme(getSystemTheme());
        }
        try {
            await AsyncStorage.setItem(THEME_KEY, newTheme);
        } catch (error) {
            console.error('Failed to save theme preference', error);
        }
    };

    // Determine actual color scheme
    const effectiveTheme = theme === 'system' ? currentSystemScheme : theme;
    const isDark = effectiveTheme === 'dark';
    const colors = isDark ? darkColors : lightColors;

    console.log('🎨 Theme state:', { theme, currentSystemScheme, effectiveTheme, isDark });

    return (
        <ThemeContext.Provider value={{ theme, colors, setTheme, isDark }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};

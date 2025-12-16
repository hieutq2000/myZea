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
}

// Bảng màu Sáng (Hiện tại)
export const lightColors: ColorPalette = {
    background: '#F3F4F6',
    card: '#FFFFFF',
    text: '#1F2937', // Gray 800
    textSecondary: '#6B7280', // Gray 500
    border: '#E5E7EB', // Gray 200
    primary: '#0068FF',
    headerGradient: ['#ffebd9', '#e0f8ff'], // Peach -> Light Blue
    statusBar: 'dark-content',
    icon: '#4B5563',
    inputBackground: '#F9FAFB',
};

// Bảng màu Tối (Mới - Sang trọng & Dịu mắt)
export const darkColors: ColorPalette = {
    background: '#121212', // Very dark gray, almost black
    card: '#1E1E1E', // Dark gray for cards
    text: '#E5E7EB', // Light gray text (not pure white for ease of reading)
    textSecondary: '#9CA3AF', // Gray 400
    border: '#2D2D2D', // Dark border
    primary: '#4DA3FF', // Lighter blue for dark mode visibility
    headerGradient: ['#3E2D24', '#18262E'], // Deep Warm Brown -> Deep Cool Blue (Phiên bản tối của Gradient gốc)
    statusBar: 'light-content',
    icon: '#D1D5DB',
    inputBackground: '#2C2C2C',
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

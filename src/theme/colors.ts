/**
 * 🎨 Design System - Colors
 * All colors used throughout the app
 * Based on existing UI - NO visual changes
 */

// =========================
// BRAND COLORS
// =========================
export const BRAND = {
    orange: '#F97316',      // Primary brand color (myZyea)
    orangeLight: '#FDA868',
    orangeDark: '#D97706',

    // myZyea Logo colors
    logoOrange: '#F27125',
    logoGreen: '#27A844',
    logoBlue: '#1a45a0',
};

// =========================
// SOCIAL COLORS (Facebook-like)
// =========================
export const SOCIAL = {
    facebookBlue: '#1877F2',
    like: '#1877F2',
    love: '#F63459',
    care: '#F7B928',
    angry: '#E4605E',
};

// =========================
// SEMANTIC COLORS
// =========================
export const SEMANTIC = {
    success: '#22C55E',
    successLight: '#10B981',
    error: '#EF4444',
    errorLight: '#F43F5E',
    warning: '#F59E0B',
    warningLight: '#FBBF24',
    info: '#0EA5E9',
    infoLight: '#38BDF8',
};

// =========================
// NEUTRAL COLORS (Grayscale)
// =========================
export const NEUTRAL = {
    black: '#000000',
    gray900: '#111827',
    gray800: '#1F2937',
    gray700: '#374151',
    gray600: '#4B5563',
    gray500: '#6B7280',
    gray400: '#9CA3AF',
    gray300: '#D1D5DB',
    gray200: '#E5E7EB',
    gray100: '#F3F4F6',
    gray50: '#F9FAFB',
    white: '#FFFFFF',
};

// =========================
// TEXT COLORS
// =========================
export const TEXT = {
    primary: '#050505',
    secondary: '#65676B',
    tertiary: '#8A8D91',
    disabled: '#BCC0C4',
    inverse: '#FFFFFF',
    link: '#1877F2',
    error: '#EF4444',
};

// =========================
// BACKGROUND COLORS
// =========================
export const BACKGROUND = {
    primary: '#FFFFFF',
    secondary: '#F5F7FA',
    tertiary: '#E4E6EB',
    dark: '#121212',
    darkCard: '#1F1F1F',
    overlay: 'rgba(0,0,0,0.5)',
    overlayLight: 'rgba(0,0,0,0.3)',
};

// =========================
// BORDER COLORS
// =========================
export const BORDER = {
    default: '#E5E7EB',
    light: '#F0F2F5',
    dark: '#CED0D4',
    focus: '#F97316',
};

// =========================
// CHAT COLORS (Zalo-like)
// =========================
export const CHAT = {
    bubbleSent: '#E7F3FF',
    bubbleReceived: '#F0F2F5',
    online: '#31A24C',
    typing: '#0068FF',
};

// =========================
// GRADIENTS
// =========================
export const GRADIENTS = {
    header: ['#FF9A56', '#FF7043'],
    headerLight: ['#FFE4D6', '#E0F2FE', '#FFFFFF'],
    auth: ['#FF9966', '#FF5E62', '#da2e66'],
    orange: ['#FFB347', '#FF7E21'],
    purple: ['#667eea', '#764ba2'],
    button: ['#F97316', '#EA580C'],
};

// =========================
// EXPORT ALL (Current theme matches existing UI)
// =========================
export const COLORS = {
    ...BRAND,
    ...SOCIAL,
    ...SEMANTIC,
    ...NEUTRAL,

    // Shortcuts for common usage
    primary: BRAND.orange,
    text: TEXT.primary,
    textSecondary: TEXT.secondary,
    background: BACKGROUND.primary,
    backgroundSecondary: BACKGROUND.secondary,
    border: BORDER.default,
    link: TEXT.link,

    // Legacy compatibility (matches existing code)
    FB_BLUE: SOCIAL.facebookBlue,
    FB_ORANGE: BRAND.orange,
    ZALO_BLUE: '#0068FF',
};

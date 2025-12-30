/**
 * 🌑 Design System - Shadows
 * All shadow styles used throughout the app
 * Cross-platform (iOS shadowX + Android elevation)
 */

import { Platform, ViewStyle } from 'react-native';

// =========================
// SHADOW LEVELS
// =========================

/** No shadow */
export const SHADOW_NONE: ViewStyle = {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
};

/** Subtle shadow - for cards, inputs */
export const SHADOW_SM: ViewStyle = {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
};

/** Default shadow - for floating elements */
export const SHADOW_MD: ViewStyle = {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
};

/** Medium shadow - for modals, popovers */
export const SHADOW_LG: ViewStyle = {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
};

/** Strong shadow - for FAB, bottom sheets */
export const SHADOW_XL: ViewStyle = {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
};

/** Intense shadow - for dialogs */
export const SHADOW_2XL: ViewStyle = {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 12,
};

// =========================
// COLORED SHADOWS
// =========================

/** Orange brand shadow */
export const SHADOW_ORANGE: ViewStyle = {
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
};

/** Blue shadow */
export const SHADOW_BLUE: ViewStyle = {
    shadowColor: '#1877F2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
};

/** Red shadow for errors/alerts */
export const SHADOW_RED: ViewStyle = {
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
};

// =========================
// TEXT SHADOWS
// =========================
export const TEXT_SHADOW = {
    sm: {
        textShadowColor: 'rgba(0,0,0,0.3)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    md: {
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    lg: {
        textShadowColor: 'rgba(0,0,0,0.7)',
        textShadowOffset: { width: 0, height: 3 },
        textShadowRadius: 6,
    },
};

// =========================
// EXPORT ALL
// =========================
export const SHADOWS = {
    none: SHADOW_NONE,
    sm: SHADOW_SM,
    md: SHADOW_MD,
    lg: SHADOW_LG,
    xl: SHADOW_XL,
    '2xl': SHADOW_2XL,

    // Colored
    orange: SHADOW_ORANGE,
    blue: SHADOW_BLUE,
    red: SHADOW_RED,

    // Text
    text: TEXT_SHADOW,
};

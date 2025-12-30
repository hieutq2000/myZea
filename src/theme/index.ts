/**
 * 🎨 Design System - Main Export
 * Import everything from here:
 * 
 * import { COLORS, TYPOGRAPHY, SPACING, SHADOWS } from '../theme';
 */

// =========================
// RE-EXPORT ALL MODULES
// =========================

export * from './colors';
export * from './typography';
export * from './spacing';
export * from './shadows';

// =========================
// CONVENIENT IMPORTS
// =========================

import { COLORS, BRAND, SOCIAL, SEMANTIC, NEUTRAL, TEXT, BACKGROUND, BORDER, GRADIENTS } from './colors';
import { TYPOGRAPHY, FONT_SIZES, FONT_WEIGHTS, TEXT_STYLES } from './typography';
import { SPACING, PADDING, MARGIN, GAP, BORDER_RADIUS, ICON_SIZES, AVATAR_SIZES, HIT_SLOP } from './spacing';
import { SHADOWS, TEXT_SHADOW } from './shadows';

// =========================
// THEME OBJECT (for context if needed)
// =========================
export const THEME = {
    colors: COLORS,
    brand: BRAND,
    social: SOCIAL,
    semantic: SEMANTIC,
    neutral: NEUTRAL,
    text: TEXT,
    background: BACKGROUND,
    border: BORDER,
    gradients: GRADIENTS,

    typography: TYPOGRAPHY,
    fontSizes: FONT_SIZES,
    fontWeights: FONT_WEIGHTS,
    textStyles: TEXT_STYLES,

    spacing: SPACING,
    padding: PADDING,
    margin: MARGIN,
    gap: GAP,
    borderRadius: BORDER_RADIUS,
    iconSizes: ICON_SIZES,
    avatarSizes: AVATAR_SIZES,
    hitSlop: HIT_SLOP,

    shadows: SHADOWS,
    textShadow: TEXT_SHADOW,
};

export default THEME;

/**
 * 📝 Design System - Typography
 * All font sizes and styles used throughout the app
 * Based on existing UI - NO visual changes
 */

// =========================
// FONT SIZES
// =========================
export const FONT_SIZES = {
    /** 10px - Tiny labels, badges */
    xs: 10,
    /** 11px - Timestamps, captions */
    xxs: 11,
    /** 12px - Small text, secondary info */
    sm: 12,
    /** 13px - Caption, metadata */
    caption: 13,
    /** 14px - Body small */
    body2: 14,
    /** 15px - Default body text */
    body: 15,
    /** 16px - Body large, inputs */
    lg: 16,
    /** 17px - Subheadings */
    subtitle: 17,
    /** 18px - Section titles */
    title: 18,
    /** 20px - Card titles */
    h4: 20,
    /** 22px - Screen titles */
    h3: 22,
    /** 24px - Large titles */
    h2: 24,
    /** 28px - Hero text */
    h1: 28,
    /** 32px+ - Display text */
    display: 32,
    /** 36px - Extra large */
    displayLg: 36,
};

// =========================
// FONT WEIGHTS
// =========================
export const FONT_WEIGHTS = {
    light: '300' as const,
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
    black: '900' as const,
};

// =========================
// LINE HEIGHTS
// =========================
export const LINE_HEIGHTS = {
    tight: 1.2,
    normal: 1.4,
    relaxed: 1.6,
    loose: 1.8,
};

// =========================
// LETTER SPACING
// =========================
export const LETTER_SPACING = {
    tight: -0.5,
    normal: 0,
    wide: 0.5,
    wider: 1,
};

// =========================
// TEXT STYLES (Presets)
// =========================
export const TEXT_STYLES = {
    // Headings
    h1: {
        fontSize: FONT_SIZES.h1,
        fontWeight: FONT_WEIGHTS.bold,
        lineHeight: FONT_SIZES.h1 * LINE_HEIGHTS.tight,
    },
    h2: {
        fontSize: FONT_SIZES.h2,
        fontWeight: FONT_WEIGHTS.bold,
        lineHeight: FONT_SIZES.h2 * LINE_HEIGHTS.tight,
    },
    h3: {
        fontSize: FONT_SIZES.h3,
        fontWeight: FONT_WEIGHTS.semibold,
        lineHeight: FONT_SIZES.h3 * LINE_HEIGHTS.tight,
    },
    h4: {
        fontSize: FONT_SIZES.h4,
        fontWeight: FONT_WEIGHTS.semibold,
        lineHeight: FONT_SIZES.h4 * LINE_HEIGHTS.normal,
    },

    // Body text
    body: {
        fontSize: FONT_SIZES.body,
        fontWeight: FONT_WEIGHTS.regular,
        lineHeight: FONT_SIZES.body * LINE_HEIGHTS.relaxed,
    },
    bodyBold: {
        fontSize: FONT_SIZES.body,
        fontWeight: FONT_WEIGHTS.semibold,
        lineHeight: FONT_SIZES.body * LINE_HEIGHTS.relaxed,
    },
    bodySmall: {
        fontSize: FONT_SIZES.body2,
        fontWeight: FONT_WEIGHTS.regular,
        lineHeight: FONT_SIZES.body2 * LINE_HEIGHTS.relaxed,
    },

    // Captions & Labels
    caption: {
        fontSize: FONT_SIZES.caption,
        fontWeight: FONT_WEIGHTS.regular,
        lineHeight: FONT_SIZES.caption * LINE_HEIGHTS.normal,
    },
    captionBold: {
        fontSize: FONT_SIZES.caption,
        fontWeight: FONT_WEIGHTS.medium,
        lineHeight: FONT_SIZES.caption * LINE_HEIGHTS.normal,
    },
    label: {
        fontSize: FONT_SIZES.sm,
        fontWeight: FONT_WEIGHTS.medium,
        lineHeight: FONT_SIZES.sm * LINE_HEIGHTS.normal,
    },

    // Buttons
    button: {
        fontSize: FONT_SIZES.lg,
        fontWeight: FONT_WEIGHTS.semibold,
    },
    buttonSmall: {
        fontSize: FONT_SIZES.body2,
        fontWeight: FONT_WEIGHTS.semibold,
    },

    // Input
    input: {
        fontSize: FONT_SIZES.lg,
        fontWeight: FONT_WEIGHTS.regular,
    },
};

// =========================
// EXPORT SHORTHAND
// =========================
export const TYPOGRAPHY = {
    sizes: FONT_SIZES,
    weights: FONT_WEIGHTS,
    lineHeights: LINE_HEIGHTS,
    styles: TEXT_STYLES,
};

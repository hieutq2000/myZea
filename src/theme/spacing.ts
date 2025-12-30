/**
 * 📐 Design System - Spacing
 * All spacing values used throughout the app
 * Based on 4px grid system
 */

// =========================
// BASE SPACING (4px grid)
// =========================
export const SPACING = {
    /** 0px */
    none: 0,
    /** 2px - Micro spacing */
    xxs: 2,
    /** 4px - Tiny spacing */
    xs: 4,
    /** 8px - Small spacing */
    sm: 8,
    /** 12px - Medium spacing */
    md: 12,
    /** 16px - Default spacing */
    lg: 16,
    /** 20px - Large spacing */
    xl: 20,
    /** 24px - Extra large */
    xxl: 24,
    /** 32px - Section spacing */
    xxxl: 32,
    /** 40px - Large section spacing */
    huge: 40,
    /** 48px - Extra huge */
    massive: 48,
};

// =========================
// PADDING PRESETS
// =========================
export const PADDING = {
    /** Standard screen padding */
    screen: SPACING.lg,
    /** Card internal padding */
    card: SPACING.md,
    /** Button padding */
    button: SPACING.md,
    /** Input padding */
    input: SPACING.md,
    /** List item padding */
    listItem: SPACING.lg,
    /** Section padding */
    section: SPACING.xl,
};

// =========================
// MARGIN PRESETS
// =========================
export const MARGIN = {
    /** Between list items */
    listItem: SPACING.sm,
    /** Between sections */
    section: SPACING.xxl,
    /** Between cards */
    card: SPACING.md,
    /** Between buttons */
    button: SPACING.sm,
};

// =========================
// GAP PRESETS (Flexbox gap)
// =========================
export const GAP = {
    /** Tight row gap */
    row: SPACING.sm,
    /** Column gap */
    column: SPACING.md,
    /** Grid gap */
    grid: SPACING.md,
    /** Button group gap */
    buttons: SPACING.sm,
    /** Icon and text gap */
    iconText: SPACING.sm,
};

// =========================
// BORDER RADIUS
// =========================
export const BORDER_RADIUS = {
    /** 0px - No radius */
    none: 0,
    /** 4px - Subtle radius */
    xs: 4,
    /** 8px - Small radius */
    sm: 8,
    /** 10px - Default radius */
    md: 10,
    /** 12px - Card radius */
    lg: 12,
    /** 16px - Large radius */
    xl: 16,
    /** 20px - Extra large */
    xxl: 20,
    /** 24px - Modal radius */
    xxxl: 24,
    /** 9999px - Full round (circle, pill) */
    full: 9999,
};

// =========================
// ICON SIZES
// =========================
export const ICON_SIZES = {
    /** 16px - Tiny icons */
    xs: 16,
    /** 18px - Small icons */
    sm: 18,
    /** 20px - Default icons */
    md: 20,
    /** 24px - Standard icons */
    lg: 24,
    /** 28px - Large icons */
    xl: 28,
    /** 32px - Extra large */
    xxl: 32,
    /** 48px - Feature icons */
    huge: 48,
};

// =========================
// AVATAR SIZES
// =========================
export const AVATAR_SIZES = {
    /** 24px - Tiny avatar */
    xs: 24,
    /** 32px - Small avatar (inline) */
    sm: 32,
    /** 40px - Default avatar */
    md: 40,
    /** 48px - List avatar */
    lg: 48,
    /** 52px - Chat avatar */
    xl: 52,
    /** 80px - Profile avatar (small) */
    xxl: 80,
    /** 120px - Profile hero avatar */
    huge: 120,
    /** 130px - Large profile avatar */
    massive: 130,
};

// =========================
// HIT SLOP (Touch target expansion)
// =========================
export const HIT_SLOP = {
    /** Small touch expansion */
    sm: { top: 5, bottom: 5, left: 5, right: 5 },
    /** Default touch expansion */
    md: { top: 10, bottom: 10, left: 10, right: 10 },
    /** Large touch expansion */
    lg: { top: 15, bottom: 15, left: 15, right: 15 },
};

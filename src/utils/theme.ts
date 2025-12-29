export const COLORS = {
    primary: '#f97316', // Orange-500
    primaryDark: '#ea580c', // Orange-600
    primaryLight: '#fdba74', // Orange-300

    secondary: '#14b8a6', // Teal-500
    secondaryDark: '#0d9488', // Teal-600

    background: '#f8fafc', // Slate-50
    backgroundDark: '#f1f5f9', // Slate-100

    text: '#1e293b', // Slate-800
    textLight: '#64748b', // Slate-500
    textMuted: '#94a3b8', // Slate-400

    white: '#ffffff',
    black: '#000000',

    success: '#22c55e', // Green-500
    error: '#ef4444', // Red-500
    warning: '#f59e0b', // Amber-500
    info: '#3b82f6', // Blue-500

    // Kids theme
    kidsPrimary: '#ec4899', // Pink-500
    kidsPrimaryLight: '#f9a8d4', // Pink-300
    kidsBackground: '#fdf2f8', // Pink-50

    cardBg: '#ffffff',
    border: '#e2e8f0', // Slate-200

    // Gradients
    gradientPrimary: ['#f97316', '#ef4444'],
    gradientSecondary: ['#14b8a6', '#06b6d4'],
    gradientKids: ['#ec4899', '#f472b6'],
};

export const FONTS = {
    regular: 'System',
    medium: 'System',
    bold: 'System',
};

export const SPACING = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
};

export const BORDER_RADIUS = {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    full: 9999,
};

export const SHADOWS = {
    xs: {
        shadowColor: 'rgba(0,0,0,0.05)',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 1,
        shadowRadius: 1,
        elevation: 1,
    },
    sm: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    md: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 4,
    },
    lg: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 8,
    },
};

// API Key - Recommend: Make repo PRIVATE or restrict key in Google Cloud Console
// ĐỂ THAY KEY MỚI: Chỉ cần dán Key API mới của bạn vào trong dấu ngoặc kép bên dưới.
// Ví dụ: export const GEMINI_API_KEY = 'AIzaSy...KeyCuaBan...';
export const GEMINI_API_KEY = 'AIzaSyAijpY0vqeywjv70SafQ7FdpSrh6IzecY8';

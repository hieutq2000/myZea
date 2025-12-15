/**
 * Categories - Danh mục thu chi
 * Các danh mục mặc định cho việc phân loại giao dịch
 */

import { Category } from '../../types/finance';

// Danh mục chi tiêu
export const EXPENSE_CATEGORIES: Category[] = [
    {
        id: 'food',
        name: 'Thức ăn',
        icon: 'fast-food-outline',
        color: '#F97316',
        type: 'expense',
        keywords: ['ăn', 'bánh', 'cơm', 'phở', 'bún', 'mì', 'cafe', 'cà phê', 'trà', 'uống', 'nhậu', 'bia', 'rượu', 'đồ ăn', 'thức ăn', 'ăn sáng', 'ăn trưa', 'ăn tối', 'ăn vặt', 'snack', 'nước', 'sinh tố', 'trà sữa'],
    },
    {
        id: 'transport',
        name: 'Di chuyển',
        icon: 'car-outline',
        color: '#3B82F6',
        type: 'expense',
        keywords: ['xăng', 'grab', 'taxi', 'xe', 'gửi xe', 'đỗ xe', 'bus', 'xe buýt', 'vé xe', 'vé tàu', 'vé máy bay', 'uber', 'be', 'gojek', 'xeom', 'xe ôm'],
    },
    {
        id: 'shopping',
        name: 'Mua sắm',
        icon: 'bag-handle-outline',
        color: '#EC4899',
        type: 'expense',
        keywords: ['mua', 'quần', 'áo', 'giày', 'dép', 'túi', 'đồng hồ', 'phụ kiện', 'mỹ phẩm', 'son', 'kem', 'sữa rửa mặt', 'quần áo', 'thời trang', 'shopping'],
    },
    {
        id: 'entertainment',
        name: 'Giải trí',
        icon: 'game-controller-outline',
        color: '#8B5CF6',
        type: 'expense',
        keywords: ['phim', 'game', 'chơi', 'du lịch', 'xem phim', 'karaoke', 'bar', 'club', 'concert', 'show', 'netflix', 'spotify', 'youtube', 'giải trí', 'vui chơi'],
    },
    {
        id: 'bills',
        name: 'Hóa đơn',
        icon: 'receipt-outline',
        color: '#EF4444',
        type: 'expense',
        keywords: ['điện', 'nước', 'internet', 'wifi', 'điện thoại', 'tiền nhà', 'thuê nhà', 'phí', 'hóa đơn', 'tiền điện', 'tiền nước', 'tiền net', 'cước', 'phí dịch vụ'],
    },
    {
        id: 'health',
        name: 'Sức khỏe',
        icon: 'medical-outline',
        color: '#10B981',
        type: 'expense',
        keywords: ['thuốc', 'bác sĩ', 'khám', 'bệnh viện', 'gym', 'tập', 'thể dục', 'yoga', 'vitamin', 'thực phẩm chức năng', 'nha khoa', 'mắt kính', 'sức khỏe'],
    },
    {
        id: 'education',
        name: 'Giáo dục',
        icon: 'school-outline',
        color: '#6366F1',
        type: 'expense',
        keywords: ['học', 'sách', 'khóa học', 'học phí', 'trường', 'lớp', 'thầy', 'cô', 'gia sư', 'udemy', 'coursera', 'online', 'tiếng anh', 'ngoại ngữ'],
    },
    {
        id: 'family',
        name: 'Gia đình',
        icon: 'people-outline',
        color: '#F59E0B',
        type: 'expense',
        keywords: ['gia đình', 'bố', 'mẹ', 'con', 'vợ', 'chồng', 'anh', 'chị', 'em', 'ông', 'bà', 'biếu', 'cho', 'tặng', 'quà'],
    },
    {
        id: 'other_expense',
        name: 'Khác',
        icon: 'ellipsis-horizontal-outline',
        color: '#6B7280',
        type: 'expense',
        keywords: [],
    },
];

// Danh mục thu nhập
export const INCOME_CATEGORIES: Category[] = [
    {
        id: 'salary',
        name: 'Lương',
        icon: 'wallet-outline',
        color: '#10B981',
        type: 'income',
        keywords: ['lương', 'nhận lương', 'lương tháng', 'salary'],
    },
    {
        id: 'bonus',
        name: 'Thưởng',
        icon: 'gift-outline',
        color: '#F59E0B',
        type: 'income',
        keywords: ['thưởng', 'bonus', 'thưởng tết', 'thưởng lễ', 'thưởng dự án'],
    },
    {
        id: 'investment',
        name: 'Đầu tư',
        icon: 'trending-up-outline',
        color: '#8B5CF6',
        type: 'income',
        keywords: ['đầu tư', 'lãi', 'cổ phiếu', 'chứng khoán', 'crypto', 'bitcoin', 'thu về', 'lợi nhuận'],
    },
    {
        id: 'freelance',
        name: 'Freelance',
        icon: 'laptop-outline',
        color: '#3B82F6',
        type: 'income',
        keywords: ['freelance', 'dự án', 'job', 'việc ngoài', 'làm thêm', 'part-time'],
    },
    {
        id: 'gift_income',
        name: 'Quà tặng',
        icon: 'heart-outline',
        color: '#EC4899',
        type: 'income',
        keywords: ['được cho', 'được tặng', 'lì xì', 'tiền mừng', 'quà'],
    },
    {
        id: 'sell',
        name: 'Bán đồ',
        icon: 'pricetag-outline',
        color: '#14B8A6',
        type: 'income',
        keywords: ['bán', 'bán được', 'bán đồ', 'thanh lý'],
    },
    {
        id: 'other_income',
        name: 'Khác',
        icon: 'ellipsis-horizontal-outline',
        color: '#6B7280',
        type: 'income',
        keywords: [],
    },
];

// Tất cả danh mục
export const ALL_CATEGORIES: Category[] = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];

// Hàm lấy danh mục theo ID
export const getCategoryById = (id: string): Category | undefined => {
    return ALL_CATEGORIES.find(cat => cat.id === id);
};

// Hàm lấy danh mục theo loại
export const getCategoriesByType = (type: 'income' | 'expense'): Category[] => {
    return type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
};

// Hàm tìm danh mục phù hợp từ text (cho AI/voice)
export const findCategoryFromText = (text: string, type: 'income' | 'expense'): Category => {
    const lowerText = text.toLowerCase();
    const categories = getCategoriesByType(type);

    for (const category of categories) {
        if (category.keywords.some(keyword => lowerText.includes(keyword))) {
            return category;
        }
    }

    // Trả về danh mục "Khác" nếu không tìm thấy
    return categories.find(cat => cat.id.includes('other')) || categories[categories.length - 1];
};

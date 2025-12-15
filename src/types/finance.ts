/**
 * Finance Types
 * Các kiểu dữ liệu cho tính năng quản lý tài chính
 */

// Loại giao dịch: Thu hoặc Chi
export type TransactionType = 'income' | 'expense';

// Danh mục chi tiêu/thu nhập
export interface Category {
    id: string;
    name: string;
    icon: string; // Tên icon từ Ionicons
    color: string;
    type: TransactionType;
    keywords: string[]; // Từ khóa để AI nhận diện từ giọng nói
}

// Giao dịch
export interface Transaction {
    id: string;
    walletId: string;
    type: TransactionType;
    amount: number;
    categoryId: string;
    description: string;
    date: string; // ISO string (YYYY-MM-DD)
    createdAt: string; // ISO string
    createdBy: 'voice' | 'manual' | 'adjustment'; // Nhập bằng giọng nói, tay, hoặc điều chỉnh
}

// Ví
export interface Wallet {
    id: string;
    name: string;
    balance: number; // Số dư ban đầu (khi tạo ví)
    icon: string;
    color: string;
    isDefault: boolean;
    createdAt: string;
}

// Mục tiêu chi tiêu/tiết kiệm
export interface Goal {
    id: string;
    walletId?: string; // Null = áp dụng cho tất cả ví
    type: 'spending_limit' | 'saving_target';
    name: string;
    amount: number;
    period: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
    categoryId?: string; // Null = tất cả danh mục
    startDate: string;
    endDate?: string;
    isActive: boolean;
}

// Thống kê chi tiêu theo ngày
export interface DailySpending {
    date: string;
    income: number;
    expense: number;
    isOverBudget: boolean;
}

// Thống kê theo danh mục
export interface CategoryStats {
    categoryId: string;
    categoryName: string;
    total: number;
    percentage: number;
    color: string;
}

// Dữ liệu tài chính tổng hợp
export interface FinanceData {
    wallets: Wallet[];
    transactions: Transaction[];
    goals: Goal[];
}

// Props cho màn hình thêm giao dịch
export interface AddTransactionParams {
    walletId?: string;
    type?: TransactionType;
}

// Kết quả parse giọng nói
export interface VoiceParseResult {
    type: TransactionType;
    amount: number;
    description: string;
    categoryId: string;
    categoryName: string;
    date: string;
    confidence: number; // Độ tin cậy 0-1
}

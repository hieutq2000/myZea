/**
 * Finance Storage - Lưu trữ dữ liệu tài chính
 * Sử dụng AsyncStorage để lưu offline
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Transaction, Wallet, Goal, FinanceData } from '../../types/finance';

// Keys cho AsyncStorage
const STORAGE_KEYS = {
    WALLETS: '@finance_wallets',
    TRANSACTIONS: '@finance_transactions',
    GOALS: '@finance_goals',
    SETTINGS: '@finance_settings',
    MONTHLY_SALARY: '@finance_monthly_salary',
};


// Giới hạn số ví free
export const MAX_FREE_WALLETS = 3;

// Ví mặc định khi bắt đầu
export const DEFAULT_WALLET: Wallet = {
    id: 'wallet_default',
    name: 'Ví chính',
    balance: 0,
    icon: '💰',
    color: '#10B981',
    isDefault: true,
    createdAt: new Date().toISOString(),
};

// ==================== WALLET FUNCTIONS ====================

// Lấy danh sách ví
export const getWallets = async (): Promise<Wallet[]> => {
    try {
        const data = await AsyncStorage.getItem(STORAGE_KEYS.WALLETS);
        if (data) {
            return JSON.parse(data);
        }
        // Nếu chưa có, tạo ví mặc định
        await saveWallets([DEFAULT_WALLET]);
        return [DEFAULT_WALLET];
    } catch (error) {
        console.error('Error getting wallets:', error);
        return [DEFAULT_WALLET];
    }
};

// Lưu danh sách ví
export const saveWallets = async (wallets: Wallet[]): Promise<void> => {
    try {
        await AsyncStorage.setItem(STORAGE_KEYS.WALLETS, JSON.stringify(wallets));
    } catch (error) {
        console.error('Error saving wallets:', error);
    }
};

// Thêm ví mới
export const addWallet = async (wallet: Omit<Wallet, 'id' | 'createdAt'>): Promise<Wallet | null> => {
    try {
        const wallets = await getWallets();

        // Kiểm tra giới hạn
        if (wallets.length >= MAX_FREE_WALLETS) {
            throw new Error('Đã đạt giới hạn số ví. Nâng cấp Premium để thêm ví mới!');
        }

        const newWallet: Wallet = {
            ...wallet,
            id: `wallet_${Date.now()}`,
            createdAt: new Date().toISOString(),
        };

        wallets.push(newWallet);
        await saveWallets(wallets);
        return newWallet;
    } catch (error) {
        console.error('Error adding wallet:', error);
        throw error;
    }
};

// Cập nhật ví
export const updateWallet = async (walletId: string, updates: Partial<Wallet>): Promise<void> => {
    try {
        const wallets = await getWallets();
        const index = wallets.findIndex(w => w.id === walletId);
        if (index !== -1) {
            wallets[index] = { ...wallets[index], ...updates };
            await saveWallets(wallets);
        }
    } catch (error) {
        console.error('Error updating wallet:', error);
    }
};

// Xóa ví
export const deleteWallet = async (walletId: string): Promise<void> => {
    try {
        const wallets = await getWallets();
        const filtered = wallets.filter(w => w.id !== walletId);

        // Đảm bảo luôn có ít nhất 1 ví
        if (filtered.length === 0) {
            filtered.push(DEFAULT_WALLET);
        }

        // Nếu xóa ví default, chuyển ví đầu tiên thành default
        if (!filtered.some(w => w.isDefault)) {
            filtered[0].isDefault = true;
        }

        await saveWallets(filtered);

        // Xóa các giao dịch của ví này
        const transactions = await getTransactions();
        const filteredTxns = transactions.filter(t => t.walletId !== walletId);
        await saveTransactions(filteredTxns);
    } catch (error) {
        console.error('Error deleting wallet:', error);
    }
};

// ==================== TRANSACTION FUNCTIONS ====================

// Lấy danh sách giao dịch
export const getTransactions = async (): Promise<Transaction[]> => {
    try {
        const data = await AsyncStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error('Error getting transactions:', error);
        return [];
    }
};

// Lưu danh sách giao dịch
export const saveTransactions = async (transactions: Transaction[]): Promise<void> => {
    try {
        await AsyncStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
    } catch (error) {
        console.error('Error saving transactions:', error);
    }
};

// Thêm giao dịch mới
export const addTransaction = async (
    transaction: Omit<Transaction, 'id' | 'createdAt'>
): Promise<Transaction> => {
    try {
        const transactions = await getTransactions();
        const newTransaction: Transaction = {
            ...transaction,
            id: `txn_${Date.now()}`,
            createdAt: new Date().toISOString(),
        };

        transactions.unshift(newTransaction); // Thêm vào đầu danh sách
        await saveTransactions(transactions);
        return newTransaction;
    } catch (error) {
        console.error('Error adding transaction:', error);
        throw error;
    }
};

// Xóa giao dịch
export const deleteTransaction = async (transactionId: string): Promise<void> => {
    try {
        const transactions = await getTransactions();
        const filtered = transactions.filter(t => t.id !== transactionId);
        await saveTransactions(filtered);
    } catch (error) {
        console.error('Error deleting transaction:', error);
    }
};

// Lấy giao dịch theo ví
export const getTransactionsByWallet = async (walletId: string): Promise<Transaction[]> => {
    const transactions = await getTransactions();
    return transactions.filter(t => t.walletId === walletId);
};

// Lấy giao dịch theo ngày
export const getTransactionsByDate = async (date: string): Promise<Transaction[]> => {
    const transactions = await getTransactions();
    return transactions.filter(t => t.date === date);
};

// Lấy giao dịch trong khoảng thời gian
export const getTransactionsByDateRange = async (
    startDate: string,
    endDate: string
): Promise<Transaction[]> => {
    const transactions = await getTransactions();
    return transactions.filter(t => t.date >= startDate && t.date <= endDate);
};

// ==================== GOAL FUNCTIONS ====================

// Lấy danh sách mục tiêu
export const getGoals = async (): Promise<Goal[]> => {
    try {
        const data = await AsyncStorage.getItem(STORAGE_KEYS.GOALS);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error('Error getting goals:', error);
        return [];
    }
};

// Lưu danh sách mục tiêu
export const saveGoals = async (goals: Goal[]): Promise<void> => {
    try {
        await AsyncStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(goals));
    } catch (error) {
        console.error('Error saving goals:', error);
    }
};

// Thêm mục tiêu
export const addGoal = async (goal: Omit<Goal, 'id'>): Promise<Goal> => {
    try {
        const goals = await getGoals();
        const newGoal: Goal = {
            ...goal,
            id: `goal_${Date.now()}`,
        };
        goals.push(newGoal);
        await saveGoals(goals);
        return newGoal;
    } catch (error) {
        console.error('Error adding goal:', error);
        throw error;
    }
};

// ==================== CALCULATION FUNCTIONS ====================

// Tính số dư thực tế của ví (số dư ban đầu + tổng thu - tổng chi)
export const calculateWalletBalance = async (walletId: string): Promise<number> => {
    const wallets = await getWallets();
    const wallet = wallets.find(w => w.id === walletId);
    const initialBalance = wallet?.balance || 0;

    const transactions = await getTransactionsByWallet(walletId);

    const totalIncome = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

    const totalExpense = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

    return initialBalance + totalIncome - totalExpense;
};

// Tính tổng số dư tất cả ví
export const calculateTotalBalance = async (): Promise<number> => {
    const wallets = await getWallets();
    let total = 0;

    for (const wallet of wallets) {
        const balance = await calculateWalletBalance(wallet.id);
        total += balance;
    }

    return total;
};

// Tính tổng thu/chi trong tháng
export const getMonthlyStats = async (year: number, month: number): Promise<{
    income: number;
    expense: number;
    balance: number;
}> => {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

    const transactions = await getTransactionsByDateRange(startDate, endDate);

    const income = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

    const expense = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

    return {
        income,
        expense,
        balance: income - expense,
    };
};

// ==================== MONTHLY SALARY FUNCTIONS ====================

// Lấy lương tháng
export const getMonthlySalary = async (): Promise<number> => {
    try {
        const data = await AsyncStorage.getItem(STORAGE_KEYS.MONTHLY_SALARY);
        return data ? parseFloat(data) : 0;
    } catch (error) {
        console.error('Error getting monthly salary:', error);
        return 0;
    }
};

// Lưu lương tháng
export const setMonthlySalary = async (salary: number): Promise<void> => {
    try {
        await AsyncStorage.setItem(STORAGE_KEYS.MONTHLY_SALARY, salary.toString());
    } catch (error) {
        console.error('Error setting monthly salary:', error);
    }
};

// ==================== EXPORT FUNCTIONS ====================


// Xuất dữ liệu tài chính
export const exportFinanceData = async (): Promise<FinanceData> => {
    const wallets = await getWallets();
    const transactions = await getTransactions();
    const goals = await getGoals();

    return { wallets, transactions, goals };
};

// Import dữ liệu tài chính
export const importFinanceData = async (data: FinanceData): Promise<void> => {
    await saveWallets(data.wallets);
    await saveTransactions(data.transactions);
    await saveGoals(data.goals);
};

// Xóa tất cả dữ liệu
export const clearAllFinanceData = async (): Promise<void> => {
    await AsyncStorage.multiRemove([
        STORAGE_KEYS.WALLETS,
        STORAGE_KEYS.TRANSACTIONS,
        STORAGE_KEYS.GOALS,
        STORAGE_KEYS.SETTINGS,
    ]);
};

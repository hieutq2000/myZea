import { LiveMode, Topic, TargetAudience, User, ExamResult } from '../types';

export type RootStackParamList = {
    Auth: undefined;
    Main: undefined; // Màn hình chính (chứa Bottom Tabs hoặc Home)
    Session: {
        mode: LiveMode;
        topic: Topic;
        audience: TargetAudience;
    };
    History: undefined;
    Profile: undefined;
    Settings: undefined;
    PostDetail: { postId: string };

    // Chat Screens
    ChatList: undefined;
    ChatDetail: {
        conversationId?: string;
        partnerId: string;
        userName?: string;
        avatar?: string;
    };
    NewChat: undefined;

    // Call Screen
    Call: {
        partnerId: string;
        userName?: string;
        avatar?: string;
        isVideo: boolean;
        isIncoming?: boolean;
        channelName?: string;
        conversationId?: string;
    };

    // Finance Screens
    FinanceHome: undefined;
    FinanceAddTransaction: {
        walletId?: string;
        type?: 'income' | 'expense';
    };
    FinanceVoiceInput: undefined;
    FinanceWallets: undefined;
    FinanceGoals: undefined;
    FinanceCalendar: undefined;
    FinanceStatistics: undefined;

    // Admin Screens
    // AdminStickers: undefined; // Removed
    Feedback: undefined;
};

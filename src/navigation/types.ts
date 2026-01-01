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
    PrivacySettings: undefined;
    ActiveSessions: undefined;
    TodoNotes: undefined;
    PostDetail: { postId: string };
    PlaceNotifications: undefined;
    ChangePassword: undefined;
    EditProfile: undefined;
    DeleteAccount: undefined;
    BlockedUsers: undefined;

    // Chat Screens
    ChatList: undefined;
    ChatDetail: {
        conversationId?: string;
        partnerId?: string;
        groupId?: string;
        userName?: string;
        avatar?: string;
        isGroup?: boolean;
        members?: any[];
    };
    NewChat: undefined;
    CreateGroup: undefined;
    GroupInfo: {
        groupId: string;
        groupName: string;
        groupAvatar?: string;
        members?: any[];
        creatorId?: string;
    };

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

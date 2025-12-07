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

    // Chat Screens
    ChatList: undefined;
    ChatDetail: {
        conversationId: string;
        userName?: string;
        avatar?: string;
    };
};

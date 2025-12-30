
export interface SessionLogEntry {
    speaker: 'AI' | 'USER';
    text: string;
    timestamp: number;
}

export interface ExamResult {
    id: string;
    timestamp: string;
    score: 'ĐẠT' | 'CHƯA ĐẠT';
    duration: string;
    transcript?: SessionLogEntry[];
    topic?: string;
}

export interface Badge {
    id: string;
    icon: string;
    name: string;
    description: string;
    condition: (user: User) => boolean;
}

export interface CustomExam {
    id: string;
    title: string;
    topic: Topic;
    material: string;
    description?: string;
    createdAt: number;
}

export enum AiVoice {
    KORE = 'Kore',
    FENRIR = 'Fenrir',
    PUCK = 'Puck',
    ZEPHYR = 'Zephyr',
    CHARON = 'Charon'
}

export const VOICE_LABELS: Record<AiVoice, { label: string, gender: 'male' | 'female', desc: string }> = {
    [AiVoice.KORE]: { label: 'Cô Giáo Diệu Hiền', gender: 'female', desc: 'Giọng nữ trầm, thư thái' },
    [AiVoice.ZEPHYR]: { label: 'Cô Giáo Năng Động', gender: 'female', desc: 'Giọng nữ cao, vui vẻ' },
    [AiVoice.FENRIR]: { label: 'Thầy Giáo Trầm Ấm', gender: 'male', desc: 'Giọng nam sâu, truyền cảm' },
    [AiVoice.PUCK]: { label: 'Gia Sư Vui Tính', gender: 'male', desc: 'Giọng nam, hóm hỉnh' },
    [AiVoice.CHARON]: { label: 'Thầy Giám Thị', gender: 'male', desc: 'Giọng nam, nghiêm nghị' },
};

export interface User {
    id: string; // From database
    email: string;
    name: string;
    avatar?: string;
    coverImage?: string;
    voice?: AiVoice;
    history?: ExamResult[];
    xp?: number;
    level?: number;
    badges?: string[];
    createdExams?: CustomExam[];
    // Profile/Follow info
    followerCount?: number;
    followingCount?: number;
    isFollowing?: boolean;
    // Personal info
    birthday?: string; // ISO date string
    bio?: string;
    phone?: string;
    location?: string;
    // Work info
    company?: string;
    department?: string;
    position?: string;
    manager?: string;
}

export enum AuthView {
    LOGIN = 'LOGIN',
    REGISTER = 'REGISTER'
}

export enum LiveStatus {
    IDLE = 'IDLE',
    CONNECTING = 'CONNECTING',
    CONNECTED = 'CONNECTED',
    ERROR = 'ERROR'
}

export enum LiveMode {
    PRACTICE = 'PRACTICE',
    EXAM = 'EXAM',
    CUSTOM = 'CUSTOM'
}

export enum TargetAudience {
    GENERAL = 'GENERAL',
    KIDS = 'KIDS'
}

export enum Topic {
    MEDICAL = 'MEDICAL',
    IT = 'IT',
    HISTORY = 'HISTORY',
    ENGLISH = 'ENGLISH',
    SCIENCE = 'SCIENCE',
    GEOGRAPHY = 'GEOGRAPHY',
    MATH = 'MATH',
    PHYSICS = 'PHYSICS',
    CHEMISTRY = 'CHEMISTRY',
    BIOLOGY = 'BIOLOGY',
    LITERATURE = 'LITERATURE',
    CIVIC_EDU = 'CIVIC_EDU',
    ECONOMICS = 'ECONOMICS',
    PSYCHOLOGY = 'PSYCHOLOGY',
    ART = 'ART',
    MUSIC = 'MUSIC',
    MARKETING = 'MARKETING',
    ASTRONOMY = 'ASTRONOMY',
    GENERAL = 'GENERAL',

    // KIDS TOPICS
    KIDS_ANIMALS = 'KIDS_ANIMALS',
    KIDS_COLORS = 'KIDS_COLORS',
    KIDS_NUMBERS = 'KIDS_NUMBERS',
    KIDS_ALPHABET = 'KIDS_ALPHABET',
    KIDS_STORIES = 'KIDS_STORIES',
    KIDS_MANNERS = 'KIDS_MANNERS',
    KIDS_DINOSAURS = 'KIDS_DINOSAURS',
    KIDS_SPACE = 'KIDS_SPACE',
    KIDS_OCEAN = 'KIDS_OCEAN',
    KIDS_VEHICLES = 'KIDS_VEHICLES',
    KIDS_BEDTIME_STORIES = 'KIDS_BEDTIME_STORIES'
}

export const TOPIC_LABELS: Record<Topic, string> = {
    [Topic.MEDICAL]: 'Y Tế & Sức Khỏe',
    [Topic.IT]: 'Công Nghệ Thông Tin',
    [Topic.HISTORY]: 'Lịch Sử',
    [Topic.ENGLISH]: 'Tiếng Anh',
    [Topic.SCIENCE]: 'Khoa Học',
    [Topic.GEOGRAPHY]: 'Địa Lý',
    [Topic.MATH]: 'Toán Học',
    [Topic.PHYSICS]: 'Vật Lý',
    [Topic.CHEMISTRY]: 'Hóa Học',
    [Topic.BIOLOGY]: 'Sinh Học',
    [Topic.LITERATURE]: 'Văn Học',
    [Topic.CIVIC_EDU]: 'GDCD',
    [Topic.ECONOMICS]: 'Kinh Tế Học',
    [Topic.PSYCHOLOGY]: 'Tâm Lý Học',
    [Topic.ART]: 'Mỹ Thuật',
    [Topic.MUSIC]: 'Âm Nhạc',
    [Topic.MARKETING]: 'Marketing',
    [Topic.ASTRONOMY]: 'Thiên Văn',
    [Topic.GENERAL]: 'Tổng Hợp',

    // KIDS LABELS
    [Topic.KIDS_ANIMALS]: 'Động Vật',
    [Topic.KIDS_COLORS]: 'Màu Sắc',
    [Topic.KIDS_NUMBERS]: 'Số Đếm',
    [Topic.KIDS_ALPHABET]: 'Chữ Cái ABC',
    [Topic.KIDS_STORIES]: 'Cổ Tích',
    [Topic.KIDS_MANNERS]: 'Lễ Phép',
    [Topic.KIDS_DINOSAURS]: 'Khủng Long',
    [Topic.KIDS_SPACE]: 'Vũ Trụ',
    [Topic.KIDS_OCEAN]: 'Đại Dương',
    [Topic.KIDS_VEHICLES]: 'Xe Cộ',
    [Topic.KIDS_BEDTIME_STORIES]: 'Mẹ Kể Bé Nghe'
};

export const TOPIC_ICONS: Record<Topic, string> = {
    [Topic.MEDICAL]: '🏥',
    [Topic.IT]: '💻',
    [Topic.HISTORY]: '📜',
    [Topic.ENGLISH]: '🔤',
    [Topic.SCIENCE]: '🔬',
    [Topic.GEOGRAPHY]: '🌍',
    [Topic.MATH]: '🔢',
    [Topic.PHYSICS]: '⚛️',
    [Topic.CHEMISTRY]: '🧪',
    [Topic.BIOLOGY]: '🧬',
    [Topic.LITERATURE]: '📚',
    [Topic.CIVIC_EDU]: '⚖️',
    [Topic.ECONOMICS]: '📈',
    [Topic.PSYCHOLOGY]: '🧠',
    [Topic.ART]: '🎨',
    [Topic.MUSIC]: '🎵',
    [Topic.MARKETING]: '📣',
    [Topic.ASTRONOMY]: '🌌',
    [Topic.GENERAL]: '📝',

    [Topic.KIDS_ANIMALS]: '🦁',
    [Topic.KIDS_COLORS]: '🌈',
    [Topic.KIDS_NUMBERS]: '🔢',
    [Topic.KIDS_ALPHABET]: '🔤',
    [Topic.KIDS_STORIES]: '📖',
    [Topic.KIDS_MANNERS]: '🙏',
    [Topic.KIDS_DINOSAURS]: '🦕',
    [Topic.KIDS_SPACE]: '🚀',
    [Topic.KIDS_OCEAN]: '🐳',
    [Topic.KIDS_VEHICLES]: '🚗',
    [Topic.KIDS_BEDTIME_STORIES]: '🌙'
};

export const BADGES: Badge[] = [
    { id: 'first_win', icon: '🥇', name: 'Khởi Đầu Nan', description: 'Hoàn thành bài thi đầu tiên với kết quả ĐẠT', condition: (u) => (u.history?.filter(h => h.score === 'ĐẠT').length || 0) >= 1 },
    { id: 'scholar', icon: '🎓', name: 'Học Giả', description: 'Đạt kết quả ĐẠT 5 bài thi', condition: (u) => (u.history?.filter(h => h.score === 'ĐẠT').length || 0) >= 5 },
    { id: 'master', icon: '👑', name: 'Bậc Thầy', description: 'Đạt kết quả ĐẠT 10 bài thi', condition: (u) => (u.history?.filter(h => h.score === 'ĐẠT').length || 0) >= 10 },
    {
        id: 'night_owl', icon: '🦉', name: 'Cú Đêm', description: 'Hoàn thành một bài thi sau 10 giờ tối', condition: (u) => {
            if (!u.history || u.history.length === 0) return false;
            const last = new Date(u.history[0].timestamp);
            return last.getHours() >= 22 || last.getHours() < 4;
        }
    },
    {
        id: 'polymath', icon: '🌍', name: 'Thông Thái', description: 'Thử sức với 3 chủ đề khác nhau', condition: (u) => {
            const topics = new Set(u.history?.map(h => h.topic));
            return topics.size >= 3;
        }
    },
    { id: 'teacher', icon: '👨‍🏫', name: 'Người Truyền Lửa', description: 'Tạo đề thi đầu tiên', condition: (u) => (u.createdExams?.length || 0) >= 1 }
];

export const LEVEL_THRESHOLDS = [0, 100, 300, 600, 1000, 2000];

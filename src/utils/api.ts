import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, ExamResult } from '../types';

// Change this to your server URL
// For local development with mobile: use your WiFi IP
// For production: https://your-domain.com
export const API_URL = 'http://192.168.0.100:3001';

const TOKEN_KEY = 'auth_token';

// ============ TOKEN MANAGEMENT ============

export async function getToken(): Promise<string | null> {
    return AsyncStorage.getItem(TOKEN_KEY);
}

export async function setToken(token: string): Promise<void> {
    await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function removeToken(): Promise<void> {
    await AsyncStorage.removeItem(TOKEN_KEY);
}

// ============ API HELPERS ============

async function apiRequest<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const token = await getToken();

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
    };

    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || 'Lỗi kết nối server');
    }

    return data;
}

// ============ AUTH API ============

export interface AuthResponse {
    token: string;
    user: User;
}

export async function register(
    email: string,
    password: string,
    name: string
): Promise<AuthResponse> {
    const response = await apiRequest<AuthResponse>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, name }),
    });

    await setToken(response.token);
    return response;
}

export async function login(
    email: string,
    password: string
): Promise<AuthResponse> {
    const response = await apiRequest<AuthResponse>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
    });

    await setToken(response.token);
    return response;
}

export async function logout(): Promise<void> {
    await removeToken();
}

export async function getCurrentUser(): Promise<User | null> {
    try {
        const token = await getToken();
        if (!token) return null;

        const user = await apiRequest<User>('/api/auth/me');
        return user;
    } catch (error) {
        console.error('Get current user error:', error);
        await removeToken();
        return null;
    }
}

export async function updateProfile(
    name: string,
    avatar?: string,
    voice?: string
): Promise<void> {
    await apiRequest('/api/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({ name, avatar, voice }),
    });
}

// ============ EXAM API ============

export interface SaveExamResultResponse {
    success: boolean;
    resultId: string;
    xpGain: number;
    newXp: number;
    newLevel: number;
}

export async function saveExamResult(
    score: 'ĐẠT' | 'CHƯA ĐẠT',
    duration: string,
    topic: string,
    transcript: any[]
): Promise<SaveExamResultResponse> {
    return apiRequest<SaveExamResultResponse>('/api/exam/result', {
        method: 'POST',
        body: JSON.stringify({ score, duration, topic, transcript }),
    });
}

export async function getExamHistory(): Promise<ExamResult[]> {
    return apiRequest<ExamResult[]>('/api/exam/history');
}

// ============ HEALTH CHECK ============

export async function checkServerHealth(): Promise<boolean> {
    try {
        const response = await fetch(`${API_URL}/api/health`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
        });
        return response.ok;
    } catch {
        return false;
    }
}

// ============ AI PROXY API ============

export interface AIGenerateResponse {
    text: string;
    raw?: any;
}

export async function generateAIContent(
    prompt: string,
    images?: string[]
): Promise<AIGenerateResponse> {
    return apiRequest<AIGenerateResponse>('/api/ai/generate', {
        method: 'POST',
        body: JSON.stringify({ prompt, images }),
    });
}

export interface FaceVerifyResponse {
    isMatch: boolean;
    confidence: number;
    message: string;
}

export async function verifyFaceViaBackend(
    cameraImage: string,
    avatarImage: string
): Promise<FaceVerifyResponse> {
    return apiRequest<FaceVerifyResponse>('/api/ai/verify-face', {
        method: 'POST',
        body: JSON.stringify({ cameraImage, avatarImage }),
    });
}

// ============ CHAT API ============

export interface ChatUser {
    id: string;
    name: string;
    avatar?: string;
}

export interface Conversation {
    conversation_id: string;
    partner_id: string;
    name: string;
    avatar?: string; // Partner avatar
    last_message?: string;
    last_message_time?: string;
    unread_count?: number;
}

export async function getConversations(): Promise<Conversation[]> {
    return apiRequest<Conversation[]>('/api/chat/conversations');
}

export async function getChatHistory(partnerId: string): Promise<any[]> {
    return apiRequest<any[]>(`/api/chat/history/${partnerId}`);
}

export async function searchUsers(query: string): Promise<ChatUser[]> {
    return apiRequest<ChatUser[]>(`/api/users/search?q=${encodeURIComponent(query)}`);
}

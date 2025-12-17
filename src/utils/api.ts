import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, ExamResult } from '../types';
import { VoiceParseResult } from '../types/finance';

// Change this to your server URL
// For local development with mobile: use your WiFi IP
// For production: https://your-domain.com
// VPS: https://data5g.site (using Cloudflare SSL)
export const API_URL = 'https://data5g.site';

/**
 * Convert a relative image path to full URL
 * Handles both relative paths (/uploads/...) and full URLs (http://...)
 * This ensures images work even when WiFi IP changes
 */
export function getImageUrl(path: string | null | undefined): string | undefined {
    if (!path || path.trim() === '') return undefined;

    // Already a full URL (http:// or https:// or data:)
    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
        // Check if it's an old URL with different IP - convert to relative
        if (path.includes('/uploads/') && !path.startsWith(API_URL)) {
            // Extract relative path from old full URL
            const match = path.match(/\/uploads\/[^/]+$/);
            if (match) {
                return `${API_URL}${match[0]}`;
            }
        }
        return path;
    }

    // Relative path - prepend API_URL
    if (path.startsWith('/')) {
        return `${API_URL}${path}`;
    }

    // Just filename or other format
    return `${API_URL}/uploads/${path}`;
}

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

export async function apiRequest<T>(
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
    voice?: string,
    coverImage?: string
): Promise<void> {
    await apiRequest('/api/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({ name, avatar, voice, coverImage }),
    });
}

export async function getUserProfile(userId: string): Promise<User> {
    return apiRequest<User>(`/api/users/${userId}`);
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

// ============ SYSTEM API ============

export interface SystemSettings {
    maintenance: boolean;
    maintenanceMessage?: string;
    version?: string;
}

export async function getSystemSettings(): Promise<SystemSettings> {
    try {
        return await apiRequest<SystemSettings>('/api/system/settings');
    } catch {
        return { maintenance: false }; // Fallback
    }
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

// Finance AI Parse
export async function parseTransactionWithAI(text: string): Promise<Partial<VoiceParseResult>[]> {
    const res = await apiRequest<any>('/api/finance/parse-transaction', {
        method: 'POST',
        body: JSON.stringify({ text }),
    });
    // Ensure it's always an array
    if (Array.isArray(res)) return res;
    if (res && typeof res === 'object') return [res];
    return [];
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
    avatar?: string;
    last_message?: string;
    last_message_time?: string;
    last_message_sender_id?: string;
    last_message_deleted_by?: string | string[];
    unread_count?: number;
    status?: 'online' | 'offline';
    last_seen?: string;
    is_pinned?: boolean;
    is_muted?: boolean;
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

// Pin/Unpin a conversation
export async function pinConversation(conversationId: string, pin: boolean): Promise<any> {
    return apiRequest('/api/chat/conversations/' + conversationId + '/pin', {
        method: 'POST',
        body: JSON.stringify({ pin }),
    });
}

// Mute/Unmute a conversation  
export async function muteConversation(conversationId: string, mute: boolean): Promise<any> {
    return apiRequest('/api/chat/conversations/' + conversationId + '/mute', {
        method: 'POST',
        body: JSON.stringify({ mute }),
    });
}

// Delete (hide) a conversation
export async function deleteConversation(conversationId: string): Promise<any> {
    return apiRequest('/api/chat/conversations/' + conversationId, {
        method: 'DELETE',
    });
}

// Mark conversation as read
export async function markConversationAsRead(conversationId: string): Promise<any> {
    return apiRequest('/api/chat/conversations/' + conversationId + '/read', {
        method: 'POST',
    });
}

// Xóa tin nhắn (phía tôi)
export async function deleteMessage(messageId: string): Promise<any> {
    return apiRequest(`/api/chat/messages/${messageId}`, {
        method: 'DELETE',
    });
}

// Update Push Token
export async function updatePushToken(token: string): Promise<void> {
    return apiRequest('/api/auth/push-token', {
        method: 'POST',
        body: JSON.stringify({ token }),
    });
}

// ... existing code ...

// Upload generic image
export interface UploadResponse {
    url: string;
    width: number;
    height: number;
}

export async function uploadImage(imageUri: string): Promise<UploadResponse> { // Changed return type
    const token = await getToken();
    const formData = new FormData();
    const fileName = imageUri.split('/').pop() || 'image.jpg';

    // Determine type based on extension
    let type = 'image/jpeg';
    if (fileName.toLowerCase().endsWith('.png')) type = 'image/png';
    else if (fileName.toLowerCase().endsWith('.gif')) type = 'image/gif';
    else if (fileName.toLowerCase().endsWith('.mp4')) type = 'video/mp4';

    formData.append('image', {
        uri: imageUri,
        type: type,
        name: fileName,
    } as any);

    const response = await fetch(`${API_URL}/api/upload/image`, {
        method: 'POST',
        headers: {
            // 'Content-Type': 'multipart/form-data', // Do NOT set this manually, let fetch handle it
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
    });

    if (!response.ok) {
        throw new Error('Upload failed');
    }

    const data = await response.json();
    // Backward compatibility: if backend doesn't return width/height yet
    return {
        url: data.url,
        width: data.width || 0,
        height: data.height || 0
    };
}

// ============ PLACE API ============

export interface Comment {
    id: string;
    content: string;
    createdAt: string;
    user: {
        id: string;
        name: string;
        avatar?: string;
    };
}

export interface ImageObj {
    uri: string;
    width?: number;
    height?: number;
}

export interface Post {
    id: string;
    author: {
        id: string;
        name: string;
        avatar?: string;
    };
    content: string;
    image?: string | ImageObj; // Can be string or object
    images?: (string | ImageObj)[]; // Array of strings or objects
    originalPost?: Post; // New: Shared Post Support
    createdAt: string;
    likes: number;
    isLiked: boolean;
    comments: number;
    views: number;
    shares: number;
    taggedUsers?: { id: string; name: string; avatar?: string }[];
    group?: { id: string; name: string; avatar?: string };
}

export async function getPosts(page: number = 1, limit: number = 20): Promise<Post[]> {
    return apiRequest<Post[]>(`/api/place/posts?page=${page}&limit=${limit}`);
}

// Track post view (call when user sees a post in feed)
export async function trackPostView(postId: string): Promise<void> {
    try {
        await apiRequest(`/api/place/posts/${postId}/view`, { method: 'POST' });
    } catch (e) {
        // Silently fail - don't interrupt user experience
    }
}

export async function createPost(
    content: string,
    imageUrl?: string | null,
    images?: (string | ImageObj)[],
    originalPostId?: string,
    taggedUserIds?: string[]
): Promise<Post> {
    return apiRequest<Post>('/api/place/posts', {
        method: 'POST',
        body: JSON.stringify({ content, imageUrl, images, originalPostId, taggedUserIds }),
    });
}
// ... existing code ...

export async function toggleLikePost(postId: string): Promise<{ liked: boolean }> {
    return apiRequest<{ liked: boolean }>(`/api/place/posts/${postId}/like`, {
        method: 'POST',
    });
}

export async function getComments(postId: string): Promise<Comment[]> {
    return apiRequest<Comment[]>(`/api/place/posts/${postId}/comments`);
}

export async function createComment(postId: string, content: string): Promise<Comment> {
    return apiRequest<Comment>(`/api/place/posts/${postId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content }),
    });
}

export interface CreateGroupParams {
    name: string;
    description?: string;
    privacy: 'public' | 'private' | 'secret';
    coverImage?: string;
}

export async function createGroup(params: CreateGroupParams): Promise<any> {
    return apiRequest('/api/place/groups', {
        method: 'POST',
        body: JSON.stringify(params),
    });
}

export async function createGroupPost(
    groupId: string,
    content: string,
    images?: (string | ImageObj)[]
): Promise<Post> {
    return apiRequest<Post>(`/api/place/groups/${groupId}/posts`, {
        method: 'POST',
        body: JSON.stringify({ content, images }),
    });
}



export async function getUserPosts(userId: string, page: number = 1): Promise<Post[]> {
    // Note: This endpoint allows getting posts from a specific user
    return apiRequest<Post[]>(`/api/place/users/${userId}/posts?page=${page}`);
}

export async function followUser(userId: string): Promise<void> {
    return apiRequest(`/api/place/users/${userId}/follow`, { method: 'POST' });
}

export async function unfollowUser(userId: string): Promise<void> {
    return apiRequest(`/api/place/users/${userId}/unfollow`, { method: 'POST' });
}

// ============ PLACE NOTIFICATIONS API ============

export interface PlaceNotification {
    id: string;
    type: 'like' | 'comment' | 'share' | 'mention' | 'follow' | 'tag';
    user: {
        id: string;
        name: string;
        avatar?: string;
    };
    postId?: string;
    postPreview?: string;
    message: string;
    createdAt: string;
    isRead: boolean;
}

export async function getPlaceNotifications(limit: number = 50): Promise<PlaceNotification[]> {
    return apiRequest<PlaceNotification[]>(`/api/place/notifications?limit=${limit}`);
}

export async function getUnreadNotificationCount(): Promise<{ count: number }> {
    return apiRequest<{ count: number }>('/api/place/notifications/unread-count');
}

export async function markNotificationAsRead(notificationId: string): Promise<void> {
    return apiRequest(`/api/place/notifications/${notificationId}/read`, { method: 'PATCH' });
}

export async function markAllNotificationsAsRead(): Promise<void> {
    return apiRequest('/api/place/notifications/read-all', { method: 'PATCH' });
}

import { ImageObj, getImageUrl } from './api';

/**
 * Check if a URL is a video file
 * @param url - URL string or ImageObj
 * @returns true if the URL is a video file
 */
export const isVideo = (url: string | ImageObj | any): boolean => {
    const uri = typeof url === 'string' ? url : url?.uri;
    return !!uri?.match(/\.(mp4|mov|avi|wmv|flv|webm|m4v|3gp)$/i);
};

/**
 * Get URI string from ImageObj or string
 * Uses getImageUrl to handle IP changes automatically
 * @param img - Image URL string or ImageObj
 * @returns URI string with current API_URL
 */
export const getUri = (img: string | ImageObj | any | undefined): string => {
    if (!img) return '';
    const rawUri = typeof img === 'string' ? img : img.uri || '';
    // Use getImageUrl to convert old IP URLs to current API_URL
    return getImageUrl(rawUri) || rawUri;
};

/**
 * Get avatar URI with fallback to ui-avatars.com
 * Uses getImageUrl to handle IP changes automatically
 * @param avatar - Avatar URL string
 * @param name - User name for fallback avatar
 * @returns Avatar URI string with current API_URL
 */
export const getAvatarUri = (avatar: string | undefined, name: string = 'User'): string => {
    if (!avatar || avatar.trim() === '') {
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;
    }
    // Use getImageUrl to convert old IP URLs to current API_URL
    const converted = getImageUrl(avatar);
    if (converted) return converted;

    // If getImageUrl returns undefined, use fallback
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;
};

import { ImageObj } from './api';

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
 * @param img - Image URL string or ImageObj
 * @returns URI string
 */
export const getUri = (img: string | ImageObj | any | undefined): string => {
    if (!img) return '';
    return typeof img === 'string' ? img : img.uri || '';
};

/**
 * Get avatar URI with fallback to ui-avatars.com
 * @param avatar - Avatar URL string
 * @param name - User name for fallback avatar
 * @returns Avatar URI string
 */
export const getAvatarUri = (avatar: string | undefined, name: string = 'User'): string => {
    if (!avatar) {
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;
    }
    // If already a URL, return as-is
    if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
        return avatar;
    }
    // If base64, return as-is
    if (avatar.startsWith('data:')) {
        return avatar;
    }
    // Otherwise, assume it's a path and return as-is
    return avatar;
};

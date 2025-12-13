/**
 * Format time to Vietnamese relative time string
 * @param dateInput - ISO date string, MySQL datetime string, or Date object
 * @returns Formatted time string like "Vừa xong", "5 phút trước", etc.
 */
export const formatTime = (dateInput: string | Date | null | undefined): string => {
    if (!dateInput) return '';

    let date: Date;

    // Handle Date object directly
    if (dateInput instanceof Date) {
        date = dateInput;
    } else if (typeof dateInput === 'string') {
        // ISO format with Z - UTC time
        if (dateInput.includes('T') && dateInput.endsWith('Z')) {
            date = new Date(dateInput);
        }
        // ISO format without Z (e.g., "2024-12-13T00:30:00.000")
        else if (dateInput.includes('T')) {
            date = new Date(dateInput);
        }
        // MySQL format (e.g., "2024-12-13 00:30:00")
        else if (dateInput.includes(' ') && dateInput.includes('-')) {
            // Convert to ISO format for consistent parsing
            const isoString = dateInput.replace(' ', 'T');
            date = new Date(isoString);
        }
        else {
            // Try to parse directly
            date = new Date(dateInput);
        }
    } else {
        return '';
    }

    // Check if date is valid
    if (isNaN(date.getTime())) {
        console.warn('[formatTime] Invalid date:', dateInput);
        return '';
    }

    const now = new Date();
    const diff = (now.getTime() - date.getTime()) / 1000; // seconds

    // Debug (remove in production)
    // console.log('[formatTime] Input:', dateInput, '| Parsed:', date.toISOString(), '| Diff (s):', diff);

    // Handle negative diff (future dates - shouldn't happen but handle gracefully)
    if (diff < 0) {
        // If diff is very small negative (within 1 minute), treat as "just now"
        if (diff > -60) return 'Vừa xong';
        // Otherwise might be timezone issue, still show "just now"
        return 'Vừa xong';
    }

    if (diff < 60) return 'Vừa xong';
    if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} ngày trước`; // 7 days

    return date.toLocaleDateString('vi-VN');
};

export default formatTime;

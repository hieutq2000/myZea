/**
 * Format time to Vietnamese relative time string
 * @param dateString - ISO date string or MySQL datetime string
 * @returns Formatted time string like "Vừa xong", "5 phút trước", etc.
 */
export const formatTime = (dateString: string): string => {
    if (!dateString) return '';

    // MySQL returns datetime in format: "2024-12-13T00:30:00.000Z" or "2024-12-13 00:30:00"
    // If it ends with Z, it's UTC. Otherwise, treat as local time.
    let date: Date;

    if (dateString.includes('T') && dateString.endsWith('Z')) {
        // ISO format with Z - this is UTC, convert to local
        date = new Date(dateString);
    } else if (dateString.includes('T')) {
        // ISO format without Z - treat as local time
        date = new Date(dateString);
    } else {
        // MySQL format without T (e.g., "2024-12-13 00:30:00")
        // JavaScript may parse this as UTC, so we need to treat it as local
        const localDate = dateString.replace(' ', 'T');
        date = new Date(localDate);
    }

    const now = new Date();
    const diff = (now.getTime() - date.getTime()) / 1000; // seconds

    // Handle negative diff (future dates, likely timezone issue)
    if (diff < 0) return 'Vừa xong';

    if (diff < 60) return 'Vừa xong';
    if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} ngày trước`; // 7 days
    return date.toLocaleDateString('vi-VN');
};

export default formatTime;

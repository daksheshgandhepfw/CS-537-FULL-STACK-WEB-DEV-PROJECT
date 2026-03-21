// Shared Utilities
export const formatDuration = (minutes: number): string => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h > 0) {
        return `${h}h ${m > 0 ? m + 'm' : ''}`;
    }
    return `${m}m`;
};

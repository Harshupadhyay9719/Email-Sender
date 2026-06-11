/**
 * Helper Utilities
 */
export declare class DateUtils {
    /**
     * Get date range (today, this week, this month, this year)
     */
    static getDateRange(range: 'today' | 'week' | 'month' | 'year'): {
        start: Date;
        end: Date;
    };
    /**
     * Format date as ISO string
     */
    static toISO(date: Date): string;
    /**
     * Calculate days between two dates
     */
    static daysBetween(date1: Date, date2: Date): number;
}
export declare class ValidationUtils {
    /**
     * Check if email is blacklist pattern match
     */
    static isBlacklistEmail(email: string, patterns: string[]): boolean;
    /**
     * Get randomized delay in milliseconds
     */
    static getRandomDelay(minSeconds: number, maxSeconds: number): number;
    /**
     * Calculate exponential backoff delay
     */
    static calculateBackoffDelay(attemptNumber: number, baseDelaySeconds: number): number;
}
export declare class StringUtils {
    /**
     * Replace merge fields in text
     */
    static replaceMergeFields(text: string, fields: Record<string, string>): string;
    /**
     * Extract all merge fields from text
     */
    static extractMergeFields(text: string): string[];
    /**
     * Sanitize HTML for security
     */
    static sanitizeHtml(html: string): string;
    /**
     * Generate slug from string
     */
    static generateSlug(text: string): string;
}
export declare class PaginationUtils {
    /**
     * Calculate skip value for pagination
     */
    static getSkip(page: number, limit: number): number;
    /**
     * Calculate total pages
     */
    static getTotalPages(total: number, limit: number): number;
    /**
     * Validate pagination parameters
     */
    static validatePagination(page: number, limit: number, maxLimit?: number): {
        page: number;
        limit: number;
    };
}
//# sourceMappingURL=helpers.d.ts.map
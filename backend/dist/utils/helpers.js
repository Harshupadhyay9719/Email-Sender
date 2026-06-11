"use strict";
/**
 * Helper Utilities
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaginationUtils = exports.StringUtils = exports.ValidationUtils = exports.DateUtils = void 0;
class DateUtils {
    /**
     * Get date range (today, this week, this month, this year)
     */
    static getDateRange(range) {
        const now = new Date();
        let start = new Date();
        switch (range) {
            case 'today':
                start.setHours(0, 0, 0, 0);
                break;
            case 'week':
                const firstDay = now.getDate() - now.getDay();
                start = new Date(now.setDate(firstDay));
                start.setHours(0, 0, 0, 0);
                break;
            case 'month':
                start = new Date(now.getFullYear(), now.getMonth(), 1);
                start.setHours(0, 0, 0, 0);
                break;
            case 'year':
                start = new Date(now.getFullYear(), 0, 1);
                start.setHours(0, 0, 0, 0);
                break;
        }
        const end = new Date();
        end.setHours(23, 59, 59, 999);
        return { start, end };
    }
    /**
     * Format date as ISO string
     */
    static toISO(date) {
        return date.toISOString();
    }
    /**
     * Calculate days between two dates
     */
    static daysBetween(date1, date2) {
        const oneDay = 24 * 60 * 60 * 1000;
        return Math.round((date2.getTime() - date1.getTime()) / oneDay);
    }
}
exports.DateUtils = DateUtils;
class ValidationUtils {
    /**
     * Check if email is blacklist pattern match
     */
    static isBlacklistEmail(email, patterns) {
        const emailLower = email.toLowerCase();
        const domainMatch = /@([^@]+)$/.exec(emailLower);
        if (!domainMatch)
            return false;
        const domain = domainMatch[1];
        return patterns.some((pattern) => {
            if (pattern.startsWith('^') || pattern.endsWith('$')) {
                // It's a regex pattern
                try {
                    const regex = new RegExp(pattern);
                    return regex.test(emailLower);
                }
                catch {
                    return false;
                }
            }
            else {
                // Simple domain match
                return emailLower.includes(pattern);
            }
        });
    }
    /**
     * Get randomized delay in milliseconds
     */
    static getRandomDelay(minSeconds, maxSeconds) {
        const minMs = minSeconds * 1000;
        const maxMs = maxSeconds * 1000;
        return Math.random() * (maxMs - minMs) + minMs;
    }
    /**
     * Calculate exponential backoff delay
     */
    static calculateBackoffDelay(attemptNumber, baseDelaySeconds) {
        return Math.min(baseDelaySeconds * Math.pow(2, attemptNumber), 3600); // Max 1 hour
    }
}
exports.ValidationUtils = ValidationUtils;
class StringUtils {
    /**
     * Replace merge fields in text
     */
    static replaceMergeFields(text, fields) {
        let result = text;
        Object.entries(fields).forEach(([key, value]) => {
            const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
            result = result.replace(regex, value);
        });
        return result;
    }
    /**
     * Extract all merge fields from text
     */
    static extractMergeFields(text) {
        const regex = /{{([^}]+)}}/g;
        const matches = [...text.matchAll(regex)];
        return [...new Set(matches.map((m) => m[1].trim()))];
    }
    /**
     * Sanitize HTML for security
     */
    static sanitizeHtml(html) {
        // Basic sanitization - remove script tags
        return html
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/on\w+\s*=/gi, '');
    }
    /**
     * Generate slug from string
     */
    static generateSlug(text) {
        return text
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/--+/g, '-');
    }
}
exports.StringUtils = StringUtils;
class PaginationUtils {
    /**
     * Calculate skip value for pagination
     */
    static getSkip(page, limit) {
        return (Math.max(1, page) - 1) * limit;
    }
    /**
     * Calculate total pages
     */
    static getTotalPages(total, limit) {
        return Math.ceil(total / limit);
    }
    /**
     * Validate pagination parameters
     */
    static validatePagination(page, limit, maxLimit = 100) {
        return {
            page: Math.max(1, page),
            limit: Math.min(Math.max(1, limit), maxLimit),
        };
    }
}
exports.PaginationUtils = PaginationUtils;
//# sourceMappingURL=helpers.js.map
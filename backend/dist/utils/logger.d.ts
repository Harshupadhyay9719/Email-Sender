/**
 * Logger Utility
 */
declare class Logger {
    private logLevel;
    private levels;
    constructor();
    private formatTimestamp;
    private shouldLog;
    error(message: string, error?: any): void;
    warn(message: string, data?: any): void;
    info(message: string, data?: any): void;
    debug(message: string, data?: any): void;
}
declare const _default: Logger;
export default _default;
//# sourceMappingURL=logger.d.ts.map
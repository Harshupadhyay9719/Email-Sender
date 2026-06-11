/**
 * MongoDB Database Connection and Configuration
 */
declare class Database {
    static connect(): Promise<void>;
    static disconnect(): Promise<void>;
    static dropDatabase(): Promise<void>;
}
export default Database;
//# sourceMappingURL=database.d.ts.map
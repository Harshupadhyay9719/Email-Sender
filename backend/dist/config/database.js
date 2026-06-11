"use strict";
/**
 * MongoDB Database Connection and Configuration
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dns_1 = __importDefault(require("dns"));
const env_1 = __importDefault(require("./env"));
const logger_1 = __importDefault(require("../utils/logger"));
class Database {
    static async connect() {
        try {
            try {
                dns_1.default.setServers(['8.8.8.8', '1.1.1.1']);
            }
            catch (dnsErr) {
                logger_1.default.warn('Failed to set DNS servers:', dnsErr);
            }
            const uri = env_1.default.node_env === 'test' ? env_1.default.mongodb_test_uri : env_1.default.mongodb_uri;
            console.log("Mongo URI:", uri);
            await mongoose_1.default.connect(uri, {
                maxPoolSize: 10,
                minPoolSize: 5,
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 45000,
                retryWrites: true,
                w: 'majority',
            });
            logger_1.default.info('✓ MongoDB connected successfully');
            // Handle connection events
            mongoose_1.default.connection.on('error', (error) => {
                logger_1.default.error('MongoDB connection error:', error);
            });
            mongoose_1.default.connection.on('disconnected', () => {
                logger_1.default.warn('MongoDB disconnected');
            });
        }
        catch (error) {
            logger_1.default.error('Failed to connect to MongoDB:', error);
            logger_1.default.error('MongoDB is required before starting the backend. Start Docker Desktop and run "npm run docker:up" from the project root, or run MongoDB locally on the configured MONGODB_URI.');
            process.exit(1);
        }
    }
    static async disconnect() {
        try {
            await mongoose_1.default.disconnect();
            logger_1.default.info('✓ MongoDB disconnected');
        }
        catch (error) {
            logger_1.default.error('Error disconnecting from MongoDB:', error);
            throw error;
        }
    }
    static async dropDatabase() {
        try {
            await mongoose_1.default.connection.dropDatabase();
            logger_1.default.info('✓ Database dropped');
        }
        catch (error) {
            logger_1.default.error('Error dropping database:', error);
            throw error;
        }
    }
}
exports.default = Database;
//# sourceMappingURL=database.js.map
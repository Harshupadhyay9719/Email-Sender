"use strict";
/**
 * Response Handler Utility
 * Standardized response format for all API endpoints
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResponseHandler = void 0;
const uuid_1 = require("uuid");
class ResponseHandler {
    static success(res, statusCode = 200, message = 'Success', data) {
        const response = {
            success: true,
            statusCode,
            message,
            data,
            timestamp: new Date(),
            requestId: res.getHeader('x-request-id') || (0, uuid_1.v4)(),
        };
        return res.status(statusCode).json(response);
    }
    static created(res, data, message = 'Resource created successfully') {
        return this.success(res, 201, message, data);
    }
    static accepted(res, data, message = 'Request accepted') {
        return this.success(res, 202, message, data);
    }
    static noContent(res) {
        return res.status(204).send();
    }
}
exports.ResponseHandler = ResponseHandler;
//# sourceMappingURL=responseHandler.js.map
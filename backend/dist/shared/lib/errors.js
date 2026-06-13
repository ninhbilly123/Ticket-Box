"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppError = void 0;
class AppError extends Error {
    statusCode;
    errorCode;
    constructor(statusCode, errorCode, message) {
        super(message);
        this.statusCode = statusCode;
        this.errorCode = errorCode;
        Object.setPrototypeOf(this, new.target.prototype);
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;

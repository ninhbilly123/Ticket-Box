"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
const errors_1 = require("../lib/errors");
function errorHandler(err, req, res, next) {
    console.error(`[Error] ${err.stack}`);
    if (err instanceof errors_1.AppError) {
        return res.status(err.statusCode).json({
            success: false,
            error: {
                code: err.errorCode,
                message: err.message,
            },
        });
    }
    // Fallback for unhandled/internal server errors
    return res.status(500).json({
        success: false,
        error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Đã xảy ra lỗi hệ thống, vui lòng thử lại sau.',
        },
    });
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const redis_1 = require("redis");
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const redisClient = (0, redis_1.createClient)({
    url: redisUrl,
});
redisClient.on('error', (err) => console.error('Redis Client Error', err));
redisClient.on('connect', () => console.log('Redis Client Connected'));
// Proactively connect to Redis
(async () => {
    try {
        if (!redisClient.isOpen) {
            await redisClient.connect();
        }
    }
    catch (err) {
        console.error('Failed to connect to Redis:', err);
    }
})();
exports.default = redisClient;

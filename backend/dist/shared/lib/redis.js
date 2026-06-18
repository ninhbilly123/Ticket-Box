"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLockedTickets = exports.unlockTicket = exports.lockTicket = void 0;
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
const lockTicket = async (ticketId, orderId, expiresInSeconds = 600) => {
    const lockKey = `ticket:${ticketId}:lock`;
    // SET key value EX seconds NX (only if it does not exist)
    const result = await redisClient.set(lockKey, orderId, {
        EX: expiresInSeconds,
        NX: true
    });
    return result === 'OK';
};
exports.lockTicket = lockTicket;
const unlockTicket = async (ticketId) => {
    const lockKey = `ticket:${ticketId}:lock`;
    await redisClient.del(lockKey);
};
exports.unlockTicket = unlockTicket;
const getLockedTickets = async (ticketIds) => {
    // Check multiple tickets using mGet or pipeline
    if (ticketIds.length === 0)
        return [];
    const keys = ticketIds.map(id => `ticket:${id}:lock`);
    const results = await redisClient.mGet(keys);
    // Return the ticketIds that are locked (result is not null)
    return ticketIds.filter((_, index) => results[index] !== null);
};
exports.getLockedTickets = getLockedTickets;
exports.default = redisClient;

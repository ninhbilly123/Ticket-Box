"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConcertService = void 0;
const prisma_1 = require("../../shared/lib/prisma");
const redis_1 = __importDefault(require("../../shared/lib/redis"));
const errors_1 = require("../../shared/lib/errors");
class ConcertService {
    /**
     * Helper to retrieve remaining tickets for a ticket type with Redis Cache-aside (TTL 30s)
     */
    async getRemainingTickets(ticketTypeId, totalQuantity) {
        const cacheKey = `ticket_inventory:${ticketTypeId}`;
        try {
            // 1. Check Redis Cache
            if (redis_1.default.isOpen) {
                const cached = await redis_1.default.get(cacheKey);
                if (cached !== null) {
                    return parseInt(cached, 10);
                }
            }
        }
        catch (err) {
            console.error(`[Redis Error] Failed to read cache for ${ticketTypeId}:`, err);
        }
        // 2. Cache Miss: Query PostgreSQL
        // Tickets with status RESERVED (temporary hold) or BOOKED (paid) are considered sold/unavailable.
        const soldCount = await prisma_1.prisma.ticket.count({
            where: {
                ticketTypeId,
                status: {
                    in: ['RESERVED', 'BOOKED'],
                },
            },
        });
        const remaining = Math.max(0, totalQuantity - soldCount);
        try {
            // 3. Write back to Redis cache with 30 seconds TTL
            if (redis_1.default.isOpen) {
                await redis_1.default.setEx(cacheKey, 30, remaining.toString());
            }
        }
        catch (err) {
            console.error(`[Redis Error] Failed to set cache for ${ticketTypeId}:`, err);
        }
        return remaining;
    }
    /**
     * Fetch all upcoming concerts with optional search & filters
     */
    async getConcerts(filters) {
        const { search, artist, date, location } = filters;
        const whereClause = {};
        // Filter upcoming concerts
        whereClause.dateTime = {
            gte: new Date(),
        };
        // Apply search string (matches title or artist name)
        if (search) {
            whereClause.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { artist: { contains: search, mode: 'insensitive' } },
            ];
        }
        // Filter by specific artist
        if (artist) {
            whereClause.artist = { contains: artist, mode: 'insensitive' };
        }
        // Filter by specific location
        if (location) {
            whereClause.location = { contains: location, mode: 'insensitive' };
        }
        // Filter by specific date
        if (date) {
            const parsedDate = new Date(date);
            if (!isNaN(parsedDate.getTime())) {
                const startOfDay = new Date(parsedDate.setUTCHours(0, 0, 0, 0));
                const endOfDay = new Date(parsedDate.setUTCHours(23, 59, 59, 999));
                whereClause.dateTime = {
                    gte: startOfDay,
                    lte: endOfDay,
                };
            }
        }
        const concerts = await prisma_1.prisma.concert.findMany({
            where: whereClause,
            include: {
                ticketTypes: true,
            },
            orderBy: {
                dateTime: 'asc',
            },
        });
        // Populate remaining tickets for each ticket type in each concert
        const populatedConcerts = await Promise.all(concerts.map(async (concert) => {
            const ticketTypesWithRemaining = await Promise.all(concert.ticketTypes.map(async (tt) => {
                const remaining = await this.getRemainingTickets(tt.id, tt.totalQuantity);
                return {
                    id: tt.id,
                    name: tt.name,
                    price: tt.price,
                    totalQuantity: tt.totalQuantity,
                    maxLimitPerUser: tt.maxLimitPerUser,
                    remaining,
                };
            }));
            return {
                id: concert.id,
                title: concert.title,
                description: concert.description,
                artist: concert.artist,
                dateTime: concert.dateTime,
                location: concert.location,
                seatMapUrl: concert.seatMapUrl,
                ticketTypes: ticketTypesWithRemaining,
            };
        }));
        return populatedConcerts;
    }
    /**
     * Fetch single concert details with seat layout and remaining tickets
     */
    async getConcertById(id) {
        const concert = await prisma_1.prisma.concert.findUnique({
            where: { id },
            include: {
                ticketTypes: true,
            },
        });
        if (!concert) {
            throw new errors_1.AppError(404, 'CONCERT_NOT_FOUND', 'Không tìm thấy thông tin concert yêu cầu.');
        }
        const ticketTypesWithRemaining = await Promise.all(concert.ticketTypes.map(async (tt) => {
            const remaining = await this.getRemainingTickets(tt.id, tt.totalQuantity);
            return {
                id: tt.id,
                name: tt.name,
                price: tt.price,
                totalQuantity: tt.totalQuantity,
                maxLimitPerUser: tt.maxLimitPerUser,
                remaining,
            };
        }));
        return {
            id: concert.id,
            title: concert.title,
            description: concert.description,
            artist: concert.artist,
            dateTime: concert.dateTime,
            location: concert.location,
            seatMapUrl: concert.seatMapUrl,
            ticketTypes: ticketTypesWithRemaining,
        };
    }
}
exports.ConcertService = ConcertService;

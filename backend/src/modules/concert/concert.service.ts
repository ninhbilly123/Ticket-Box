import { prisma } from '../../shared/lib/prisma';
import redisClient from '../../shared/lib/redis';
import { AppError } from '../../shared/lib/errors';

export class ConcertService {
  /**
   * Helper to retrieve remaining tickets for a ticket type with Redis Cache-aside (TTL 30s)
   */
  public async getRemainingTickets(ticketTypeId: string, totalQuantity: number): Promise<{ remaining: number, reserved: number, booked: number }> {
    const cacheKey = `ticket_inventory_detailed:${ticketTypeId}`;
    
    try {
      if (redisClient.isOpen) {
        const cached = await redisClient.get(cacheKey);
        if (cached !== null) {
          return JSON.parse(cached);
        }
      }
    } catch (err) {
      console.error(`[Redis Error] Failed to read cache for ${ticketTypeId}:`, err);
    }

    const reservedCount = await prisma.ticket.count({
      where: { ticketTypeId, status: 'RESERVED' },
    });
    
    const bookedCount = await prisma.ticket.count({
      where: { ticketTypeId, status: 'BOOKED' },
    });

    const soldCount = reservedCount + bookedCount;
    const remaining = Math.max(0, totalQuantity - soldCount);
    
    const result = { remaining, reserved: reservedCount, booked: bookedCount };

    try {
      if (redisClient.isOpen) {
        await redisClient.setEx(cacheKey, 30, JSON.stringify(result));
      }
    } catch (err) {
      console.error(`[Redis Error] Failed to set cache for ${ticketTypeId}:`, err);
    }

    return result;
  }

  /**
   * Fetch all upcoming concerts with optional search & filters
   */
  public async getConcerts(filters: {
    search?: string;
    artist?: string;
    date?: string;
    location?: string;
  }) {
    const { search, artist, date, location } = filters;
    const whereClause: any = {};

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

    const concerts = await prisma.concert.findMany({
      where: whereClause,
      include: {
        ticketTypes: true,
      },
      orderBy: {
        dateTime: 'asc',
      },
    });

    // Populate remaining tickets for each ticket type in each concert
    const populatedConcerts = await Promise.all(
      concerts.map(async (concert) => {
        const ticketTypesWithRemaining = await Promise.all(
          concert.ticketTypes.map(async (tt) => {
            const counts = await this.getRemainingTickets(tt.id, tt.totalQuantity);
            return {
              id: tt.id,
              name: tt.name,
              price: tt.price,
              totalQuantity: tt.totalQuantity,
              maxLimitPerUser: tt.maxLimitPerUser,
              remaining: counts.remaining,
              reserved: counts.reserved,
              booked: counts.booked,
            };
          })
        );

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
      })
    );

    return populatedConcerts;
  }

  /**
   * Fetch single concert details with seat layout and remaining tickets
   */
  public async getConcertById(id: string) {
    const concert = await prisma.concert.findUnique({
      where: { id },
      include: {
        ticketTypes: true,
        artistBios: {
          where: { status: 'PUBLISHED' },
          orderBy: { publishedAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!concert) {
      throw new AppError(404, 'CONCERT_NOT_FOUND', 'Không tìm thấy thông tin concert yêu cầu.');
    }

    const ticketTypesWithRemaining = await Promise.all(
      concert.ticketTypes.map(async (tt) => {
        const counts = await this.getRemainingTickets(tt.id, tt.totalQuantity);
        return {
          id: tt.id,
          name: tt.name,
          price: tt.price,
          totalQuantity: tt.totalQuantity,
          maxLimitPerUser: tt.maxLimitPerUser,
          remaining: counts.remaining,
          reserved: counts.reserved,
          booked: counts.booked,
        };
      })
    );

    return {
      id: concert.id,
      title: concert.title,
      description: concert.description,
      artist: concert.artist,
      dateTime: concert.dateTime,
      location: concert.location,
      seatMapUrl: concert.seatMapUrl,
      ticketTypes: ticketTypesWithRemaining,
      artistBio: concert.artistBios[0]?.publishedBio || null,
    };
  }
}

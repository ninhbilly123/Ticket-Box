import { prisma } from '../../shared/lib/prisma';
import redisClient from '../../shared/lib/redis';
import { AppError } from '../../shared/lib/errors';

export class ConcertService {
  /**
   * Helper to retrieve remaining tickets for a ticket type with Redis Cache-aside (TTL 30s)
   */
  public async getRemainingTickets(ticketTypeId: string, totalQuantity: number): Promise<number> {
    const cacheKey = `ticket_inventory:${ticketTypeId}`;
    
    try {
      // 1. Check Redis Cache
      if (redisClient.isOpen) {
        const cached = await redisClient.get(cacheKey);
        if (cached !== null) {
          return parseInt(cached, 10);
        }
      }
    } catch (err) {
      console.error(`[Redis Error] Failed to read cache for ${ticketTypeId}:`, err);
    }

    // 2. Cache Miss: Query PostgreSQL
    // Tickets with status valid or used are considered sold/unavailable.
    const soldCount = await prisma.ticket.count({
      where: {
        orderItem: {
          ticketTypeId,
        },
        status: {
          in: ['valid', 'used'],
        },
      },
    });

    const remaining = Math.max(0, totalQuantity - soldCount);

    try {
      // 3. Write back to Redis cache with 30 seconds TTL
      if (redisClient.isOpen) {
        await redisClient.setEx(cacheKey, 30, remaining.toString());
      }
    } catch (err) {
      console.error(`[Redis Error] Failed to set cache for ${ticketTypeId}:`, err);
    }

    return remaining;
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

    // Filter upcoming concerts (today and future)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    whereClause.startAt = {
      gte: todayStart,
    };

    // Apply search string (matches name, venue, or artist name)
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { venue: { contains: search, mode: 'insensitive' } },
        {
          artists: {
            some: {
              artist: {
                name: { contains: search, mode: 'insensitive' }
              }
            }
          }
        }
      ];
    }

    // Filter by specific artist
    if (artist) {
      whereClause.artists = {
        some: {
          artist: {
            name: { contains: artist, mode: 'insensitive' }
          }
        }
      };
    }

    // Filter by specific location/venue
    if (location) {
      whereClause.venue = { contains: location, mode: 'insensitive' };
    }

    // Filter by specific date
    if (date) {
      const parsedDate = new Date(date);
      if (!isNaN(parsedDate.getTime())) {
        const startOfDay = new Date(parsedDate.setUTCHours(0, 0, 0, 0));
        const endOfDay = new Date(parsedDate.setUTCHours(23, 59, 59, 999));
        whereClause.startAt = {
          gte: startOfDay,
          lte: endOfDay,
        };
      }
    }

    const concerts = await prisma.concert.findMany({
      where: whereClause,
      include: {
        ticketTypes: true,
        artists: {
          include: {
            artist: true,
          },
        },
      },
      orderBy: {
        startAt: 'asc',
      },
    });

    // Populate remaining tickets for each ticket type in each concert
    const populatedConcerts = await Promise.all(
      concerts.map(async (concert) => {
        const ticketTypesWithRemaining = await Promise.all(
          concert.ticketTypes.map(async (tt) => {
            const remaining = await this.getRemainingTickets(tt.id, tt.totalQuantity);
            return {
              id: tt.id,
              name: tt.name,
              price: Number(tt.price),
              totalQuantity: tt.totalQuantity,
              maxLimitPerUser: tt.maxPerAccount,
              remaining,
            };
          })
        );

        const artistNames = concert.artists.map((ca) => ca.artist.name).join(', ');

        return {
          id: concert.id,
          title: concert.name,
          description: concert.description,
          artist: artistNames || 'Nhiều nghệ sĩ',
          dateTime: concert.startAt.toISOString(),
          location: concert.venue,
          seatMapUrl: concert.svgSeatingMap || '',
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
        artists: {
          include: {
            artist: true,
          },
        },
      },
    });

    if (!concert) {
      throw new AppError(404, 'CONCERT_NOT_FOUND', 'Không tìm thấy thông tin concert yêu cầu.');
    }

    const ticketTypesWithRemaining = await Promise.all(
      concert.ticketTypes.map(async (tt) => {
        const remaining = await this.getRemainingTickets(tt.id, tt.totalQuantity);
        return {
          id: tt.id,
          name: tt.name,
          price: Number(tt.price),
          totalQuantity: tt.totalQuantity,
          maxLimitPerUser: tt.maxPerAccount,
          remaining,
        };
      })
    );

    const artistNames = concert.artists.map((ca) => ca.artist.name).join(', ');

    return {
      id: concert.id,
      title: concert.name,
      description: concert.description,
      artist: artistNames || 'Nhiều nghệ sĩ',
      dateTime: concert.startAt.toISOString(),
      location: concert.venue,
      seatMapUrl: concert.svgSeatingMap || '',
      ticketTypes: ticketTypesWithRemaining,
    };
  }
}
export default ConcertService;

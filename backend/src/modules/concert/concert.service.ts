import { prisma } from '../../shared/lib/prisma';
import redisClient, { isRedisReady, runRedisOperation } from '../../shared/lib/redis';
import { AppError } from '../../shared/lib/errors';
import {
  ConcertListFilters,
  readConcertListCache,
  writeConcertListCache,
} from './concert-listing-cache';
import {
  readConcertDetailCache,
  readTicketAvailabilityCache,
  writeConcertDetailCache,
  writeTicketAvailabilityCache,
} from './concert-detail-cache';

const PUBLIC_CONCERT_STATUSES = ['PUBLISHED', 'ON_SALE'];

export class ConcertService {
  /**
   * Helper to retrieve remaining tickets for a ticket type with Redis Cache-aside (TTL 30s)
   */
  public async getRemainingTickets(ticketTypeId: string, totalQuantity: number): Promise<number> {
    const cacheKey = `ticket_inventory:${ticketTypeId}`;
    
    try {
      // 1. Check Redis Cache
      if (isRedisReady()) {
        const cached = await runRedisOperation(() => redisClient.get(cacheKey));
        if (cached !== null) {
          return parseInt(cached, 10);
        }
      }
    } catch (err) {
      console.error(`[Redis Error] Failed to read cache for ${ticketTypeId}:`, err);
    }

    // 2. Cache Miss: Prefer inventory counters so pending holds reduce availability.
    const inventory = await prisma.ticketInventory.findUnique({
      where: { ticketTypeId },
      select: { availableQuantity: true },
    });
    const remaining = inventory?.availableQuantity ?? totalQuantity;

    try {
      // 3. Write back to Redis cache with 30 seconds TTL
      if (isRedisReady()) {
        await runRedisOperation(() => redisClient.setEx(cacheKey, 30, remaining.toString()));
      }
    } catch (err) {
      console.error(`[Redis Error] Failed to set cache for ${ticketTypeId}:`, err);
    }

    return remaining;
  }

  /**
   * Fetch all upcoming concerts with optional search & filters
   */
  public async getConcerts(filters: ConcertListFilters) {
    const cached = await readConcertListCache<unknown[]>(filters);
    if (cached) {
      return cached;
    }

    const concerts = await this.getConcertsFromDatabase(filters);
    await writeConcertListCache(filters, concerts);
    return concerts;
  }

  private async getConcertsFromDatabase(filters: ConcertListFilters) {
    const { search, artist, date, location } = filters;
    const whereClause: any = {
      status: { in: ['PUBLISHED', 'ON_SALE', 'published'] },
    };

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
    const cached = await readConcertDetailCache<any>(id);
    const detail = cached || await this.getConcertDetailFromDatabase(id);

    if (!cached) {
      await writeConcertDetailCache(id, detail);
    }

    const availability = await this.getConcertAvailability(id);
    const availabilityByTicketType = new Map(
      availability.ticketTypes.map((ticketType) => [ticketType.id, ticketType.remaining])
    );

    return {
      ...detail,
      ticketTypes: detail.ticketTypes.map((ticketType: any) => ({
        ...ticketType,
        remaining: availabilityByTicketType.get(ticketType.id) ?? 0,
      })),
    };
  }

  public async getConcertAvailability(id: string) {
    const cached = await readTicketAvailabilityCache<{
      concertId: string;
      ticketTypes: Array<{ id: string; name: string; remaining: number }>;
    }>(id);
    if (cached) {
      return cached;
    }

    const availability = await this.getConcertAvailabilityFromDatabase(id);
    await writeTicketAvailabilityCache(id, availability);
    return availability;
  }

  private async getConcertDetailFromDatabase(id: string) {
    const concert = await prisma.concert.findFirst({
      where: {
        id,
        status: { in: PUBLIC_CONCERT_STATUSES },
      },
      include: {
        ticketTypes: true,
        artists: {
          include: {
            artist: true,
          },
        },
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

    const artistNames = concert.artists.map((ca) => ca.artist.name).join(', ');

    return {
      id: concert.id,
      title: concert.name,
      name: concert.name,
      description: concert.description,
      artist: artistNames || 'Nhiều nghệ sĩ',
      artistBio: concert.artistBios[0]?.publishedBio || null,
      dateTime: concert.startAt.toISOString(),
      startAt: concert.startAt.toISOString(),
      saleOpenAt: concert.saleOpenAt.toISOString(),
      status: concert.status,
      location: concert.venue,
      venue: concert.venue,
      seatMapUrl: concert.svgSeatingMap || '',
      ticketTypes: concert.ticketTypes.map((tt) => ({
        id: tt.id,
        name: tt.name,
        price: Number(tt.price),
        totalQuantity: tt.totalQuantity,
        maxLimitPerUser: tt.maxPerAccount,
        maxPerAccount: tt.maxPerAccount,
        saleOpenAt: tt.saleOpenAt ? tt.saleOpenAt.toISOString() : null,
        saleCloseAt: tt.saleCloseAt ? tt.saleCloseAt.toISOString() : null,
        status: tt.status,
      })),
    };
  }

  private async getConcertAvailabilityFromDatabase(id: string) {
    const concert = await prisma.concert.findFirst({
      where: {
        id,
        status: { in: PUBLIC_CONCERT_STATUSES },
      },
      select: {
        id: true,
        ticketTypes: {
          select: {
            id: true,
            name: true,
            totalQuantity: true,
            reservedQuantity: true,
            soldQuantity: true,
            inventory: true,
          },
        },
      },
    });

    if (!concert) {
      throw new AppError(404, 'CONCERT_NOT_FOUND', 'Không tìm thấy thông tin concert yêu cầu.');
    }

    return {
      concertId: concert.id,
      ticketTypes: concert.ticketTypes.map((tt) => {
        const remaining = tt.inventory
          ? tt.inventory.availableQuantity
          : Math.max(0, tt.totalQuantity - tt.reservedQuantity - tt.soldQuantity);

        return {
          id: tt.id,
          name: tt.name,
          remaining,
        };
      }),
    };
  }
}
export default ConcertService;

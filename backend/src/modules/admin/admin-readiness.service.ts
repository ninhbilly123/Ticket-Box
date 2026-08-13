import { Injectable } from '@nestjs/common';
import { AppError } from '../../shared/lib/errors';
import { PrismaService } from '../../shared/modules/prisma.service';
import { assertZoneCode, inspectSeatMapSvg } from '../../shared/lib/seat-map-svg';

export interface ConcertReadinessCheck {
  key: string;
  label: string;
  status: 'PASS' | 'FAIL' | 'WARNING';
  message: string;
  blocking: boolean;
}

@Injectable()
export class AdminReadinessService {
  constructor(private readonly prisma: PrismaService) {}

  public async evaluateConcertReadiness(concertId: string) {
    const concert = await this.prisma.concert.findUnique({
      where: { id: concertId },
      include: {
        ticketTypes: { include: { inventory: true } },
        artists: true,
        staffAssignments: true,
        artistBios: { where: { status: 'PUBLISHED' }, take: 1 },
      },
    });
    if (!concert) throw new AppError(404, 'CONCERT_NOT_FOUND', 'Concert not found.');

    const checks: ConcertReadinessCheck[] = [];
    const addCheck = (
      key: string,
      label: string,
      passed: boolean,
      successMessage: string,
      failureMessage: string,
      blocking = true
    ) => {
      checks.push({
        key,
        label,
        status: passed ? 'PASS' : blocking ? 'FAIL' : 'WARNING',
        message: passed ? successMessage : failureMessage,
        blocking,
      });
    };

    addCheck(
      'basic-info',
      'Thong tin co ban',
      Boolean(concert.eventCode.trim() && concert.name.trim() && concert.venue.trim()),
      'Event code, name, and venue are ready.',
      'Event code, name, and venue are required.'
    );

    const scheduleValid = concert.saleOpenAt < concert.startAt && concert.startAt > new Date();
    addCheck(
      'schedule',
      'Lich su kien',
      scheduleValid,
      'Sale opening time and event time are valid.',
      'Event time must be in the future, and sale opening time must be before event time.'
    );

    addCheck(
      'artists',
      'Nghe si',
      concert.artists.length > 0,
      `${concert.artists.length} artist(s) attached.`,
      'At least one artist is required.'
    );

    const activeTicketTypes = concert.ticketTypes.filter((ticketType) => ticketType.status === 'ACTIVE');
    const invalidTicketTypes: string[] = [];
    for (const ticketType of activeTicketTypes) {
      const totalQuantity = ticketType.inventory?.totalQuantity ?? ticketType.totalQuantity;
      try {
        this.validateTicketSaleWindow(ticketType.saleOpenAt, ticketType.saleCloseAt, concert);
      } catch {
        invalidTicketTypes.push(`${ticketType.name}: invalid sale window`);
      }
      if (totalQuantity <= 0) invalidTicketTypes.push(`${ticketType.name}: inventory must be positive`);
      if (ticketType.maxPerAccount <= 0 || Number(ticketType.price) < 0) {
        invalidTicketTypes.push(`${ticketType.name}: price or limit is invalid`);
      }
    }
    addCheck(
      'ticket-types',
      'Loai ve va ton kho',
      activeTicketTypes.length > 0 && invalidTicketTypes.length === 0,
      `${activeTicketTypes.length} active ticket type(s) ready.`,
      activeTicketTypes.length === 0 ? 'At least one active ticket type is required.' : invalidTicketTypes.join('; ')
    );

    const zoneCodes = activeTicketTypes.map((ticketType) => ticketType.zoneCode);
    const normalizedZoneCodes = zoneCodes.map((code) => assertZoneCode(code));
    addCheck(
      'zone-codes',
      'Ma khu vuc',
      normalizedZoneCodes.length > 0 && new Set(normalizedZoneCodes).size === normalizedZoneCodes.length,
      'Zone codes are valid and unique.',
      'Every active ticket type needs a valid and unique zone code.'
    );

    let seatMapValid = !concert.seatMapEnabled;
    let seatMapMessage = 'Seat map is disabled.';
    if (concert.seatMapEnabled) {
      if (!concert.svgSeatingMap) {
        seatMapMessage = 'Seat map is enabled but SVG has not been uploaded.';
      } else {
        try {
          const inspected = inspectSeatMapSvg(concert.svgSeatingMap, normalizedZoneCodes);
          seatMapValid = inspected.missingZoneCodes.length === 0 && inspected.unknownZoneCodes.length === 0;
          seatMapMessage = seatMapValid
            ? `SVG maps ${inspected.zoneCodes.length} zone(s).`
            : `SVG missing [${inspected.missingZoneCodes.join(', ')}] or has unknown [${inspected.unknownZoneCodes.join(', ')}].`;
        } catch (error) {
          seatMapMessage = error instanceof Error ? error.message : 'SVG is invalid.';
        }
      }
    }
    addCheck('seat-map', 'So do khu vuc', seatMapValid, seatMapMessage, seatMapMessage);

    addCheck(
      'artist-bio',
      'Artist Bio',
      concert.artistBios.length > 0,
      'Published artist bio exists.',
      'Published artist bio is missing. This does not block publishing.',
      false
    );
    addCheck(
      'checkin-staff',
      'Nhan vien soat ve',
      concert.staffAssignments.length > 0,
      `${concert.staffAssignments.length} check-in assignment(s) configured.`,
      'No check-in staff assigned. This does not block publishing.',
      false
    );

    const blockingIssues = checks
      .filter((check) => check.blocking && check.status === 'FAIL')
      .map((check) => `${check.label}: ${check.message}`);
    return { concertId, ready: blockingIssues.length === 0, checks, blockingIssues };
  }

  private validateTicketSaleWindow(
    saleOpenAt: Date | null,
    saleCloseAt: Date | null,
    concert: { saleOpenAt: Date; startAt: Date }
  ) {
    const effectiveOpenAt = saleOpenAt || concert.saleOpenAt;
    const effectiveCloseAt = saleCloseAt || concert.startAt;
    if (!Number.isFinite(effectiveOpenAt.getTime()) || !Number.isFinite(effectiveCloseAt.getTime())) {
      throw new Error('Invalid sale time.');
    }
    if (effectiveOpenAt < concert.saleOpenAt || effectiveOpenAt >= effectiveCloseAt || effectiveCloseAt > concert.startAt) {
      throw new Error('Invalid sale window.');
    }
  }
}

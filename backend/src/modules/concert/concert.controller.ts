import { Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common';
import { ConcertService } from './concert.service';
import { WaitingRoomService } from './waiting-room.service';
import { AuthGuard } from '../../shared/guards/auth.guard';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';

@Controller('api/v1/concerts')
export class ConcertController {
  constructor(
    private readonly concertService: ConcertService,
    private readonly waitingRoomService: WaitingRoomService
  ) {}

  @Get()
  public async getConcerts(
    @Query('search') search?: string,
    @Query('artist') artist?: string,
    @Query('date') date?: string,
    @Query('location') location?: string,
  ) {
    const concerts = await this.concertService.getConcerts({
      search,
      artist,
      date,
      location,
    });

    return {
      success: true,
      data: concerts,
    };
  }

  @Get(':id/availability')
  public async getConcertAvailability(@Param('id') id: string) {
    const availability = await this.concertService.getConcertAvailability(id);

    return {
      success: true,
      data: availability,
    };
  }

  @Post(':concertId/waiting-room/join')
  @UseGuards(AuthGuard)
  public async joinWaitingRoom(
    @Param('concertId') concertId: string,
    @CurrentUser() user: any,
  ) {
    const status = await this.waitingRoomService.join(concertId, user.id);

    return {
      success: true,
      data: status,
    };
  }

  @Get(':concertId/waiting-room/status')
  @UseGuards(AuthGuard)
  public async getWaitingRoomStatus(
    @Param('concertId') concertId: string,
    @CurrentUser() user: any,
  ) {
    const status = await this.waitingRoomService.getStatus(concertId, user.id);

    return {
      success: true,
      data: status,
    };
  }

  @Get(':id')
  public async getConcertById(@Param('id') id: string) {
    const concert = await this.concertService.getConcertById(id);

    return {
      success: true,
      data: concert,
    };
  }
}

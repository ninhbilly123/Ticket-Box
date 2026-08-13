import { WaitingRoomService } from '../modules/concert/waiting-room.service';
import { prisma } from '../shared/lib/prisma';
import { PrismaService } from '../shared/modules/prisma.service';

const waitingRoomService = new WaitingRoomService(prisma as unknown as PrismaService);

const RELEASE_INTERVAL_MS = 60_000;

export function startWaitingRoomWorker() {
  console.log('[WaitingRoomWorker] Started');

  setInterval(async () => {
    try {
      await waitingRoomService.releaseWaitingRooms();
    } catch (error) {
      console.error('[WaitingRoomWorker] Release cycle failed', error);
    }
  }, RELEASE_INTERVAL_MS);
}

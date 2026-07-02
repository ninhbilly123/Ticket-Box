import { waitingRoomService } from '../modules/concert/waiting-room.service';

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

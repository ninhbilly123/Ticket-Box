import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

import { authRoutes } from './modules/auth/auth.routes';
import { adminRoutes } from './modules/admin/admin.routes';
import { internalRoutes } from './modules/admin/internal.routes';
import { concertRoutes } from './modules/concert/concert.routes';
import { ticketRoutes } from './modules/ticket/ticket.routes';
import { orderRoutes } from './modules/order/order.routes';
import { paymentRoutes } from './modules/payment/payment.routes';
import { checkinRoutes } from './modules/checkin/checkin.routes';
import { artistBioRoutes } from './modules/ai/artist-bio.routes';
import { vipGuestSyncRoutes } from './modules/vip-guest-sync/vip-guest-sync.routes';
import { errorHandler } from './shared/middleware/errorHandler';
import { memberAOpenApi } from './shared/openapi/memberA';
import { startCleanupWorker } from './workers/cleanup.worker';
import { startNotificationWorker } from './workers/notification.worker';
import { startConcertListingCacheInvalidationWorker } from './workers/concert-listing-cache-invalidation.worker';
import { startOrderExpirationWorker } from './workers/order-expiration.worker';
import { startWaitingRoomWorker } from './workers/waiting-room.worker';
import { startAiBioWorker } from './workers/ai-bio.worker';
import { startVipGuestSyncWorker } from './workers/vip-guest-sync.worker';
import { startEmailWorker } from './workers/email.worker';
import { startConcertReminderWorker } from './workers/concert-reminder.worker';

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS
app.use(cors());

// Parse JSON request bodies
app.use(express.json());

// Base healthcheck
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', time: new Date() });
});

// Routing
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/internal', internalRoutes);
app.use('/api/v1/concerts', concertRoutes);
app.use('/api/v1/tickets', ticketRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/checkins', checkinRoutes);
app.use('/api/v1/ai/artist-bio', artistBioRoutes);
app.use('/api/v1/vip-guest-sync', vipGuestSyncRoutes);

app.get('/api/v1/openapi/member-a.json', (req, res) => {
  res.status(200).json(memberAOpenApi);
});

// Global Error Handler
app.use(errorHandler);

export function startServer() {
  return app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`[Server] TicketBox backend running on port ${PORT}`);
    startCleanupWorker();
    startNotificationWorker();
    startConcertListingCacheInvalidationWorker();
    startOrderExpirationWorker();
    startWaitingRoomWorker();
    startAiBioWorker();
    startEmailWorker();
    startVipGuestSyncWorker();
    startConcertReminderWorker();
  });
}

if (require.main === module) {
  startServer();
}

export default app;

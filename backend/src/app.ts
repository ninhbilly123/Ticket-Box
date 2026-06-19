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
import { paymentRoutes } from './modules/payment/payment.routes';
import { checkinRoutes } from './modules/checkin/checkin.routes';
import { errorHandler } from './shared/middleware/errorHandler';
import { memberAOpenApi } from './shared/openapi/memberA';
import { startCleanupWorker } from './workers/cleanup.worker';
import { startNotificationWorker } from './workers/notification.worker';

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
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/checkins', checkinRoutes);

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
  });
}

if (require.main === module) {
  startServer();
}

export default app;

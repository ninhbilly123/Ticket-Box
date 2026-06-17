import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

import { concertRoutes } from './modules/concert/concert.routes';
import { ticketRoutes } from './modules/ticket/ticket.routes';
import { paymentRoutes } from './modules/payment/payment.routes';
import { checkinRoutes } from './modules/checkin/checkin.routes';
import { errorHandler } from './shared/middleware/errorHandler';

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
app.use('/api/v1/concerts', concertRoutes);
app.use('/api/v1/tickets', ticketRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/checkins', checkinRoutes);

// Global Error Handler
app.use(errorHandler);

import { startCleanupWorker } from './workers/cleanup.worker';
import { startNotificationWorker } from './workers/notification.worker';

// Start server
app.listen(PORT, () => {
  console.log(`[Server] TicketBox backend running on port ${PORT}`);
  startCleanupWorker();
  startNotificationWorker();
});

export default app;

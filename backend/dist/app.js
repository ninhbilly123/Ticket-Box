"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables
dotenv_1.default.config();
const concert_routes_1 = require("./modules/concert/concert.routes");
const ticket_routes_1 = require("./modules/ticket/ticket.routes");
const payment_routes_1 = require("./modules/payment/payment.routes");
const artist_bio_routes_1 = require("./modules/ai/artist-bio.routes");
const vip_guest_sync_routes_1 = require("./modules/vip-guest-sync/vip-guest-sync.routes");
const errorHandler_1 = require("./shared/middleware/errorHandler");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
// Enable CORS
app.use((0, cors_1.default)());
// Parse JSON request bodies
app.use(express_1.default.json());
// Base healthcheck
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', time: new Date() });
});
// Routing
app.use('/api/v1/concerts', concert_routes_1.concertRoutes);
app.use('/api/v1/tickets', ticket_routes_1.ticketRoutes);
app.use('/api/v1/payments', payment_routes_1.paymentRoutes);
app.use('/api/v1/ai/artist-bio', artist_bio_routes_1.artistBioRoutes);
app.use('/api/v1/vip-guest-sync', vip_guest_sync_routes_1.vipGuestSyncRoutes);
// Global Error Handler
app.use(errorHandler_1.errorHandler);
const cleanup_worker_1 = require("./workers/cleanup.worker");
const ai_bio_worker_1 = require("./workers/ai-bio.worker");
const vip_guest_sync_worker_1 = require("./workers/vip-guest-sync.worker");
// Start server
app.listen(PORT, () => {
    console.log(`[Server] TicketBox backend running on port ${PORT}`);
    (0, cleanup_worker_1.startCleanupWorker)();
    (0, ai_bio_worker_1.startAiBioWorker)();
    (0, vip_guest_sync_worker_1.startVipGuestSyncWorker)();
});
exports.default = app;

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
// Global Error Handler
app.use(errorHandler_1.errorHandler);
// Start server
app.listen(PORT, () => {
    console.log(`[Server] TicketBox backend running on port ${PORT}`);
});
exports.default = app;

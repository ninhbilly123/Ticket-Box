"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.concertRoutes = void 0;
const express_1 = require("express");
const concert_controller_1 = require("./concert.controller");
const router = (0, express_1.Router)();
exports.concertRoutes = router;
const concertController = new concert_controller_1.ConcertController();
// GET /api/v1/concerts - List concerts with search/filter queries
router.get('/', (req, res, next) => concertController.getConcerts(req, res, next));
// GET /api/v1/concerts/:id - Details of a specific concert
router.get('/:id', (req, res, next) => concertController.getConcertById(req, res, next));
exports.default = router;

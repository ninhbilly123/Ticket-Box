"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConcertController = void 0;
const concert_service_1 = require("./concert.service");
const concertService = new concert_service_1.ConcertService();
class ConcertController {
    async getConcerts(req, res, next) {
        try {
            const { search, artist, date, location } = req.query;
            const concerts = await concertService.getConcerts({
                search: search ? String(search) : undefined,
                artist: artist ? String(artist) : undefined,
                date: date ? String(date) : undefined,
                location: location ? String(location) : undefined,
            });
            return res.status(200).json({
                success: true,
                data: concerts,
            });
        }
        catch (err) {
            next(err);
        }
    }
    async getConcertById(req, res, next) {
        try {
            const { id } = req.params;
            const concert = await concertService.getConcertById(id);
            return res.status(200).json({
                success: true,
                data: concert,
            });
        }
        catch (err) {
            next(err);
        }
    }
}
exports.ConcertController = ConcertController;

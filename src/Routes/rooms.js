const express = require('express');
const router = express.Router();
const Room = require('../models/Room');
const auth = require('../middleware/auth');
const { getSudoku } = require('sudoku-gen');
// Post /rooms/ | tworzymy nowy pokój
router.post('/', auth, async (req, res) => {
    try {
        const { difficulty } = req.body;
        const sudoku = getSudoku(difficulty || 'easy');

        const newRoom = new Room({
            host: req.user.userId, // ID pobrane z tokena przez middleware
            board: sudoku.puzzle,
            solution: sudoku.solution,
            difficulty: sudoku.difficulty,
            status: 'waiting'
        });

        const room = await newRoom.save();

        res.status(201).json({
            message: 'Pokój został utworzony',
            roomId: room._id,
            difficulty: room.difficulty
        });

    } catch {
        res.status(500).json({ error: 'Błąd serwera podczas tworzenia pokoju' });
    }
});

// GET /rooms/ | pobieramy obecne pokoje
router.get('/', auth, async (req, res) => {
    try {
        const rooms = await Room.find({ status: 'waiting' })
                                .populate('host', 'username')
                                .sort({ createdAt: -1 });
        res.json(rooms);
    } catch {
        res.status(500).json({ error: 'Błąd podczas pobierania pokoi' });
    }
});
// GET /rooms/id | pobieramy pokój do którego wchodzimy
router.get('/:id', auth, async (req, res) => {
    try {
        const roomId = req.params.id;
        const room = await Room.findById(roomId)
                               .populate('host', 'username')
                               .populate('opponent', 'username');

        if (!room) {
            return res.status(404).json({ error: 'Pokój nie istnieje' });
        }
        // Zabezpieczamy planszę tak żeby host nie widział cyfr przed startem
        // Kopiujemy oryginalną planszę
        let boardToSend = room.board;
        if (room.status === 'waiting') {
            boardToSend = boardToSend.replace(/[1-9]/g, '.');
        }
        res.json({
            ...room.toObject(),
            board: boardToSend 
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Błąd serwera' });
    }
});

// PATCH /rooms/id/join | Dołączanie do istniejącego pokoju (UPDATE)
router.patch('/:id/join', auth, async (req, res) => {
    try {
        const roomId = req.params.id;
        const userId = req.user.userId;
        const room = await Room.findById(roomId);
        if (!room) {
            return res.status(404).json({ message: 'Pokój nie istnieje' });
        }
        // Sprawdzamy czy pokój nie jest pełny
        if (room.status !== 'waiting') {
            return res.status(400).json({ message: 'Gra już się toczy lub zakończyła' });
        }
        // Sprawdzamy czy host nie próbuje dołączyć do samego siebie 
        if (room.host.toString() === userId) {
            return res.status(400).json({ message: 'Jesteś gospodarzem tego pokoju' });
        }
        room.opponent = userId;
        room.status = 'playing';
        await room.save();

        const io = req.app.get('io');
        io.to(roomId).emit('gameStarted', { message: 'Przeciwnik dołączył!' });
        io.emit('updateRoomList'); 

        res.json({ message: 'Dołączono do gry', roomId: room._id });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Błąd serwera' });
    }
});

module.exports = router;
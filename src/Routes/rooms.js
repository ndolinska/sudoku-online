const express = require('express');
const router = express.Router();
const Room = require('../models/Room');
const auth = require('../middleware/auth');
const { getSudoku } = require('sudoku-gen');
// Post /rooms/ | tworzymy nowy pokój
router.post('/', auth, async (req, res) => {
    try {
        const { difficulty } = req.body;
        const sudoku = getSudoku(difficulty || 'medium');

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

module.exports = router;
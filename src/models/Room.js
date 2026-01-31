const mongoose = require('mongoose');

const RoomSchema = new mongoose.Schema({
    host: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    opponent: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    status: {
        type: String,
        enum: ['waiting', 'playing', 'finished'],
        default: 'waiting'
    },
    board: {
        type: String,
        required: true
    },
    solution: {
        type: String,
        required: true
    },
    difficulty: {
        type: String,
        enum: ['easy', 'medium', 'hard', 'expert'],
        default: 'easy'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    scores: {
        host: { type: Number, default: 0 },
        opponent: { type: Number, default: 0 }
    },
    winner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
});

module.exports = mongoose.model('Room', RoomSchema);
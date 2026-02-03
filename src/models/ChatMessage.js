const mongoose = require('mongoose');

const ChatMessageSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['chat', 'system'], // Rozróżniamy zwykłe wiadomości od systemowych
        default: 'chat'
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 3600 
    }
});

module.exports = mongoose.model('ChatMessage', ChatMessageSchema);
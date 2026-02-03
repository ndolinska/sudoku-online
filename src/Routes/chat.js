const express = require('express');
const router = express.Router();
const ChatMessage = require('../models/ChatMessage');
const auth = require('../middleware/auth');
const { broadcastMessage } = require('../mqttHandler');

// CREATE - Wyślij wiadomość (POST)
router.post('/', auth, async (req, res) => {
    try {
        const { message } = req.body;
        /// Zapisz w bazie
        const newMsg = await ChatMessage.create({
            username: req.user.username, // Z tokena JWT
            message: message,
            type: 'chat'
        });

        // Wyślij powiadomienie MQTT do wszystkich
        broadcastMessage('sudoku/chat/new', {
            _id: newMsg._id,
            username: newMsg.username,
            message: newMsg.message,
            type: 'chat'
        });

        res.status(201).json(newMsg);
    } catch (err) {
        res.status(500).json({ error: 'Błąd wysyłania wiadomości' });
    }
});

// READ - Pobierz historię
router.get('/history', auth, async (req, res) => {
    try {
        const messages = await ChatMessage.find().sort({ createdAt: -1 }).limit(50);
        res.json(messages.reverse());
    } catch (err) {
        res.status(500).json({ error: 'Błąd pobierania historii' });
    }
});

// UPDATE - Edytuj wiadomość (PATCH)
router.patch('/:id', auth, async (req, res) => {
    try {
        const { message } = req.body;
        const msgId = req.params.id;

        // Znajdź wiadomość i sprawdź czy należy do użytkownika
        const msg = await ChatMessage.findById(msgId);
        if (!msg) return res.status(404).json({ error: 'Wiadomość nie istnieje' });
        
        if (msg.username !== req.user.username) {
            return res.status(403).json({ error: 'Nie możesz edytować cudzych wiadomości' });
        }

        // Aktualizacja w bazie
        msg.message = message;
        await msg.save();

        // Powiadomienie MQTT o edycji
        broadcastMessage('sudoku/chat/update', {
            _id: msg._id,
            newMessage: message
        });

        res.json(msg);
    } catch (err) {
        res.status(500).json({ error: 'Błąd edycji' });
    }
});

// DELETE - Usuń wiadomość (DELETE)
router.delete('/:id', auth, async (req, res) => {
    try {
        const msgId = req.params.id;
        
        const msg = await ChatMessage.findById(msgId);
        if (!msg) return res.status(404).json({ error: 'Wiadomość nie istnieje' });

        if (msg.username !== req.user.username) {
            return res.status(403).json({ error: 'Nie możesz usuwać cudzych wiadomości' });
        }

        await ChatMessage.findByIdAndDelete(msgId);

        // Powiadomienie MQTT o usunięciu
        broadcastMessage('sudoku/chat/delete', {
            _id: msgId
        });

        res.json({ message: 'Usunięto' });
    } catch (err) {
        res.status(500).json({ error: 'Błąd usuwania' });
    }
});

module.exports = router;
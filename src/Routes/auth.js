const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcrypt');

// POST /api/auth/register | rejestracja nowego użytkownika
router.post('/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        let user = await User.findOne({ username });
        if (user) {
            return res.status(400).json({ message: 'Taki użytkownik już istnieje' });
        }
        // bcrypt do hasła
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        user = new User({
            username,
            password: hashedPassword
        });

        await user.save();
        res.status(201).json({ message: 'Użytkownik zarejestrowany pomyślnie' });

    } catch (err) {
        res.status(500).json({ error: 'Błąd serwera' });
    }
});

module.exports = router;
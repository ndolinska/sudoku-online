const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const auth = require('../middleware/auth');

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
// POST /api/auth/login | logowanie 
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        const user = await User.findOne({ username });

        if (!user) {
            return res.status(400).json({ message: 'Nieprawidłowy login lub hasło' });
        };

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Nieprawidłowy login lub hasło' });
        };

        // Token JWT
        const token = jwt.sign(
            { userId: user._id, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: '1h' } 
        );
        // Zapisujemy token do cookie
        res.cookie('token', token, {
            httpOnly: true, 
            secure: false,  
            maxAge: 3600000 // dla testów 1 godzina
        });

        res.status(200).json({ 
            message: 'Zalogowano pomyślnie',
            user: { username: user.username } 
        });

    } catch {
        res.status(500).json({ error: 'Błąd serwera' });
    }
});
// POST /api/auth/logout | wylogowanie 
router.post('/logout', (req, res) => {
    res.clearCookie('token');
    res.status(200).json({ message: 'Wylogowano pomyślnie' });
});

// GET /api/auth/me | dbamy o sesje z tokenem
router.get('/me', auth, async (req, res) => {
    try {
        // req.user pochodzi z naszego middleware
        const user = await User.findById(req.user.userId).select('-password'); // Pobieramy bez hasła
        res.json(user);
    } catch (err) {
        res.status(500).send('Błąd serwera');
    }
});

module.exports = router;
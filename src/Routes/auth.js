const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Room = require('../models/Room');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const auth = require('../middleware/auth');

// POST /auth/register | rejestracja nowego użytkownika
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

    } catch {
        res.status(500).json({ error: 'Błąd serwera' });
    }
});
// POST /auth/login | logowanie 
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
        console.error(err);
        res.status(500).json({ error: 'Błąd serwera' });
    }
});
// POST /auth/logout | wylogowanie 
router.post('/logout', (req, res) => {
    res.clearCookie('token');
    res.status(200).json({ message: 'Wylogowano pomyślnie' });
});

// GET /auth/me | dbamy o sesje z tokenem
router.get('/me', auth, async (req, res) => {
    try {
        // req.user pochodzi z naszego middleware
        const user = await User.findById(req.user.userId).select('-password'); // Pobieramy bez hasła
        res.json(user);
    } catch {
        console.error(err);
        res.status(500).send('Błąd serwera');
    }
});

// PATCH /auth/me | Aktualizacja danych użytkownika (UPDATE)
router.patch('/me', auth, async (req, res) => {
    try {
        const { username, password } = req.body;
        const userId = req.user.userId;

        // Znajdź użytkownika
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'Użytkownik nie znaleziony' });
        }

        // Jeśli użytkownik chce zmienić nazwę
        if (username && username !== user.username) {
            // Sprawdź czy nowa nazwa nie jest zajęta
            const existingUser = await User.findOne({ username });
            if (existingUser) {
                return res.status(400).json({ message: 'Ta nazwa użytkownika jest już zajęta' });
            }
            user.username = username;
        }

        //  Jeśli użytkownik chce zmienić hasło
        if (password) {
            if (password.length < 6) {
                return res.status(400).json({ message: 'Hasło musi mieć min. 6 znaków' });
            }
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(password, salt);
        }

        await user.save();

        res.json({ 
            message: 'Dane zaktualizowane pomyślnie', 
            user: { username: user.username, totalPoints: user.totalPoints } 
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Błąd serwera podczas aktualizacji' });
    }
});

// DELETE /auth/me | Usuwanie konta (DELETE)
router.delete('/me', auth, async (req, res) => {
    try {
        const userId = req.user.userId;

        // Usuń użytkownika
        const deletedUser = await User.findByIdAndDelete(userId);
        if (!deletedUser) {
            return res.status(404).json({ message: 'Użytkownik nie znaleziony' });
        }
        //  Usuń pokoje, które ten użytkownik stworzył (jako host) żeby nie wisiały "puste" pokoje w lobby
        await Room.deleteMany({ host: userId });

       // Czyścimy ciasteczko sesyjne
        res.clearCookie('token');

        res.json({ message: 'Konto zostało usunięte' });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Błąd serwera podczas usuwania konta' });
    }
});

module.exports = router;
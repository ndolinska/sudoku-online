require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');


const authRoutes = require('./src/Routes/auth')

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use('/api/auth', authRoutes);

app.get('/', (req, res) => {
    res.status(200).json({
        status: 'online',
        timestamp: new Date().toISOString(),
        message: 'Serwer Sudoku Battle działa!'
    });
});

app.use((req, res) => {
    res.status(404).json({ error: 'Nie znaleziono takiej ścieżki' });
});

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Połączono z MongoDB w Dockerze');
    } catch (err) {
        console.error('Błąd połączenia z bazą:', err.message);
        process.exit(1); 
    }
};
connectDB();
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Serwer wystartował poprawnie. Adres: http://localhost:${PORT}`);
});
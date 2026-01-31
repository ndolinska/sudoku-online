require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

const authRoutes = require('./src/routes/auth');
const roomRoutes = require('./src/routes/rooms');

const socketHandler = require('./src/socket');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(cookieParser());
app.use('/auth', authRoutes);
app.use('/rooms', roomRoutes)
app.use(express.static(path.join(__dirname, 'public')));


app.get('/', (req, res) => {
    res.status(200).json({
        status: 'online',
        timestamp: new Date().toISOString(),
        message: 'Serwer Sudoku Battle działa!'
    });
});
app.set('io', io);
socketHandler(io);
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
server.listen(PORT, () => {
    console.log(`Serwer wystartował poprawnie. Adres: http://localhost:${PORT}`);
});
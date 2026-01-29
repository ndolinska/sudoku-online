const express = require('express');

const app = express();

app.use(express.json());

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

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Serwer wystartował poprawnie. Adres: http://localhost:${PORT}`);
});
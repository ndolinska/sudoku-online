const Room = require('./models/Room');
const User = require('./models/User');

const DIFFICULTY_MULTIPLIERS = {
    'easy': 1,
    'medium': 1.5,
    'hard': 2,
    'expert': 3
};


module.exports = (io) => {
    io.on('connection', (socket) => {
         // Dołączanie do pokoju
        socket.on('joinGameRoom', ({roomId, userId}) => {
            socket.join(roomId);
            socket.activeRoom = roomId;
            socket.activeUser = userId;
            console.log(`Socket ${socket.id} dołączył do pokoju: ${roomId}`);
        });

        // Nowy pokój
        socket.on('newRoomCreated', (data) => {
            socket.broadcast.emit('updateRoomList', data);
        });
        // Logika ruchów gry
        socket.on('makeMove', async ({ roomId, userId, index, value }) => {
            try {
                const room = await Room.findById(roomId);
                // Walidacje czy gra trwa i czy gracz należy do pokoju
                if (!room || room.status !== 'playing') return;
                
                // Sprawdzenie czy użytkownik należy do pokoju
                const isHost = room.host.toString() === userId;
                const isOpponent = room.opponent && room.opponent.toString() === userId;
                if (!isHost && !isOpponent) return;

                const correctValue = room.solution[index];

                if (value === correctValue) {
                    // --- RUCH POPRAWNY ---
                    const points = 10;
                    if (isHost) room.scores.host += points;
                    else room.scores.opponent += points;

                    // Aktualizacja planszy
                    const newBoard = room.board.substring(0, index) + value + room.board.substring(index + 1);
                    room.board = newBoard;

                    // Sprawdzenie wygranej
                    if (!newBoard.includes('-')) {
                        room.status = 'finished';
                        
                        // Obliczanie punktów końcowych z mnożnikiem
                        const multiplier = DIFFICULTY_MULTIPLIERS[room.difficulty] || 1;
                        const hostFinal = Math.round(room.scores.host * multiplier);
                        const oppFinal = Math.round(room.scores.opponent * multiplier);

                        // Zapis do bazy User
                        await User.findByIdAndUpdate(room.host, { $inc: { totalPoints: hostFinal } });
                        await User.findByIdAndUpdate(room.opponent, { $inc: { totalPoints: oppFinal } });

                        // Zwycięzca
                        let winnerName = "Remis";
                        if (room.scores.host > room.scores.opponent) winnerName = "Host";
                        else if (room.scores.opponent > room.scores.host) winnerName = "Dołączający";

                        await room.save();

                        await room.save();
                        
                        io.to(roomId).emit('gameOver', { 
                            winner: winnerName,
                            hostScore: room.scores.host,
                            opponentScore: room.scores.opponent,
                            hostTotalAdded: hostFinal,
                            oppTotalAdded: oppFinal
                        });
                    } else {
                        await room.save();
                        io.to(roomId).emit('updateBoard', { index, value, scores: room.scores });
                    }
                } else {
                    // --- RUCH BŁĘDNY ---
                    const penalty = 20;
                    if (isHost) room.scores.host -= penalty;
                    else room.scores.opponent -= penalty;
                    
                    await room.save();
                    socket.emit('wrongMove', { index });
                    io.to(roomId).emit('updateScores', room.scores);
                }
            } catch (err) {
                console.error('Błąd przy ruchu:', err);
            }
            
        });
        socket.on('disconnect', async () => {
            if (!socket.activeRoom || !socket.activeUser) return;
            try {
                const room = await Room.findById(socket.activeRoom);
                if (!room) return;

                // SCENARIUSZ 1: Gra w lobby (waiting)
                if (room.status === 'waiting') {
                    // Jeśli wyszedł Host -> usuwamy pokój
                    if (room.host.toString() === socket.activeUser) {
                        await Room.findByIdAndDelete(socket.activeRoom);
                        io.emit('updateRoomList'); // Odświeżamy listę w lobby
                    }
                }
                // SCENARIUSZ 2: Gra w trakcie (playing)
                else if (room.status === 'playing') {
                    // Kończymy grę
                    room.status = 'finished';
                    await room.save();
                    // Informujemy drugiego gracza
                    io.to(socket.activeRoom).emit('opponentLeft');
                }

            } catch (err) {
                console.error('Błąd przy rozłączaniu:', err);
            }
        });
    });
};
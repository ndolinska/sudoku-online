document.addEventListener('DOMContentLoaded', async () => {
    const socket = io();
    const gridElement = document.getElementById('sudoku-grid');
    const overlay = document.getElementById('waiting-overlay');
    const cancelBtn = document.getElementById('cancel-room-btn')
    const urlParams = new URLSearchParams(window.location.search); 
    const roomId = urlParams.get('id');
    let currentUserId = null;

    const hostName = document.getElementById('host-name');
    const oppName = document.getElementById('opponent-name');

    const userRes = await fetch('/auth/me');
    if(userRes.ok) {
    const userData = await userRes.json();
    currentUserId = userData._id;
    }

    if (!roomId) {
        alert('Brak ID pokoju!');
        window.location.href = 'lobby.html';
        return;
    }
    cancelBtn.addEventListener('click', async () => {
        if (!confirm("Czy na pewno chcesz usunąć ten pokój?")) return;

        try {
            const res = await fetch(`/rooms/${roomId}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                window.location.href = 'lobby.html';
            } else {
                const data = await res.json();
                alert(data.message || "Błąd podczas usuwania pokoju");
            }
        } catch (err) {
            console.error(err);
            alert("Błąd połączenia z serwerem");
        }
    });
    socket.emit('joinGameRoom', { roomId, userId: currentUserId });
    const loadGameState = async () => {
        try {
            const response = await fetch(`/rooms/${roomId}`);
            if (response.status === 404) {
                alert('Ten pokój już nie istnieje.');
                window.location.href = 'lobby.html';
                return;
            }
            if (!response.ok) throw new Error('Błąd pobierania danych pokoju');
            const roomData = await response.json();

            // Ustawiamy nazwy
            hostName.innerText = roomData.host.username;
            if (roomData.opponent) {
                oppName.innerText = roomData.opponent.username;
            } else {
                oppName.innerText = "???";
            }
            if (roomData.status === 'waiting') {
                overlay.classList.add('active');
                gridElement.innerHTML = ''; 
            } else {
                overlay.classList.remove('active'); 
                renderBoard(roomData.board); 

        }} catch (err) {
            console.error(err);
            window.location.href = 'lobby.html';
        }
    };
    const renderBoard = (boardString) => {
        gridElement.innerHTML = '';
        for (let i = 0; i < 81; i++) {
            const char = boardString[i];
            let cell;

            if (char === '-') {
                // Puste pole -> Input
                cell = document.createElement('input');
                cell.type = 'text'; 
                cell.maxLength = 1;
                cell.dataset.index = i; // Zapisujemy indeks (0-80) w atrybucie
                cell.classList.add('cell');
                
                // Obsługa wpisywania
                cell.addEventListener('input', (e) => {
                    const val = e.target.value;
                    // Jeśli wpisano cyfrę 1-9
                    if (/^[1-9]$/.test(val)) {
                        // Wyślij ruch do serwera
                        socket.emit('makeMove', { 
                            roomId, 
                            userId: currentUserId,
                            index: i, 
                            value: val 
                        });
                        // Zablokuj input na chwilę (żeby nie wpisywać dalej przed weryfikacją)
                        e.target.disabled = true; 
                    } else {
                        e.target.value = ''; // Wyczyść śmieci
                    }
                });

            } else {
                cell = document.createElement('div');
                cell.innerText = char;
                cell.classList.add('cell', 'fixed');
            }
            gridElement.appendChild(cell);
        }
    };
    const updateScoreUI = (scores) => {
    document.getElementById('host-score').innerText = scores.host;
    document.getElementById('opponent-score').innerText = scores.opponent};

    socket.on('updateBoard', ({ index, value, scores }) => {
        const cell = document.querySelector(`.cell[data-index='${index}']`);
        
        if (cell) {
            const newDiv = document.createElement('div');
            newDiv.innerText = value;
            newDiv.classList.add('cell', 'fixed');
            newDiv.style.color = '#28a745';
            newDiv.style.fontWeight = 'bold';
            cell.replaceWith(newDiv);
        }
        if (scores) updateScoreUI(scores);
    });
    socket.on('wrongMove', ({ index }) => {
        const cell = document.querySelector(`.cell[data-index='${index}']`);
        if (cell) {
            cell.value = ''; // Wyczyść
            cell.disabled = false; // Odblokuj
            cell.classList.add('error-shake'); // Dodaj animację błędu
            // Usuń klasę błędu po timeoutcie
            setTimeout(() => cell.classList.remove('error-shake'), 500);
        }
    });
    socket.on('updateScores', (scores) => {
    updateScoreUI(scores)});

    socket.on('gameOver', ({ winner }) => {
        alert('KONIEC GRY! Wygrywa: ' + winner);
        window.location.href = 'lobby.html';
    });
    socket.on('gameStarted', () => {
        loadGameState(); 
    });
    socket.on('opponentLeft', () => {
        if (overlay) {
            overlay.innerHTML = `
                <div>
                    <h2 style="color: #dc3545;">Przeciwnik uciekł!</h2>
                    <p>Gra anulowana.</p>
                    <p>Za 3 sekundy wrócisz do lobby...</p>
                </div>
            `;
            overlay.classList.add('active'); // Pokazujemy overlay
        }
        setTimeout(() => {
            window.location.href = 'lobby.html';
        }, 3000);
        });
    loadGameState();
});

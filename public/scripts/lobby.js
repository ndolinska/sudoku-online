document.addEventListener('DOMContentLoaded', async () => {
    const socket = io(); 
    const roomsList = document.getElementById('rooms-list');
    const userDisplay = document.getElementById('user-display');
    const logoutBtn = document.getElementById('logout-btn');
    try {
        const response = await fetch('/auth/me');
        if (!response.ok) {
            // Jeśli token wygasł lub go brak -> wyrzuć do logowania
            window.location.href = 'login.html';
            return;
        }
        const user = await response.json();
        userDisplay.innerText = user.username;
    } catch {
        window.location.href = 'login.html';
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                // Usuwamy ciasteczko
                await fetch('/auth/logout', { method: 'POST' });
                // Wracamy do logowania
                window.location.href = 'login.html';
            } catch (err) {
                console.error('Błąd wylogowania:', err);
            }
        });
    }

    const fetchRooms = async () => {
        try {
            const res = await fetch('/rooms');
            const rooms = await res.json();
            renderRooms(rooms);
        } catch (err) {
            console.error('Błąd pobierania pokoi', err);
        }
    };
    const renderRooms = (rooms) => {
        if (rooms.length === 0) {
            roomsList.innerHTML = '<p style="width:100%; text-align:center; color:#888;">Brak aktywnych pokoi. Stwórz pierwszy!</p>';
            return;
        }
        roomsList.innerHTML = rooms.map(room => {
            const playerCount = room.opponent ? '2/2' : '1/2';
            return `
            <div class="room-card">
                <div class="room-info">
                    <h3>Pokój gracza <strong>${room.host.username}</strong></h3>
                    <p>Trudność: <strong>${room.difficulty}</strong></p>
                </div>
                
                <div class="room-footer">
                    <span class="player-count">${playerCount}</span>
                    <button onclick="joinRoom('${room._id}')" class="btn-join">Dołącz</button>
                </div>
            </div>
        `}).join('');
    };
    logoutBtn.addEventListener('click', async () => {
        await fetch('/auth/logout', { method: 'POST' });
        window.location.href = 'login.html';
    });

    document.getElementById('create-room-btn').addEventListener('click', async () => {
        try{
            const res = await fetch('/rooms', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ difficulty: 'easy' })
            });
            
            if (res.ok) {
                const newRoom = await res.json();
                socket.emit('newRoomCreated', newRoom);
                window.location.href = `game.html?id=${newRoom.roomId}`;
            }}
        catch{
            alert("Nie udało się stworzyć pokoju")
        }
    });

    socket.on('updateRoomList', () => {
        fetchRooms();
    });
    fetchRooms(); 
});
window.joinRoom = async function(roomId) {
    try {
        const response = await fetch(`/rooms/${roomId}/join`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (response.ok) {
            window.location.href = `game.html?id=${roomId}`;
        } else {
            alert(data.message || 'Nie udało się dołączyć.');
            location.reload(); 
        }
    } catch (err) {
        console.error('Błąd:', err);
        alert('Błąd połączenia.');
    }
};
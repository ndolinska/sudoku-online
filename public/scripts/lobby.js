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
            roomsList.innerHTML = 'Brak aktywnych pokoi...';
            return;
        }
        roomsList.innerHTML = rooms.map(room => `
            <div class="room-item" style="border: 1px solid #444; margin: 10px 0; padding: 10px; border-radius: 8px;">
                <span>Pokój gracza: <strong>${room.host.username}</strong> (${room.difficulty})</span>
                <button onclick="joinRoom('${room._id}')" style="width: auto; margin-left: 20px; padding: 5px 15px;">Dołącz</button>
            </div>
        `).join('');
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
                body: JSON.stringify({ difficulty: 'medium' })
            });
            
            if (res.ok) {
                const newRoom = await res.json();
                socket.emit('newRoomCreated', newRoom);
                fetchRooms();
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

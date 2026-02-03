document.addEventListener('DOMContentLoaded', async () => {
    const chatWindow = document.getElementById('chat-window');
    const chatInput = document.getElementById('chat-input');
    const chatSendBtn = document.getElementById('chat-send');
    const statusDiv = document.getElementById('mqtt-status');
    
    if (!chatWindow) return;

    let myUsername = 'Gość';
    try {
        const res = await fetch('/auth/me');
        if (res.ok) {
            const user = await res.json();
            myUsername = user.username;
            console.log('Zalogowany w czacie jako:', myUsername);
        }
    } catch (err) {
        console.error('Błąd weryfikacji użytkownika w czacie:', err);
    }
    // Służy do odbierania zmian 
    const mqttClient = mqtt.connect('ws://localhost:9001');

    mqttClient.on('connect', () => {
        if(statusDiv) statusDiv.innerText = 'Połączono z MQTT';
        // Subskrybujemy 3 zdarzenia
        mqttClient.subscribe('sudoku/chat/new');    // Ktoś napisał
        mqttClient.subscribe('sudoku/chat/update'); // Ktoś edytował
        mqttClient.subscribe('sudoku/chat/delete'); // Ktoś usunął
        mqttClient.subscribe('sudoku/system');
    });

    mqttClient.on('message', (topic, payload) => {
        const data = JSON.parse(payload.toString()); // Teraz dane to JSON

        if (topic === 'sudoku/chat/new') {
            // Jeśli to moja wiadomość, to już ją mam (Optimistic UI), ale dla pewności
            // sprawdzamy czy nie ma duplikatu po ID, jeśli backend szybko odpowiedział
            if (!document.getElementById(`msg-${data._id}`)) {
                appendMessageToUI(data);
                scrollToBottom();
            }
        } 
        else if (topic === 'sudoku/chat/update') {
            // Znajdź wiadomość w DOM i zaktualizuj tekst
            const msgEl = document.getElementById(`msg-${data._id}`);
            if (msgEl) {
                const contentSpan = msgEl.querySelector('.msg-content');
                if(contentSpan) contentSpan.innerText = data.newMessage;
            }
        }
        else if (topic === 'sudoku/chat/delete') {
            // Znajdź wiadomość i usuń z DOM
            const msgEl = document.getElementById(`msg-${data._id}`);
            if (msgEl) msgEl.remove();
        }
        else if (topic === 'sudoku/system') {
            const systemMsg = data.message || JSON.stringify(data); 
            appendMessageToUI({
                username: 'SYSTEM',
                message: systemMsg,
                type: 'system',
                _id: 'sys-' + Date.now() // Generujemy sztuczne ID
            });
        }
    });

    // Pobieranie historii
    const loadHistory = async () => {
        try {
            const res = await fetch('/chat/history');
            if (!res.ok) return;
            const messages = await res.json();
            chatWindow.innerHTML = ''; // Wyczyść
            messages.forEach(msg => appendMessageToUI(msg));
            scrollToBottom();
        } catch (err) { console.error(err); }
    };

    //  Renderowanie wiadomości
    const appendMessageToUI = (msg) => {
        const div = document.createElement('div');
        div.id = `msg-${msg._id}`;
        div.style.marginBottom = '8px';
        div.style.padding = '5px';
        div.style.background = '#fff';
        div.style.borderBottom = '1px solid #eee';
        div.style.overflow = 'hidden';

        const isMine = msg.username === myUsername;

        let buttonsHtml = '';
        if (isMine && msg.type !== 'system') {
            buttonsHtml = `
                <span style="float: right; display:flex; font-size: 0.8rem;">
                    <button class="edit-btn" data-id="${msg._id}" style="cursor:pointer; border:none; background:none; color:blue;">Edytuj</button>
                    <button class="delete-btn" data-id="${msg._id}" style="cursor:pointer; border:none; background:none; color:red;">Usun</button>
                </span>
            `;
        }

        div.innerHTML = `
            ${buttonsHtml}
            <strong>${msg.username}:</strong> 
            <span class="msg-content">${msg.message}</span>
        `;
        
        chatWindow.appendChild(div);

        // Event Listenery dla przycisków
        if (isMine) {
            const editBtn = div.querySelector('.edit-btn');
            const delBtn = div.querySelector('.delete-btn');
            
            if(editBtn) editBtn.addEventListener('click', () => handleEdit(msg._id, msg.message));
            if(delBtn) delBtn.addEventListener('click', () => handleDelete(msg._id));
        }
    };

    // Obsługa akcji użytkownika (Wysyłanie - POST)
    const sendMessage = async () => {
        const text = chatInput.value.trim();
        if (!text) return;

        chatInput.value = ''; // Czyścimy od razu

        try {
            await fetch('/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text })
            });
        } catch (err) { console.error(err); }
    };

    // Obsługa Edycji (PATCH)
    const handleEdit = async (id, oldText) => {
        const newText = prompt("Edytuj wiadomość:", oldText);
        if (newText && newText !== oldText) {
            await fetch(`/chat/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: newText })
            });
        }
    };

    // Obsługa Usuwania (DELETE)
    const handleDelete = async (id) => {
        if (confirm("Usunąć wiadomość?")) {
            await fetch(`/chat/${id}`, { method: 'DELETE' });
        }
    };
    const scrollToBottom = () => { chatWindow.scrollTop = chatWindow.scrollHeight; };

    if(chatSendBtn) chatSendBtn.addEventListener('click', sendMessage);
    if(chatInput) chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });

    loadHistory();
});
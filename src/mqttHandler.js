const mqtt = require('mqtt');
const ChatMessage = require('./models/ChatMessage');

let mqttClient = null;

const mqttHandler = () => {
    mqttClient = mqtt.connect(`mqtt://localhost:1883`);

    mqttClient.on('connect', () => {
        console.log('Serwis MQTT (Backend) podłączony');
        // Backend nasłuchuje systemowych rzeczy, 
        // bo chat jest obsługiwany przez REST API -> MQTT
        mqttClient.subscribe('sudoku/system');
        // A także możliwość wysyłania wiadomości na chat z klienta
        mqttClient.subscribe('sudoku/chat/external');
    });

    mqttClient.on('message', async (topic, message) => {
        if (topic === 'sudoku/chat/external') {
            try {
                const msgString = message.toString();
                let data;
                try {
                    data = JSON.parse(msgString);
                } catch {
                    data = { username: 'Admin', message: msgString };
                }

                // Zapisz w bazie (żeby była w historii)
                const newMsg = await ChatMessage.create({
                    username: data.username || 'Admin',
                    message: data.message || 'Pusta wiadomość',
                    type: 'chat'
                });

                // Rozgłoś to do wszystkich na stronie (żeby zobaczyli)
                // Używamy tego samego tematu, co REST API ('sudoku/chat/new')
                broadcastMessage('sudoku/chat/new', {
                    _id: newMsg._id,
                    username: newMsg.username,
                    message: newMsg.message,
                    type: 'chat'
                });
            } catch (err) {
                console.error('Błąd przetwarzania wiadomości przychodzącej MQTT:', err);
            }
        }
    });
    return mqttClient;
};

// Funkcja pomocnicza do wysyłania powiadomień z innych plików (np. z routera)
const broadcastMessage = (topic, data) => {
    if (mqttClient && mqttClient.connected) {
        // Wysyłamy dane jako JSON string
        mqttClient.publish(topic, JSON.stringify(data));
    }
};

module.exports = { mqttHandler, broadcastMessage };
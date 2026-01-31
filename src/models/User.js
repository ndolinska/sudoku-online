const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, 'Nazwa użytkownika jest wymagana'],
        unique: true,
        trim: true,
        minlength: 3
    },
    password: {
        type: String,
        required: [true, 'Hasło jest wymagane'],
        minlength: 6
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    totalPoints: { type: Number, default: 0 }
});

module.exports = mongoose.model('User', UserSchema);
const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
    const token = req.cookies.token;
    if (!token) {
        return res.status(401).json({ message: 'Brak autoryzacji, zaloguj się.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();         //Przejdź dalej (do właściwej trasy)
    } catch (err) {
        res.status(401).json({ message: 'Token jest nieprawidłowy lub wygasł.' });
    }
};

module.exports = auth;
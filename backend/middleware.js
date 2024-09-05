const jwt = require('jsonwebtoken')

require('dotenv').config();

const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ 
            message: 'Not authorized to access this route' 
        });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (decoded.userId) {
            req.userId = decoded.userId;
            next();
        } else {
            return res.status(401).json({
                message: 'Not authorized to access this route'
            })
        }
    } catch (error) {
        return res.status(401).json({
            message: 'Not authorized to access this route'
        })
    }
};

module.exports = { 
    authMiddleware
}
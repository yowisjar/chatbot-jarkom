const jwt = require('jsonwebtoken');
const USER_ROLE = require('../constants/roles');

const requireAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token tidak ditemukan, akses ditolak' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.role !== USER_ROLE.ADMIN) {
      return res.status(403).json({ message: 'Akses ditolak, butuh hak akses admin' });
    }

    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token tidak valid atau sudah kadaluarsa' });
  }
};

module.exports = requireAdmin;

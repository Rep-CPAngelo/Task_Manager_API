const { verifyAccessToken } = require('../utils/auth');

const auth = (req, res, next) => {
  // Get token from header (support x-auth-token and Authorization: Bearer)
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  const bearerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const token = req.header('x-auth-token') || bearerToken;

  // Check if no token
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'No token, authorization denied'
    });
  }

  try {
    // Verify token
    const decoded = verifyAccessToken(token);
    req.user = decoded.user;
    next();
  } catch (err) {
    res.status(401).json({
      success: false,
      message: 'Token is not valid'
    });
  }
};

module.exports = auth;

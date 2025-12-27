// Simple authentication middleware
// This is a basic implementation - in production, use a proper JWT system

export const authMiddleware = (req, res, next) => {
  // Get token from header
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  // Check if no token
  if (!token) {
    return res.status(401).json({ error: 'No token, authorization denied' });
  }

  try {
    // In a real implementation, you would verify the token
    // For now, we'll just check if it exists in our simple demo
    if (token === 'demo-token') {
      next();
    } else {
      res.status(401).json({ error: 'Token is not valid' });
    }
  } catch (err) {
    console.error('Token error:', err);
    res.status(401).json({ error: 'Token is not valid' });
  }
};

// Optional middleware for routes that can work with or without auth
export const optionalAuthMiddleware = (req, res, next) => {
  // Get token from header
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  // If token exists, validate it (simplified)
  if (token) {
    try {
      // In a real implementation, you would verify the token
      if (token === 'demo-token') {
        req.isAuthenticated = true;
      }
    } catch (err) {
      console.error('Token error in optional auth:', err);
    }
  }
  
  next();
};

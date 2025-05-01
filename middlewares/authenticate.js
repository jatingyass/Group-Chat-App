// middlewares/authenticate.js

const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const { User, GroupMember } = require('../models');

dotenv.config();

const authenticate = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      return res.status(401).json({ success: false, message: 'Authorization token missing' });
    }

    const token = authHeader.split(' ')[1]; // Bearer <token>
    if (!token) {
      return res.status(401).json({ success: false, message: 'Token missing' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find user from database
    const user = await User.findByPk(decoded.id);
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    
    req.user = {
      id: user.id,
      name: user.name,
      
    };

    next(); 
  } catch (err) {
    console.error("Authentication error:", err);
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};


const isGroupAdmin = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    const admin = await GroupMember.findOne({
      where: {
        groupId,
        userId,
        is_admin: true
      }
    });

    if (!admin) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    next();
  } catch (err) {
    console.error("Admin check error:", err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {authenticate, isGroupAdmin};




// controllers/messageController.js

const { GroupMember, Message } = require('../models');
const { Op } = require('sequelize');

exports.sendMessage = async (req, res) => {
  try {
    const { groupId, message } = req.body;
    const userId = req.user.id;
    const userName = req.user.name; 

    if (!groupId || !message) {
      return res.status(400).json({ success: false, message: 'Group ID and message are required' });
    }

    const newMessage = await Message.create({
      userId,
      userName,
      groupId,
      message,
    });

    res.status(201).json({ success: true, message: 'Message sent successfully', data: newMessage });
  } catch (err) {
    console.error("Error sending message:", err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.getGroupMessages = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    // Check if user is a member of the group
    const isMember = await GroupMember.findOne({ where: { groupId, userId } });
    if (!isMember) {
      return res.status(403).json({ success: false, message: 'You are not a member of this group' });
    }

    const messages = await Message.findAll({
      where: { groupId },
      order: [['createdAt', 'ASC']],
      // limit: 20,
    });

    res.status(200).json({ success: true, data: messages });
  } catch (err) {
    console.error("Error fetching group messages:", err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

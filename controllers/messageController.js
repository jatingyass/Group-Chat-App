
//-----------------------------------------------------------

const { Op } = require('sequelize');

const { Message, User } = require('../models');

exports.sendMessage = async (req, res) => {
  try {
    const { userId, message } = req.body;
    if (!userId || !message) {
      return res.status(400).json({ success: false, message: 'User ID and message are required' });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const newMessage = await Message.create({
      userId: user.id,
      userName: user.name,
      message,
    });

    res.status(201).json({ success: true, message: 'Message sent successfully', data: newMessage });
  } catch (err) {
    console.error("Error sending message:", err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.getAllMessages = async (req, res) => {
  try {
    const lastMessageId = parseInt(req.query.lastmessageid) || -1;

    let allMessages;
    if (lastMessageId === -1) {
      allMessages = await Message.findAll({
        order: [['createdAt', 'ASC']],
        limit: 10
      });
    } else {
      allMessages = await Message.findAll({
        where: { id: { [Op.gt]: lastMessageId } },
        order: [['createdAt', 'ASC']]
      });
    }

    res.status(200).json({ success: true, data: allMessages });
  } catch (err) {
    console.error("Error fetching messages:", err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

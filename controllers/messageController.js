// const { Message } = require('../models');

// exports.sendMessage = async (req, res) => {
//     try{
//         const { userId, message } = req.body;
//         if (!userId || !message) {
//             return res.status(400).json({ success: false, message: 'User ID and message are required' });
//         }

//         const newMessage = await Message.create({ userId, message });
//         res.status(201).json({ success: true, message: 'Message sent successfully', data: newMessage });
//     }
//     catch(err){
//         console.error("Error sending message:", err);
//         res.status(500).json({ success: false, message: 'Internal server error' });
//     }
// };


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
      userName: user.name,  // 🆕 Save userName too
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
    const allMessages = await Message.findAll({ order: [['createdAt', 'ASC']] });
    res.status(200).json({ success: true, data: allMessages });
  } catch (err) {
    console.error("Error fetching messages:", err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

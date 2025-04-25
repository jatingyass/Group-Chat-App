const { Message } = require('../models');

exports.sendMessage = async (req, res) => {
    try{
        const { userId, message } = req.body;
        if (!userId || !message) {
            return res.status(400).json({ success: false, message: 'User ID and message are required' });
        }

        const newMessage = await Message.create({ userId, message });
        res.status(201).json({ success: true, message: 'Message sent successfully', data: newMessage });
    }
    catch(err){
        console.error("Error sending message:", err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
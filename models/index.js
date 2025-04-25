const Sequelize = require('sequelize');
const sequelize = require('../config/db');


const UserModel = require('./User');
const MessageModel = require('./Message');





const User = UserModel(sequelize, Sequelize.DataTypes);
const Message = MessageModel(sequelize, Sequelize.DataTypes);

// Define associations 
User.hasMany(Message, { 
    foreignKey: 'userId',
     onDelete: 'CASCADE', 
    as: 'messages' 
});

Message.belongsTo(User, { 
    foreignKey: 'userId',
});


module.exports = {
    sequelize,
    User,
    Message
};
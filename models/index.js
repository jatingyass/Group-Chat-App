// const Sequelize = require('sequelize');
// const sequelize = require('../config/db');


// const UserModel = require('./User');
// const MessageModel = require('./Message');





// const User = UserModel(sequelize, Sequelize.DataTypes);
// const Message = MessageModel(sequelize, Sequelize.DataTypes);

// // Define associations 
// User.hasMany(Message, { 
//     foreignKey: 'userId',
//      onDelete: 'CASCADE', 
//     as: 'messages' 
// });

// Message.belongsTo(User, { 
//     foreignKey: 'userId',
// });

// User.belongsToMany(Group, { through: 'GroupMember', foreignKey: 'userId' });
// Group.belongsToMany(User, { through: 'GroupMember', foreignKey: 'groupId' });

// Group.hasMany(Message, { foreignKey: 'groupId' });
// Message.belongsTo(Group, { foreignKey: 'groupId' });

// User.hasMany(Message, { foreignKey: 'userId' });
// Message.belongsTo(User, { foreignKey: 'userId' });


// module.exports = {
//     sequelize,
//     User,
//     Message
// };




const Sequelize = require('sequelize');
const sequelize = require('../config/db');

// Import all models
const UserModel = require('./User');
const MessageModel = require('./Message');
const GroupModel = require('./Group');
const GroupMemberModel = require('./GroupMember');

// Initialize models
const User = UserModel(sequelize, Sequelize.DataTypes);
const Message = MessageModel(sequelize, Sequelize.DataTypes);
const Group = GroupModel(sequelize, Sequelize.DataTypes);
const GroupMember = GroupMemberModel(sequelize, Sequelize.DataTypes);

// Define associations
User.hasMany(Message, { 
    foreignKey: 'userId', 
    onDelete: 'CASCADE', 
    as: 'messages' 
});
Message.belongsTo(User, { 
    foreignKey: 'userId',
});

User.belongsToMany(Group, { through: GroupMember, foreignKey: 'userId' });
Group.belongsToMany(User, { through: GroupMember, foreignKey: 'groupId' });

Group.hasMany(GroupMember, { foreignKey: 'groupId' });
GroupMember.belongsTo(Group, { foreignKey: 'groupId' });

Group.hasMany(Message, { foreignKey: 'groupId' });
Message.belongsTo(Group, { foreignKey: 'groupId' });

// Export all models
module.exports = {
    sequelize,
    User,
    Message,
    Group,
    GroupMember
};

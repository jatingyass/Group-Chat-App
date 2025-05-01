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

// Associations for messages
User.hasMany(Message, { foreignKey: 'userId', onDelete: 'CASCADE', as: 'messages' });
Message.belongsTo(User, { foreignKey: 'userId' });

Group.hasMany(Message, { foreignKey: 'groupId' });
Message.belongsTo(Group, { foreignKey: 'groupId' });

// Many-to-many through GroupMember
User.belongsToMany(Group, { through: GroupMember, foreignKey: 'userId' });
Group.belongsToMany(User, { through: GroupMember, foreignKey: 'groupId' });

// One-to-many for group membership
Group.hasMany(GroupMember, { foreignKey: 'groupId' });
GroupMember.belongsTo(Group, { foreignKey: 'groupId' });

User.hasMany(GroupMember, { foreignKey: 'userId' });
GroupMember.belongsTo(User, { foreignKey: 'userId' });

// Important: Who added whom (for admin logic)
User.hasMany(GroupMember, { foreignKey: 'added_by', as: 'AddedMembers' });
GroupMember.belongsTo(User, { foreignKey: 'added_by', as: 'AddedBy' });

// Export all models
module.exports = {
    sequelize,
    User,
    Message,
    Group,
    GroupMember
};

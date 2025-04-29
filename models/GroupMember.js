module.exports = (sequelize, DataTypes) => {
  const GroupMember = sequelize.define('GroupMember', {
    id: { 
      type: DataTypes.INTEGER, 
      primaryKey: true, 
      autoIncrement: true 
    },
    groupId: { 
      type: DataTypes.INTEGER, 
      allowNull: false 
    },
    userId: { 
      type: DataTypes.INTEGER,
       allowNull: false 
      },
  }, {
    timestamps: true,
  });

  return GroupMember;
};

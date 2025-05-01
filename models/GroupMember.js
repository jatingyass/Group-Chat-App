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
      is_admin: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      added_by: {
        type: DataTypes.INTEGER,
        REFERENCES: {
          model: 'Users',
          key: 'id',
        },
      },
  }, {
    timestamps: true,
  });

  return GroupMember;
};

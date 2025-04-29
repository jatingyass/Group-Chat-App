module.exports = (sequelize, DataTypes) => {
  const Group = sequelize.define('Group', {
    id: { 
      type: DataTypes.INTEGER, primaryKey: true,
      autoIncrement: true 
    },
    name: { 
      type: DataTypes.STRING, 
      allowNull: false 
    },
    createdBy: { 
      type: DataTypes.INTEGER, 
      allowNull: false 
    },
  }, {
    timestamps: true,
  });

  return Group;
};

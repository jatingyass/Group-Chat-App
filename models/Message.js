module.exports = (sequelize, DataTypes) => {
  const Message = sequelize.define(
    'Message',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      userName: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      groupId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      message: {
        type: DataTypes.STRING(2000),
        allowNull: false,
      },
      // Attachment fields — populated only when the user sends a file
      fileUrl: {
        type: DataTypes.STRING(1000),
        allowNull: true,
      },
      fileName: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      fileMimeType: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      fileSize: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: true,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      timestamps: false,
      indexes: [
        { fields: ['groupId', 'createdAt'] },
        { fields: ['userId'] },
      ],
    },
  );

  return Message;
};

module.exports = (sequelize, DataTypes) => {
    const Message = sequelize.define("Message", {
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
            type: DataTypes.STRING,
            allowNull: false,
        },
        createdAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
    }, {
        timestamps: false,
    });

    return Message;
};

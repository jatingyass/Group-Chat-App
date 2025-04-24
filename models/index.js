const Sequelize = require('sequelize');
const sequelize = require('../config/db');

// const db = {};
// db.Sequelize = Sequelize;

const UserModel = require('./User');
const User = UserModel(sequelize, Sequelize.DataTypes);

module.exports = {
    sequelize,
    User
};
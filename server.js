const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const sequelize = require('./config/db');
// const User = require('./models/User');

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const signupRoute = require('./routes/signupRoutes');
app.use('/', signupRoute);




sequelize.sync()
  .then(() => {
    console.log('Database synced!');
 })
  .catch((err) => {
    console.error('Error syncing database:', err);
  });

// Start server
app.listen(process.env.PORT, () => {
    console.log(`Server is running on http://localhost:${process.env.PORT}`);
});
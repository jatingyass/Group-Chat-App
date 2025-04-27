const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const sequelize = require('./config/db');
// const User = require('./models/User');

dotenv.config();
const app = express();


//setup CORS 
const corsOptions = {
    origin: 'http://127.0.0.1:5500', // Frontend origin
    methods: ['GET', 'POST', 'PUT', 'OPTIONS'],
    credentials: true,
};

app.use(cors(corsOptions));
// app.options('*', cors(corsOptions)); 



app.use(express.json());
app.use(express.static('public'));

const signupRoute = require('./routes/signupRoutes');
const loginRoute = require('./routes/loginRoutes');
const messageRoute = require('./routes/messageRoutes');

app.use('/', signupRoute);
app.use('/', loginRoute);
app.use('/', messageRoute);


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
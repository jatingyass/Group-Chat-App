// const express = require('express');
// const cors = require('cors');
// const dotenv = require('dotenv');
// const sequelize = require('./config/db');
// // const User = require('./models/User');

// dotenv.config();
// const app = express();


// //setup CORS 
// const corsOptions = {
//     origin: 'http://127.0.0.1:5500',  // Frontend origin
//     methods: ['GET', 'POST', 'PUT', 'OPTIONS'],
//     credentials: true,
// };

// app.use(cors(corsOptions));
// // app.options('*', cors(corsOptions)); 



// app.use(express.json());
// app.use(express.static('public'));
// app.use(express.urlencoded({ extended: true }));



// const signupRoute = require('./routes/signupRoutes');
// const loginRoute = require('./routes/loginRoutes');
// // const messageRoute = require('./routes/messageRoutes');
// const groupRoutes = require('./routes/groupRoutes');

// app.use('/', signupRoute);
// app.use('/', loginRoute);
// // app.use('/', messageRoute);
// app.use('/', groupRoutes);

// app.get('/', (req, res) => {
//   res.send('Server is running correctly!');
// });

// app.use((err, req, res, next) => {
//   console.error(err.stack);
//   res.status(500).send('Something broke!');
// });


// sequelize.sync()
//   .then(() => {
//     console.log('Database synced!');
//  })
//   .catch((err) => {
//     console.error('Error syncing database:', err);
//   });

// // Start server
// app.listen(process.env.PORT, () => {
//     console.log(`Server is running on http://localhost:${process.env.PORT}`);
// });


const http = require('http');
const { Server } = require('socket.io');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const sequelize = require('./config/db');

dotenv.config();
const app = express();
const server = http.createServer(app); // create server from express app
const io = new Server(server, {
  cors: {
    origin: 'http://127.0.0.1:5500',
    methods: ['GET', 'POST']
  }
});

const corsOptions = {
  origin: 'http://127.0.0.1:5500',
  methods: ['GET', 'POST', 'PUT', 'OPTIONS'],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

const signupRoute = require('./routes/signupRoutes');
const loginRoute = require('./routes/loginRoutes');
const groupRoutes = require('./routes/groupRoutes');

app.use('/', signupRoute);
app.use('/', loginRoute);
app.use('/', groupRoutes);

app.get('/', (req, res) => {
  res.send('Server is running correctly!');
});

// Socket logic
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('join-group', (groupId) => {
    socket.join(groupId);
    console.log(`User joined group: ${groupId}`);
  });

  socket.on('send-message', (messageData) => {
    // Emit to everyone in the group except the sender
    io.to(messageData.groupId).emit('receive-message', messageData);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

sequelize.sync()
  .then(() => {
    console.log('Database synced!');
  })
  .catch((err) => {
    console.error('Error syncing database:', err);
  });

server.listen(process.env.PORT, () => {
  console.log(`Server is running on http://localhost:${process.env.PORT}`);
});

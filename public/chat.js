
// const BASE_URL = 'http://13.203.210.30:5000';

// const groupsDiv = document.getElementById('groups');
// const messagesDiv = document.getElementById('messages');
// const messageForm = document.getElementById('message-form');
// const messageInput = document.getElementById('message-input');
// const currentGroupName = document.getElementById('current-group-name');
// const token = localStorage.getItem('token');
// console.log("chat page me token get ", token);
// const userId = localStorage.getItem('id');
// const userName = localStorage.getItem('name');

// let currentGroupId = null;
// let messages = [];

// // Load Groups
// async function loadGroups() {
// const token = localStorage.getItem('token');
// console.log("load me token ", token);
//   try {
//     const res = await axios.get(`${BASE_URL}/groups`, {
//       headers: { Authorization: `Bearer ${token}` }
//     });
//     const groups = res.data.data;

//     groupsDiv.innerHTML = '';
//     groups.forEach(group => {
//       const btn = document.createElement('button');
//       btn.classList.add('btn', 'btn-outline-primary', 'w-100', 'mb-2');
//       btn.textContent = group.name;
//       btn.onclick = () => selectGroup(group.id, group.name);
//       groupsDiv.appendChild(btn);
//     });
//   } catch (err) {
//     console.error('Failed to load groups:', err);
//   }
// }

// // Create Group
// document.getElementById('create-group-btn').addEventListener('click', async () => {
// const token = localStorage.getItem('token');
// console.log("load me token ", token);
  
// const groupName = prompt('Enter Group Name:');
//   if (!groupName) return;

//   try {
//    const response = await axios.post(`${BASE_URL}/groups`, 
//       { name: groupName }, 
//       { headers: { Authorization: `Bearer ${token}` } }
//     );

    
//     const groupId = response.data.data.id; // Extract groupId
//     localStorage.setItem('groupId', groupId);
     
//     alert('Group created successfully!');
//     loadGroups();
//   } catch (err) {
//     console.error('Failed to create group:', err);
//     alert('Failed to create group');
//   }
// });

// // Invite User to Group
// document.getElementById('invite-user-btn').addEventListener('click', async () => {
//   const email = prompt('Enter the email of the user to invite:');
//    console.log("currentGroupId", currentGroupId);
//   if (!email || !currentGroupId) return;

//   try {
//     await axios.post(`${BASE_URL}/groups/${currentGroupId}/invite`, 
//       { email }, 
//       { headers: { Authorization: `Bearer ${token}` } }
//     );
//     alert('User invited successfully!');
//   } catch (err) {
//     console.error('Failed to invite user:', err);
//     alert('Failed to invite user.');
//   }
// });

// // Select Group
// function selectGroup(groupId, groupName) {
//   currentGroupId = groupId;
//   currentGroupName.textContent = groupName;
//   messages = [];
//   localStorage.removeItem('messages');
//   renderMessages();
//   loadMessages();
// }


// // Load Messages
// async function loadMessages() {
//   if (!currentGroupId) return;

//   try {
//     const res = await axios.get(`${BASE_URL}/messages/${currentGroupId}`, {
//       headers: { Authorization: `Bearer ${token}` }
//     });

//     const newMessages = res.data.data;

//     messages = newMessages;

//     if (messages.length > 10) {
//       messages = messages.slice(messages.length - 10);
//     }

//     localStorage.setItem('messages', JSON.stringify(messages));
//     renderMessages();
//   } catch (err) {
//     console.error('Failed to load messages:', err);
//   }
// }




// // Render Messages
// function renderMessages() {
//   messagesDiv.innerHTML = '';
//   messages.forEach(msg => {
//     const div = document.createElement('div');
//     div.classList.add('message');
//     div.innerHTML = `<strong>${parseInt(msg.userId) === parseInt(userId) ? 'You' : msg.userName}:</strong> ${msg.message}`;
//     messagesDiv.appendChild(div);
//   });
//   messagesDiv.scrollTop = messagesDiv.scrollHeight;
// }

// // Send Message
// messageForm.addEventListener('submit', async (e) => {
//   e.preventDefault();

//   if (!currentGroupId) {
//     alert('Please select a group first!');
//     return;
//   }

//   const text = messageInput.value.trim();
//   if (!text) return;

//   const tempMessage = { userId, userName, message: text };
//   messages.push(tempMessage);
//   renderMessages();
//   messageInput.value = '';

//   try {
//     const res = await axios.post(`${BASE_URL}/messages`, {
//       userId,
//       message: text,
//       groupId: currentGroupId
//     }, {
//       headers: { Authorization: `Bearer ${token}`,
//              'Content-Type': 'application/json'
 
//        }
//     });

//     const savedMessage = res.data.data;
//     messages[messages.length - 1].id = savedMessage.id;

//     // Limit to last 10 messages
//     if (messages.length > 10) {
//       messages = messages.slice(messages.length - 10);
//     }

//     localStorage.setItem('messages', JSON.stringify(messages));
//   } catch (err) {
//     console.error('Failed to send message:', err);
//   }
// });



// document.addEventListener('DOMContentLoaded', function () {
//   const token = localStorage.getItem('token');
//   console.log("Token:", token); 

//   // Promote to Admin Button Click
//   document.getElementById('promote-user-btn').addEventListener('click', async () => {
//     const groupId = localStorage.getItem('groupId');
//     console.log("Group ID:", groupId);
//     console.log("chl reha h bhai admin button ");
//     const userName = prompt('Enter the username to promote to admin:');
//     if (!userName) {
//       alert("Please enter a username to promote.");
//       return;
//     }

//     try {
//       const response = await axios.post(`${BASE_URL}/groups/${groupId}/promote`,
//         { userNameToPromote: userName },
//         {
//           headers: {
//             Authorization: `Bearer ${token}`
//           }
//         }
//       );

//        alert(response.data.message);
//     } catch (error) {
//       console.error("Error:", error.response?.data || error.message);
//       alert(error.response?.data?.message || "Something went wrong!");
//     }
//   });

//     // Remove Member Button Click
//     document.getElementById('remove-user-btn').addEventListener('click', async () => {
//       const userEmailToRemove = prompt('Enter the email of the user to remove:');
//       if (!userEmailToRemove || !currentGroupId) return;
    
//       try {
//         await axios.post(
//           `${BASE_URL}/groups/${currentGroupId}/remove`, // Make sure route matches your backend
//           { userEmailToRemove },
//           { headers: { Authorization: `Bearer ${token}` } }
//         );
    
//         alert('User removed successfully!');
//       } catch (err) {
//         console.error('Failed to remove user:', err.response?.data || err.message);
//         alert('Failed to remove user.');
//       }
//     });
    
// });
// // Initial Load
// window.addEventListener('DOMContentLoaded', () => {
//   loadGroups();
// });
// setInterval(loadMessages, 1000);




const BASE_URL = 'http://13.203.210.30:5000';
const socket = io(BASE_URL);

const groupsDiv = document.getElementById('groups');
const messagesDiv = document.getElementById('messages');
const messageForm = document.getElementById('message-form');
const messageInput = document.getElementById('message-input');
const currentGroupName = document.getElementById('current-group-name');
const token = localStorage.getItem('token');
const userId = localStorage.getItem('id');
const userName = localStorage.getItem('name');

let currentGroupId = null;
let messages = [];

// Load Groups
async function loadGroups() {
  try {
    const res = await axios.get(`${BASE_URL}/groups`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const groups = res.data.data;

    groupsDiv.innerHTML = '';
    groups.forEach(group => {
      const btn = document.createElement('button');
      btn.classList.add('btn', 'btn-outline-primary', 'w-100', 'mb-2');
      btn.textContent = group.name;
      btn.onclick = () => selectGroup(group.id, group.name);
      groupsDiv.appendChild(btn);
    });
  } catch (err) {
    console.error('Failed to load groups:', err);
  }
}

// Select Group and Join Room
function selectGroup(groupId, groupName) {
  currentGroupId = groupId;
  currentGroupName.textContent = groupName;
  messages = [];
  localStorage.removeItem('messages');
  renderMessages();
  loadMessages();
  socket.emit('join-group', groupId);
}

// Load Messages
async function loadMessages() {
  if (!currentGroupId) return;
  try {
    const res = await axios.get(`${BASE_URL}/messages/${currentGroupId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    messages = res.data.data;
    if (messages.length > 10) {
      messages = messages.slice(messages.length - 10);
    }

    localStorage.setItem('messages', JSON.stringify(messages));
    renderMessages();
  } catch (err) {
    console.error('Failed to load messages:', err);
  }
}

// Render Messages
function renderMessages() {
  messagesDiv.innerHTML = '';
  messages.forEach(msg => {
    const div = document.createElement('div');
    div.classList.add('message');
    div.innerHTML = `<strong>${parseInt(msg.userId) === parseInt(userId) ? 'You' : msg.userName}:</strong> ${msg.message}`;
    messagesDiv.appendChild(div);
  });
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Send Message
messageForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  if (!currentGroupId) {
    alert('Please select a group first!');
    return;
  }

  const text = messageInput.value.trim();
  if (!text) return;

  const tempMessage = { userId, userName, message: text, groupId: currentGroupId };
  messages.push(tempMessage);
  renderMessages();
  messageInput.value = '';

  try {
    const res = await axios.post(`${BASE_URL}/messages`, {
      userId,
      message: text,
      groupId: currentGroupId
    }, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const savedMessage = res.data.data;
    tempMessage.id = savedMessage.id;

    // Emit message via socket
    socket.emit('send-message', tempMessage);

    if (messages.length > 10) {
      messages = messages.slice(messages.length - 10);
    }

    localStorage.setItem('messages', JSON.stringify(messages));
  } catch (err) {
    console.error('Failed to send message:', err);
  }
});

// Receive Message from socket
socket.on('receive-message', (msg) => {
  if (parseInt(msg.groupId) === parseInt(currentGroupId)) {
    messages.push(msg);
    if (messages.length > 10) {
      messages = messages.slice(messages.length - 10);
    }
    localStorage.setItem('messages', JSON.stringify(messages));
    renderMessages();
  }
});

// Create Group
document.getElementById('create-group-btn').addEventListener('click', async () => {
  const groupName = prompt('Enter Group Name:');
  if (!groupName) return;

  try {
    const response = await axios.post(`${BASE_URL}/groups`,
      { name: groupName },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const groupId = response.data.data.id;
    localStorage.setItem('groupId', groupId);
    alert('Group created successfully!');
    loadGroups();
  } catch (err) {
    console.error('Failed to create group:', err);
    alert('Failed to create group');
  }
});

// Invite User
document.getElementById('invite-user-btn').addEventListener('click', async () => {
  const email = prompt('Enter the email of the user to invite:');
  if (!email || !currentGroupId) return;

  try {
    await axios.post(`${BASE_URL}/groups/${currentGroupId}/invite`,
      { email },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    alert('User invited successfully!');
  } catch (err) {
    console.error('Failed to invite user:', err);
    alert('Failed to invite user.');
  }
});

// Promote User to Admin
document.getElementById('promote-user-btn').addEventListener('click', async () => {
  const groupId = localStorage.getItem('groupId');
  const userNameToPromote = prompt('Enter the username to promote to admin:');
  if (!userNameToPromote) return;

  try {
    const response = await axios.post(`${BASE_URL}/groups/${groupId}/promote`,
      { userNameToPromote },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    alert(response.data.message);
  } catch (error) {
    console.error("Error:", error.response?.data || error.message);
    alert(error.response?.data?.message || "Something went wrong!");
  }
});

// Remove User
document.getElementById('remove-user-btn').addEventListener('click', async () => {
  const userEmailToRemove = prompt('Enter the email of the user to remove:');
  if (!userEmailToRemove || !currentGroupId) return;

  try {
    await axios.post(`${BASE_URL}/groups/${currentGroupId}/remove`,
      { userEmailToRemove },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    alert('User removed successfully!');
  } catch (err) {
    console.error('Failed to remove user:', err.response?.data || err.message);
    alert('Failed to remove user.');
  }
});

// Load groups on page load
window.addEventListener('DOMContentLoaded', () => {
  loadGroups();
});

// Poll messages every second (optional if WebSocket is active)
// setInterval(loadMessages, 1000);/

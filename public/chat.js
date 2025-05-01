
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
    const res = await axios.get('http://localhost:5000/groups', {
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

// Create Group
document.getElementById('create-group-btn').addEventListener('click', async () => {
  const groupName = prompt('Enter Group Name:');
  if (!groupName) return;

  try {
    await axios.post('http://localhost:5000/groups', 
      { name: groupName }, 
      { headers: { Authorization: `Bearer ${token}` } }
    );
    alert('Group created successfully!');
    loadGroups();
  } catch (err) {
    console.error('Failed to create group:', err);
    alert('Failed to create group');
  }
});

// Invite User to Group
document.getElementById('invite-user-btn').addEventListener('click', async () => {
  const email = prompt('Enter the email of the user to invite:');
  if (!email || !currentGroupId) return;

  try {
    await axios.post(`http://localhost:5000/groups/${currentGroupId}/invite`, 
      { email }, 
      { headers: { Authorization: `Bearer ${token}` } }
    );
    alert('User invited successfully!');
  } catch (err) {
    console.error('Failed to invite user:', err);
    alert('Failed to invite user.');
  }
});

// Select Group
function selectGroup(groupId, groupName) {
  currentGroupId = groupId;
  currentGroupName.textContent = groupName;
  messages = [];
  localStorage.removeItem('messages');
  renderMessages();
  loadMessages();
  if (messageInterval) {
    clearInterval(messageInterval);
  }

  messageInterval = setInterval(() => {
    loadMessages();
  }, 1000);
  
}


// Load Messages
async function loadMessages() {
  if (!currentGroupId) return;

  try {
    const res = await axios.get(`http://localhost:5000/messages/${currentGroupId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const newMessages = res.data.data;

    messages = newMessages;

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

  const tempMessage = { userId, userName, message: text };
  messages.push(tempMessage);
  renderMessages();
  messageInput.value = '';

  try {
    const res = await axios.post('http://localhost:5000/messages', {
      userId,
      message: text,
      groupId: currentGroupId
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const savedMessage = res.data.data;
    messages[messages.length - 1].id = savedMessage.id;

    // Limit to last 10 messages
    if (messages.length > 10) {
      messages = messages.slice(messages.length - 10);
    }

    localStorage.setItem('messages', JSON.stringify(messages));
  } catch (err) {
    console.error('Failed to send message:', err);
  }
});

// Initial Load
window.addEventListener('DOMContentLoaded', () => {
  loadGroups();
});
setInterval(loadMessages, 1000);


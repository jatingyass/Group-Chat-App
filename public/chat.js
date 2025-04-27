const messagesDiv = document.getElementById('messages');
const messageForm = document.getElementById('message-form');
const messageInput = document.getElementById('message-input');

const token = localStorage.getItem('token');
const userId = localStorage.getItem('id');
const userName = localStorage.getItem('name'); 

let messages = [];

function renderMessages() {
  messagesDiv.innerHTML = '';
  messages.forEach(msg => {
    const div = document.createElement('div');
    div.classList.add('message');
    div.innerHTML = `<strong>${parseInt(msg.userId) == parseInt(userId) ? 'You' : msg.userName}:</strong> ${msg.message}`;
    messagesDiv.appendChild(div);
  });
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

async function loadMessages() {
  try {
    const res = await axios.get('http://localhost:5000/messages', {
      headers: { Authorization: `Bearer ${token}` }
    });
    messages = res.data.data;
    renderMessages();
  } catch (err) {
    console.error('Failed to load messages:', err);
  }
}

window.addEventListener('load', loadMessages);

messageForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = messageInput.value.trim();
  if (!text) return;

  messages.push({ userId: userId, userName: userName, message: text });
  renderMessages();
  messageInput.value = '';

  try {
    const res = await axios.post(
      'http://localhost:5000/messages',
      { userId, message: text },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log('Saved message:', res.data.data);
  } catch (err) {
    console.error('Failed to save message:', err);
  }
});

// Auto-refresh every 5 sec (Optional)
setInterval(loadMessages, 1000);

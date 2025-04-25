const messagesDiv   = document.getElementById('messages');
const messageForm   = document.getElementById('message-form');
const messageInput  = document.getElementById('message-input');

const token  = localStorage.getItem('token');
const userId = localStorage.getItem('id');

// 1️⃣ Start with an empty array (or fetch from server)
let messages = [];

// 2️⃣ Optionally load previous messages:
// axios.get('http://localhost:5000/api/messages', { headers: { Authorization: `Bearer ${token}` } })
//   .then(res => {
//     messages = res.data.messages;   // must be an array
//     renderMessages();
//   });

function renderMessages() {
  messagesDiv.innerHTML = '';
  messages.forEach(msg => {
    const div = document.createElement('div');
    div.classList.add('message');
    div.innerHTML = `<strong>${msg.user}:</strong> ${msg.text}`;
    messagesDiv.appendChild(div);
  });
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// initial render (will show nothing until messages is populated)
renderMessages();

messageForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = messageInput.value.trim();
  if (!text) return;

  // Add to local array and re-render
  messages.push({ user: 'You', text });
  renderMessages();
  messageInput.value = '';

  // Persist to server
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

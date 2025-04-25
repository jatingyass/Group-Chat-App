const messagesDiv = document.getElementById('messages');
const messageForm = document.getElementById('message-form');
const messageInput = document.getElementById('message-input');

// Dummy data
const messages = [
  { user: 'You', text: 'You joined' },
  { user: 'Vaibhav', text: 'Vaibhav joined' },
  { user: 'Vaibhav', text: 'hello' },
  { user: 'You', text: 'Hi There' },
  { user: 'Vaibhav', text: 'What is up?' },
  { user: 'Vaibhav', text: 'All good' },
];

// Function to render messages
function renderMessages() {
  messagesDiv.innerHTML = ''; // Clear old messages
  messages.forEach(msg => {
    const div = document.createElement('div');
    div.classList.add('message');
    div.innerHTML = `<strong>${msg.user}:</strong> ${msg.text}`;
    messagesDiv.appendChild(div);
  });
}

// Initial load
renderMessages();

// Send new message
messageForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const messageText = messageInput.value.trim();
  if (messageText !== '') {
    messages.push({ user: 'You', text: messageText });
    renderMessages();
    messageInput.value = '';
    messagesDiv.scrollTop = messagesDiv.scrollHeight; // Auto scroll down
  }
});

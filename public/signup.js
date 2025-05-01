document.getElementById('signup-form').addEventListener('submit', function(e) {
    e.preventDefault();

    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const password = document.getElementById('password').value.trim();

    // Clear any previous error
    document.getElementById('email-error').innerText = '';

    axios.post('http://localhost:5000/signup', { name, email, phone, password })
        .then(res => {
            alert('Signup successful!');
            window.location.href = 'http://127.0.0.1:5501/public/login.html'; // redirect to login
        })
        .catch(err => {
            if (err.response && err.response.status === 400) {
                document.getElementById('email-error').innerText = err.response.data.message;
                alert("User already exists, Please Login"); // Deliverable: ✅

            } else {
                alert('Signup failed. Please try again.');
                console.error(err);
            }
        });
});

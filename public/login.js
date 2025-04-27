document.getElementById("login-form").addEventListener("submit", async function(event) {
    event.preventDefault(); 

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    try {
        const response = await axios.post('http://localhost:5000/login', {email, password}, {withCredentials: true});
        if (response.data.success) {
            alert("Login successful!");
            window.location.href = 'http://127.0.0.1:5500/public/chat.html'; // redirect to login
            
            localStorage.setItem('token', response.data.token); 
            localStorage.setItem('id', response.data.user.id);  
            localStorage.setItem('name', response.data.user.name); 
        
            
        }else {
            document.getElementById('error-msg').innerText = response.data.message;
        }
    } catch (error) {
            const errorMsg = document.getElementById('error-msg');
            if (errorMsg) {
                errorMsg.innerText = error.response.data.message || "An error occurred. Please try again.";
            }else{
                console.error("Error:", error);
            }
        }   
});

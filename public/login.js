document.getElementById("login-form").addEventListener("submit", async function(event) {
    event.preventDefault(); 

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    try {
        const response = await axios.post('http://localhost:5000/login', {email, password});
        if (response.data.success) {
            alert("Login successful!");
    
            window.location.href = '/dashboard'; 
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

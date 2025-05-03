
const baseURL = 'http://13.203.210.30:5000';


document.getElementById("login-form").addEventListener("submit", async function(event) {
    event.preventDefault(); 

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    try {
        const response = await axios.post(`${baseURL}/login`, {email, password}, {withCredentials: true});
        if (response.data.success) {
        
            localStorage.setItem('token', response.data.token);
             console.log("token login ke baad ", localStorage.getItem('token'));
            localStorage.setItem('id', response.data.user.id);
            localStorage.setItem('name', response.data.user.name);

            alert("Login successful!");
          window.location.href = `http://13.203.210.30:5000/chat.html`; // redirect to login 
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

document.getElementById('signup-form').addEventListener('submit', function(e){
    e.preventDefault(); 

    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const phone = document.getElementById('phone').value;
    const password = document.getElementById('password').value;

    console.log(name, email, phone, password);
})
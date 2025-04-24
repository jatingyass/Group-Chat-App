const { User } = require("../models");
const bcrypt = require("bcryptjs"); 

exports.signupUser = async (req, res) => {
    const { name, email, phone, password } = req.body;

    try{
        const existingUser = await User.findOne({where: {email}});
        if(existingUser){
            return res.status(400).json({success: false, message: "Email already exists"});
        }
       
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await User.create({
            name,
            email,
            phone,
            password: hashedPassword,
        });

        res.status(201).json({success: true, message: "User created successfully", user: newUser});
    }catch (err){
        console.error("Error during signup:", err);
        res.status(500).json({success: false, message: "Internal server error"});
    }
};    
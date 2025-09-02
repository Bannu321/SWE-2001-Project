const express = require('express');
const router = express.Router();
const User = require('../models/userModel');
const jwt = require('jsonwebtoken');

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '1d' });
};

// @route   POST /register
// @desc    Register a new user
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, role, roleId } = req.body;

        if (!name || !email || !password || !role || !roleId) {
            return res.status(400).json({ message: 'Please provide all required fields.' });
        }

        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'User with this email already exists' });
        }
        
        const roleIdExists = await User.findOne({ roleId });
        if (roleIdExists) {
            return res.status(400).json({ message: 'User with this ID already exists' });
        }

        const isFirstUser = (await User.countDocuments({})) === 0;
        const finalRole = isFirstUser ? 'admin' : role;

        const user = await User.create({ name, email, password, role: finalRole, roleId });

        if (user) {
            res.status(201).json({
                _id: user._id, name: user.name, email: user.email,
                role: user.role, token: generateToken(user._id)
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        console.error('Registration Error:', error);
        res.status(500).json({ message: 'Server error during registration.' });
    }
});

// @route   POST /login
// @desc    Authenticate user & get token
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (user && (await user.matchPassword(password))) {
            res.json({
                _id: user._id, name: user.name, email: user.email,
                role: user.role, token: generateToken(user._id),
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ message: 'Server error during login.' });
    }
});

module.exports = router;


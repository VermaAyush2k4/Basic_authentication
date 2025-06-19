const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Login route
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('Login attempt received:', { email });
    
    // Validate input
    if (!email || !password) {
      console.log('Login failed - missing credentials');
      return res.status(400).json({ 
        success: false, 
        message: 'Please enter both email and password' 
      });
    }

    // Basic validation
    if (typeof password !== 'string' || password.length < 6) {
      console.log('Login failed - invalid password format');
      return res.status(400).json({ 
        success: false, 
        message: 'Password must be at least 6 characters long' 
      });
    }

    // Find user by email
    const user = await User.findOne({
      where: {
        email: email.trim().toLowerCase()
      }
    });

    if (!user) {
      console.log('Login failed - user not found for email:', email);
      return res.status(401).json({ 
        success: false, 
        message: 'This email is not registered yet. Please register first.' 
      });
    }

    // Compare passwords directly
    if (user.password !== password) {
      console.log('Login failed - incorrect password for user:', user.id);
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    console.log('Login successful for user:', {
      userId: user.id,
      name: user.name,
      email: user.email
    });
    res.status(200).json({ 
      success: true, 
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// Register route
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    console.log('Registration attempt received:', { email, name });
    
    // Validate input
    if (!name || !email || !password) {
      console.log('Registration failed - missing required fields');
      return res.status(400).json({ 
        success: false, 
        message: 'All fields are required' 
      });
    }

    // Validate password length
    if (password.length < 6) {
      console.log('Registration failed - password too short');
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Check if user exists
    const existingUser = await User.findOne({
      where: {
        email: email.trim().toLowerCase()
      }
    });

    if (existingUser) {
      console.log('Registration failed - user already exists for email:', email);
      return res.status(400).json({
        success: false,
        message: 'This email is already registered'
      });
    }

    // Create new user
    const newUser = await User.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: password // In a real app, this should be hashed
    });

    console.log('Registration successful for new user:', {
      userId: newUser.id,
      name: newUser.name,
      email: newUser.email
    });

    res.status(201).json({ 
      success: true, 
      message: 'Registration successful',
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// Generate password reset token
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please enter your email' 
      });
    }

    const user = await User.findOne({
      where: {
        email: email.trim().toLowerCase()
      }
    });

    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'This email is not registered yet. Please register first.' 
      });
    }

    // Generate reset token
    const resetToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1h' }
    );

    // Save reset token and expiration time
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour from now
    await user.save();

    // Create reset URL
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

    // In a real application, you would send this URL via email
    // For now, we'll just return it in the response
    return res.status(200).json({ 
      success: true,
      message: 'Password reset instructions have been sent to your email',
      resetUrl,
      resetToken // Remove this in production
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// Reset password route
router.post('/reset-password', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('Password reset attempt received:', { email });
    
    // Validate input
    if (!email || !password) {
      console.log('Password reset failed - missing required fields');
      return res.status(400).json({
        success: false,
        message: 'Email and new password are required'
      });
    }

    // Validate password length
    if (password.length < 6) {
      console.log('Password reset failed - password too short');
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long'
      });
    }

    // Find user
    const user = await User.findOne({
      where: {
        email: email.trim().toLowerCase()
      }
    });

    if (!user) {
      console.log('Password reset failed - user not found for email:', email);
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update password
    user.password = password; // In a real app, this should be hashed
    await user.save();

    console.log('Password reset successful for user:', {
      userId: user.id,
      email: user.email
    });

    res.status(200).json({
      success: true,
      message: 'Password reset successful'
    });

  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;

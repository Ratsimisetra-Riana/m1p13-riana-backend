const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const UserDTO = require('../dtos/userDTO');

// Login route - Authenticate user and return JWT token
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }
        
        // Check if user is active
        if (!user.isActive) {
            return res.status(401).json({ message: 'Account is disabled' });
        }
        
        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }
        
        // Generate JWT token with user info
        const token = jwt.sign(
            {
                userId: user._id,
                name: user.name,
                email: user.email,
                shopId: user.shopId,
                role: user.role
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        // Return only token (all user info is in the token)
        res.json({ token });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Admin: Create any type of user (centre-admin or shop-admin)
router.post('/admin/create-user', async (req, res) => {
    try {
        
        const { name, email, password, role, shopId, isActive } = req.body;
        
        // Validate required fields
        if (!name || !email || !password || !role) {
            return res.status(400).json({ message: 'name, email, password, and role are required' });
        }
        
        // Validate role
        const allowedRoles = ['client', 'shop_admin', 'centre_admin'];
        if (!allowedRoles.includes(role)) {
            return res.status(400).json({ message: 'Invalid role. Allowed: client, shop-admin, centre-admin' });
        }
        
        // Check if email already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Email already registered' });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({
            name,
            email,
            passwordHash: hashedPassword,
            role,
            shopId: shopId || null,  // Required for shop-admin
            isActive: isActive !== undefined ? isActive : true
        });
        await user.save();
        
        res.status(201).json({
            message: 'User created successfully',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                shopId: user.shopId,
                isActive: user.isActive
            }
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Register new client (only clients can register themselves)
router.post('/', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        
        // Check if email already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Email already registered' });
        }
        
        // Only allow client role for self-registration
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({
            name,
            email,
            passwordHash: hashedPassword,
            role: 'client', // Force client role for registration
            shopId: null,   // No shop for clients
            isActive: true  // Automatically active
        });
        await user.save();
        
        // Generate JWT token with all user info
        const token = jwt.sign(
            {
                userId: user._id,
                name: user.name,
                email: user.email,
                shopId: user.shopId,
                role: user.role
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        res.status(201).json({ token });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Lire tous les users
router.get('/', async (req, res) => {
    try {
        const users = await User.find()
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const users = await User.findById(req.params.id)  ;
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Mettre à jour un user
// Mettre à jour un user
router.put('/:id', async (req, res) => {
    try {
        console.log(req.body);
        const userDTO = new UserDTO(req.body.name, req.body.email, req.body.password, req.body.role, req.body.shopId, req.body.isActive);
        
        // Construire l'objet de mise à jour
        const updateData = {
            name: userDTO.name,
            email: userDTO.email,
            role: userDTO.role,
            shopId: userDTO.shopId,
            isActive: userDTO.isActive
        };
        
        if (userDTO.password && userDTO.password.trim() !== '') {
            const hashedPassword = await bcrypt.hash(userDTO.password, 10);
            updateData.passwordHash = hashedPassword;
        }
        
        const user = await User.findByIdAndUpdate(
            req.params.id, 
            updateData, 
            { new: true }
        );
        
        res.json(user);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Supprimer un user
router.delete('/:id', async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.json({ message: "utilisateur supprimé" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.post("/bulk", async (req, res) => {
  try {
    const users = await Promise.all(req.body.map(async (userData) => {
      const userDTO = new UserDTO(userData.name, userData.email, userData.password, userData.role, userData.shopId, userData.isActive);
      const hashedPassword = await bcrypt.hash(userDTO.password, 10);
      return {
        name: userDTO.name,
        email: userDTO.email,
        passwordHash: hashedPassword,
        role: userDTO.role,
        shopId: userDTO.shopId,
        isActive: userDTO.isActive
      };
    }));
    const result = await User.insertMany(users);
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const User = require('../models/User');
const UserDTO = require('../dtos/userDTO');

// Créer un user
router.post('/', async (req, res) => {
    try {
        const userDTO = new UserDTO(req.body.name, req.body.email, req.body.password, req.body.role, req.body.shopId, req.body.isActive);
        const hashedPassword = await bcrypt.hash(userDTO.password, 10);
        const user = new User({
            name: userDTO.name,
            email: userDTO.email,
            passwordHash: hashedPassword,
            role: userDTO.role,
            shopId: userDTO.shopId,
            isActive: userDTO.isActive
        });
        await user.save();
        res.status(201).json(user);
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
router.put('/:id', async (req, res) => {
    try {
        const userDTO = new UserDTO(req.body.name, req.body.email, req.body.password, req.body.role, req.body.shopId, req.body.isActive);
        const hashedPassword = await bcrypt.hash(userDTO.password, 10);
        const user = await User.findByIdAndUpdate(req.params.id, {
            name: userDTO.name,
            email: userDTO.email,
            passwordHash: hashedPassword,
            role: userDTO.role,
            shopId: userDTO.shopId,
            isActive: userDTO.isActive
        }, { new: true });
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
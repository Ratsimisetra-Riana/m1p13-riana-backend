const express = require('express');
const router = express.Router();
const Order = require('../models/Order');

// Créer une commande
router.post('/', async (req, res) => {
    try {
        console.log("Creating order with data:", req.body);
        const order = new Order(req.body);
        await order.save();
        const populatedOrder = await Order.findById(order._id)
            .populate('userId')
            .populate('shopId')
            .populate('items.productId');
        res.status(201).json(populatedOrder);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Lire toutes les commandes d'un shop
router.get('/shop/:shopId', async (req, res) => {
    try {
        const orders = await Order.find({ shopId: req.params.shopId })
            .populate('userId')
            .populate('shopId')
            .populate('items.productId')
            .sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Lire toutes les commandes d'un client (user)
router.get('/user/:userId', async (req, res) => {
    try {
        const orders = await Order.find({ userId: req.params.userId })
            .populate('userId')
            .populate('shopId')
            .populate('items.productId')
            .sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Lire toutes les commandes
router.get('/', async (req, res) => {
    try {
        const orders = await Order.find()
            .populate('userId')
            .populate('shopId')
            .populate('items.productId')
            .sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Lire une commande par ID
router.get('/:id', async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('userId')
            .populate('shopId')
            .populate('items.productId');
        if (!order) {
            return res.status(404).json({ message: 'Commande non trouvée' });
        }
        res.json(order);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Mettre à jour le statut d'une commande
router.put('/:id', async (req, res) => {
    try {
        const order = await Order.findByIdAndUpdate(req.params.id, req.body, { new: true })
            .populate('userId')
            .populate('shopId')
            .populate('items.productId');
        if (!order) {
            return res.status(404).json({ message: 'Commande non trouvée' });
        }
        res.json(order);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Supprimer une commande
router.delete('/:id', async (req, res) => {
    try {
        const order = await Order.findByIdAndDelete(req.params.id);
        if (!order) {
            return res.status(404).json({ message: 'Commande non trouvée' });
        }
        res.json({ message: 'Commande supprimée' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;

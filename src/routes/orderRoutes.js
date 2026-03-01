const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Product = require('../models/Product');

// Helper function to reduce stock when order is created
async function reduceStock(orderItems) {
    for (const item of orderItems) {
        const product = await Product.findById(item.productId);
        if (!product) continue;
        
        const variant = product.variants.find(v => v.sku === item.variantSku);
        if (variant && variant.stock >= item.quantity) {
            variant.stock -= item.quantity;
            await product.save();
        }
    }
}

// Helper function to restore stock when order is cancelled
async function restoreStock(orderItems) {
    for (const item of orderItems) {
        const product = await Product.findById(item.productId);
        if (!product) continue;
        
        const variant = product.variants.find(v => v.sku === item.variantSku);
        if (variant) {
            variant.stock += item.quantity;
            await product.save();
        }
    }
}

// Créer une commande
router.post('/', async (req, res) => {
    try {
        console.log("Creating order with data:", req.body);
        const order = new Order(req.body);
        await order.save();
        
        // Reduce stock for each item in the order
        await reduceStock(order.items);
        
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
        // Get current order to check previous status
        const currentOrder = await Order.findById(req.params.id);
        if (!currentOrder) {
            return res.status(404).json({ message: 'Commande non trouvée' });
        }
        
        const previousStatus = currentOrder.status;
        const newStatus = req.body.status;
        
        // Update the order
        const order = await Order.findByIdAndUpdate(req.params.id, req.body, { new: true })
            .populate('userId')
            .populate('shopId')
            .populate('items.productId');
        
        // If status changed to 'canceled', restore stock
        if (previousStatus !== 'canceled' && newStatus === 'canceled') {
            await restoreStock(currentOrder.items);
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

const express = require('express');
const router = express.Router();
const Shop = require('../models/Shop');

// Créer un shop
router.post('/', async (req, res) => {
    try {
        const shop = new Shop(req.body);
        await shop.save();
    res.status(201).json(shop);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Lire tous les shops
router.get('/', async (req, res) => {
    try {
        const shops = await Shop.find().populate('box', 'code _id');
        res.json(shops);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const shop = await Shop.findById(req.params.id).populate('box', 'code _id');
        if (!shop) {
            return res.status(404).json({ message: "Shop non trouvé" });
        }
        res.json(shop);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Mettre à jour un shop
router.put('/:id', async (req, res) => {
    try {
        const shop = await Shop.findByIdAndUpdate(req.params.id,
        req.body, { new: true });
        res.json(shop);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Supprimer un article
router.delete('/:id', async (req, res) => {
    try {
        await Article.findByIdAndDelete(req.params.id);
        res.json({ message: "Article supprimé" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.post("/bulk", async (req, res) => {
  try {
    const shops = await Shop.insertMany(req.body);
    res.status(201).json(shops);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
const express = require('express');
const router = express.Router();
const Box = require('../models/Box');

// Créer un box
router.post('/', async (req, res) => {
    try {
        const box = new Box(req.body);
        await box.save();
    res.status(201).json(box);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Lire tous les boxs
router.get('/', async (req, res) => {
    try {
        const boxs = await Box.find();
        res.json(boxs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// lire un box
router.get('/:id', async (req, res) => {
    try {
        const box = await Box.findById(req.params.id);
        if (!box) {
            return res.status(404).json({ message: "Box non trouvé" });
        }
        res.json(box);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


// Mettre à jour un box
router.put('/:id', async (req, res) => {
    try {
        const box = await Box.findByIdAndUpdate(req.params.id,
        req.body, { new: true });
        res.json(box);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Supprimer un article
router.delete('/:id', async (req, res) => {
    try {
        await Box.findByIdAndDelete(req.params.id);
        res.json({ message: "Box supprimé" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.post("/bulk", async (req, res) => {
  try {
    const boxs = await Box.insertMany(req.body);
    res.status(201).json(boxs);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
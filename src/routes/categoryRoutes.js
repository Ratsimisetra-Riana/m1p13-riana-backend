const express = require('express');
const router = express.Router();
const Category = require('../models/Category');

// Créer un category
router.post('/', async (req, res) => {
    try {
        const category = new Category(req.body);
        await category.save();
    res.status(201).json(category);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Lire tous les categorys (flat list - no hierarchy)
router.get('/', async (req, res) => {
    try {
        const categories = await Category.find().populate('parent', 'name _id');
        res.json(categories);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Lire tous les categorys (hierarchical structure)
router.get('/hierarchy', async (req, res) => {
    try {
        // Get all categories
        const categories = await Category.find().populate('parent', 'name _id');
        
        // Separate root categories (parent is null) and child categories
        const rootCategories = categories.filter(c => !c.parent);
        const childCategories = categories.filter(c => c.parent);
        
        // Build hierarchical structure
        const buildHierarchy = (parentCategories, allChildren) => {
            return parentCategories.map(parent => {
                const children = allChildren.filter(
                    child => child.parent && child.parent._id.toString() === parent._id.toString()
                );
                return {
                    ...parent.toObject(),
                    children: children.length > 0 ? buildHierarchy(children, allChildren) : []
                };
            });
        };
        
        const hierarchicalCategories = buildHierarchy(rootCategories, childCategories);
        res.json(hierarchicalCategories);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Lire tous les categorys
router.get('/:id', async (req, res) => {
    try {
        const category = await Category.findById(req.params.id).populate('parent', 'name _id');
        res.json(category);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Mettre à jour un category
router.put('/:id', async (req, res) => {
    try {
        const category = await Category.findByIdAndUpdate(req.params.id,
        req.body, { new: true });
        res.json(category);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Supprimer un article
router.delete('/:id', async (req, res) => {
    try {
        await Article.findByIdAndDelete(req.params.id);
        res.json({ message: "Category supprimé" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.post("/bulk", async (req, res) => {
  try {
    const categories = await Category.insertMany(req.body);
    res.status(201).json(categories);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
module.exports = router;
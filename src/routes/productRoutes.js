const express = require('express');
const router = express.Router();
const Product = require('../models/Product');

// ========== SHOP ADMIN ROUTES ==========

// Créer un produit pour un shop
router.post('/shop/:shopId', async (req, res) => {
    try {
        const product = new Product({
            ...req.body,
            shopId: req.params.shopId
        });
        await product.save();
        res.status(201).json(product);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Lire tous les produits d'un shop
router.get('/shop/:shopId', async (req, res) => {
    try {
        const products = await Product.find({ shopId: req.params.shopId })
            .populate('categoryId')
            .populate('shopId');
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Mettre à jour un produit (shop admin)
router.put('/shop/:shopId/:productId', async (req, res) => {
    try {
        const product = await Product.findOne({
            _id: req.params.productId,
            shopId: req.params.shopId
        });
        
        if (!product) {
            return res.status(404).json({ message: "Produit non trouvé ou vous n'avez pas la permission" });
        }
        
        const updatedProduct = await Product.findByIdAndUpdate(
            req.params.productId,
            req.body,
            { new: true }
        );
        res.json(updatedProduct);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Supprimer un produit (shop admin)
router.delete('/shop/:shopId/:productId', async (req, res) => {
    try {
        const product = await Product.findOne({
            _id: req.params.productId,
            shopId: req.params.shopId
        });
        
        if (!product) {
            return res.status(404).json({ message: "Produit non trouvé ou vous n'avez pas la permission" });
        }
        
        await Product.findByIdAndDelete(req.params.productId);
        res.json({ message: "Produit supprimé" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ========== GENERAL ROUTES ==========
router.post('/', async (req, res) => {
    try {
        const product = new Product(req.body);
        await product.save();
    res.status(201).json(product);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Lire tous les produits
router.get('/', async (req, res) => {
    try {
        const products = await Product.find()
        .populate('categoryId')   // <-- populate the category
        .populate('shopId');  ;
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Filter products by category and variant attributes
router.get('/filter', async (req, res) => {
    try {
        const { categoryId, shopId, ...attributes } = req.query;
        
        // Build the base query
        const query = {};
        
        // Filter by shopId if provided
        if (shopId) {
            query.shopId = shopId;
        }
        
        // Filter by categoryId and its children if provided
        if (categoryId) {
            const Category = require('../models/Category');
            
            // Get all category IDs (selected category + all descendants)
            const getCategoryIds = async (catId) => {
                const allCategories = await Category.find();
                const ids = new Set([catId]);
                
                const findChildren = (parentId) => {
                    allCategories.forEach(cat => {
                        if (cat.parent && cat.parent.toString() === parentId && !ids.has(cat._id.toString())) {
                            ids.add(cat._id.toString());
                            findChildren(cat._id.toString());
                        }
                    });
                };
                
                findChildren(catId);
                return Array.from(ids);
            };
            
            const categoryIds = await getCategoryIds(categoryId);
            query.categoryId = { $in: categoryIds };
        }
        
        // Get products matching the query
        const products = await Product.find(query)
            .populate('categoryId')
            .populate('shopId');
        
        // Further filter variants within each product if attributes specified
        let filteredProducts = products;
        if (Object.keys(attributes).length > 0) {
            filteredProducts = products.map(product => {
                const filteredVariants = product.variants.filter(variant => {
                    const variantAttrs = variant.attributes ? Object.fromEntries(variant.attributes) : {};
                    return Object.entries(attributes).every(([key, value]) => variantAttrs[key] === value);
                });
                return { ...product.toObject(), variants: filteredVariants };
            }).filter(p => p.variants.length > 0);
        }
        
        res.json(filteredProducts);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const products = await Product.findById(req.params.id)
        .populate('categoryId')   // <-- populate the category
        .populate('shopId');  ;
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Mettre à jour un produit
router.put('/:id', async (req, res) => {
    try {
        console.log("Updating product with ID:", req.params.id);
        console.log("Update data:", req.body);
        const product = await Product.findById(req.params.id);
        const produit = await Product.findByIdAndUpdate(req.params.id,
        req.body, { new: true });
        res.json(product);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Supprimer un produit
router.delete('/:id', async (req, res) => {
    try {
        await Product.findByIdAndDelete(req.params.id);
        res.json({ message: "produit supprimé" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.post("/bulk", async (req, res) => {
  try {
    const categories = await Product.insertMany(req.body);
    res.status(201).json(categories);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
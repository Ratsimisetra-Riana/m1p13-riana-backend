const express = require('express');
const router = express.Router();
const Shop = require('../models/Shop');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Box = require('../models/Box');
const mongoose = require('mongoose');

// Centre-admin dashboard (global - no shopId)
router.get('/dashboard/centre', async (req, res) => {
    try {
        const now = new Date();
        const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        
        // 1. Overview stats
        const totalShops = await Shop.countDocuments();
        
        // Total expected rent
        const totalRent = await Shop.aggregate([
            { $group: { _id: null, total: { $sum: '$rent' } } }
        ]);
        
        // Total orders and revenue
        const totalOrders = await Order.countDocuments({ status: { $ne: 'canceled' } });
        const totalRevenue = await Order.aggregate([
            { $match: { status: { $ne: 'canceled' } } },
            { $group: { _id: null, total: { $sum: '$totalAmount' } } }
        ]);
        
        // Revenue last 30 days
        const revenueLast30Days = await Order.aggregate([
            { $match: { 
                status: { $ne: 'canceled' },
                createdAt: { $gte: last30Days }
            }},
            { $group: { _id: null, total: { $sum: '$totalAmount' } } }
        ]);
        
        // 2. Shops by zone - using simple count
        const allShops = await Shop.find();
        const zoneMap = {};
        const floorMap = {};
        const boxIds = [];
        
        for (const shop of allShops) {
            // Check if box is a valid ObjectId
            if (shop.box && typeof shop.box === 'object' && shop.box._id) {
                boxIds.push(shop.box._id);
            }
        }
        
        const boxes = await Box.find({ _id: { $in: boxIds } });
        const boxZoneMap = {};
        const boxFloorMap = {};
        boxes.forEach(box => {
            boxZoneMap[box._id.toString()] = box.zone;
            boxFloorMap[box._id.toString()] = box.floor;
        });
        
        for (const shop of allShops) {
            const boxId = shop.box && typeof shop.box === 'object' && shop.box._id ? shop.box._id.toString() : null;
            if (boxId && boxZoneMap[boxId]) {
                const zone = boxZoneMap[boxId];
                if (!zoneMap[zone]) zoneMap[zone] = { count: 0, totalRent: 0 };
                zoneMap[zone].count++;
                zoneMap[zone].totalRent += shop.rent || 0;
                
                const floor = boxFloorMap[boxId];
                if (!floorMap[floor]) floorMap[floor] = { count: 0, totalRent: 0 };
                floorMap[floor].count++;
                floorMap[floor].totalRent += shop.rent || 0;
            }
        }
        
        const shopsByZone = Object.entries(zoneMap).map(([zone, data]) => ({ _id: zone, count: data.count, totalRent: data.totalRent }));
        const shopsByFloor = Object.entries(floorMap).map(([floor, data]) => ({ _id: parseInt(floor), count: data.count, totalRent: data.totalRent }));
        
        // 4. Top performing shops (by revenue)
        const topShops = await Order.aggregate([
            { $match: { status: { $ne: 'canceled' } } },
            { $group: { _id: '$shopId', totalRevenue: { $sum: '$totalAmount' }, orderCount: { $sum: 1 } } },
            { $sort: { totalRevenue: -1 } },
            { $limit: 10 },
            {
                $lookup: {
                    from: 'shops',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'shop'
                }
            },
            { $unwind: '$shop' },
            {
                $project: {
                    shopId: '$_id',
                    shopName: '$shop.name',
                    totalRevenue: 1,
                    orderCount: 1
                }
            }
        ]);
        
        // 5. Sales by day (last 7 days)
        const salesByDay = await Order.aggregate([
            { $match: { 
                status: { $ne: 'canceled' },
                createdAt: { $gte: last7Days }
            }},
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                    revenue: { $sum: '$totalAmount' },
                    orders: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);
        
        // 6. Orders by status (all shops)
        const ordersByStatus = await Order.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);
        
        // 7. Orders by channel (all shops)
        const ordersByChannel = await Order.aggregate([
            { $group: { _id: '$channel', count: { $sum: 1 }, revenue: { $sum: '$totalAmount' } } }
        ]);
        
        // 8. Low stock products across all shops
        const lowStockProducts = await Product.aggregate([
            { $unwind: '$variants' },
            { $match: { 'variants.stock': { $lte: 5, $gte: 0 }, shopId: { $type: 'objectId' } } },
            { $lookup: { from: 'shops', localField: 'shopId', foreignField: '_id', as: 'shop' } },
            { $unwind: '$shop' },
            { $project: {
                productId: '$_id',
                productName: '$name',
                shopName: '$shop.name',
                sku: '$variants.sku',
                stock: '$variants.stock'
            }},
            { $sort: { stock: 1 } },
            { $limit: 15 }
        ]);
        
        // 9. Shops with no orders
        const allShopIds = await Shop.distinct('_id');
        const shopsWithOrders = await Order.distinct('shopId', { status: { $ne: 'canceled' } });
        const shopsWithOrdersIds = shopsWithOrders.map(id => {
            try { return id.toString(); } catch { return null; }
        }).filter(Boolean);
        const shopsWithoutOrders = await Shop.find({
            _id: { $nin: allShopIds.filter(id => shopsWithOrdersIds.includes(id.toString())) }
        });
        const shopsWithoutOrdersList = shopsWithoutOrders.map(s => ({
            _id: s._id,
            name: s.name,
            box: s.box && typeof s.box === 'object' && s.box.code ? s.box : null
        }));
        
        // 10. Unoccupied boxes (boxes not linked to any shop)
        const allShopsWithBox = await Shop.find({ box: { $exists: true, $ne: null } });
        const occupiedBoxIds = [];
        for (const shop of allShopsWithBox) {
            if (shop.box && typeof shop.box === 'object' && shop.box._id) {
                occupiedBoxIds.push(shop.box._id);
            }
        }
        const unoccupiedBoxes = await Box.find({ _id: { $nin: occupiedBoxIds } });
        
        // 11. Recent orders (last 10)
        const recentOrders = await Order.find()
            .sort({ createdAt: -1 })
            .limit(10)
            .populate('shopId', 'name')
            .populate('userId', 'name');
        
        // 12. Total products across all shops
        const totalProducts = await Product.countDocuments();
        
        // Compile dashboard data
        const dashboard = {
            overview: {
                totalShops,
                totalExpectedRent: totalRent[0]?.total || 0,
                totalOrders,
                totalRevenue: totalRevenue[0]?.total || 0,
                revenueLast30Days: revenueLast30Days[0]?.total || 0,
                totalProducts,
                unoccupiedBoxesCount: unoccupiedBoxes.length,
                shopsWithoutOrdersCount: shopsWithoutOrders.length
            },
            shopsByZone: shopsByZone.reduce((acc, curr) => {
                acc[curr._id || 'Unassigned'] = { count: curr.count, totalRent: curr.totalRent };
                return acc;
            }, {}),
            shopsByFloor: shopsByFloor.reduce((acc, curr) => {
                acc[curr._id || 0] = { count: curr.count, totalRent: curr.totalRent };
                return acc;
            }, {}),
            topShops,
            salesByDay,
            ordersByStatus: ordersByStatus.reduce((acc, curr) => {
                acc[curr._id] = curr.count;
                return acc;
            }, {}),
            ordersByChannel: ordersByChannel.reduce((acc, curr) => {
                acc[curr._id] = { count: curr.count, revenue: curr.revenue };
                return acc;
            }, {}),
            lowStockProducts,
            shopsWithoutOrders: shopsWithoutOrdersList,
            unoccupiedBoxes,
            recentOrders: recentOrders.map(o => ({
                _id: o._id,
                shopName: o.shopId?.name || 'Unknown',
                status: o.status,
                totalAmount: o.totalAmount,
                channel: o.channel,
                createdAt: o.createdAt
            }))
        };
        
        res.json(dashboard);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Dashboard endpoint for shop-admin
router.get('/:shopId/dashboard', async (req, res) => {
    try {
        const shopId = req.params.shopId;
        
        // Get date ranges
        const now = new Date();
        const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        
        // 1. Overview stats
        const totalOrders = await Order.countDocuments({ shopId });
        const totalRevenue = await Order.aggregate([
            { $match: { shopId: new mongoose.Types.ObjectId(shopId), status: { $ne: 'canceled' } } },
            { $group: { _id: null, total: { $sum: '$totalAmount' } } }
        ]);
        
        // Orders in last 7 days
        const ordersLast7Days = await Order.countDocuments({
            shopId,
            createdAt: { $gte: last7Days }
        });
        
        // Revenue in last 7 days
        const revenueLast7Days = await Order.aggregate([
            { $match: { 
                shopId: new mongoose.Types.ObjectId(shopId), 
                status: { $ne: 'canceled' },
                createdAt: { $gte: last7Days }
            }},
            { $group: { _id: null, total: { $sum: '$totalAmount' } } }
        ]);
        
        // 2. Orders by status
        const ordersByStatus = await Order.aggregate([
            { $match: { shopId: new mongoose.Types.ObjectId(shopId) } },
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);
        
        // 3. Recent orders (last 5)
        const recentOrders = await Order.find({ shopId })
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('userId', 'name email');
        
        // 4. Top selling products
        const topProducts = await Order.aggregate([
            { $match: { shopId: new mongoose.Types.ObjectId(shopId), status: { $ne: 'canceled' } } },
            { $unwind: '$items' },
            { $group: { 
                _id: '$items.productId', 
                totalQuantity: { $sum: '$items.quantity' },
                totalRevenue: { $sum: { $multiply: ['$items.unitPrice', '$items.quantity'] } }
            }},
            { $sort: { totalQuantity: -1 } },
            { $limit: 5 }
        ]);
        
        // Populate product details for top products
        const topProductIds = topProducts.map(p => p._id);
        const topProductDetails = await Product.find({ _id: { $in: topProductIds } });
        const topProductsWithDetails = topProducts.map(p => {
            const product = topProductDetails.find(prod => prod._id.toString() === p._id?.toString());
            return {
                productId: p._id,
                productName: product?.name || 'Unknown',
                totalQuantity: p.totalQuantity,
                totalRevenue: p.totalRevenue
            };
        });
        
        // 5. Low stock products
        const lowStockProducts = await Product.aggregate([
            { $match: { shopId: new mongoose.Types.ObjectId(shopId) } },
            { $unwind: '$variants' },
            { $match: { 'variants.stock': { $lte: 5, $gte: 0 } } },
            { $project: {
                productId: '$_id',
                productName: '$name',
                sku: '$variants.sku',
                stock: '$variants.stock',
                attributes: '$variants.attributes'
            }},
            { $sort: { stock: 1 } },
            { $limit: 10 }
        ]);
        
        // 6. Sales by day (last 7 days)
        const salesByDay = await Order.aggregate([
            { $match: { 
                shopId: new mongoose.Types.ObjectId(shopId), 
                status: { $ne: 'canceled' },
                createdAt: { $gte: last7Days }
            }},
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                    revenue: { $sum: '$totalAmount' },
                    orders: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);
        
        // 7. Orders by channel
        const ordersByChannel = await Order.aggregate([
            { $match: { shopId: new mongoose.Types.ObjectId(shopId) } },
            { $group: { _id: '$channel', count: { $sum: 1 }, revenue: { $sum: '$totalAmount' } } }
        ]);
        
        // 8. Total products count
        const totalProducts = await Product.countDocuments({ shopId });
        
        // 9. Average order value
        const avgOrderValue = await Order.aggregate([
            { $match: { shopId: new mongoose.Types.ObjectId(shopId), status: { $ne: 'canceled' } } },
            { $group: { _id: null, avg: { $avg: '$totalAmount' } } }
        ]);
        
        // Compile dashboard data
        const dashboard = {
            overview: {
                totalOrders,
                totalRevenue: totalRevenue[0]?.total || 0,
                ordersLast7Days,
                revenueLast7Days: revenueLast7Days[0]?.total || 0,
                totalProducts,
                averageOrderValue: avgOrderValue[0]?.avg || 0
            },
            ordersByStatus: ordersByStatus.reduce((acc, curr) => {
                acc[curr._id] = curr.count;
                return acc;
            }, {}),
            recentOrders: recentOrders.map(o => ({
                _id: o._id,
                status: o.status,
                totalAmount: o.totalAmount,
                createdAt: o.createdAt,
                customerName: o.customerInfo?.name || o.userId?.name || 'Guest'
            })),
            topProducts: topProductsWithDetails,
            lowStockProducts,
            salesByDay,
            ordersByChannel: ordersByChannel.reduce((acc, curr) => {
                acc[curr._id] = { count: curr.count, revenue: curr.revenue };
                return acc;
            }, {})
        };
        
        res.json(dashboard);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

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
        const shops = await Shop.find().populate('box', 'code _id floor zone');
        res.json(shops);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const shop = await Shop.findById(req.params.id).populate('box', 'code _id floor zone');
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
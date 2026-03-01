const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const app = express();
const PORT = process.env.PORT;
const dns = require('dns');

// FORCE DNS RESOLUTION - CRITICAL FOR NODE v25 ON WINDOWS
dns.setServers(['8.8.8.8', '1.1.1.1']);
console.log('✅ DNS servers set to: 8.8.8.8, 1.1.1.1');

// Middleware
app.use(cors({
  origin: '*', // only allow Angular dev server
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));
app.use(express.json());

// Connect to MongoDB
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ MongoDB connecté avec succès");
        console.log("📊 Base de données:", mongoose.connection.name);
    } catch (error) {
        console.error("❌ Erreur de connexion MongoDB:", error.message);
        process.exit(1);
    }
};

// Appeler la fonction
connectDB();

// Routes
app.use('/articles', require('./routes/articleRoutes'));
app.use('/products', require('./routes/productRoutes'));
app.use('/shops', require('./routes/shopRoutes'));
app.use('/categories', require('./routes/categoryRoutes'));
app.use('/boxes', require('./routes/boxRoutes'));
app.use('/users', require('./routes/userRoutes'));
app.use('/orders', require('./routes/orderRoutes'));
app.listen(PORT, () => console.log(`Serveur démarré sur le port ${PORT}`));
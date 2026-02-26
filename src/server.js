const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const app = express();
const PORT = process.env.PORT;

// Middleware
app.use(cors({
  origin: '*', // only allow Angular dev server
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));
app.use(express.json());

// Connexion à MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connecté"))
  .catch(err => console.log(err));

// Routes
app.use('/articles', require('./routes/articleRoutes'));
app.use('/products', require('./routes/productRoutes'));
app.use('/shops', require('./routes/shopRoutes'));
app.use('/categories', require('./routes/categoryRoutes'));
app.use('/boxes', require('./routes/boxRoutes'));
app.listen(PORT, () => console.log(`Serveur démarré sur le port ${PORT}`));
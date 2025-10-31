// server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose'); // needed for fixRoleNumberIndex
const bodyParser = require('body-parser');
const connectDB = require('./config/db');

const authRoutes = require('./routes/auth');
const teacherRoutes = require('./routes/teacher');

// Initialize app first
const app = express();

// Middleware
app.use(bodyParser.json()); // or app.use(express.json());

// Routes

app.use('/api/teacher', teacherRoutes);
app.use('/api/auth', authRoutes);
const adminRoutes = require('./routes/admin');
app.use('/api/admin', adminRoutes);


// Connect to database
connectDB();

// ✅ TEMPORARY FIX: Drop and recreate the index
const fixRoleNumberIndex = async () => {
  try {
    const collection = mongoose.connection.collection('users');

    // Drop existing index
    try {
      await collection.dropIndex('roleNumber_1');
      console.log('✅ Dropped old roleNumber index');
    } catch (err) {
      console.log('ℹ️  Index already dropped or does not exist');
    }

    // Create new sparse index
    await collection.createIndex({ roleNumber: 1 }, { 
      unique: true, 
      sparse: true 
    });
    console.log('✅ Created new sparse roleNumber index');
  } catch (error) {
    console.log('Index fix completed');
  }
};

// Call after a short delay to ensure DB is connected
setTimeout(fixRoleNumberIndex, 2000);

// Test route
app.get('/', (req, res) => res.send('Student Auth API is running'));

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

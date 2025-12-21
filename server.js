// server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose'); // needed for fixRoleNumberIndex
const bodyParser = require('body-parser');
const connectDB = require('./config/db');
const studentRoutes = require('./routes/student');
const authRoutes = require('./routes/auth');
const teacherRoutes = require('./routes/teacher');
const parentRoutes = require('./routes/parent.js');
const cors = require('cors');
const { startScheduledJobs } = require('./config/scheduler.js');

const app = express();

// ✅ Allow multiple frontend origins
const allowedOrigins = [
  'http://localhost:3000', // login
  'http://localhost:5175', // teacher
  'http://localhost:5176', // parent
  'http://localhost:5174',//Admin
  'http://localhost:5173' // student
];

app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests with no origin (Postman, mobile apps)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true
  })
);

// Middleware
app.use(bodyParser.json()); // or app.use(express.json());


// Routes

app.use('/api/teacher', teacherRoutes);
app.use('/api/auth', authRoutes);
const adminRoutes = require('./routes/admin');
app.use('/api/admin', adminRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/parent', parentRoutes);

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
    await collection.createIndex(
      { roleNumber: 1 },
      {
        unique: true,
        sparse: true,
      }
    );
    console.log('✅ Created new sparse roleNumber index');
  } catch (error) {
    console.log('Index fix completed');
  }
};

// Test route
app.get('/', (req, res) => res.send('Student Auth API is running'));

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', async () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`🚀 Server running at: http://localhost:${PORT}`);

  
  // Connect to database
  await connectDB();
  // fixRoleNumberIndex
  await fixRoleNumberIndex();

  // this marks all the students absent (default) at 1:00AM (only from Mon - Sat) - SHUBHAM
  // You can add more jobs here - SHUBHAM
  startScheduledJobs();
});

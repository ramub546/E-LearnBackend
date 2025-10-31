const User = require('../models/User');

async function generateRoleNumber(academicRegion) {
  // Create prefix from region (first 2 letters uppercase)
  const prefix = academicRegion.substring(0, 2).toUpperCase();
  
  // Find the latest user with this region to increment the number
  const latestUser = await User.findOne({ academicRegion }).sort({ createdAt: -1 });
  
  let nextNumber = 1;
  if (latestUser && latestUser.roleNumber) {
    // Extract number from existing roleNumber (e.g., NO001 → 001)
    const lastNumber = parseInt(latestUser.roleNumber.replace(prefix, '')) || 0;
    nextNumber = lastNumber + 1;
  }
  
  // Format: NO001, DE001, MU001, etc.
  return `${prefix}${nextNumber.toString().padStart(3, '0')}`;
}

module.exports = { generateRoleNumber };
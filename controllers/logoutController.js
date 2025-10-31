// ---------------------- SINGLE LOGOUT FOR ALL USERS ----------------------
exports.logout = async (req, res) => {
  try {

    
    console.log('🚪 User logout:', {
      id: req.user?.id,
      role: req.user?.role,
      email: req.user?.email
    });

 

    return res.json({
      message: 'Logged out successfully',
      success: true
    });
    
  } catch (err) {
    console.error('Logout Error:', err);
    return res.status(500).json({ 
      message: 'Server error during logout', 
      error: err.message 
    });
  }
};
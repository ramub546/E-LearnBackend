const Announcement = require('../models/Announcement');

// ---------------------- CREATE ANNOUNCEMENT ----------------------
exports.createAnnouncement = async (req, res) => {
  try {
    const { title, message, targetAudience } = req.body;
    const adminId = req.user.id;

    if (!title || !message) {
      return res.status(400).json({ message: 'Title and message are required' });
    }

    const announcement = new Announcement({
      title,
      message,
      targetAudience: targetAudience || 'all',
      createdBy: adminId
    });

    await announcement.save();

    return res.status(201).json({
      message: 'Announcement created successfully',
      announcement: announcement
    });
  } catch (err) {
    console.error('Create Announcement Error:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ---------------------- GET ALL ANNOUNCEMENTS ----------------------
exports.getAllAnnouncements = async (req, res) => {
  try {
    const announcements = await Announcement.find()
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    return res.json({
      message: 'Announcements retrieved successfully',
      count: announcements.length,
      announcements: announcements
    });
  } catch (err) {
    console.error('Get All Announcements Error:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ---------------------- GET ANNOUNCEMENTS FOR USER ----------------------
exports.getUserAnnouncements = async (req, res) => {
  try {
    const userRole = req.user.role; // student, teacher, or parent

    const announcements = await Announcement.find({
      $or: [
        { targetAudience: 'all' },
        { targetAudience: userRole }
      ]
    })
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 });

    return res.json({
      message: 'Announcements retrieved successfully',
      count: announcements.length,
      announcements: announcements
    });
  } catch (err) {
    console.error('Get User Announcements Error:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};


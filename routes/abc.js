const mongoose = require('mongoose');    //JUST EXTRA DONT ADD THIS Namrata
const bcrypt = require('bcryptjs');      //For testing if passwords are matching
require('dotenv').config();

const Teacher = require('./models/User'); // adjust path to your teacher model

const email = 'namratapeshw@gmail.com';
const newPassword = 'Hello123'; // the password you want

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(async () => {
  const teacher = await Teacher.findOne({ email });
  if (!teacher) return console.log('Teacher not found');

  teacher.passwordHash = await bcrypt.hash(newPassword, 12);
  teacher.teacherStatus = 'approved'; // ensure approved
  await teacher.save();

  console.log('✅ Password reset successfully!');
  mongoose.disconnect();
}).catch(err => console.error(err));

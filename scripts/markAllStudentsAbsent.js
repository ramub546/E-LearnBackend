// File: /scripts/markAllStudentsAbsent.js

const mongoose = require('mongoose');
const User = require('../models/User'); // Adjust path as needed
const Class = require('../models/Class'); // Adjust path as needed
const Attendance = require('../models/Attendance'); // Adjust path as needed
require('dotenv').config({ path: '../.env' }); // Adjust path as needed

// Function to get the start of "today"
const getStartOfToday = () => {
  const now = new Date();
  now.setHours(0, 0, 0, 0); // Set to midnight
  return now;
};

const runJob = async () => {
  console.log('Connecting to database...');
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Database connected. Starting "Mark Absent" job...');

  const today = getStartOfToday();
  let recordsCreated = 0;
  let studentsProcessed = 0;

  // --- ✅ FIX ---
  // Declare newAttendanceRecords here, so it's accessible in 'finally'
  let newAttendanceRecords = [];

  try {
    // 1. Find all students
    const students = await User.find({ role: 'student' })
      .populate({
        path: 'class',
        select: 'subjects _id classCode',
      })
      .select('class');

    if (!students || students.length === 0) {
      console.log('No students found. Exiting job.');
      return;
    }

    studentsProcessed = students.length;
    // const newAttendanceRecords = []; // <-- ❌ REMOVED from here

    // 2. Loop through each student and their subjects
    for (const student of students) {
      if (
        !student.class ||
        !student.class.subjects ||
        student.class.subjects.length === 0
      ) {
        continue;
      }

      const classId = student.class._id;
      const subjectIds = student.class.subjects;

      // 3. Create a new "absent" record for each subject
      for (const subjectId of subjectIds) {
        newAttendanceRecords.push({
          student: student._id,
          subject: subjectId,
          class: classId,
          date: today,
          status: 'absent',
        });
      }
    }

    if (newAttendanceRecords.length === 0) {
      console.log('No new attendance records to create.');
      return;
    }

    // 4. Use insertMany
    const result = await Attendance.insertMany(newAttendanceRecords, {
      ordered: false,
    });
    recordsCreated = result.length;
  } catch (error) {
    if (error.code === 11000) {
      console.log(
        'Encountered duplicate records (which is OK). Job likely ran already.'
      );
      recordsCreated = error.result.nInserted;
    } else {
      console.error('Error running "Mark Absent" job:', error);
    }
  } finally {
    // This 'finally' block can now access newAttendanceRecords
    console.log('--- Job Summary ---');
    console.log(`Processed: ${studentsProcessed} students.`);
    console.log(`Attempted to create: ${newAttendanceRecords.length} records.`); // <-- This will now work
    console.log(
      `Successfully created: ${recordsCreated} new "absent" records.`
    );
    await mongoose.disconnect();
    console.log('Database disconnected. Job finished.');
  }
};

// Run the job
runJob();

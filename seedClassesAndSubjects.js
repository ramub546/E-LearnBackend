const mongoose = require('mongoose');
require('dotenv').config();

const Class = require('./models/Class');
const Subject = require('./models/Subject');

const classSubjects = {
  '1': ['English', 'Mathematics', 'Environmental Studies (EVS)', 'Social Studies', 'Art & Craft', 'Physical and Health Education'],
  '2': ['English', 'Mathematics', 'Environmental Studies (EVS)', 'Social Studies', 'Art & Craft', 'Physical and Health Education'],
  '3': ['English', 'Mathematics', 'General Science', 'Social Studies', 'Art & Craft', 'Physical and Health Education'],
  '4': ['English', 'Mathematics', 'Science (Physics, Chemistry, Biology)', 'Social Studies', 'Art & Craft', 'Physical and Health Education'],
  '5': ['English', 'Mathematics', 'Science (Physics, Chemistry, Biology)', 'Social Studies', 'Art & Craft', 'Physical and Health Education'],
  '6': ['English', 'Mathematics', 'Science (Physics, Chemistry, Biology)', 'Social Studies (Geography, History, Politics)', 'Computer Science', 'Physical and Health Education'],
  '7': ['English', 'Mathematics', 'Science (Physics, Chemistry, Biology)', 'Social Studies (Geography, History, Politics)', 'Computer Science', 'Physical and Health Education'],
  '8': ['English', 'Mathematics', 'Science (Physics, Chemistry, Biology)', 'Social Studies (Geography, History, Politics)', 'Computer Science (Information Science)', 'Physical and Health Education'],
  '9': ['English', 'Applied Mathematics', 'Science (Physics, Chemistry, Biology)', 'Social Studies (Geography, History, Politics)', 'Computer Science (Information Science)', 'Physical and Health Education'],
  '10': ['English', 'Applied Mathematics', 'Science (Physics, Chemistry, Biology)', 'Social Studies (Geography, History, Politics)', 'Computer Science (Information Science)', 'Physical and Health Education']
};

async function seedData() {
  try {
    await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    await Subject.deleteMany({});
    await Class.deleteMany({});
    console.log('🗑 Cleared existing classes and subjects');

    for (const [className, subjects] of Object.entries(classSubjects)) {
      // Create class
      const classDoc = new Class({
        className: className,
        classCode: `CLASS${className}`,
        description: `Class ${className}`,
        subjects: [] // Initialize empty array
      });

      const savedClass = await classDoc.save();
      console.log(`📚 Created class: ${className}`);

      // Create subjects for this class
      const subjectIds = [];
      for (const subjectName of subjects) {
        const subjectCode = `CLASS${className}_${subjectName.split(' ')[0].toUpperCase()}`;
        
        const subject = new Subject({
          subjectCode: subjectCode,
          subjectName: subjectName,
          class: savedClass._id,
          description: `${subjectName} for Class ${className}`
        });

        const savedSubject = await subject.save();
        subjectIds.push(savedSubject._id);
        console.log(`✅ Created subject: ${subjectName} for Class ${className}`);
      }

      // Update class with subjects
      savedClass.subjects = subjectIds;
      await savedClass.save();
    }

    console.log('🎉 Classes and subjects seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding error:', error);
    process.exit(1);
  }
}

seedData();

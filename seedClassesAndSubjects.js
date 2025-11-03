const mongoose = require('mongoose');
require('dotenv').config();

const Class = require('./models/Class');
const Subject = require('./models/Subject');

// Updated data structure to include subject names and syllabus descriptions
const classSyllabusData = {
  1: [
    {
      name: 'English',
      description:
        'Basics of phonics, alphabet recognition (capital and small), simple CVC words, rhymes, and storytelling.',
    },
    {
      name: 'Mathematics',
      description:
        'Counting (1-100), number names, basic shapes, simple addition and subtraction (up to 20), and introduction to measurement.',
    },
    {
      name: 'Environmental Studies (EVS)',
      description:
        'Introduction to self, family, surroundings, plants, animals, and healthy habits.',
    },
    {
      name: 'Social Studies',
      description:
        'Understanding family, school, neighborhood, and national festivals.',
    },
    {
      name: 'Art & Craft',
      description: 'Basic drawing, coloring, clay modeling, and paper crafts.',
    },
    {
      name: 'Physical and Health Education',
      description:
        'Simple exercises, group games, and understanding basic hygiene.',
    },
  ],
  2: [
    {
      name: 'English',
      description:
        'Building vocabulary, reading simple sentences, picture comprehension, and basic grammar (nouns, verbs).',
    },
    {
      name: 'Mathematics',
      description:
        'Numbers up to 1000, place value, addition and subtraction (with regrouping), introduction to multiplication, and time.',
    }, // <-- This line is now fixed
    {
      name: 'Environmental Studies (EVS)',
      description:
        'Types of houses, food, water, air, and introduction to the environment.',
    },
    {
      name: 'Social Studies',
      description: 'Community helpers, maps, and different types of transport.',
    },
    {
      name: 'Art & Craft',
      description: 'Drawing and coloring, patterns, and simple origami.',
    },
    {
      name: 'Physical and Health Education',
      description: 'Team games, basic yoga, and importance of nutrition.',
    },
  ],
  3: [
    {
      name: 'English',
      description:
        'Paragraph reading, simple essay writing, grammar (adjectives, adverbs), and storytelling.',
    },
    {
      name: 'Mathematics',
      description:
        'Four-digit numbers, multiplication (2-digit), division, fractions, and geometry (lines and shapes).',
    },
    {
      name: 'General Science',
      description:
        'Living and non-living things, parts of a plant, animal life, and states of matter.',
    },
    {
      name: 'Social Studies',
      description:
        'Our country (India), states and capitals, introduction to history, and our government.',
    },
    {
      name: 'Art & Craft',
      description:
        'Drawing with shading, craftwork with waste materials, and poster making.',
    },
    {
      name: 'Physical and Health Education',
      description:
        'Drills, simple athletics, and awareness of communicable diseases.',
    },
  ],
  4: [
    {
      name: 'English',
      description:
        'Comprehension passages, letter writing, grammar (tenses, prepositions), and vocabulary building.',
    },
    {
      name: 'Mathematics',
      description:
        'Large numbers, factors and multiples, fractions and decimals, measurement, and geometry (angles).',
    },
    {
      name: 'Science (Physics, Chemistry, Biology)',
      description:
        'Food and digestion, materials, force and energy, and plant life.',
    },
    {
      name: 'Social Studies',
      description:
        'The Northern mountains, coastal plains, heritage of India, and introduction to civics.',
    },
    {
      name: 'Art & Craft',
      description: 'Still life drawing, color mixing, and clay modeling.',
    },
    {
      name: 'Physical and Health Education',
      description: 'Local sports (Kho-Kho, Kabaddi), yoga, and first aid.',
    },
  ],
  5: [
    {
      name: 'English',
      description:
        'Reading fluency, formal and informal letters, advanced grammar (conjunctions, punctuation), and story writing.',
    },
    {
      name: 'Mathematics',
      description:
        'Decimals, percentages, profit and loss, area and perimeter, and data handling (bar graphs).',
    },
    {
      name: 'Science (Physics, Chemistry, Biology)',
      description:
        'Skeletal system, simple machines, light and shadows, and rocks and minerals.',
    },
    {
      name: 'Social Studies',
      description:
        'Major landforms, climate zones, motions of the Earth, and the age of exploration.',
    },
    {
      name: 'Art & Craft',
      description:
        'Perspective drawing, collage work, and introduction to craft techniques.',
    },
    {
      name: 'Physical and Health Education',
      description:
        'Basic rules of major sports (cricket, football), and personal hygiene.',
    },
  ],
  6: [
    {
      name: 'English',
      description:
        'Reading comprehension (unseen passages), notice writing, email etiquette, and grammar (active/passive voice).',
    },
    {
      name: 'Mathematics',
      description:
        'Integers, algebra (introduction), ratios and proportions, basic geometry, and mensuration.',
    },
    {
      name: 'Science (Physics, Chemistry, Biology)',
      description:
        'Components of food, separation of substances, motion and measurement, and electricity and circuits.',
    },
    {
      name: 'Social Studies (Geography, History, Politics)',
      description:
        'Introduction to ancient history (Indus Valley), the Earth in the solar system, and understanding diversity and government.',
    },
    {
      name: 'Computer Science',
      description:
        'Introduction to computers (hardware, software), MS Office (Word, PowerPoint), and basics of the internet.',
    },
    {
      name: 'Physical and Health Education',
      description:
        'Specialized sports skills, teamwork, and health and wellness.',
    },
  ],
  7: [
    {
      name: 'English',
      description:
        'Advanced reading, report writing, debating, and grammar (clauses, modals).',
    },
    {
      name: 'Mathematics',
      description:
        'Fractions and decimals, data handling, simple equations, lines and angles, and congruence of triangles.',
    },
    {
      name: 'Science (Physics, Chemistry, Biology)',
      description:
        'Nutrition in plants and animals, acids and bases, heat, and weather and climate.',
    },
    {
      name: 'Social Studies (Geography, History, Politics)',
      description:
        'Medieval history (Delhi Sultanate, Mughals), environment and ecosystems, and understanding media.',
    },
    {
      name: 'Computer Science',
      description:
        'Introduction to HTML, basic programming concepts (algorithms), and more on MS Excel.',
    },
    {
      name: 'Physical and Health Education',
      description:
        'Strategy in team sports, physical fitness, and mental well-being.',
    },
  ],
  8: [
    {
      name: 'English',
      description:
        'Literary analysis, formal writing (articles, speeches), and advanced grammar (reported speech, tenses).',
    },
    {
      name: 'Mathematics',
      description:
        'Rational numbers, linear equations, squares and square roots, cubes and cube roots, and data handling (pie charts).',
    },
    {
      name: 'Science (Physics, Chemistry, Biology)',
      description:
        'Cell structure, microorganisms, force and pressure, sound, and synthetic fibres and plastics.',
    },
    {
      name: 'Social Studies (Geography, History, Politics)',
      description:
        'Modern history (British rule), resources and development, and the Indian Constitution.',
    },
    {
      name: 'Computer Science (Information Science)',
      description:
        'Introduction to data, basics of a computer network, HTML and CSS, and understanding cyber safety.',
    },
    {
      name: 'Physical and Health Education',
      description:
        'Leadership in sports, advanced drills, and adolescent health issues.',
    },
  ],
  9: [
    {
      name: 'English',
      description:
        'Analysis of prose and poetry, descriptive and narrative writing, and integrated grammar exercises.',
    },
    {
      name: 'Applied Mathematics',
      description:
        'Number systems, polynomials, coordinate geometry, linear equations in two variables, and introduction to statistics.',
    },
    {
      name: 'Science (Physics, Chemistry, Biology)',
      description:
        'Matter in our surroundings, motion, force and laws of motion, the fundamental unit of life (cell), and tissues.',
    },
    {
      name: 'Social Studies (Geography, History, Politics)',
      description:
        'The French Revolution, socialism in Europe, drainage systems of India, and democratic rights.',
    },
    {
      name: 'Computer Science (Information Science)',
      description:
        'Python programming basics, database concepts (SQL), and advanced cyber safety and ethics.',
    },
    {
      name: 'Physical and Health Education',
      description:
        'Rules and regulations of sports, yoga and meditation, and diet and nutrition.',
    },
  ],
  10: [
    {
      name: 'English',
      description:
        'Advanced comprehension (seen and unseen passages), formal and informal writing (letters, articles), advanced grammar (modals, clauses), and literary devices.',
    },
    {
      name: 'Applied Mathematics',
      description:
        'Quadratic equations, arithmetic progressions, circles, trigonometry, statistics (mean, median, mode), and probability.',
    },
    {
      name: 'Science (Physics, Chemistry, Biology)',
      description:
        'Chemical reactions, acids, bases and salts, electricity, magnetic effects, life processes (nutrition, respiration), and heredity.',
    },
    {
      name: 'SocialStudies (Geography, History, Politics)',
      description:
        'Nationalism in Europe and India, manufacturing industries, outcomes of democracy, and globalization.',
    },
    {
      name: 'Computer Science (Information Science)',
      description:
        'Advanced Python (data structures), database management (SQL joins), and web development fundamentals (HTML, CSS, JS).',
    },
    {
      name: 'Physical and Health Education',
      description:
        'Sports injuries and management, advanced training methods, and stress management.',
    },
  ],
};

async function seedData() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    await Subject.deleteMany({});
    await Class.deleteMany({});
    console.log('🗑 Cleared existing classes and subjects');

    for (const [className, subjects] of Object.entries(classSyllabusData)) {
      // Create class
      const classDoc = new Class({
        className: className,
        classCode: `CLASS${className}`,
        description: `Class ${className}`,
        subjects: [], // Initialize empty array
      });

      const savedClass = await classDoc.save();
      console.log(`📚 Created class: ${className}`);

      // Create subjects for this class
      const subjectIds = [];

      // Loop through the new array of subject objects
      for (const subjectData of subjects) {
        const subjectCode = `CLASS${className}_${subjectData.name
          .split(' ')[0]
          .toUpperCase()}`;

        const subject = new Subject({
          subjectCode: subjectCode,
          subjectName: subjectData.name, // Use the subject name from the object
          class: savedClass._id,
          description: subjectData.description, // Use the syllabus description from the object
        });

        const savedSubject = await subject.save();
        subjectIds.push(savedSubject._id);
        console.log(
          `✅ Created subject: ${subjectData.name} for Class ${className}`
        );
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

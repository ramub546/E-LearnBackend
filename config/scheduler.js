const cron = require('node-cron');
const { exec } = require('child_process');
const Test = require('../models/Test');
const schedule = require('node-schedule');
const User = require('../models/User');

/**
 * Initializes and starts all cron jobs for the application.
 */
const startScheduledJobs = () => {
  console.log('Scheduling daily "mark absent" job for Mon-Sat at 1:00AM...');

  // '0 1 * * 1-6' = 1:00 AM, every day-of-month, every month, on day-of-week 1-6 (Mon-Sat)
  cron.schedule(
    '0 1 * * 1-6',
    () => {
      console.log(
        '\n\n--- [CRON] Starting Daily "Mark Absent" Job (Mon-Sat) ---'
      );

      // This path './scripts/markAllStudentsAbsent.js' is relative to the
      // project's root directory (where you run 'node server.js'),
      // so it will still work correctly.
      exec(
        'node ./scripts/markAllStudentsAbsent.js',
        (error, stdout, stderr) => {
          if (error) {
            console.error(`--- [CRON] Job Error: ${error.message} ---`);
            return;
          }
          if (stderr) {
            console.error(`--- [CRON] Job Stderr: ${stderr} ---`);
          }

          console.log(`--- [CRON] Job Output: --- \n${stdout}`);
          console.log('--- [CRON] Daily "Mark Absent" Job Finished ---\n\n');
        }
      );
    },
    {
      timezone: 'Asia/Kolkata',
    }
  );

  // ----- 2️⃣ Update test status (pending → completed) every minute -----
  schedule.scheduleJob({rule: '* * * * *', tz: 'Asia/Kolkata'}, async () => {
    try {
      const now = new Date();
      const result = await Test.updateMany(
        { testDate: { $lte: now }, status: 'pending' },
        { $set: { status: 'completed' } }
      );
      if (result.modifiedCount > 0) {
        console.log(
          `[Scheduler] Updated ${result.modifiedCount} test(s) to completed.`
        );
      }
    } catch (err) {
      console.error('[Scheduler] Error updating test status:', err);
    }
  });

  // --- Add other jobs here in the future ---
  // cron.schedule('...', () => { ... });
};

// Export the function
module.exports = { startScheduledJobs };

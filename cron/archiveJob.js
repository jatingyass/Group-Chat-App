 const cron = require('node-cron');
 const archiveOldMessages = require('../services/archiveMessages');

// cron.schedule('* * * * *', () => {
//   console.log("🕑 Running Archive Job every 1 minute...");
//   archiveOldMessages();
// });

// console.log("✅ Archive Job Scheduled: Every 1 minute");


//archive job to run every 24 hours
cron.schedule('* * * * *', () => {
  console.log("🕑 Running Archive Job every day at 2 AM...");
  archiveOldMessages();
});

console.log("✅ Archive Job Scheduled: Every day at 2 AM");

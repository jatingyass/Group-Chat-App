// testInsert.js
const { Message } = require('./models'); // models folder same level pe hona chahiye

async function insertOldMessage() {
  try {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 2); // 2 din purani date

    await Message.create({
      userId: 1,
      userName: 'jatin',
      groupId: 1,
      message: 'This is a 2-day old test message',
      fileUrl: null,
      createdAt: oldDate,
      updatedAt: new Date()
    });

    console.log("✅ Old test message inserted successfully.");
  } catch (err) {
    console.error("❌ Error inserting test message:", err);
  }
}

insertOldMessage();

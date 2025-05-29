// const { Message, ArchivedMessage } = require('../models');
// const { Op } = require('sequelize');

// async function archiveOldMessages() {
//   const oneMinuteAgo = new Date();
//   oneMinuteAgo.setMinutes(oneMinuteAgo.getMinutes() - 1); // ⬅️ yeh change karo 30 din se 1 min

//   try {
//     const oldMessages = await Message.findAll({
//       where: {
//         createdAt: {
//           [Op.lt]: oneMinuteAgo
//         }
//       }
//     });

//     if (oldMessages.length === 0) {
//       console.log("📭 No old messages to archive.");
//       return;
//     }

//     const archivedData = oldMessages.map(msg => ({
//       id: msg.id,
//       userId: msg.userId,
//       userName: msg.userName,
//       groupId: msg.groupId,
//       message: msg.message,
//       fileUrl: msg.fileUrl,
//       createdAt: msg.createdAt
//     }));

//     await ArchivedMessage.bulkCreate(archivedData);
//     await Message.destroy({
//       where: {
//         createdAt: {
//           [Op.lt]: oneMinuteAgo
//         }
//       }
//     });

//     console.log(`✅ Archived ${archivedData.length} messages.`);
//   } catch (err) {
//     console.error("❌ Error archiving messages:", err);
//   }
// }

// module.exports = archiveOldMessages;


//one day archive job
const { Message, ArchivedMessage } = require('../models');
const { Op } = require('sequelize');

async function archiveOldMessages() {
  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1); // ⬅️ Yeh hai 1 din ka logic

  try {
    const oldMessages = await Message.findAll({
      where: {
        createdAt: {
          [Op.lt]: oneDayAgo
        }
      }
    });

    if (oldMessages.length === 0) {
      console.log("📭 No old messages to archive.");
      return;
    }

    const archivedData = oldMessages.map(msg => ({
      id: msg.id,
      userId: msg.userId,
      userName: msg.userName,
      groupId: msg.groupId,
      message: msg.message,
      fileUrl: msg.fileUrl,
      createdAt: msg.createdAt
    }));

    await ArchivedMessage.bulkCreate(archivedData);
    await Message.destroy({
      where: {
        createdAt: {
          [Op.lt]: oneDayAgo
        }
      }
    });

    console.log(`✅ Archived ${archivedData.length} messages.`);
  } catch (err) {
    console.error("❌ Error archiving messages:", err);
  }
}

module.exports = archiveOldMessages;

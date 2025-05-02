// controllers/groupController.js

const { Group, GroupMember, Message, User } = require('../models');

exports.createGroup = async (req, res) => {
  try {
    const { name, members } = req.body;
    const userId = req.user.id;  // login user id (token se)

    const group = await Group.create({ name, createdBy: userId});

    await GroupMember.create({ groupId: group.id, userId: userId, is_admin: true });

    // Add other members too
    if (members && members.length > 0) {
      const groupMembers = members.map(memberId => ({
        groupId: group.id,
        userId: memberId
      }));
      await GroupMember.bulkCreate(groupMembers);
    }

    res.status(201).json({ success: true, message: 'Group created successfully', data: group });
  } catch (err) {
    console.error("Error creating group:", err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};


exports.getUserGroups = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const groups = await Group.findAll({
      include: {
        model: GroupMember,
        where: { userId },
        attributes: [],
      },
      attributes: ['id', 'name'],
    });

    res.status(200).json({ success: true, data: groups });
  } catch (err) {
    console.error("Error fetching groups:", err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};


exports.sendMessage = async (req, res) => {
  try {
    const { groupId, message } = req.body;
    const userId = req.user.id;

    const newMessage = await Message.create({
      userId,
      groupId,
      message,
    });

    res.status(201).json({ success: true, message: 'Message sent successfully', data: newMessage });
  } catch (err) {
    console.error("Error sending message:", err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};


exports.getGroupMessages = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    // Check membership
    const isMember = await GroupMember.findOne({ where: { groupId, userId } });
    if (!isMember) {
      return res.status(403).json({ success: false, message: 'You are not a member of this group' });
    }

    const messages = await Message.findAll({
      where: { groupId },
      order: [['createdAt', 'ASC']],
      // limit: 20,
    });

    res.status(200).json({ success: true, data: messages });
  } catch (err) {
    console.error("Error fetching group messages:", err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

//invite user to member
exports.inviteUser = async (req, res) => {
  const { groupId } = req.params;
  const { email } = req.body;

  try {
    console.log("Inviting:", email, "to group:", groupId);
    const user = await User.findOne({ where: { email } });
    
    if (!user) {
      console.log("User not found");
      return res.status(404).json({ message: 'User not found.' });
    }

    const existingMember = await GroupMember.findOne({ where: { groupId, userId: user.id } });
    if (existingMember) {
      console.log("User already in group");
      return res.status(400).json({ message: 'User already in group.' });
    }

    const isAdmin = await GroupMember.create({ groupId, userId: user.id });
      console.log("isAdmin", isAdmin);
     if (!isAdmin) {
      return res.status(403).json({ message: 'Only admins can invite users.' });
    }
    res.status(200).json({ message: 'User invited successfully.' });
  } catch (error) {
    console.log("Error inviting user:", error);
    res.status(500).json({ message: 'Server error.' });
  }
};


// promoteToAdmin.js
exports.promoteToAdmin = async (req, res) => {
  const { groupId } = req.params;
  const { userNameToPromote } = req.body;

  console.log("🟡 Promote request received for groupId:", groupId, "and user:", userNameToPromote);

  try {
    // Step 1: Find the user by name
    const user = await User.findOne({ where: { name: userNameToPromote } });

    if (!user) {
      console.log("❌ User not found.");
      return res.status(404).json({ message: 'User not found.' });
    }

    // Step 2: Check if user is a group member
    const member = await GroupMember.findOne({
      where: { groupId: parseInt(groupId), userId: user.id }
    });

    if (!member) {
      console.log("❌ Not a group member.");
      return res.status(404).json({ message: 'User is not a member of the group.' });
    }

    // Step 3: Promote to admin
    member.is_admin = true;
    await member.save();

    console.log("✅ User promoted successfully");
    res.status(200).json({ message: 'User promoted to admin.' });
  } catch (error) {
    console.error("❌ Error promoting user:", error);
    res.status(500).json({ message: 'Server error.' });
  }
};


exports.removeMember = async (req, res) => {
  const { groupId } = req.params;
  const { userEmailToRemove } = req.body;

  console.log("Remove Request: ", { groupId, userEmailToRemove });

  try {
    // ✅ Fix here: search by email
    const user = await User.findOne({ where: { email: userEmailToRemove } });

    if (!user) {
      console.log("❌ User not found.");
      return res.status(404).json({ message: 'User not found.' });
    }

    const member = await GroupMember.findOne({
      where: { groupId: parseInt(groupId), userId: user.id }
    });

    if (!member) {
      console.log("❌ Not a group member.");
      return res.status(404).json({ message: 'User is not a member of the group.' });
    }

    await member.destroy();

    res.status(200).json({ message: 'User removed from the group.' });
  } catch (error) {
    console.error("Error removing member:", error);
    res.status(500).json({ message: 'Server error.' });
  }
};

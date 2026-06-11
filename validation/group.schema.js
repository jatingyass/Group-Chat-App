const { z } = require('zod');

const createGroupSchema = z.object({
  name: z.string().trim().min(2, 'Group name must be at least 2 characters').max(80),
  members: z.array(z.coerce.number().int().positive()).max(200).optional().default([]),
});

const groupIdParamSchema = z.object({
  groupId: z.coerce.number().int().positive(),
});

const inviteUserSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email format'),
});

const promoteUserSchema = z.object({
  userNameToPromote: z.string().trim().min(1),
});

const removeMemberSchema = z.object({
  userEmailToRemove: z.string().trim().toLowerCase().email('Invalid email format'),
});

module.exports = {
  createGroupSchema,
  groupIdParamSchema,
  inviteUserSchema,
  promoteUserSchema,
  removeMemberSchema,
};

const { z } = require('zod');

// A message either has text, or an attachment, or both. Disallow empty payloads.
const sendMessageSchema = z
  .object({
    groupId: z.coerce.number().int().positive(),
    message: z.string().trim().max(2000, 'Message too long').default(''),
    fileUrl: z.string().max(1000).optional().nullable(),
    fileName: z.string().max(255).optional().nullable(),
    fileMimeType: z.string().max(100).optional().nullable(),
    fileSize: z.coerce.number().int().nonnegative().optional().nullable(),
  })
  .refine(
    (v) => (v.message && v.message.length > 0) || Boolean(v.fileUrl),
    { message: 'Either message text or a file attachment is required', path: ['message'] },
  );

const getMessagesParamSchema = z.object({
  groupId: z.coerce.number().int().positive(),
});

const getMessagesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  before: z.coerce.number().int().positive().optional(),
});

const presignedUrlQuerySchema = z.object({
  filename: z.string().trim().min(1).max(200),
  filetype: z.string().regex(/^[a-zA-Z0-9.+-]+\/[a-zA-Z0-9.+-]+$/, 'Invalid mime type'),
  filesize: z.coerce.number().int().min(1).max(100 * 1024 * 1024).optional(), // 100 MB
});

module.exports = {
  sendMessageSchema,
  getMessagesParamSchema,
  getMessagesQuerySchema,
  presignedUrlQuerySchema,
};

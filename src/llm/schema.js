const { z } = require('zod');

const TriageSchema = z.object({
  category: z.enum(['billing', 'bug', 'feature', 'other']),
  urgency: z.enum(['low', 'normal', 'high']),
  confidence: z.number().min(0).max(1),
  reason: z.string().min(1).max(300),
});

const TriageInputSchema = z.object({
  text: z.string().min(1).max(2000),
});

module.exports = { TriageSchema, TriageInputSchema };
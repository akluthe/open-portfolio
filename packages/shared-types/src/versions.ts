import { z } from 'zod';

// Metadata for one saved version of a resume or tailoring profile. Field names
// match the JSON projected by the .NET ListVersionsAsync queries (no doc body).
export const resumeVersionMetaSchema = z.object({
  version: z.number().int().positive(),
  createdAt: z.string(),
  createdBy: z.string().nullable().optional(),
  changeSummary: z.string().nullable().optional()
});

export const resumeVersionListSchema = z.array(resumeVersionMetaSchema);

export type ResumeVersionMeta = z.infer<typeof resumeVersionMetaSchema>;

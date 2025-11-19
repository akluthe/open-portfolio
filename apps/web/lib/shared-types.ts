// Re-export from shared-types package
// This is a workaround for Turbopack module resolution issues
// Import explicitly to ensure exports work
import { resumeSchema, type ResumeDocument, type ResumeExperience, type ResumeSkillGroup } from '@resume-platform/shared-types';

export { resumeSchema, type ResumeDocument, type ResumeExperience, type ResumeSkillGroup };


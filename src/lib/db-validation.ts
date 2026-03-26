/**
 * Database validation utilities to handle business logic constraints
 * that can't be enforced at the database level
 */

// Credits validation
export const validateCredits = (credits: number): boolean => {
  return credits >= 0 && credits <= 10000;
};

export const sanitizeCredits = (credits: number): number => {
  if (credits < 0) return 0;
  if (credits > 10000) return 10000;
  return credits;
};

// Commit hash collision handling
export const generateCommitKey = (projectId: string, commitHash: string, commitDate: string): string => {
  // Create a composite key to handle potential hash collisions
  return `${projectId}-${commitHash}-${commitDate}`;
};

// Meeting status validation
export const VALID_MEETING_STATUSES = ['PROCESSING', 'COMPLETED', 'FAILED'] as const;
export type MeetingStatus = typeof VALID_MEETING_STATUSES[number];

export const validateMeetingStatus = (status: string): status is MeetingStatus => {
  return VALID_MEETING_STATUSES.includes(status as MeetingStatus);
};

export const sanitizeMeetingStatus = (status: string): MeetingStatus => {
  return validateMeetingStatus(status) ? status : 'PROCESSING';
};

// Project status validation
export const VALID_PROJECT_STATUSES = ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'] as const;
export type ProjectStatus = typeof VALID_PROJECT_STATUSES[number];

export const validateProjectStatus = (status: string): status is ProjectStatus => {
  return VALID_PROJECT_STATUSES.includes(status as ProjectStatus);
};

export const sanitizeProjectStatus = (status: string): ProjectStatus => {
  return validateProjectStatus(status) ? status : 'PENDING';
};

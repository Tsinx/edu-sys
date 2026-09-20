export interface PreparationNote {
  text: string;
  revision: number;
  updatedAt?: string;
  updatedBy?: string;
}
export interface ReadingProgress {
  slideKey: string;
  deckVersion: string;
  revision: number;
  updatedAt?: string;
}
export interface PortalPreferences {
  compactSidebar: boolean;
  classReminders: boolean;
  submissionsReadAt: string;
}
export interface StartClassOptions {
  mode?: "resume" | "new";
  requestId?: string;
  lesson?: number;
  scheduledSessionId?: string;
  room?: string;
}

export type PageToolsRole = 'teacher' | 'reader' | 'student' | 'projection';
export interface PageToolScope {
  pageKey: string;
  audience?: 'teacher' | 'local';
}

/** 'reader' runs local controllers; it never grants permission to send teacher events. */
export function pageToolsAllowed(definition: PageToolScope, pageKey: string, role: PageToolsRole) {
  return definition.pageKey === pageKey && role !== 'projection'
    && (role !== 'student' || definition.audience === 'local');
}

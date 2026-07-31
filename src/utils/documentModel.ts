// Types for Hussayni Document Model

export interface Token {
  type: 'H' | 'B' | 'F' | 'P';
  text: string;
  lineIndex: number;
}

export interface BodyFooterPair {
  id: string;
  body: string;
  bodyLineIndex: number;
  footer: string;
  footerLineIndex: number;
  activeHeader: string;
}

export interface ValidationError {
  line: number;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

export interface ParsedPage {
  pageNumber: number;
  headerText: string;
  fontSize: number;
  lineBreakSize: number;
  pairs: BodyFooterPair[];
}

export type DocumentItem =
  | { type: 'pair'; data: BodyFooterPair }
  | { type: 'break'; lineIndex: number };

export interface UserPreferences {
  theme: 'slate' | 'warm' | 'dark' | 'classic';
  language?: 'en' | 'ar';
  minFontSize: number;
  maxFontSize: number;
  paragraphSpacing: 'compact' | 'normal' | 'relaxed';
  showLineNumbers: boolean;
  editorFontSize: number;
  editorRtl: boolean;
  zoom: number;
  zoomH?: number;
  zoomP?: number;
  showDebug: boolean;
  showPageNumber: boolean;
  footerFontSize: number;
  includeExportTimestamp?: boolean;
  outputMode?: 'P' | 'H';
  headerFontSize?: number;
  headerLineSpacing?: number;
  headerTheme?: 'dark' | 'light';
  showCompilationLog?: boolean;
}

export interface RecentDocument {
  id: string;
  name: string;
  markup: string;
  lastSaved: string; // ISO string
  leftFooter?: string;
  rightFooter?: string;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'slate',
  language: 'en',
  minFontSize: 16,
  maxFontSize: 32,
  paragraphSpacing: 'normal',
  showLineNumbers: true,
  editorFontSize: 13,
  editorRtl: true,
  zoom: 75,
  zoomH: 75,
  zoomP: 75,
  showDebug: false,
  showPageNumber: true,
  footerFontSize: 14,
  includeExportTimestamp: false,
  outputMode: 'P',
  headerFontSize: 145,
  headerLineSpacing: 1.2,
  headerTheme: 'dark',
  showCompilationLog: true
};

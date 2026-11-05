import type { UploadWarning } from './api/lessonsApi';

/**
 * What the page that created or filled a lesson tells the lesson page, through the router's
 * navigation state: a message shown once and gone after a reload.
 */
export interface LessonPageState {
  /** The text was just read from a file. */
  uploaded?: boolean;
  warnings?: UploadWarning[];
  /** The lesson was made but the file could not be read; already in Serbian. */
  uploadError?: string;
}

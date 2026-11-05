export type SubjectColor = 'mint' | 'blush' | 'butter' | 'lilac' | 'sky' | 'pistachio';
export type SubjectIcon = 'leaf' | 'calculator' | 'book' | 'globe' | 'palette';

/** A subject as the cards and blobs draw it: the API has no colour or icon, so they are chosen. */
export interface Subject {
  id: string;
  name: string;
  color: SubjectColor;
  icon: SubjectIcon;
}

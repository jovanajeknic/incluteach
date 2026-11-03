import type { SupportProfile } from '@/features/student/types';
import { text } from '@/text/sr-Latn';

/** Human-readable needs for a student. Needs only; diagnoses are never stored or shown. */
export function needLabels(needs: SupportProfile): string[] {
  const t = text.needs;
  const labels: string[] = [];
  if (needs.preferSimplifiedText) labels.push(t.preferSimplifiedText);
  if (needs.preferMoreExamples) labels.push(t.preferMoreExamples);
  if (needs.preferStepByStep) labels.push(t.preferStepByStep);
  if (needs.readingPreset === 'easier-reading') labels.push(t.easierReading);
  return labels;
}

import { useState } from 'react';
import { needsReview, useSchool } from '@/features/school/schoolContext';
import type { SchoolLesson } from '@/features/school/types';
import { Button } from '@/shared/ui/button';
import { text } from '@/text/sr-Latn';
import { SectionCard, StatusMessage } from './SectionCard';

/** Students only ever see what the teacher approved here. */
export function ApprovalPanel({ lesson }: { lesson: SchoolLesson }) {
  const t = text.lessonDetail.approval;
  const { approveLesson } = useSchool();
  const [confirming, setConfirming] = useState(false);
  const [justApproved, setJustApproved] = useState(false);
  const processing = lesson.status === 'processing';
  const pending = lesson.status === 'draft' || needsReview(lesson);

  return (
    <SectionCard id="approval-heading" title={t.heading} intro={t.intro} variant="side">
      {processing ? (
        <p className="text-ink-soft">{t.waitForAi}</p>
      ) : !pending ? (
        <p className="hand-note text-mint-ink">✓ {t.nothingToApprove}</p>
      ) : confirming ? (
        <div>
          <p className="font-medium text-ink">{t.confirmText}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={() => {
                approveLesson(lesson.id);
                setConfirming(false);
                setJustApproved(true);
              }}
              className="h-9 px-4"
            >
              {t.confirm}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirming(false)}
              className="h-9 px-4"
            >
              {t.cancel}
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          onClick={() => {
            setConfirming(true);
            setJustApproved(false);
          }}
          className="h-10 w-full px-4"
        >
          {t.approve}
        </Button>
      )}
      <StatusMessage message={justApproved ? t.approved : undefined} />
    </SectionCard>
  );
}

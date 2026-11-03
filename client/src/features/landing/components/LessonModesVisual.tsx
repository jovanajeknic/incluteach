import { FileText, Headphones, ImageIcon, ListChecks, Play, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/utils';
import { text } from '@/text/sr-Latn';
import { WaterCycleIllustration } from './WaterCycleIllustration';

// Fixed heights give the static waveform a natural, hand-made rhythm.
const waveform = [8, 14, 22, 12, 28, 18, 32, 20, 12, 26, 16, 30, 14, 22, 10, 18, 8];

interface ModeCardProps {
  icon: LucideIcon;
  label: string;
  comingSoon?: boolean;
  className?: string;
  children: ReactNode;
}

function ModeCard({ icon: Icon, label, comingSoon, className, children }: ModeCardProps) {
  return (
    <div className={cn('rounded-2xl border bg-card p-4 shadow-soft sm:p-5', className)}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-petrol-deep">
          <span className="flex size-7 items-center justify-center rounded-full bg-petrol-tint">
            <Icon className="size-4" />
          </span>
          {label}
        </span>
        {comingSoon && (
          <span className="rounded-full bg-gold-tint px-2 py-0.5 text-xs font-semibold text-apricot-ink">
            {text.landing.badges.comingSoon}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

/**
 * One lesson shown four ways. The whole composition is illustrative: its parts are hidden
 * from screen readers and the visible caption describes it, including what is not built yet.
 */
export function LessonModesVisual() {
  const t = text.landing.visual;

  return (
    <figure aria-labelledby="lesson-modes-caption" className="relative">
      {/* Decorative backdrop: soft shapes and a path that links the four modes. */}
      <div aria-hidden="true" className="pointer-events-none absolute -inset-6 -z-10 sm:-inset-10">
        <div className="absolute top-0 right-0 size-64 rounded-full bg-petrol-tint/70 blur-2xl sm:size-80" />
        <div className="absolute bottom-6 left-0 size-40 rounded-full bg-apricot-tint blur-2xl" />
        <svg
          viewBox="0 0 400 400"
          className="absolute inset-0 size-full"
          preserveAspectRatio="none"
        >
          <path
            d="M40 360C80 250 160 230 200 180S300 60 370 40"
            fill="none"
            className="stroke-petrol/25"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="1 9"
          />
        </svg>
      </div>

      <div aria-hidden="true" className="grid grid-cols-6 gap-3 sm:gap-4">
        <ModeCard
          icon={FileText}
          label={t.modeText}
          className="col-span-6 shadow-lifted sm:col-span-4"
        >
          <p className="text-sm text-ink-soft">{t.lessonMeta}</p>
          <p className="mt-1 font-display text-xl leading-snug font-semibold text-ink">
            {t.lessonTitle}
          </p>
          <div className="mt-3 space-y-2 text-[0.95rem] leading-relaxed text-ink">
            {t.textLines.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        </ModeCard>

        <ModeCard
          icon={ImageIcon}
          label={t.modeVisual}
          comingSoon
          className="col-span-6 flex flex-col min-[420px]:col-span-3 sm:col-span-2 sm:row-span-2 sm:translate-y-6"
        >
          <div className="flex flex-1 items-center rounded-xl bg-paper p-2">
            <WaterCycleIllustration />
          </div>
        </ModeCard>

        <ModeCard
          icon={ListChecks}
          label={t.modeSummary}
          comingSoon
          className="col-span-6 min-[420px]:col-span-3 sm:col-span-2"
        >
          <ol className="space-y-2 text-sm text-ink">
            {t.summaryItems.map((item, index) => (
              <li key={item} className="flex gap-2">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-apricot-tint text-xs font-bold text-apricot-ink">
                  {index + 1}
                </span>
                {item}
              </li>
            ))}
          </ol>
        </ModeCard>

        <ModeCard
          icon={Headphones}
          label={t.modeAudio}
          comingSoon
          className="col-span-6 sm:col-span-2"
        >
          <div className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-petrol text-white">
              <Play className="size-4 translate-x-px fill-current" />
            </span>
            <div className="flex h-8 flex-1 items-center gap-[3px]">
              {waveform.map((height, index) => (
                <span
                  key={index}
                  className={cn('w-1 rounded-full', index < 6 ? 'bg-petrol' : 'bg-petrol/30')}
                  style={{ height: `${height}px` }}
                />
              ))}
            </div>
          </div>
          <p className="mt-2 text-sm text-ink-soft">{t.audioLabel}</p>
        </ModeCard>
      </div>

      <figcaption
        id="lesson-modes-caption"
        className="mt-10 flex flex-col gap-2 text-sm text-ink-soft sm:mt-12 sm:flex-row sm:items-start"
      >
        <span className="inline-flex w-fit shrink-0 items-center rounded-full border border-border bg-card px-3 py-1 font-semibold text-ink">
          {text.landing.badges.illustrative}
        </span>
        <span className="max-w-prose">{t.caption}</span>
      </figcaption>
    </figure>
  );
}

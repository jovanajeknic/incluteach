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
  /** Surface and icon-bubble colours: each way of learning gets its own pastel. */
  surface: string;
  bubble: string;
  comingSoon?: boolean;
  className?: string;
  children: ReactNode;
}

function ModeCard({
  icon: Icon,
  label,
  surface,
  bubble,
  comingSoon,
  className,
  children,
}: ModeCardProps) {
  return (
    <div className={cn('hover-hop rounded-3xl p-4 shadow-soft sm:p-5', surface, className)}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-2 font-display text-sm font-extrabold text-ink">
          <span className={cn('flex size-8 items-center justify-center rounded-full', bubble)}>
            <Icon className="size-4" />
          </span>
          {label}
        </span>
        {comingSoon && (
          <span className="rounded-full bg-card/80 px-2.5 py-0.5 text-xs font-bold text-blush-ink">
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
      {/* Decorative pastel bubbles behind the cards. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-8 -right-6 size-40 rounded-full bg-butter sm:size-56" />
        <div className="absolute bottom-16 -left-10 size-32 rounded-full bg-blush sm:size-44" />
        <div className="absolute top-1/2 right-1/3 size-16 rounded-full bg-lilac" />
      </div>

      <div aria-hidden="true" className="grid grid-cols-6 gap-3 sm:gap-4">
        <ModeCard
          icon={FileText}
          label={t.modeText}
          surface="bg-card"
          bubble="bg-mint text-mint-ink"
          className="col-span-6 shadow-lifted sm:col-span-4"
        >
          <p className="text-sm text-ink-soft">{t.lessonMeta}</p>
          <p className="mt-1 font-display text-xl leading-snug font-extrabold text-ink">
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
          surface="bg-sky"
          bubble="bg-card text-sky-ink"
          comingSoon
          className="col-span-6 flex flex-col min-[420px]:col-span-3 sm:col-span-2 sm:row-span-2 sm:mt-8"
        >
          <div className="flex flex-1 items-center rounded-2xl bg-card p-2">
            <WaterCycleIllustration />
          </div>
        </ModeCard>

        <ModeCard
          icon={ListChecks}
          label={t.modeSummary}
          surface="bg-butter"
          bubble="bg-card text-butter-ink"
          comingSoon
          className="col-span-6 min-[420px]:col-span-3 sm:col-span-2"
        >
          <ol className="space-y-2 text-sm text-ink">
            {t.summaryItems.map((item, index) => (
              <li key={item} className="flex gap-2">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-butter-deep text-xs font-bold text-ink">
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
          surface="bg-lilac"
          bubble="bg-card text-lilac-ink"
          comingSoon
          className="col-span-6 sm:col-span-2"
        >
          <div className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-lilac-ink text-white">
              <Play className="size-4 translate-x-px fill-current" />
            </span>
            <div className="flex h-8 flex-1 items-center gap-[3px]">
              {waveform.map((height, index) => (
                <span
                  key={index}
                  className={cn('w-1 rounded-full', index < 6 ? 'bg-lilac-ink' : 'bg-lilac-deep')}
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
        className="mt-8 flex flex-col gap-2 text-sm text-ink-soft sm:flex-row sm:items-start"
      >
        <span className="inline-flex w-fit shrink-0 items-center rounded-full bg-card px-3 py-1 font-display font-extrabold text-ink shadow-soft">
          {text.landing.badges.illustrative}
        </span>
        <span className="max-w-prose">{t.caption}</span>
      </figcaption>
    </figure>
  );
}

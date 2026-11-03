import {
  ArrowRight,
  BookOpen,
  Check,
  Headphones,
  HeartHandshake,
  House,
  MessageSquareText,
  Type,
  type LucideIcon,
} from 'lucide-react';
import { Link } from 'react-router';
import { LessonStatusBadge } from '@/features/lessons/components/LessonStatusBadge';
import { teacherHomePath } from '@/features/lessons/paths';
import type { LessonStatus } from '@/features/lessons/types';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { text } from '@/text/sr-Latn';
import { sectionIds } from '../sections';
import { AvailabilityBadge } from './AvailabilityBadge';
import { SectionHeading } from './SectionHeading';

function BenefitList({ items, className }: { items: readonly string[]; className?: string }) {
  return (
    <ul className={cn('space-y-3', className)}>
      {items.map((item) => (
        <li key={item} className="flex gap-3 text-ink">
          <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-card text-navy shadow-soft">
            <Check aria-hidden="true" className="size-4" strokeWidth={3} />
          </span>
          {item}
        </li>
      ))}
    </ul>
  );
}

function IconBubble({ icon: Icon, className }: { icon: LucideIcon; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn('flex size-12 items-center justify-center rounded-2xl shadow-soft', className)}
    >
      <Icon className="size-6" />
    </span>
  );
}

// Illustrative rows built from the real status badge, to preview the teacher's lesson list.
const previewLessons: { title: string; status: LessonStatus }[] = [
  { title: 'Kruženje vode u prirodi', status: 'in_review' },
  { title: 'Imenice i pridjevi', status: 'approved' },
  { title: 'Sabiranje do 100', status: 'assigned' },
];

export function AudiencesSection() {
  const t = text.landing.audiences;
  const headingId = `${sectionIds.audiences}-heading`;

  return (
    <section id={sectionIds.audiences} aria-labelledby={headingId} className="py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          id={headingId}
          eyebrow={t.eyebrow}
          title={t.title}
          intro={t.intro}
          align="center"
          className="reveal-on-scroll"
        />

        {/* Teacher: the one corner that already exists, so it gets the widest stage. */}
        <article
          aria-labelledby="audience-teacher"
          className="reveal-on-scroll mt-16 grid overflow-hidden rounded-[2rem] border bg-card shadow-soft lg:grid-cols-[1.1fr_1fr]"
        >
          <div className="p-7 sm:p-10 lg:p-12">
            <p className="text-sm font-bold tracking-wide text-navy uppercase">{t.teacher.label}</p>
            <h3
              id="audience-teacher"
              className="mt-3 font-display text-2xl leading-snug font-semibold text-ink sm:text-3xl"
            >
              {t.teacher.title}
            </h3>
            <BenefitList items={t.teacher.benefits} className="mt-6" />
            <div className="mt-8 flex flex-col gap-4">
              <AvailabilityBadge availability="inDemo" />
              <p className="text-ink-soft">{t.teacher.availability}</p>
              <Button asChild size="lg" className="w-fit text-base">
                <Link to={teacherHomePath}>
                  {t.teacher.action}
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </div>

          <div
            aria-hidden="true"
            className="relative flex items-center bg-navy-tint p-7 sm:p-10 lg:p-12"
          >
            <div className="absolute -right-10 -bottom-10 size-48 rounded-full bg-card/50" />
            <ul className="relative w-full space-y-3">
              {previewLessons.map((lesson, index) => (
                <li
                  key={lesson.title}
                  className={cn(
                    'flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-card p-4 shadow-soft',
                    index === 1 && 'lg:translate-x-6',
                  )}
                >
                  <span className="font-semibold text-ink">{lesson.title}</span>
                  <LessonStatusBadge status={lesson.status} />
                </li>
              ))}
            </ul>
          </div>
        </article>

        <div className="mt-8 grid gap-8 md:grid-cols-2">
          {/* Student: icons on top, as a playful cluster. */}
          <article
            aria-labelledby="audience-student"
            className="reveal-on-scroll flex flex-col rounded-[2rem] bg-sky-tint p-7 sm:p-10"
          >
            <div className="mb-8 flex gap-3">
              <IconBubble icon={BookOpen} className="bg-card text-sky-ink" />
              <IconBubble icon={Type} className="translate-y-3 bg-sun text-navy-deep" />
              <IconBubble icon={Headphones} className="bg-card text-violet-ink" />
            </div>
            <p className="text-sm font-bold tracking-wide text-sky-ink uppercase">
              {t.student.label}
            </p>
            <h3
              id="audience-student"
              className="mt-3 font-display text-2xl leading-snug font-semibold text-ink"
            >
              {t.student.title}
            </h3>
            <BenefitList items={t.student.benefits} className="mt-6 flex-1" />
            <AvailabilityBadge availability="comingSoon" className="mt-8" />
          </article>

          {/* Parent: a warmer surface, with the icon beside the heading. */}
          <article
            aria-labelledby="audience-parent"
            className="reveal-on-scroll flex flex-col rounded-[2rem] bg-coral-tint p-7 sm:p-10 md:mt-12"
          >
            <div className="flex items-start gap-4">
              <IconBubble icon={HeartHandshake} className="bg-card text-coral-ink" />
              <div>
                <p className="text-sm font-bold tracking-wide text-coral-ink uppercase">
                  {t.parent.label}
                </p>
                <h3
                  id="audience-parent"
                  className="mt-3 font-display text-2xl leading-snug font-semibold text-ink"
                >
                  {t.parent.title}
                </h3>
              </div>
            </div>
            <BenefitList items={t.parent.benefits} className="mt-6 flex-1" />
            <div className="mt-8 flex items-center justify-between gap-4">
              <AvailabilityBadge availability="comingSoon" />
              <span aria-hidden="true" className="flex gap-2 text-coral-ink/70">
                <House className="size-5" />
                <MessageSquareText className="size-5" />
              </span>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

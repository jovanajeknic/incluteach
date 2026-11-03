import type { ReactNode } from 'react';

interface MessagePageProps {
  title: string;
  description: string;
  action?: ReactNode;
}

/** Full-page message for states such as "not found" or an unexpected error. */
export function MessagePage({ title, description, action }: MessagePageProps) {
  return (
    <div className="mx-auto max-w-xl py-12 text-center">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
      <p className="mt-3 text-muted-foreground">{description}</p>
      {action && <div className="mt-8 flex justify-center">{action}</div>}
    </div>
  );
}

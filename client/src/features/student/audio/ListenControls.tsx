import { PauseIcon, PlayIcon, SpeakerSlashIcon, StopIcon } from '@phosphor-icons/react';
import { useId } from 'react';
import { Button } from '@/shared/ui/button';
import { NativeSelect, NativeSelectOption } from '@/shared/ui/native-select';
import { text } from '@/text/sr-Latn';
import type { SpeechAvailability, SpeechRate, SpeechStatus } from './useLessonSpeech';

interface ListenControlsProps {
  availability: SpeechAvailability;
  status: SpeechStatus;
  rate: SpeechRate;
  onRateChange: (rate: SpeechRate) => void;
  onPlay: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
}

/** Play, pause, stop and speed. Never starts on its own. */
export function ListenControls({
  availability,
  status,
  rate,
  onRateChange,
  onPlay,
  onPause,
  onResume,
  onStop,
}: ListenControlsProps) {
  const t = text.pupil.audio;
  const speedId = useId();

  if (availability !== 'ready') {
    // Honest message instead of a button that would do nothing.
    return (
      <p className="flex items-center gap-2 rounded-full bg-card px-4 py-2 text-sm text-ink-soft">
        <SpeakerSlashIcon aria-hidden="true" weight="duotone" className="size-5 shrink-0" />
        {availability === 'unsupported' ? t.unsupported : t.noVoice}
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === 'idle' && (
        <Button type="button" onClick={onPlay} className="h-11 px-5">
          <PlayIcon aria-hidden="true" weight="fill" />
          {t.listen}
        </Button>
      )}
      {status === 'playing' && (
        <Button type="button" onClick={onPause} className="h-11 px-5">
          <PauseIcon aria-hidden="true" weight="fill" />
          {t.pause}
        </Button>
      )}
      {status === 'paused' && (
        <Button type="button" onClick={onResume} className="h-11 px-5">
          <PlayIcon aria-hidden="true" weight="fill" />
          {t.resume}
        </Button>
      )}
      {status !== 'idle' && (
        <Button type="button" variant="outline" onClick={onStop} className="h-11 px-4">
          <StopIcon aria-hidden="true" weight="fill" />
          {t.stop}
        </Button>
      )}
      <label htmlFor={speedId} className="sr-only">
        {t.speed}
      </label>
      <div className="w-32">
        <NativeSelect
          id={speedId}
          value={rate}
          onChange={(event) => onRateChange(event.target.value as SpeechRate)}
          className="h-11 rounded-full bg-card text-base md:text-base"
        >
          <NativeSelectOption value="slow">{t.speeds.slow}</NativeSelectOption>
          <NativeSelectOption value="normal">{t.speeds.normal}</NativeSelectOption>
          <NativeSelectOption value="fast">{t.speeds.fast}</NativeSelectOption>
        </NativeSelect>
      </div>
    </div>
  );
}

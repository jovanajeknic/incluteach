import { CopyIcon, DownloadSimpleIcon } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { formatDate } from '@/shared/lib/format';
import { Button } from '@/shared/ui/button';
import { text } from '@/text/sr-Latn';
import type { Activation } from '../api/usersApi';

const t = text.admin.link;

interface ActivationLinkProps {
  activation: Activation;
  person: { fullName: string; username: string };
}

/**
 * The one-time link as a QR code, as text to copy, and as a picture to save. The picture is
 * drawn here, in the browser: the link is a secret and never goes to an outside QR service.
 */
export function ActivationLink({ activation, person }: ActivationLinkProps) {
  const [picture, setPicture] = useState<string | null>(null);
  const [pictureFailed, setPictureFailed] = useState(false);
  const [copyResult, setCopyResult] = useState<'copied' | 'failed' | null>(null);

  useEffect(() => {
    let current = true;
    // Loaded on demand: only an administrator who hands out a link needs the library.
    import('qrcode')
      .then(({ default: QRCode }) =>
        QRCode.toDataURL(activation.url, { width: 320, margin: 2, errorCorrectionLevel: 'M' }),
      )
      .then((url) => current && setPicture(url))
      .catch(() => current && setPictureFailed(true));
    return () => {
      current = false;
    };
  }, [activation.url]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(activation.url);
      setCopyResult('copied');
    } catch {
      // No clipboard (an old browser, or a page that is not secure): the link is on the screen.
      setCopyResult('failed');
    }
  }

  return (
    <div className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-start">
      <div className="flex size-44 items-center justify-center rounded-2xl bg-white p-2">
        {picture ? (
          <img
            src={picture}
            alt={t.qrAlt(person.fullName)}
            width={160}
            height={160}
            className="size-40"
          />
        ) : pictureFailed ? (
          <p className="p-2 text-center text-sm text-ink-soft">{t.qrFailed}</p>
        ) : null}
      </div>
      <div className="grid min-w-0 gap-3">
        <div>
          <p className="text-sm font-medium text-ink-soft">{t.linkLabel}</p>
          <p className="font-mono text-sm break-all text-ink select-all">{activation.url}</p>
        </div>
        <p className="text-sm font-medium text-ink">
          {t.expires(formatDate(activation.expiresAt))}
        </p>
        <div className="flex flex-wrap gap-3">
          <Button type="button" variant="outline" size="lg" onClick={() => void copy()}>
            <CopyIcon aria-hidden="true" weight="bold" className="size-5" />
            {t.copy}
          </Button>
          {picture && (
            <Button asChild variant="outline" size="lg">
              <a href={picture} download={`aktivacija-${person.username}.png`}>
                <DownloadSimpleIcon aria-hidden="true" weight="bold" className="size-5" />
                {t.download}
              </a>
            </Button>
          )}
        </div>
        <div role="status" aria-live="polite" className="empty:hidden">
          {copyResult === 'copied' && <p className="font-medium text-mint-ink">{t.copied}</p>}
          {copyResult === 'failed' && <p className="font-medium text-blush-ink">{t.copyFailed}</p>}
        </div>
        <p className="text-sm text-ink-soft">{t.onlyNow}</p>
      </div>
    </div>
  );
}

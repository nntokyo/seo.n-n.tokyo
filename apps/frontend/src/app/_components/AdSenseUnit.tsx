'use client';

import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    adsbygoogle?: Array<Record<string, unknown>>;
  }
}

interface AdSenseUnitProps {
  placement?: 'home' | 'tools' | 'tool-content';
  className?: string;
}

export function AdSenseUnit({
  placement = 'tool-content',
  className = '',
}: AdSenseUnitProps) {
  const initialized = useRef(false);
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT_ID || '';
  const slotId = process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_SLOT_ID || '';
  const isConfigured =
    process.env.NODE_ENV === 'production' &&
    /^ca-pub-\d+$/.test(clientId) &&
    /^\d+$/.test(slotId);

  useEffect(() => {
    if (!isConfigured || initialized.current) return;

    initialized.current = true;
    try {
      window.adsbygoogle = window.adsbygoogle || [];
      window.adsbygoogle.push({});
    } catch {
      initialized.current = false;
    }
  }, [isConfigured]);

  if (!isConfigured) return null;

  return (
    <aside
      aria-label="広告"
      data-ad-placement={placement}
      className={`border-y border-white/[0.06] bg-[#080B11] px-4 py-8 sm:px-6 ${className}`}
    >
      <div className="mx-auto max-w-5xl">
        <p className="mb-3 text-center text-[10px] font-medium tracking-[0.2em] text-slate-500">
          広告
        </p>
        <div className="min-h-[140px] overflow-hidden rounded-xl">
          <ins
            className="adsbygoogle block min-h-[140px]"
            data-ad-client={clientId}
            data-ad-slot={slotId}
            data-ad-format="auto"
            data-full-width-responsive="true"
          />
        </div>
      </div>
    </aside>
  );
}

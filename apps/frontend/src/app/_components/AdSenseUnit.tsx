'use client';

import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    adsbygoogle?: Array<Record<string, unknown>>;
  }
}

export function AdSenseUnit() {
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
    <aside aria-label="広告" className="border-y border-white/[0.06] bg-[#080B11] px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <p className="mb-2 text-center text-[10px] tracking-[0.2em] text-slate-600">広告</p>
        <ins
          className="adsbygoogle block min-h-[120px] overflow-hidden"
          data-ad-client={clientId}
          data-ad-slot={slotId}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      </div>
    </aside>
  );
}

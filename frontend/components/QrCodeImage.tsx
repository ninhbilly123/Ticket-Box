'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import QRCode from 'qrcode';

interface QrCodeImageProps {
  value: string;
  alt: string;
  className?: string;
}

export default function QrCodeImage({ value, alt, className }: QrCodeImageProps) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    QRCode.toDataURL(value, {
      errorCorrectionLevel: 'M',
      margin: 2,
      scale: 6,
      color: {
        dark: '#020617',
        light: '#ffffff',
      },
    })
      .then((dataUrl) => {
        if (active) setSrc(dataUrl);
      })
      .catch(() => {
        if (active) setSrc(null);
      });

    return () => {
      active = false;
    };
  }, [value]);

  if (!src) {
    return (
      <div
        aria-label={alt}
        className={`flex items-center justify-center bg-white text-xs font-semibold text-slate-500 ${className || ''}`}
      >
        QR
      </div>
    );
  }

  return <Image src={src} alt={alt} width={180} height={180} unoptimized className={className} />;
}

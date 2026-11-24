'use client';

import React, { useEffect, useState } from 'react';
import { thumbnailUrl } from '@/lib/imageUrls';

const PLACEHOLDER = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80';

type ThumbImageProps = Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  /** The original image URL. A small preview is requested first; the original is the fallback. */
  src: string;
  /** Show the stock placeholder when even the original fails to load. */
  placeholder?: boolean;
};

export function ThumbImage({ src, placeholder = true, alt = '', onError, ...rest }: ThumbImageProps) {
  // 0 = thumbnail, 1 = original, 2 = placeholder
  const [stage, setStage] = useState(0);
  useEffect(() => setStage(0), [src]);

  const candidates = [thumbnailUrl(src), src, PLACEHOLDER];
  // Remote images and tiny uploads have no distinct thumbnail: skip straight to the original.
  const first = candidates[0] === src ? 1 : 0;
  const current = candidates[Math.max(stage, first)];

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      {...rest}
      src={current}
      alt={alt}
      onError={(event) => {
        const next = Math.max(stage, first) + 1;
        if (next < candidates.length && (placeholder || next < 2)) setStage(next);
        onError?.(event);
      }}
    />
  );
}

import React from 'react';
import { Globe, Youtube, Instagram, Sparkles, Link2 } from 'lucide-react';

interface PlatformIconProps {
  platform: string;
  iconName?: string;
  className?: string;
  size?: number;
}

export function PlatformIcon({
  platform,
  iconName,
  className = "w-4 h-4",
  size = 16,
}: PlatformIconProps) {
  const p = (platform || '').toLowerCase();
  const icon = iconName || p;

  // Check if icon is an emoji or short custom symbol
  const isEmoji =
    icon &&
    icon.length <= 4 &&
    !['instagram', 'twitter', 'x', 'tiktok', 'youtube', 'website'].includes(icon.toLowerCase());

  if (isEmoji) {
    return (
      <span
        style={{ fontSize: `${size}px`, lineHeight: 1 }}
        className="inline-flex items-center justify-center shrink-0 select-none"
      >
        {icon}
      </span>
    );
  }

  if (p === 'instagram' || icon === 'instagram') {
    return (
      <svg
        className={className}
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
        <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
      </svg>
    );
  }

  if (p === 'twitter' || p === 'x' || icon === 'twitter' || icon === 'x') {
    return (
      <svg
        className={className}
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    );
  }

  if (p === 'tiktok' || icon === 'tiktok') {
    return (
      <svg
        className={className}
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M19.589 6.686a4.793 4.793 0 0 1-3.77-4.245V2h-3.445v13.672a2.896 2.896 0 0 1-5.201 1.743l-.068-.102a2.895 2.895 0 0 1 2.373-4.537c.28 0 .548.04.804.116V9.387a6.34 6.34 0 0 0-6.257 6.03 6.341 6.341 0 0 0 7.893 6.096 6.34 6.34 0 0 0 4.706-6.11V8.62a8.214 8.214 0 0 0 5.176 1.83v-3.45a4.767 4.767 0 0 1-2.211-.314z" />
      </svg>
    );
  }

  if (p === 'youtube' || icon === 'youtube') {
    return <Youtube className={className} size={size} />;
  }

  if (p === 'website' || icon === 'website') {
    return <Globe className={className} size={size} />;
  }

  return <Link2 className={className} size={size} />;
}

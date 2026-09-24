export interface TagStyle {
  bg: string;
  text: string;
  border: string;
  dot: string;
}

export const TAG_COLOR_MAP: Record<string, TagStyle> = {
  Fashion: {
    bg: "bg-pink-500/10 text-pink-400 border-pink-500/20",
    text: "text-pink-400",
    border: "border-pink-500/30",
    dot: "bg-pink-500",
  },
  Fitness: {
    bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    text: "text-emerald-400",
    border: "border-emerald-500/30",
    dot: "bg-emerald-500",
  },
  Cosplay: {
    bg: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    text: "text-purple-400",
    border: "border-purple-500/30",
    dot: "bg-purple-500",
  },
  Tattoo: {
    bg: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    text: "text-rose-400",
    border: "border-rose-500/30",
    dot: "bg-rose-500",
  },
  Travel: {
    bg: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
    text: "text-cyan-400",
    border: "border-cyan-500/30",
    dot: "bg-cyan-500",
  },
  Blonde: {
    bg: "bg-amber-500/10 text-amber-300 border-amber-500/20",
    text: "text-amber-300",
    border: "border-amber-500/30",
    dot: "bg-amber-400",
  },
  Brunette: {
    bg: "bg-orange-800/15 text-orange-300 border-orange-700/30",
    text: "text-orange-300",
    border: "border-orange-700/40",
    dot: "bg-amber-700",
  },
  Türkiye: {
    bg: "bg-red-500/10 text-red-400 border-red-500/20",
    text: "text-red-400",
    border: "border-red-500/30",
    dot: "bg-red-500",
  },
  Turkey: {
    bg: "bg-red-500/10 text-red-400 border-red-500/20",
    text: "text-red-400",
    border: "border-red-500/30",
    dot: "bg-red-500",
  },
  Avrupa: {
    bg: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    text: "text-blue-400",
    border: "border-blue-500/30",
    dot: "bg-blue-500",
  },
  Europe: {
    bg: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    text: "text-blue-400",
    border: "border-blue-500/30",
    dot: "bg-blue-500",
  },
  Photography: {
    bg: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    text: "text-indigo-400",
    border: "border-indigo-500/30",
    dot: "bg-indigo-500",
  },
  Gaming: {
    bg: "bg-violet-500/10 text-violet-400 border-violet-500/20",
    text: "text-violet-400",
    border: "border-violet-500/30",
    dot: "bg-violet-500",
  },
};

const PALETTE: TagStyle[] = [
  { bg: "bg-teal-500/10 text-teal-400 border-teal-500/20", text: "text-teal-400", border: "border-teal-500/30", dot: "bg-teal-400" },
  { bg: "bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20", text: "text-fuchsia-400", border: "border-fuchsia-500/30", dot: "bg-fuchsia-400" },
  { bg: "bg-sky-500/10 text-sky-400 border-sky-500/20", text: "text-sky-400", border: "border-sky-500/30", dot: "bg-sky-400" },
  { bg: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20", text: "text-yellow-400", border: "border-yellow-500/30", dot: "bg-yellow-400" },
  { bg: "bg-lime-500/10 text-lime-400 border-lime-500/20", text: "text-lime-400", border: "border-lime-500/30", dot: "bg-lime-400" },
  { bg: "bg-slate-500/10 text-slate-300 border-slate-500/20", text: "text-slate-300", border: "border-slate-500/30", dot: "bg-slate-400" },
];

export const TAG_COLOR_OPTIONS: Record<string, TagStyle> = {
  pink: { bg: "bg-pink-500/10 text-pink-500 border-pink-500/20", text: "text-pink-500", border: "border-pink-500/30", dot: "bg-pink-500" },
  purple: { bg: "bg-purple-500/10 text-purple-500 border-purple-500/20", text: "text-purple-500", border: "border-purple-500/30", dot: "bg-purple-500" },
  blue: { bg: "bg-blue-500/10 text-blue-500 border-blue-500/20", text: "text-blue-500", border: "border-blue-500/30", dot: "bg-blue-500" },
  cyan: { bg: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20", text: "text-cyan-500", border: "border-cyan-500/30", dot: "bg-cyan-500" },
  emerald: { bg: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20", text: "text-emerald-500", border: "border-emerald-500/30", dot: "bg-emerald-500" },
  amber: { bg: "bg-amber-500/10 text-amber-500 border-amber-500/20", text: "text-amber-500", border: "border-amber-500/30", dot: "bg-amber-500" },
  orange: { bg: "bg-orange-500/10 text-orange-500 border-orange-500/20", text: "text-orange-500", border: "border-orange-500/30", dot: "bg-orange-500" },
  rose: { bg: "bg-rose-500/10 text-rose-500 border-rose-500/20", text: "text-rose-500", border: "border-rose-500/30", dot: "bg-rose-500" },
};

export function getTagStyle(tag: string, color?: string | null): TagStyle {
  if (color && TAG_COLOR_OPTIONS[color]) {
    return TAG_COLOR_OPTIONS[color];
  }
  if (TAG_COLOR_MAP[tag]) {
    return TAG_COLOR_MAP[tag];
  }
  // deterministic hash for unknown tags
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % PALETTE.length;
  return PALETTE[index];
}

export const PLATFORM_INFO: Record<string, { label: string; color: string; badgeBg: string; border: string; iconColor: string }> = {
  instagram: {
    label: "Instagram",
    color: "from-pink-500 via-rose-500 to-amber-500",
    badgeBg: "bg-gradient-to-r from-pink-500/20 via-rose-500/20 to-amber-500/20 text-pink-300 border-pink-500/30",
    border: "border-pink-500/40",
    iconColor: "text-pink-400",
  },
  twitter: {
    label: "X (Twitter)",
    color: "from-slate-700 to-slate-900",
    badgeBg: "bg-zinc-800/80 text-zinc-200 border-zinc-700",
    border: "border-zinc-700",
    iconColor: "text-zinc-300",
  },
  tiktok: {
    label: "TikTok",
    color: "from-cyan-400 to-pink-500",
    badgeBg: "bg-gradient-to-r from-cyan-500/20 to-pink-500/20 text-cyan-300 border-cyan-500/30",
    border: "border-cyan-500/40",
    iconColor: "text-cyan-400",
  },
  youtube: {
    label: "YouTube",
    color: "from-red-600 to-red-700",
    badgeBg: "bg-red-500/20 text-red-300 border-red-500/30",
    border: "border-red-500/40",
    iconColor: "text-red-400",
  },
  website: {
    label: "Website",
    color: "from-blue-600 to-indigo-600",
    badgeBg: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    border: "border-blue-500/40",
    iconColor: "text-blue-400",
  },
};

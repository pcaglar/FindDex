export const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=800&q=80',
];

export const SUGGESTED_TAGS = [
  'Fashion', 'Fitness', 'Cosplay', 'Tattoo', 'Travel',
  'Blonde', 'Brunette', 'Turkey', 'Europe', 'Photography', 'Gaming',
];

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const VALID_UPLOAD_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

export interface FormLink {
  platformKey: string;
  url: string;
  label?: string;
}

export interface FormImage {
  id?: string;
  url: string;
  isCover: boolean;
  sortOrder: number;
}

export const FIELD_CLASS = 'w-full px-3.5 py-2.5 rounded-xl bg-[#151c2e] border border-[#1f293d] text-white placeholder-slate-500 focus:outline-none focus:border-pink-500';

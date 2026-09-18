export interface VideoRelease {
  id: string;
  title: string;
  shortTitle: string;
  url: string;
  thumbnail: string;
  category: string;
  duration?: string;
  tags?: string[];
  isFeatured?: boolean;
}

export interface SocialLink {
  name: string;
  url: string;
  icon: string;
  handle: string;
}

export interface LivePlatform {
  name: string;
  url: string;
  icon: string;
  color: string;
  badge?: string;
  description: string;
}

export interface SubscriptionTier {
  name: string;
  url: string;
  icon: string;
  color: string;
  badge?: string;
  highlightText?: string;
}

export type LegalModalType = 'none' | 'impressum' | 'privacy' | 'newsletter' | 'share';

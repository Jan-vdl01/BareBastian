import type { IconComponent } from './icons';

export interface PortfolioLink {
  id: string;
  label: string;
  url: string;
  /** Kurzer Untertitel, z. B. Handle oder Beschreibung */
  description: string;
  icon: IconComponent;
  badge?: string;
}

export interface LinkGroup {
  id: string;
  title: string;
  subtitle: string;
  icon: IconComponent;
  /** Tailwind-Gradient für den Icon-Chip */
  accent: string;
  links: PortfolioLink[];
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export interface NavItem {
  label: string;
  href: string;
}

export type ContactTopic = 'allgemein' | 'kooperation' | 'presse' | 'support';

export interface ContactFormState {
  name: string;
  email: string;
  topic: ContactTopic;
  message: string;
}

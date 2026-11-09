/**
 * Abo-Pakete. PREISE SIND PLATZHALTER – hier anpassen.
 * Bei echter Zahlungsanbindung (z. B. Stripe) gehört die Preis-ID des Anbieters in `providerPriceId`.
 */
export type PlanId = 'monthly' | 'quarterly' | 'yearly';

export interface Plan {
  id: PlanId;
  name: string;
  months: number;
  /** Preis pro Abrechnungszeitraum in Euro */
  price: number;
  highlight?: string;
  providerPriceId?: string;
}

export const PLANS: Plan[] = [
  { id: 'monthly', name: 'Monatlich', months: 1, price: 9.99 },
  { id: 'quarterly', name: '3 Monate', months: 3, price: 24.99, highlight: 'Beliebt' },
  { id: 'yearly', name: '12 Monate', months: 12, price: 79.99, highlight: 'Bester Preis' },
];

export const PLAN_FEATURES = [
  'Komplette Videobibliothek in HD streamen',
  'Alle Fotoalben & exklusive Posts',
  'Modularer Chaturbate-Bio-Baukasten',
  'Jederzeit kündbar',
];

export const formatEuro = (value: number) =>
  value.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });

export const getPlan = (id: PlanId) => PLANS.find((p) => p.id === id) ?? PLANS[0];

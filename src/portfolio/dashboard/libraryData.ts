/**
 * Datentypen der Abonnenten-Bibliothek. Die Inhalte selbst verwaltet der Admin
 * in der App; Dateien liegen geschützt auf dem Server (nur mit aktivem Abo abrufbar).
 */

export interface VideoItem {
  id: string;
  title: string;
  description: string;
  duration: string;
  date: string; // ISO
  category: string;
  tags: string[];
  src?: string;
  poster?: string;
  hue: number; // Farbton der Platzhalter-Grafik
  /** Dateiendung bei hochgeladenen Dateien (für den Export) */
  fileExt?: string;
}

export interface PhotoItem {
  id: string;
  title: string;
  album: string;
  date: string;
  src?: string;
  hue: number;
  tall?: boolean;
  description?: string;
  fileExt?: string;
}

export interface PostItem {
  id: string;
  date: string;
  text: string;
  photoIds?: string[];
  videoId?: string;
  likes: number;
}

export const placeholderGradient = (hue: number) =>
  `radial-gradient(circle at 25% 20%, hsl(${hue} 90% 65% / .55), transparent 55%), radial-gradient(circle at 80% 85%, hsl(${(hue + 50) % 360} 85% 55% / .5), transparent 55%), linear-gradient(135deg, hsl(${hue} 45% 14%), hsl(${(hue + 30) % 360} 50% 8%))`;

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' });

/**
 * Inhalte der Abonnenten-Bibliothek.
 *
 * Eigene Dateien einbinden: Videos unter media/videos/, Fotos unter media/photos/
 * (neben der index.html) ablegen und hier den Pfad in `src` eintragen.
 * Fehlt eine Datei, zeigt die App automatisch eine Platzhalter-Grafik.
 *
 * ⚠️ Auf einem rein statischen Server sind Dateien im media/-Ordner für jeden
 * mit dem direkten Link abrufbar. Echter Schutz braucht ein Backend (siehe README).
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
}

export interface PhotoItem {
  id: string;
  title: string;
  album: string;
  date: string;
  src?: string;
  hue: number;
  tall?: boolean;
}

export interface PostItem {
  id: string;
  date: string;
  text: string;
  photoIds?: string[];
  videoId?: string;
  likes: number;
}

export const VIDEOS: VideoItem[] = [
  { id: 'v01', title: 'Studio-Tour 2026', description: 'Ein Rundgang durch das neue Studio – Licht, Technik und Setup.', duration: '08:42', date: '2026-11-04', category: 'Behind the Scenes', tags: ['Studio', 'Setup'], src: 'media/videos/v01.mp4', hue: 200 },
  { id: 'v02', title: 'Live-Stream Highlights #12', description: 'Die besten Momente aus dem letzten Live-Stream.', duration: '22:15', date: '2026-10-29', category: 'Live-Highlights', tags: ['Live', 'Highlights'], src: 'media/videos/v02.mp4', hue: 260 },
  { id: 'v03', title: 'Q&A – Eure Fragen', description: 'Ich beantworte die meistgestellten Fragen aus dem Chat.', duration: '14:03', date: '2026-10-21', category: 'Talk', tags: ['Q&A', 'Community'], src: 'media/videos/v03.mp4', hue: 180 },
  { id: 'v04', title: 'Exklusiv: Session Vol. 7', description: 'Neues exklusives Video – nur für Abonnenten.', duration: '18:40', date: '2026-10-14', category: 'Exklusiv', tags: ['Exklusiv', 'Full HD'], src: 'media/videos/v04.mp4', hue: 220 },
  { id: 'v05', title: 'Live-Stream Highlights #11', description: 'Zusammenschnitt aus dem Oktober-Stream.', duration: '25:30', date: '2026-10-07', category: 'Live-Highlights', tags: ['Live'], src: 'media/videos/v05.mp4', hue: 280 },
  { id: 'v06', title: 'Exklusiv: Session Vol. 6', description: 'Das Original in voller Länge.', duration: '16:05', date: '2026-09-30', category: 'Exklusiv', tags: ['Exklusiv'], src: 'media/videos/v06.mp4', hue: 240 },
  { id: 'v07', title: 'Ein Tag mit mir – Vlog', description: 'Von morgens bis zum Stream am Abend.', duration: '11:20', date: '2026-09-22', category: 'Behind the Scenes', tags: ['Vlog', 'Alltag'], src: 'media/videos/v07.mp4', hue: 190 },
  { id: 'v08', title: 'Exklusiv: Session Vol. 5', description: 'Abonnenten-Exklusiv aus dem Archiv.', duration: '19:55', date: '2026-09-15', category: 'Exklusiv', tags: ['Exklusiv', 'Archiv'], src: 'media/videos/v08.mp4', hue: 300 },
];

const photo = (n: number, album: string, date: string, hue: number, tall = false): PhotoItem => ({
  id: `p${String(n).padStart(2, '0')}`,
  title: `${album} #${n}`,
  album,
  date,
  src: `media/photos/p${String(n).padStart(2, '0')}.jpg`,
  hue,
  tall,
});

export const PHOTOS: PhotoItem[] = [
  photo(1, 'Herbst-Shooting', '2026-11-02', 30, true),
  photo(2, 'Herbst-Shooting', '2026-11-02', 20),
  photo(3, 'Herbst-Shooting', '2026-11-02', 40),
  photo(4, 'Herbst-Shooting', '2026-11-02', 15, true),
  photo(5, 'Studio Sessions', '2026-10-18', 210),
  photo(6, 'Studio Sessions', '2026-10-18', 225, true),
  photo(7, 'Studio Sessions', '2026-10-18', 200),
  photo(8, 'Studio Sessions', '2026-10-18', 240),
  photo(9, 'Hamburg Nights', '2026-09-27', 270, true),
  photo(10, 'Hamburg Nights', '2026-09-27', 290),
  photo(11, 'Hamburg Nights', '2026-09-27', 255),
  photo(12, 'Hamburg Nights', '2026-09-27', 310, true),
];

export const POSTS: PostItem[] = [
  { id: 'post5', date: '2026-11-05', text: 'Das neue Studio ist fertig! 🎬 Die komplette Tour findet ihr ab sofort in der Bibliothek. Danke für euren Support – ohne euch wäre das nicht möglich gewesen.', videoId: 'v01', likes: 128 },
  { id: 'post4', date: '2026-11-02', text: 'Neues Album „Herbst-Shooting“ ist online 🍂 Welches Bild ist euer Favorit?', photoIds: ['p01', 'p02', 'p03'], likes: 214 },
  { id: 'post3', date: '2026-10-30', text: 'Nächster Live-Stream: Samstag ab 21 Uhr. Ich freu mich auf euch! 🔴', likes: 97 },
  { id: 'post2', date: '2026-10-21', text: 'Eure Fragen, meine Antworten – das Q&A-Video ist da. Schreibt mir gerne, was ich beim nächsten Mal beantworten soll.', videoId: 'v03', likes: 156 },
  { id: 'post1', date: '2026-10-18', text: 'Kleine Vorschau aus den Studio Sessions 📸', photoIds: ['p05', 'p06'], likes: 189 },
];

export const placeholderGradient = (hue: number) =>
  `radial-gradient(circle at 25% 20%, hsl(${hue} 90% 65% / .55), transparent 55%), radial-gradient(circle at 80% 85%, hsl(${(hue + 50) % 360} 85% 55% / .5), transparent 55%), linear-gradient(135deg, hsl(${hue} 45% 14%), hsl(${(hue + 30) % 360} 50% 8%))`;

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' });

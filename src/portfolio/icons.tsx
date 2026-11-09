import type { ReactElement, SVGProps } from 'react';

/** Schlanke Inline-SVG-Icons – ersetzt externe Icon-Bibliotheken. */
export type IconProps = SVGProps<SVGSVGElement> & { size?: number };
export type IconComponent = (props: IconProps) => ReactElement;

const stroke = (path: ReactElement, displayName: string): IconComponent => {
  const Icon: IconComponent = ({ size = 20, ...rest }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {path}
    </svg>
  );
  (Icon as { displayName?: string }).displayName = displayName;
  return Icon;
};

const fill = (path: ReactElement, displayName: string): IconComponent => {
  const Icon: IconComponent = ({ size = 20, ...rest }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" {...rest}>
      {path}
    </svg>
  );
  (Icon as { displayName?: string }).displayName = displayName;
  return Icon;
};

export const SearchIcon = stroke(<><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>, 'SearchIcon');
export const XIcon = stroke(<path d="M18 6 6 18M6 6l12 12" />, 'XIcon');
export const ChevronDown = stroke(<path d="m6 9 6 6 6-6" />, 'ChevronDown');
export const ArrowRight = stroke(<path d="M5 12h14m-6-6 6 6-6 6" />, 'ArrowRight');
export const ArrowLeft = stroke(<path d="M19 12H5m6 6-6-6 6-6" />, 'ArrowLeft');
export const ExternalLink = stroke(<><path d="M15 3h6v6" /><path d="M10 14 21 3" /><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /></>, 'ExternalLink');
export const MailIcon = stroke(<><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>, 'MailIcon');
export const EyeIcon = stroke(<><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>, 'EyeIcon');
export const EyeOffIcon = stroke(<><path d="M10.7 5.1A10.6 10.6 0 0 1 12 5c6.5 0 10 7 10 7a17.6 17.6 0 0 1-2.2 3.2" /><path d="M6.6 6.6A17.4 17.4 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /><path d="m2 2 20 20" /></>, 'EyeOffIcon');
export const LockIcon = stroke(<><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>, 'LockIcon');
export const SendIcon = stroke(<><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></>, 'SendIcon');
export const CheckIcon = stroke(<path d="M20 6 9 17l-5-5" />, 'CheckIcon');
export const UsersIcon = stroke(<><circle cx="9" cy="8" r="4" /><path d="M2 21a7 7 0 0 1 14 0" /><path d="M16 4a4 4 0 0 1 0 8" /><path d="M22 21a7 7 0 0 0-4-6.3" /></>, 'UsersIcon');
export const GemIcon = stroke(<><path d="M6 3h12l4 6-10 12L2 9Z" /><path d="M2 9h20M12 21 8 9l4-6 4 6-4 12" /></>, 'GemIcon');
export const VideoIcon = stroke(<><rect x="2" y="6" width="14" height="12" rx="2" /><path d="m16 10 6-3v10l-6-3" /></>, 'VideoIcon');
export const HeartIcon = stroke(<path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7Z" />, 'HeartIcon');
export const SparkleIcon = stroke(<path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" />, 'SparkleIcon');
export const FileText = stroke(<><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z" /><path d="M14 3v6h6M8 13h8M8 17h5" /></>, 'FileText');
export const Shield = stroke(<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />, 'Shield');
export const PlayIcon = fill(<path d="M8 5v14l11-7Z" />, 'PlayIcon');

export const InstagramIcon = stroke(<><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r=".6" fill="currentColor" /></>, 'InstagramIcon');
export const XBrandIcon = fill(<path d="M17.8 3h3.1l-6.8 7.7L22 21h-6.2l-4.9-6.4L5.3 21H2.2l7.2-8.3L2 3h6.4l4.4 5.8Zm-1.1 16.2h1.7L7.4 4.7H5.6Z" />, 'XBrandIcon');
export const TelegramIcon = fill(<path d="M21.9 4.3 18.7 19.5c-.2 1-.9 1.3-1.8.8l-4.9-3.6-2.4 2.3c-.3.3-.5.5-1 .5l.3-5 9.2-8.3c.4-.4-.1-.6-.6-.2L6.2 13.2l-4.9-1.5c-1-.3-1.1-1 .2-1.5L20.6 2.9c.9-.3 1.6.2 1.3 1.4Z" />, 'TelegramIcon');
export const GitHubIcon = fill(<path d="M12 2a10 10 0 0 0-3.2 19.5c.5.1.7-.2.7-.5v-1.7c-2.8.6-3.4-1.3-3.4-1.3-.4-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.5 2.4 1.1 2.9.8.1-.7.4-1.1.6-1.3-2.2-.3-4.6-1.1-4.6-5 0-1.1.4-2 1-2.7-.1-.3-.4-1.3.1-2.7 0 0 .8-.3 2.7 1a9.4 9.4 0 0 1 5 0c1.9-1.3 2.7-1 2.7-1 .5 1.4.2 2.4.1 2.7.6.7 1 1.6 1 2.7 0 3.9-2.3 4.7-4.6 5 .4.3.7.9.7 1.9V21c0 .3.2.6.7.5A10 10 0 0 0 12 2Z" />, 'GitHubIcon');
export const GoogleIcon: IconComponent = ({ size = 20, ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...rest}>
    <path fill="#EA4335" d="M12 10.2v3.9h5.4c-.2 1.3-1.6 3.8-5.4 3.8a6 6 0 0 1 0-12c1.9 0 3.1.8 3.8 1.5l2.6-2.5A9.3 9.3 0 0 0 12 2.3a9.7 9.7 0 1 0 0 19.4c5.6 0 9.3-3.9 9.3-9.5 0-.6-.1-1.1-.2-1.6H12Z" />
    <path fill="#FBBC05" d="M6.2 14.3a6 6 0 0 1 0-4.6L3 7.2a9.7 9.7 0 0 0 0 9.6l3.2-2.5Z" />
    <path fill="#34A853" d="M12 21.7c2.6 0 4.8-.9 6.4-2.4l-3.1-2.4c-.8.6-1.9 1-3.3 1a6 6 0 0 1-5.7-4.1L3.1 16.3A9.7 9.7 0 0 0 12 21.7Z" />
    <path fill="#4285F4" d="M21.3 12.2c0-.6-.1-1.1-.2-1.6H12v3.9h5.4a4.7 4.7 0 0 1-2.1 2.4l3.1 2.4c1.8-1.7 2.9-4.1 2.9-7.1Z" />
  </svg>
);

export const HomeIcon = stroke(<><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1Z" /></>, 'HomeIcon');
export const LibraryIcon = stroke(<><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>, 'LibraryIcon');
export const WandIcon = stroke(<><path d="m15 4 5 5L8 21l-5-5Z" /><path d="m12 7 5 5" /><path d="M19 2v3M21 3.5h-3M5 3v2M6 4H4" /></>, 'WandIcon');
export const UserIcon = stroke(<><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>, 'UserIcon');
export const LogoutIcon = stroke(<><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><path d="m10 17-5-5 5-5M5 12h11" /></>, 'LogoutIcon');
export const CrownIcon = stroke(<><path d="m3 7 4.5 4L12 4l4.5 7L21 7l-2 12H5Z" /></>, 'CrownIcon');
export const ImageIcon = stroke(<><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-5-5L5 21" /></>, 'ImageIcon');
export const PostIcon = stroke(<><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" /></>, 'PostIcon');
export const HeartFilledIcon = fill(<path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7Z" />, 'HeartFilledIcon');
export const CopyIcon = stroke(<><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" /></>, 'CopyIcon');
export const DownloadIcon = stroke(<><path d="M12 3v12m-5-5 5 5 5-5" /><path d="M4 21h16" /></>, 'DownloadIcon');
export const AlertIcon = stroke(<><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4M12 17h.01" /></>, 'AlertIcon');
export const ChevronLeft = stroke(<path d="m15 18-6-6 6-6" />, 'ChevronLeft');
export const ChevronRight = stroke(<path d="m9 18 6-6-6-6" />, 'ChevronRight');
export const ClockIcon = stroke(<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>, 'ClockIcon');
export const PlusIcon = stroke(<path d="M12 5v14M5 12h14" />, 'PlusIcon');
export const TrashIcon = stroke(<><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" /></>, 'TrashIcon');

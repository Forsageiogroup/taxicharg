// Lightweight inline social icons (lucide-react dropped brand glyphs), so
// we don't depend on an external icon pack just for the footer.

export function FacebookIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M13.5 21v-7.7h2.6l.4-3h-3v-1.9c0-.87.24-1.46 1.5-1.46h1.6V4.2C15.86 4.1 15 4 13.98 4c-2.35 0-3.96 1.44-3.96 4.06v2.24H7.4v3h2.62V21h3.48z" />
    </svg>
  );
}

export function InstagramIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function LinkedinIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M4.98 3.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM3.5 9.98h3v10.02h-3zM9.5 9.98h2.88v1.37h.04c.4-.76 1.38-1.56 2.85-1.56 3.05 0 3.61 2 3.61 4.6v5.61h-3v-4.97c0-1.19-.02-2.72-1.66-2.72-1.66 0-1.92 1.3-1.92 2.63v5.06h-3V9.98z" />
    </svg>
  );
}

export function XIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M3 3l7.2 9.4L3.4 21H6l5.6-6.4L15.9 21H21l-7.6-9.9L20.6 3H18l-5.2 5.9L8.1 3H3z" />
    </svg>
  );
}

export function backdropMarkup() {
  return `
    <svg class="backdrop" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="page" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#9ed8c4"/>
          <stop offset="45%" stop-color="#8dceba"/>
          <stop offset="100%" stop-color="#6aa890"/>
        </linearGradient>
      </defs>
      <rect width="1440" height="900" fill="url(#page)"/>
      <g fill="#4f8d76" opacity="0.45">
        <path d="M40 250c40-120 180-150 250-90 30 26 20 70-10 86-40 8-70 40-120 36-70-6-150-10-120-32z"/>
        <rect x="168" y="230" width="46" height="150" rx="23"/>
        <path d="M1180 180c30-90 150-120 210-70 28 24 18 60-8 74-36 8-60 34-100 30-58-4-120-8-102-34z"/>
        <rect x="1290" y="170" width="36" height="130" rx="18"/>
        <path d="M1280 520c50-80 140-70 160-10 8 24-10 40-36 42-30 2-50 20-78 16-36-6-62-18-46-48z"/>
        <rect x="1352" y="530" width="28" height="90" rx="14"/>
      </g>
      <g fill="#5e9a82" opacity="0.55">
        <path d="M180 760c8-30 20-40 24-18 6 10 2 28-8 36-12 8-22 2-16-18z"/>
        <path d="M210 780c6-26 18-34 20-14 4 12 0 26-10 32-10 6-16 0-10-18z"/>
        <path d="M1180 800c8-28 22-36 24-12 4 14-2 30-12 36-12 6-20-2-12-24z"/>
        <path d="M1224 812c6-22 16-28 18-10 3 10-1 22-8 26-8 4-14 0-10-16z"/>
        <circle cx="250" cy="820" r="3"/>
        <circle cx="430" cy="840" r="2.4"/>
        <circle cx="980" cy="830" r="2.6"/>
        <circle cx="1100" cy="848" r="2"/>
      </g>
      <rect x="18" y="16" width="1404" height="868" rx="28" fill="none" stroke="#e7f6ef" stroke-opacity="0.55" stroke-width="2"/>
    </svg>
  `;
}

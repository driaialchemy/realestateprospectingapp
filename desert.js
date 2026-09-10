const scene = `
  <svg class="desert-svg" viewBox="0 0 1440 900" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id="duskSky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#1b2a4a"/>
        <stop offset="42%" stop-color="#c2410c"/>
        <stop offset="72%" stop-color="#f4a261"/>
        <stop offset="100%" stop-color="#f3e0c2"/>
      </linearGradient>
      <linearGradient id="duneFill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#7c4a2d"/>
        <stop offset="100%" stop-color="#3d2418"/>
      </linearGradient>
    </defs>
    <rect width="1440" height="900" fill="url(#duskSky)"/>
    <circle cx="1080" cy="210" r="72" fill="#fde68a"/>
    <path d="M0 430 C 180 390 320 470 480 430 C 660 386 820 470 980 428 C 1140 388 1280 450 1440 410 L 1440 900 L 0 900 Z" fill="#4a2c22" opacity="0.55"/>
    <path d="M0 560 C 220 510 420 600 680 548 C 900 504 1120 610 1440 540 L 1440 900 L 0 900 Z" fill="url(#duneFill)"/>
    <g fill="#16202a">
      <g transform="translate(180 448)">
        <rect x="28" y="40" width="28" height="230" rx="14"/>
        <rect x="0" y="108" width="28" height="18" rx="9"/>
        <rect x="0" y="78" width="18" height="48" rx="9"/>
        <rect x="56" y="128" width="36" height="18" rx="9"/>
        <rect x="74" y="92" width="18" height="54" rx="9"/>
      </g>
      <g transform="translate(430 500)">
        <rect x="22" y="28" width="22" height="190" rx="11"/>
        <rect x="-6" y="86" width="28" height="14" rx="7"/>
        <rect x="-6" y="62" width="14" height="38" rx="7"/>
        <rect x="44" y="108" width="30" height="14" rx="7"/>
        <rect x="60" y="80" width="14" height="42" rx="7"/>
      </g>
      <g transform="translate(720 410)">
        <rect x="34" y="20" width="34" height="288" rx="17"/>
        <rect x="-8" y="118" width="42" height="20" rx="10"/>
        <rect x="-8" y="78" width="20" height="60" rx="10"/>
        <rect x="68" y="148" width="48" height="20" rx="10"/>
        <rect x="96" y="104" width="20" height="64" rx="10"/>
        <rect x="68" y="210" width="36" height="16" rx="8"/>
        <rect x="88" y="184" width="16" height="42" rx="8"/>
      </g>
      <g transform="translate(1020 478)">
        <rect x="24" y="32" width="24" height="208" rx="12"/>
        <rect x="-4" y="96" width="28" height="16" rx="8"/>
        <rect x="-4" y="70" width="16" height="42" rx="8"/>
        <rect x="48" y="124" width="32" height="16" rx="8"/>
        <rect x="64" y="92" width="16" height="48" rx="8"/>
      </g>
      <g transform="translate(1248 522)">
        <rect x="18" y="36" width="18" height="160" rx="9"/>
        <rect x="-8" y="82" width="26" height="12" rx="6"/>
        <rect x="-8" y="62" width="12" height="32" rx="6"/>
        <rect x="36" y="102" width="26" height="12" rx="6"/>
        <rect x="50" y="78" width="12" height="36" rx="6"/>
      </g>
    </g>
  </svg>
`;

const root = document.querySelector("#desert-scene");
if (root) root.innerHTML = scene;

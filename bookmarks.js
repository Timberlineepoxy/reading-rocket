/* Reading Rocket bookmarks: every book gets its own bookmark, designed from the book itself:
   its title, colours taken from its cover, and pictures that match what it is about.
   The star and challenge bookmarks use the same drawing code. Everything is drawn in code. */
(() => {
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // A book's bookmark must look the same every time, so its random choices come from a seed.
  const hash = s => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
  const rng = seed => () => { seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const pick = (R, a) => a[Math.floor(R() * a.length)];

  /* ======================= pictures (each fits a 40 x 40 box) ======================= */
  const pixelSword = () => {
    const px = [[8, 1, '#E6EDF2'], [7, 2, '#E6EDF2'], [6, 3, '#C9D3DD'], [5, 4, '#C9D3DD'], [4, 5, '#AEB9C6'], [3, 6, '#8B5A2B'], [2, 7, '#5B3A1A'], [1, 8, '#5B3A1A'],
      [8, 2, '#AEB9C6'], [7, 3, '#AEB9C6'], [6, 4, '#AEB9C6'], [5, 5, '#8E99A8'], [2, 5, '#5B3A1A'], [4, 7, '#5B3A1A'], [8, 0, '#FFFFFF']];
    return px.map(([x, y, c]) => `<rect x="${x * 4 + 2}" y="${y * 4 + 2}" width="4.2" height="4.2" fill="${c}"/>`).join('');
  };
  const ICON = {
    star: '<path d="M20 3 L25 14 L37 15 L28 23 L31 35 L20 29 L9 35 L12 23 L3 15 L15 14Z" fill="#FFD23F" stroke="#E0A100" stroke-width="2" stroke-linejoin="round"/>',
    rocket: '<g transform="rotate(35 20 20)"><path d="M20 2 C27 8 28 18 26 28 H14 C12 18 13 8 20 2Z" fill="#F4F4F8" stroke="#9AA3B5" stroke-width="1.5"/><path d="M20 2 C24 5 26 9 26.5 13 H13.5 C14 9 16 5 20 2Z" fill="#E8304A"/><circle cx="20" cy="18" r="3.5" fill="#3AA0FF" stroke="#9AA3B5"/><path d="M14 22 L8 30 L14 28Z M26 22 L32 30 L26 28Z" fill="#E8304A"/><path d="M15 29 C16 35 18 38 20 39 C22 38 24 35 25 29Z" fill="#FFB020"/><path d="M17.5 29 C18 33 19 35 20 36 C21 35 22 33 22.5 29Z" fill="#FFF07A"/></g>',
    lightning: '<path d="M23 2 L8 22 H18 L14 38 L32 15 H21 L27 2Z" fill="#FFD23F" stroke="#E0A100" stroke-width="2" stroke-linejoin="round"/>',
    heart: '<path d="M20 35 C8 26 3 19 3 12 C3 6 8 3 12 3 C16 3 18 6 20 9 C22 6 24 3 28 3 C32 3 37 6 37 12 C37 19 32 26 20 35Z" fill="#FF4F8B"/><path d="M9 9 C10 7 12 6 14 6.5" stroke="#fff" stroke-width="2" opacity=".6" fill="none" stroke-linecap="round"/>',
    crown: '<path d="M4 30 L6 12 L14 20 L20 6 L26 20 L34 12 L36 30Z" fill="#FFC93C" stroke="#D99A00" stroke-width="2" stroke-linejoin="round"/><rect x="4" y="30" width="32" height="5" rx="2" fill="#E0A100"/><circle cx="20" cy="22" r="3" fill="#E8304A"/><circle cx="11" cy="25" r="2" fill="#3AA0FF"/><circle cx="29" cy="25" r="2" fill="#22C55E"/>',
    book: '<path d="M20 10 C14 6 8 6 3 8 V33 C8 31 14 31 20 35 C26 31 32 31 37 33 V8 C32 6 26 6 20 10Z" fill="#fff" stroke="#6C4BF4" stroke-width="2.4" stroke-linejoin="round"/><path d="M20 10 V35" stroke="#6C4BF4" stroke-width="2"/><path d="M7 14 H16 M7 19 H16 M24 14 H33 M24 19 H33 M7 24 H14 M24 24 H31" stroke="#C9BEF5" stroke-width="1.6" stroke-linecap="round"/>',
    dino: '<path d="M6 36 L9 25 C5 23 2 18 1 12 C5 16 9 18 13 18 C15 12 20 9 26 9 H34 C37 9 38 11 38 13 V16 L31 17 V19 L28 20 C28 26 25 30 22 31 L23 36 H19 L18 31 H14 V36 H10Z" fill="#3FAE5A"/><path d="M15 12 L16 8 L18 11 L20 7 L22 10 L24 6 L25 9" fill="#2E8B48"/><circle cx="31" cy="12.5" r="1.7" fill="#111"/><path d="M28 20 L31 23" stroke="#2E8B48" stroke-width="2" stroke-linecap="round"/><path d="M33 16 l1 2 l1 -2" stroke="#fff" stroke-width="1" fill="none"/>',
    planet: '<circle cx="20" cy="20" r="11" fill="#F59E0B"/><path d="M10 16 C16 18 24 18 30 16 M10 23 C16 25 24 25 30 23" stroke="#B45309" stroke-width="2" opacity=".6" fill="none"/><ellipse cx="20" cy="21" rx="19" ry="5" fill="none" stroke="#FDE68A" stroke-width="2.6" transform="rotate(-18 20 21)"/><circle cx="5" cy="6" r="1.5" fill="#fff"/><circle cx="35" cy="35" r="1.3" fill="#fff"/><circle cx="34" cy="5" r="1" fill="#fff"/>',
    shark: '<path d="M1 22 L8 16 L7 22 L8 28Z" fill="#5D7A90"/><path d="M7 22 C12 14 24 12 32 15 C36 17 38 20 39 22 C36 26 30 28 22 28 C14 28 10 26 7 22Z" fill="#6E8BA3"/><path d="M18 15 L22 4 L25 14Z" fill="#5D7A90"/><path d="M12 25 C20 29 30 28 37 23 C33 27 26 29 20 29 C16 29 13 27 12 25Z" fill="#E6EDF2"/><circle cx="31" cy="19" r="1.6" fill="#111"/><path d="M30 25 l1.5 -1.5 l1.5 1.5 l1.5 -1.5 l1.5 1.5" stroke="#fff" stroke-width="1" fill="none"/>',
    fish: '<path d="M3 20 L10 12 V28Z" fill="#FF7A1A"/><ellipse cx="22" cy="20" rx="14" ry="9" fill="#FF9A3C"/><path d="M18 12 C20 16 20 24 18 28" stroke="#fff" stroke-width="2.4" fill="none"/><circle cx="30" cy="18" r="2.2" fill="#fff"/><circle cx="30.6" cy="18" r="1.1" fill="#111"/>',
    wave: '<path d="M2 26 C8 14 18 12 22 20 C18 18 14 22 18 26 C24 30 32 24 38 22 V38 H2Z" fill="#3AA0FF"/><path d="M2 32 C10 28 18 34 26 30 C30 28 34 30 38 30" stroke="#BDE3FF" stroke-width="2" fill="none"/>',
    dragon: '<path d="M4 31 C4 19 12 10 23 10 L33 13 L38 19 L30 21 L32 25 L23 25 C21 31 15 36 4 36Z" fill="#E8304A"/><path d="M12 12 L8 2 L18 10Z M21 10 L21 0 L27 11Z" fill="#B91C3B"/><circle cx="26" cy="15.5" r="2.2" fill="#FFD23F"/><circle cx="26.6" cy="15.5" r="1.1" fill="#111"/><path d="M6 28 l5 -2 M6 32 l5 -2" stroke="#FFB0B0" stroke-width="1.6"/><path d="M31 23 C35 22 39 20 40 24 C40 29 35 29 32 26Z" fill="#FF8A1F"/><path d="M33 24 C35 24 37 23 38 25 C37 27 35 27 33.5 26Z" fill="#FFE03B"/>',
    flame: '<path d="M20 2 C22 10 32 14 32 25 C32 33 26 38 20 38 C14 38 8 33 8 25 C8 18 12 14 14 9 C15 14 17 16 19 16 C17 10 18 6 20 2Z" fill="#FF6A1A"/><path d="M20 18 C22 23 27 25 27 30 C27 34 24 37 20 37 C16 37 13 34 13 30 C13 26 16 25 17 21 C18 24 19 25 20 25 C19 22 19 20 20 18Z" fill="#FFD23F"/>',
    wizard: '<path d="M20 2 L32 30 H8Z" fill="#5B3BD6"/><path d="M3 30 C10 27 30 27 37 30 C37 34 3 34 3 30Z" fill="#4527A0"/><path d="M12 23 H28" stroke="#FFD23F" stroke-width="3"/><path d="M19 9 l1.2 2.8 3 .3 -2.3 2 .7 3 -2.6 -1.6 -2.6 1.6 .7 -3 -2.3 -2 3 -.3Z" fill="#FFD23F"/><circle cx="27" cy="16" r="1.2" fill="#FFD23F"/>',
    moon: '<path d="M26 4 C16 6 10 14 10 22 C10 31 18 38 28 36 C20 33 16 27 16 20 C16 13 20 7 26 4Z" fill="#FFE27A"/><circle cx="31" cy="12" r="1.4" fill="#FFE27A"/><circle cx="34" cy="22" r="1" fill="#FFE27A"/>',
    shield: '<path d="M20 3 L35 8 V20 C35 29 28 35 20 38 C12 35 5 29 5 20 V8Z" fill="#3B82F6" stroke="#C0C8D6" stroke-width="2.4"/><path d="M20 8 V33 M10 18 H30" stroke="#FFD23F" stroke-width="4"/>',
    castle: '<path d="M4 38 V14 H9 V18 H13 V14 H17 V18 H23 V14 H27 V18 H31 V14 H36 V38Z" fill="#A9B3C1"/><path d="M16 38 V29 C16 25 24 25 24 29 V38Z" fill="#5B4636"/><path d="M20 14 V3" stroke="#666" stroke-width="1.4"/><path d="M20 3 L29 6 L20 9Z" fill="#E8304A"/><rect x="7" y="22" width="4" height="5" rx="2" fill="#5B4636"/><rect x="29" y="22" width="4" height="5" rx="2" fill="#5B4636"/>',
    pirate: '<path d="M6 3 V39" stroke="#6B4A2B" stroke-width="2.6" stroke-linecap="round"/><path d="M7 4 H37 C35 11 35 18 37 26 H7Z" fill="#222"/><circle cx="22" cy="12" r="5" fill="#fff"/><rect x="19.5" y="15" width="5" height="3" fill="#fff"/><circle cx="20" cy="12" r="1.3" fill="#222"/><circle cx="24" cy="12" r="1.3" fill="#222"/><path d="M14 18 L30 23 M30 18 L14 23" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>',
    chest: '<rect x="4" y="18" width="32" height="18" rx="2" fill="#8B5A2B"/><path d="M4 18 C4 8 36 8 36 18Z" fill="#A0693A"/><path d="M4 18 H36 M12 12 V36 M28 12 V36" stroke="#FFC93C" stroke-width="2.4"/><rect x="17" y="16" width="6" height="7" rx="1" fill="#FFC93C"/><circle cx="10" cy="7" r="2" fill="#FFE27A"/><circle cx="30" cy="6" r="1.6" fill="#FFE27A"/><circle cx="20" cy="4" r="1.3" fill="#FFE27A"/>',
    ninja: '<circle cx="20" cy="20" r="16" fill="#222"/><path d="M5 16 H35 V25 H5Z" fill="#F2C9A0"/><path d="M11 21 C13 19 16 19 17 21 M23 21 C24 19 27 19 29 21" stroke="#222" stroke-width="2.4" stroke-linecap="round" fill="none"/><path d="M34 19 L40 15 M34 21 L40 26" stroke="#E8304A" stroke-width="3" stroke-linecap="round"/>',
    shuriken: '<path d="M20 2 L24 16 L38 20 L24 24 L20 38 L16 24 L2 20 L16 16Z" fill="#9AA3B5" stroke="#5B6474" stroke-width="1.6" stroke-linejoin="round"/><circle cx="20" cy="20" r="3.4" fill="#5B6474"/>',
    robot: '<path d="M20 2 V7" stroke="#9AA3B5" stroke-width="2"/><circle cx="20" cy="3" r="2.4" fill="#E8304A"/><rect x="6" y="8" width="28" height="22" rx="5" fill="#B8C4D4" stroke="#7D8A9C" stroke-width="2"/><circle cx="14" cy="18" r="4" fill="#3AA0FF"/><circle cx="26" cy="18" r="4" fill="#3AA0FF"/><circle cx="15" cy="17" r="1.3" fill="#fff"/><circle cx="27" cy="17" r="1.3" fill="#fff"/><rect x="13" y="24" width="14" height="3" rx="1.5" fill="#5B6474"/><rect x="2" y="15" width="4" height="8" rx="2" fill="#7D8A9C"/><rect x="34" y="15" width="4" height="8" rx="2" fill="#7D8A9C"/><rect x="12" y="31" width="16" height="7" rx="2" fill="#7D8A9C"/>',
    pixel: pixelSword(),
    pow: '<path d="M20 1 L24 11 L35 6 L30 16 L39 22 L28 24 L30 36 L21 28 L13 38 L13 27 L2 27 L10 19 L3 10 L15 12Z" fill="#FFD23F" stroke="#E8304A" stroke-width="2.2" stroke-linejoin="round"/><text x="20" y="23.5" font-family="Fredoka,Arial,sans-serif" font-weight="700" font-size="10" text-anchor="middle" fill="#E8304A">POW!</text>',
    mask: '<path d="M2 16 C10 10 16 13 20 16 C24 13 30 10 38 16 C38 26 28 28 20 22 C12 28 2 26 2 16Z" fill="#3B82F6"/><path d="M8 17 C11 14 14 15 16 18 C13 20 10 19 8 17Z M32 17 C29 14 26 15 24 18 C27 20 30 19 32 17Z" fill="#fff"/>',
    dog: '<ellipse cx="20" cy="22" rx="12" ry="11" fill="#C98B4E"/><path d="M8 13 C2 15 2 28 7 30 C10 26 10 18 8 13Z M32 13 C38 15 38 28 33 30 C30 26 30 18 32 13Z" fill="#7A4A22"/><ellipse cx="20" cy="27" rx="6.5" ry="5" fill="#F0D2AE"/><ellipse cx="20" cy="24" rx="3" ry="2.2" fill="#222"/><circle cx="15" cy="19" r="1.8" fill="#222"/><circle cx="25" cy="19" r="1.8" fill="#222"/><path d="M18 30 C18 35 22 35 22 30Z" fill="#FF7A9A"/>',
    cat: '<path d="M8 5 L14 13 H26 L32 5 L33 20 C33 30 27 35 20 35 C13 35 7 30 7 20Z" fill="#F2A541"/><path d="M10 9 L13 14 L9 15Z M30 9 L27 14 L31 15Z" fill="#FFC9D0"/><circle cx="15" cy="21" r="2" fill="#222"/><circle cx="25" cy="21" r="2" fill="#222"/><path d="M18.5 25 H21.5 L20 27Z" fill="#FF7A9A"/><path d="M4 24 L13 25 M4 28 L13 27 M36 24 L27 25 M36 28 L27 27" stroke="#7a4a1a" stroke-width="1" fill="none"/>',
    paw: '<ellipse cx="20" cy="27" rx="9" ry="8" fill="#6B4A2B"/><ellipse cx="9" cy="16" rx="3.6" ry="4.6" fill="#6B4A2B"/><ellipse cx="16" cy="9" rx="3.6" ry="4.6" fill="#6B4A2B"/><ellipse cx="24" cy="9" rx="3.6" ry="4.6" fill="#6B4A2B"/><ellipse cx="31" cy="16" rx="3.6" ry="4.6" fill="#6B4A2B"/>',
    horse: '<path d="M12 38 C10 30 10 22 14 14 L12 5 L18 10 C24 8 30 12 33 20 L37 28 C38 31 35 33 32 31 L26 28 C26 32 27 35 28 38Z" fill="#8B5A2B"/><path d="M14 14 C12 20 11 28 12 38 L8 38 C6 28 8 18 12 10Z" fill="#3B2414"/><circle cx="25" cy="17" r="1.8" fill="#111"/><circle cx="34" cy="28" r="1" fill="#3B2414"/>',
    barn: '<path d="M3 18 L20 5 L37 18 V38 H3Z" fill="#D62828"/><path d="M3 18 L20 5 L37 18" stroke="#fff" stroke-width="2.4" fill="none"/><rect x="13" y="22" width="14" height="16" fill="#fff"/><path d="M13 22 L27 38 M27 22 L13 38" stroke="#D62828" stroke-width="2"/><rect x="16" y="11" width="8" height="6" fill="#fff"/>',
    sun: '<g stroke="#FFB020" stroke-width="3" stroke-linecap="round"><path d="M20 2 V7 M20 33 V38 M2 20 H7 M33 20 H38 M7 7 L10.5 10.5 M29.5 29.5 L33 33 M33 7 L29.5 10.5 M10.5 29.5 L7 33"/></g><circle cx="20" cy="20" r="9.5" fill="#FFD23F"/>',
    apple: '<path d="M20 12 C14 8 5 10 5 21 C5 31 12 38 20 36 C28 38 35 31 35 21 C35 10 26 8 20 12Z" fill="#E8304A"/><path d="M20 12 C20 8 21 5 23 3" stroke="#6B4A2B" stroke-width="2" fill="none"/><path d="M22 8 C26 4 31 5 32 7 C28 10 25 10 22 8Z" fill="#3E8C4C"/><path d="M10 18 C10 15 12 13 14 13" stroke="#fff" stroke-width="2" opacity=".5" fill="none" stroke-linecap="round"/>',
    bug: '<path d="M20 8 C13 8 7 14 7 22 C7 31 13 36 20 36 C27 36 33 31 33 22 C33 14 27 8 20 8Z" fill="#E8304A"/><path d="M20 9 V36" stroke="#222" stroke-width="2"/><path d="M13 8 C14 4 26 4 27 8 C25 11 15 11 13 8Z" fill="#222"/><circle cx="14" cy="18" r="3" fill="#222"/><circle cx="26" cy="18" r="3" fill="#222"/><circle cx="13" cy="28" r="2.6" fill="#222"/><circle cx="27" cy="28" r="2.6" fill="#222"/><path d="M16 4 L13 1 M24 4 L27 1" stroke="#222" stroke-width="1.6" stroke-linecap="round"/>',
    lion: '<circle cx="20" cy="20" r="17" fill="#B45309"/><circle cx="11" cy="10" r="3.4" fill="#F2B04A"/><circle cx="29" cy="10" r="3.4" fill="#F2B04A"/><circle cx="20" cy="21" r="11" fill="#F2B04A"/><circle cx="16" cy="19" r="1.7" fill="#222"/><circle cx="24" cy="19" r="1.7" fill="#222"/><path d="M18 24 H22 L20 26.5Z" fill="#5B3A1A"/><path d="M20 26.5 C19 28.5 17 28.5 16 27.5 M20 26.5 C21 28.5 23 28.5 24 27.5" stroke="#5B3A1A" stroke-width="1.2" fill="none"/>',
    owl: '<path d="M8 9 L12 15 C9 19 8 24 8 28 C8 34 14 38 20 38 C26 38 32 34 32 28 C32 24 31 19 28 15 L32 9 L24 13 C21 12 19 12 16 13Z" fill="#8B5A2B"/><circle cx="15" cy="20" r="5" fill="#fff"/><circle cx="25" cy="20" r="5" fill="#fff"/><circle cx="15" cy="20" r="2.4" fill="#222"/><circle cx="25" cy="20" r="2.4" fill="#222"/><path d="M18.5 24 L20 28 L21.5 24Z" fill="#F2A71B"/><path d="M13 31 C16 33 24 33 27 31" stroke="#E2C9A0" stroke-width="2" fill="none"/>',
    tree: '<path d="M20 2 L32 18 H26 L35 30 H5 L14 18 H8Z" fill="#2E8B48"/><rect x="17" y="30" width="6" height="8" fill="#6B4A2B"/><path d="M20 6 L16 12" stroke="#5FC46F" stroke-width="2" stroke-linecap="round"/>',
    tent: '<path d="M2 36 L20 6 L38 36Z" fill="#FF7A1A"/><path d="M20 6 L14 36 H26Z" fill="#7A3A0A"/><path d="M20 6 V1" stroke="#6B4A2B" stroke-width="2"/><path d="M20 1 L26 3 L20 5Z" fill="#E8304A"/>',
    ghost: '<path d="M8 36 V18 C8 9 13 4 20 4 C27 4 32 9 32 18 V36 L28 32 L24 36 L20 32 L16 36 L12 32Z" fill="#fff" stroke="#9AA3B5" stroke-width="1.6"/><ellipse cx="15.5" cy="17" rx="2.4" ry="3.4" fill="#222"/><ellipse cx="24.5" cy="17" rx="2.4" ry="3.4" fill="#222"/><ellipse cx="20" cy="25" rx="3" ry="3.6" fill="#222"/>',
    bat: '<path d="M20 14 C17 14 16 17 16 19 C12 16 7 15 2 17 C5 19 6 22 6 25 C9 23 12 23 14 25 C15 23 17 22 20 24 C23 22 25 23 26 25 C28 23 31 23 34 25 C34 22 35 19 38 17 C33 15 28 16 24 19 C24 17 23 14 20 14Z" fill="#3B2B5A"/><path d="M17.5 15 L17 11 L19.5 14 M22.5 15 L23 11 L20.5 14" fill="#3B2B5A" stroke="#3B2B5A" stroke-width="1.2"/><circle cx="18.5" cy="18" r="1" fill="#FFD23F"/><circle cx="21.5" cy="18" r="1" fill="#FFD23F"/>',
    magnifier: '<circle cx="16" cy="16" r="11" fill="#BDE3FF" stroke="#3B4A5A" stroke-width="3.4"/><path d="M10 12 C11 9 14 8 16 8" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M24 24 L36 36" stroke="#8B5A2B" stroke-width="5.4" stroke-linecap="round"/>',
    key: '<circle cx="12" cy="13" r="8" fill="none" stroke="#E0A100" stroke-width="4"/><path d="M18 19 L36 37 M28 29 L32 25 M32 33 L35 30" stroke="#E0A100" stroke-width="4" stroke-linecap="round"/>',
    football: '<ellipse cx="20" cy="20" rx="17" ry="10" transform="rotate(-35 20 20)" fill="#8B4513"/><path d="M14 26 L26 14" stroke="#fff" stroke-width="1.8"/><path d="M15 21 l3 3 M18 18 l3 3 M21 15 l3 3" stroke="#fff" stroke-width="1.6"/><path d="M8.5 25 C9.5 23.5 10.5 22.5 11.5 21.5 M28.5 18.5 C29.5 17.5 30.5 16.5 31.5 15" stroke="#fff" stroke-width="1.6"/>',
    soccer: '<circle cx="20" cy="20" r="17" fill="#fff" stroke="#222" stroke-width="1.6"/><path d="M20 12 L27 17 L24.5 25 H15.5 L13 17Z" fill="#222"/><path d="M20 12 V3 M27 17 L36 14 M24.5 25 L29 33 M15.5 25 L11 33 M13 17 L4 14" stroke="#222" stroke-width="1.6"/>',
    baseball: '<circle cx="20" cy="20" r="17" fill="#fff" stroke="#C9C9C9" stroke-width="1.4"/><path d="M9 7 C14 14 14 26 9 33 M31 7 C26 14 26 26 31 33" stroke="#E8304A" stroke-width="1.8" fill="none" stroke-dasharray="2.4 2"/>',
    basketball: '<circle cx="20" cy="20" r="17" fill="#F57C1F"/><path d="M3 20 H37 M20 3 V37 M8 8 C14 14 14 26 8 32 M32 8 C26 14 26 26 32 32" stroke="#5B2A0A" stroke-width="1.6" fill="none"/>',
    trophy: '<path d="M11 4 H29 V14 C29 20 25 24 20 24 C15 24 11 20 11 14Z" fill="#FFC93C"/><path d="M11 7 H5 C5 13 8 16 12 16 M29 7 H35 C35 13 32 16 28 16" stroke="#E0A100" stroke-width="2.4" fill="none"/><rect x="18" y="24" width="4" height="6" fill="#E0A100"/><rect x="11" y="30" width="18" height="6" rx="1.5" fill="#8B5A2B"/><path d="M15 8 C15 12 16 15 18 17" stroke="#FFF1B8" stroke-width="2" fill="none" stroke-linecap="round"/>',
    car: '<path d="M3 28 V22 C3 20 5 19 7 19 L12 13 H26 L32 19 C36 19 38 21 38 24 V28Z" fill="#E8304A"/><path d="M14 15 H20 V19 H11Z M22 15 H25 L29 19 H22Z" fill="#BDE3FF"/><circle cx="11" cy="29" r="4.4" fill="#222"/><circle cx="30" cy="29" r="4.4" fill="#222"/><circle cx="11" cy="29" r="1.6" fill="#ccc"/><circle cx="30" cy="29" r="1.6" fill="#ccc"/><circle cx="21" cy="23.5" r="3" fill="#fff"/><text x="21" y="25.6" font-size="5.6" font-family="Arial" font-weight="700" text-anchor="middle" fill="#E8304A">1</text>',
    truck: '<rect x="5" y="13" width="28" height="10" rx="3" fill="#22A045"/><path d="M19 13 V7 H27 L32 13Z" fill="#22A045"/><path d="M21 8.5 H26.5 L30 12.5 H21Z" fill="#BDE3FF"/><circle cx="11" cy="29" r="8" fill="#222"/><circle cx="29" cy="29" r="8" fill="#222"/><circle cx="11" cy="29" r="3" fill="#9AA3B5"/><circle cx="29" cy="29" r="3" fill="#9AA3B5"/><path d="M8 17 H16" stroke="#FFD23F" stroke-width="2"/>',
    plane: '<path d="M3 21 C10 19 30 18 36 19 C39 20 39 22 36 23 C30 24 10 23 3 21Z" fill="#E6EDF2" stroke="#7D8A9C" stroke-width="1.4"/><path d="M16 20 L24 6 H28 L24 20Z M17 22 L24 34 H28 L23 22Z M4 20 L2 13 H6 L10 20Z" fill="#3AA0FF"/>',
    flask: '<path d="M17 3 V14 L6 33 C5 36 7 38 10 38 H30 C33 38 35 36 34 33 L23 14 V3" fill="#fff" stroke="#3B4A5A" stroke-width="2.4" stroke-linejoin="round"/><path d="M14 3 H26" stroke="#3B4A5A" stroke-width="2.4" stroke-linecap="round"/><path d="M11 26 H29 L33 33 C34 35 32 36 30 36 H10 C8 36 6 35 7 33Z" fill="#22C55E"/><circle cx="17" cy="31" r="1.6" fill="#BBF7D0"/><circle cx="23" cy="29" r="1.2" fill="#BBF7D0"/>',
    volcano: '<path d="M2 38 L14 14 H26 L38 38Z" fill="#7A4A2B"/><path d="M14 14 C16 18 18 16 20 20 C22 16 24 18 26 14Z" fill="#FF6A1A"/><path d="M20 20 C19 26 21 28 19 33" stroke="#FF6A1A" stroke-width="2.6" fill="none" stroke-linecap="round"/><circle cx="14" cy="7" r="3" fill="#FF8A1F"/><circle cx="22" cy="4" r="2.4" fill="#FFB020"/><circle cx="27" cy="9" r="2" fill="#FF6A1A"/>',
    helmet: '<path d="M5 26 C5 14 12 8 20 8 C28 8 35 14 35 26Z" fill="#556B2F"/><rect x="2" y="25" width="36" height="5" rx="2.5" fill="#435523"/><path d="M10 18 C12 14 15 12 18 12" stroke="#7A8F4A" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M20 15 l1.2 2.6 2.8.3 -2.1 1.9 .6 2.8 -2.5 -1.5 -2.5 1.5 .6 -2.8 -2.1 -1.9 2.8 -.3Z" fill="#FFD23F"/>',
    cowboy: '<path d="M2 26 C8 30 32 30 38 26 C36 33 4 33 2 26Z" fill="#8B5A2B"/><path d="M11 26 C11 16 13 10 16 10 C18 10 19 12 20 12 C21 12 22 10 24 10 C27 10 29 16 29 26Z" fill="#A0693A"/><path d="M11 22 C17 24 23 24 29 22 V25 C23 27 17 27 11 25Z" fill="#E8304A"/>',
    cactus: '<path d="M17 38 V8 C17 4 23 4 23 8 V38Z M17 25 H12 C9.5 25 8 23.5 8 21 V14 C8 11 12 11 12 14 V21 H17 M23 20 H28 V12 C28 9 32 9 32 12 V20 C32 22.5 30.5 24 28 24 H23" fill="#3E8C4C"/><path d="M20 8 V36" stroke="#2F7A3D" stroke-width="1.2"/>',
    cross: '<circle cx="20" cy="16" r="14" fill="#FFF3C4" opacity=".75"/><rect x="17" y="3" width="6" height="34" rx="1.5" fill="#FFE7A0" stroke="#D9A400" stroke-width="1.2"/><rect x="8" y="11" width="24" height="6" rx="1.5" fill="#FFE7A0" stroke="#D9A400" stroke-width="1.2"/>',
    dove: '<path d="M4 22 C10 22 14 18 18 14 C20 10 24 8 28 10 L34 9 L30 13 C31 20 26 28 16 28 L8 32 L11 27 C7 27 5 25 4 22Z" fill="#fff" stroke="#9AA3B5" stroke-width="1.4"/><path d="M16 18 C20 12 26 10 30 4 C30 12 26 18 18 22Z" fill="#EEF2F7" stroke="#9AA3B5" stroke-width="1.2"/><circle cx="29" cy="12" r="1" fill="#222"/><path d="M34 9 l3 1" stroke="#F2A71B" stroke-width="2"/>',
    pizza: '<path d="M20 38 L4 6 C14 1 26 1 36 6Z" fill="#F7C94B"/><path d="M4 6 C14 1 26 1 36 6 L34 10 C25 6 15 6 6 10Z" fill="#D9862B"/><circle cx="18" cy="14" r="3" fill="#D62828"/><circle cx="25" cy="20" r="2.6" fill="#D62828"/><circle cx="17" cy="25" r="2.4" fill="#D62828"/>',
    cookie: '<circle cx="20" cy="20" r="16" fill="#D9A15B"/><circle cx="20" cy="20" r="16" fill="none" stroke="#B9813B" stroke-width="2"/><circle cx="14" cy="14" r="2.4" fill="#5B3A1A"/><circle cx="25" cy="13" r="2" fill="#5B3A1A"/><circle cx="12" cy="24" r="2" fill="#5B3A1A"/><circle cx="22" cy="23" r="2.6" fill="#5B3A1A"/><circle cx="28" cy="27" r="1.8" fill="#5B3A1A"/>',
    laugh: '<circle cx="20" cy="20" r="17" fill="#FFD23F"/><path d="M10 15 C12 12 15 12 17 15 M23 15 C25 12 28 12 30 15" stroke="#5B3A1A" stroke-width="2.2" fill="none" stroke-linecap="round"/><path d="M9 21 H31 C31 29 26 33 20 33 C14 33 9 29 9 21Z" fill="#5B1A1A"/><path d="M13 28 C16 26 24 26 27 28 C25 31 15 31 13 28Z" fill="#FF7A9A"/><path d="M6 15 C4.5 19 6 21 8 21 C10 21 10 19 6 15Z" fill="#7FD3FF"/>',
    snowman: '<circle cx="20" cy="29" r="9" fill="#fff" stroke="#BCD0E0" stroke-width="1.4"/><circle cx="20" cy="15" r="7" fill="#fff" stroke="#BCD0E0" stroke-width="1.4"/><rect x="14" y="1" width="12" height="7" fill="#222"/><rect x="11" y="7.5" width="18" height="2.4" fill="#222"/><path d="M20 15 L27 16.5 L20 17.5Z" fill="#FF7A1A"/><circle cx="17.5" cy="13" r="1" fill="#222"/><circle cx="22.5" cy="13" r="1" fill="#222"/><circle cx="20" cy="26" r="1.1" fill="#222"/><circle cx="20" cy="30" r="1.1" fill="#222"/>',
    snowflake: `<g transform="translate(20 20)" stroke="#5FB6F2" stroke-width="2.6" stroke-linecap="round" fill="none">${[0, 60, 120].map(a => `<g transform="rotate(${a})"><path d="M0 -17 V17 M-5 -12 L0 -8 L5 -12 M-5 12 L0 8 L5 12"/></g>`).join('')}</g>`,
    note: '<path d="M14 31 V9 L34 5 V27" stroke="#3B2B5A" stroke-width="3" fill="none"/><path d="M14 14 L34 10" stroke="#3B2B5A" stroke-width="3"/><ellipse cx="10" cy="31" rx="6" ry="4.6" fill="#3B2B5A"/><ellipse cx="30" cy="27" rx="6" ry="4.6" fill="#3B2B5A"/>',
    pencil: '<g transform="rotate(45 20 20)"><rect x="15" y="1" width="10" height="28" fill="#FFC93C"/><rect x="15" y="1" width="10" height="5" fill="#FF8FA8"/><rect x="15" y="6" width="10" height="3" fill="#C0C8D6"/><path d="M15 29 L20 39 L25 29Z" fill="#F2D2A6"/><path d="M18.4 35.8 L20 39 L21.6 35.8Z" fill="#333"/></g>',
    clock: '<circle cx="20" cy="21" r="16" fill="#fff" stroke="#6C4BF4" stroke-width="3"/><path d="M20 21 V11 M20 21 L27 25" stroke="#222" stroke-width="2.6" stroke-linecap="round"/><circle cx="20" cy="21" r="2" fill="#E8304A"/><path d="M11 3 L5 9 M29 3 L35 9" stroke="#6C4BF4" stroke-width="3" stroke-linecap="round"/>',
    worm: '<path d="M4 32 C4 26 10 26 12 30 C14 34 18 34 20 30 C22 26 26 26 28 30" stroke="#7BCB4A" stroke-width="7" fill="none" stroke-linecap="round"/><circle cx="31" cy="20" r="7.5" fill="#7BCB4A"/><circle cx="28.6" cy="19" r="2.8" fill="#fff" stroke="#222" stroke-width="1.2"/><circle cx="34.6" cy="19" r="2.8" fill="#fff" stroke="#222" stroke-width="1.2"/><path d="M31.4 19 H31.8" stroke="#222" stroke-width="1.2"/><circle cx="28.8" cy="19.4" r="1" fill="#222"/><circle cx="34.8" cy="19.4" r="1" fill="#222"/><path d="M29 24 C31 26 33 26 35 24" stroke="#222" stroke-width="1.2" fill="none"/>',
    gem: '<path d="M10 6 H30 L37 15 L20 36 L3 15Z" fill="#3AC6E8"/><path d="M3 15 H37 M10 6 L15 15 L20 36 L25 15 L30 6 M15 15 L20 6 L25 15" stroke="#1E8FB0" stroke-width="1.4" fill="none"/><path d="M12 9 L15.5 13" stroke="#fff" stroke-width="2" stroke-linecap="round"/>',
  };
  const GENERIC = ['star', 'lightning', 'rocket', 'book', 'heart', 'crown', 'gem', 'moon', 'sun', 'planet'];

  /* ======================= what is the book about? ======================= */
  // [theme, words to look for, pictures]  (the first picture is the big one)
  const THEMES = [
    ['dino', /dinosaur|\bdino|t-?rex|tyrannosaur|jurassic|raptor|triceratops|fossil|prehistoric/, ['dino', 'volcano', 'dino']],
    ['shark', /shark/, ['shark', 'wave', 'fish']],
    ['dragon', /dragon/, ['dragon', 'flame', 'castle']],
    ['ninja', /ninja|samurai|karate|kung fu|martial art/, ['ninja', 'shuriken', 'shuriken']],
    ['pirate', /pirate|treasure|shipwreck/, ['pirate', 'chest', 'wave']],
    ['robot', /robot|machine|invent|technolog|engineer|coding|computer/, ['robot', 'lightning', 'flask']],
    ['game', /minecraft|video game|gaming|roblox|gamer|pixel/, ['pixel', 'gem', 'pixel']],
    ['hero', /super ?hero|villain|comic|graphic novel|captain/, ['pow', 'mask', 'lightning']],
    ['space', /\bspace\b|planet|astronaut|rocket|galax|\bmoon\b|solar system|\bmars\b|alien|\bstars?\b/, ['planet', 'rocket', 'star']],
    ['ocean', /ocean|\bsea\b|whale|dolphin|octopus|underwater|marine|\bfish/, ['fish', 'wave', 'shark']],
    ['magic', /magic|wizard|witch|spell|fair(y|ies)|unicorn|fantasy|enchant|sorcer/, ['wizard', 'star', 'moon']],
    ['knight', /knight|castle|\bking\b|queen|prince|medieval|sword/, ['shield', 'castle', 'crown']],
    ['spooky', /ghost|monster|zombie|haunt|spooky|vampire|halloween|scary|creepy|goosebumps|werewol/, ['ghost', 'bat', 'moon']],
    ['mystery', /myster|detective|\bspy\b|spies|secret|\bclues?\b|\bcase\b|agent/, ['magnifier', 'key', 'star']],
    ['football', /football|\bnfl\b|touchdown|quarterback/, ['football', 'trophy', 'star']],
    ['soccer', /soccer/, ['soccer', 'trophy', 'star']],
    ['baseball', /baseball/, ['baseball', 'trophy', 'star']],
    ['basketball', /basketball/, ['basketball', 'trophy', 'star']],
    ['sports', /sport|olympic|hockey|champion|\bteam\b/, ['trophy', 'soccer', 'basketball']],
    ['cars', /\bcars?\b|truck|\brac(e|ing)\b|vehicle/, ['car', 'truck', 'flame']],
    ['plane', /airplane|\bplanes?\b|pilot|flight/, ['plane', 'sun', 'star']],
    ['volcano', /volcano|lava|earthquake/, ['volcano', 'flame', 'volcano']],
    ['science', /science|experiment|chemist|scientist|weather/, ['flask', 'planet', 'lightning']],
    ['dog', /\bdogs?\b|pupp|\bpup\b/, ['dog', 'paw', 'heart']],
    ['cat', /\bcats?\b|kitten|kitty/, ['cat', 'paw', 'fish']],
    ['horse', /horse|pony|ponies|stallion/, ['horse', 'cowboy', 'heart']],
    ['bird', /\bbirds?\b|\bowls?\b|eagle|parrot/, ['owl', 'moon', 'tree']],
    ['bug', /insect|\bbugs?\b|spider|beetle|\bants?\b|\bbees?\b|butterfl|ladybug/, ['bug', 'tree', 'bug']],
    ['farm', /\bfarm|tractor|\bcows?\b|\bpigs?\b|chicken/, ['barn', 'sun', 'apple']],
    ['wild', /animal|\bzoo\b|\blions?\b|tiger|jungle|safari|elephant|monkey|wildlife|gorilla/, ['lion', 'paw', 'tree']],
    ['war', /\bwar\b|army|soldier|battle|military/, ['helmet', 'shield', 'star']],
    ['history', /histor|ancient|egypt|pyramid|roman|viking/, ['shield', 'crown', 'castle']],
    ['western', /cowboy|western|wild west|ranch|arizona|desert|outlaw/, ['cowboy', 'cactus', 'sun']],
    ['faith', /bible|\bgod\b|jesus|christ|prayer|church|faith|scripture|devotion/, ['cross', 'dove', 'heart']],
    ['food', /\bfood|cook|pizza|candy|\bcakes?\b|dessert|baking|chocolate|cookie/, ['pizza', 'cookie', 'heart']],
    ['funny', /funny|humou?r|jokes?|silly|laugh|fart|underpants|giggle|goofy/, ['laugh', 'pow', 'star']],
    ['nature', /forest|camping|outdoor|nature|woods|hiking|survival|wilderness/, ['tree', 'tent', 'sun']],
    ['winter', /winter|\bsnow|christmas|frozen|arctic|polar/, ['snowman', 'snowflake', 'star']],
    ['music', /music|\bband\b|\bsongs?\b|guitar|singing/, ['note', 'star', 'note']],
    ['school', /school|teacher|classroom|friendship|\bfriends?\b/, ['pencil', 'apple', 'book']],
  ];
  // Title words count more than library subjects; the two best themes give the pictures.
  function iconsFor(seed, title, subjects = []) {
    const t = String(title || '').toLowerCase(), subj = subjects.map(s => String(s).toLowerCase());
    const scored = THEMES.map(([id, re, icons], i) => ({ id, icons, i, n: (re.test(t) ? 5 : 0) + subj.filter(s => re.test(s)).length }))
      .filter(x => x.n).sort((a, b) => b.n - a.n || a.i - b.i);
    const R = rng(seed);
    if (!scored.length) { const g = [...GENERIC].sort(() => R() - .5); return { themes: [], icons: g.slice(0, 3) }; }
    const [a, b] = scored;
    return { themes: scored.slice(0, 2).map(x => x.id), icons: b ? [a.icons[0], a.icons[1], b.icons[0]] : a.icons.slice(0, 3) };
  }
  async function subjectsFor(title, author) {
    try {
      const u = `https://openlibrary.org/search.json?title=${encodeURIComponent(title)}${author ? `&author=${encodeURIComponent(author)}` : ''}&limit=3&fields=subject`;
      const j = await (await fetch(u)).json();
      return (j.docs || []).flatMap(d => (d.subject || []).slice(0, 40));
    } catch (e) { return []; }
  }

  /* ======================= colours from the cover ======================= */
  const hex = (r, g, b) => '#' + [r, g, b].map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
  function hsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
    if (!d) return [0, 0, l];
    const s = d / (1 - Math.abs(2 * l - 1));
    const h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [(h * 60 + 360) % 360, s, l];
  }
  const fallbackPal = seed => { const h = seed % 360; return [`hsl(${h},72%,55%)`, `hsl(${(h + 35) % 360},70%,38%)`, `hsl(${(h + 180) % 360},85%,62%)`]; };
  function palFromImage(img) {
    const cv = document.createElement('canvas'); cv.width = 24; cv.height = 36;
    const g = cv.getContext('2d'); g.drawImage(img, 0, 0, 24, 36);
    const px = g.getImageData(0, 0, 24, 36).data, bins = {};
    for (let i = 0; i < px.length; i += 4) {
      const [h, s, l] = hsl(px[i], px[i + 1], px[i + 2]);
      const key = s < .2 ? `g${Math.round(l * 3)}` : `${Math.round(h / 30) % 12}-${l < .35 ? 0 : l < .7 ? 1 : 2}`;
      const b = bins[key] ||= { n: 0, r: 0, g: 0, b: 0 };
      b.n++; b.r += px[i]; b.g += px[i + 1]; b.b += px[i + 2];
    }
    const list = Object.values(bins).map(b => { const r = b.r / b.n, g2 = b.g / b.n, bl = b.b / b.n, [h, s, l] = hsl(r, g2, bl); return { r, g: g2, b: bl, h, s, l, n: b.n }; });
    // Colourful, not-too-pale colours win; greys only count a little.
    const score = c => c.n * (c.s < .2 ? .25 : .6 + c.s) * (c.l > .9 || c.l < .08 ? .2 : 1);
    list.sort((a, b) => score(b) - score(a));
    if (!list.length || list[0].s < .15) return null;
    const c1 = list[0];
    const far = c => Math.min(Math.abs(c.h - c1.h), 360 - Math.abs(c.h - c1.h)) > 35 || Math.abs(c.l - c1.l) > .25;
    // the second colour is the bottom of the bookmark: rich and darker, or a deeper shade of the first
    const c2 = list.find(c => c !== c1 && far(c) && c.s > .25 && c.l < .6) || { ...c1, r: c1.r * .55, g: c1.g * .55, b: c1.b * .55 };
    const c3 = [...list].filter(c => c !== c1 && c.s > .35).sort((a, b) => b.s * b.n - a.s * a.n)[0] || c2;
    const tone = c => { const k = c.l > .72 ? .72 / c.l : 1; return hex(c.r * k, c.g * k, c.b * k); };
    return [tone(c1), tone(c2), tone(c3)];
  }
  function palFor(src) {
    return new Promise(res => {
      if (!src) return res(null);
      const img = new Image();
      // A separate address from the one the shelf shows, so this colour check never
      // gets in the way of the cover picture loading on the shelf.
      if (!src.startsWith('data:')) { img.crossOrigin = 'anonymous'; src += (src.includes('?') ? '&' : '?') + 'rrbm=1'; }
      const t = setTimeout(() => res(null), 8000);
      img.onload = () => { clearTimeout(t); try { res(palFromImage(img)); } catch (e) { res(null); } };
      img.onerror = () => { clearTimeout(t); res(null); };
      img.src = src;
    });
  }
  // Everything the bookmark needs from one book: pictures and colours.
  async function analyze(b, coverURL) {
    const seed = hash(b.id);
    const [subjects, pal] = await Promise.all([subjectsFor(b.title, b.author), palFor(coverURL)]);
    const { icons, themes } = iconsFor(seed, b.title, subjects);
    return { icons, themes, pal: pal || fallbackPal(seed) };
  }

  /* ======================= drawing ======================= */
  const SHAPES = {
    ribbon: 'M6 14 Q6 4 16 4 H84 Q94 4 94 14 V296 L50 270 L6 296Z',
    tab: 'M6 30 Q6 4 32 4 H68 Q94 4 94 30 V288 Q94 296 86 296 H14 Q6 296 6 288Z',
    arrow: 'M6 12 Q6 4 14 4 H86 Q94 4 94 12 V268 L50 298 L6 268Z',
    wavy: 'M6 12 Q6 4 14 4 H86 Q94 4 94 12 V284 Q83 298 72 284 T50 284 T28 284 T6 284Z',
  };
  const PATTERNS = {
    dots: '<circle cx="7" cy="7" r="2.6" fill="#fff"/>|14|14',
    stripes: '<rect width="7" height="16" fill="#fff"/>|16|16|rotate(35)',
    zigzag: '<path d="M0 9 L5 3 L10 9 L15 3 L20 9" stroke="#fff" stroke-width="2.6" fill="none"/>|20|12',
    stars: '<path d="M13 6 l2 4.4 4.8.5 -3.6 3.2 1 4.7 -4.2 -2.4 -4.2 2.4 1 -4.7 -3.6 -3.2 4.8 -.5Z" fill="#fff"/>|26|26',
    checks: '<rect width="10" height="10" fill="#fff"/><rect x="10" y="10" width="10" height="10" fill="#fff"/>|20|20',
    waves: '<path d="M0 8 Q5 2 10 8 T20 8" stroke="#fff" stroke-width="2.4" fill="none"/>|20|12',
  };
  const EDGE = { common: '#C47A3A', rare: '#B9C6D3', epic: '#9B5CFF', legendary: '#FFC93C' };
  const RAR = { common: 'Common', rare: 'Rare', epic: 'Epic', legendary: 'Legendary' };
  let n = 0;
  // Two short lines for long titles, squeezed to fit if they are still too long.
  function titleLines(title) {
    const t = String(title || '').trim(), max = 34;
    const s = t.length > max ? t.slice(0, max - 1).trimEnd() + '…' : t;
    if (s.length <= 13) return [s];
    const words = s.split(' '); let best = [s, ''], bestD = 1e9;
    for (let i = 1; i < words.length; i++) { const a = words.slice(0, i).join(' '), b = words.slice(i).join(' '), d = Math.max(a.length, b.length); if (d < bestD) { bestD = d; best = [a, b]; } }
    return best[1] ? best : [s];
  }
  /* spec: { seed, title, pal:[c1,c2,c3], icons:[big, small, small], rarity, stage (0 sketch .. 4 complete), shape?, pattern? }
     Stages: 0 a pencil sketch, 1 colour, 2 pictures, 3 pattern and tassel, 4 finished with its rarity. */
  function svg(sp, w = 80, cls = '') {
    const id = ++n, R = rng(sp.seed >>> 0);
    const shape = sp.shape || pick(R, Object.keys(SHAPES)), pat = sp.pattern || pick(R, Object.keys(PATTERNS));
    const [c1, c2, c3] = sp.pal || fallbackPal(sp.seed);
    const st = sp.stage ?? 4, col = st >= 1, art = st >= 2, deco = st >= 3, rar = st >= 4 ? (sp.rarity || 'common') : null;
    const body = SHAPES[shape];
    const [pBody, pw, ph, pt] = PATTERNS[pat].split('|');
    const lines = titleLines(sp.title), fs = lines.length > 1 ? 14.5 : 17.5;
    const longest = Math.max(...lines.map(l => l.length)), squeeze = longest * fs * .56 > 112;
    const text = lines.map((l, i) => `<text x="0" y="${lines.length > 1 ? (i ? 9.5 : -7.5) : 1}" dy=".35em" text-anchor="middle" font-family="Fredoka,Nunito,sans-serif" font-weight="700" font-size="${fs}" fill="${col ? '#2A2340' : '#A3A8B4'}"${squeeze && l.length * fs * .56 > 112 ? ' textLength="112" lengthAdjust="spacingAndGlyphs"' : ''}>${esc(l)}</text>`).join('');
    const icon = (k, x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})">${ICON[k] || ICON.star}</g>`;
    const [big, s1, s2] = sp.icons || ['star', 'star', 'star'];
    const tw = (x, y, s, d) => `<path class="bm-tw" style="animation-delay:-${d}s" d="M${x} ${y - s} C${x + s * .12} ${y - s * .2} ${x + s * .2} ${y - s * .12} ${x + s} ${y} C${x + s * .2} ${y + s * .12} ${x + s * .12} ${y + s * .2} ${x} ${y + s} C${x - s * .12} ${y + s * .2} ${x - s * .2} ${y + s * .12} ${x - s} ${y} C${x - s * .2} ${y - s * .12} ${x - s * .12} ${y - s * .2} ${x} ${y - s}Z" fill="#fff"/>`;
    const cordFrom = shape === 'tab' ? 20 : 6;
    return `<svg class="bm ${cls}" viewBox="-4 -40 108 344" width="${w}" height="${Math.round(w * 344 / 108)}" aria-hidden="true">
      <defs><clipPath id="bmc${id}"><path d="${body}"/></clipPath>
        <linearGradient id="bmg${id}" x1="0" y1="0" x2=".5" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient>
        <pattern id="bmp${id}" width="${pw}" height="${ph}" patternUnits="userSpaceOnUse"${pt ? ` patternTransform="${pt}"` : ''}>${pBody}</pattern>
        ${rar === 'legendary' ? `<linearGradient id="bmh${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FF5C8A"/><stop offset=".25" stop-color="#FFD23F"/><stop offset=".5" stop-color="#5CF2C2"/><stop offset=".75" stop-color="#5CA8FF"/><stop offset="1" stop-color="#C77DFF"/></linearGradient>` : ''}</defs>
      ${deco ? `<g class="bm-tassel"><path d="M50 ${cordFrom} C50 -6 55 -18 66 -26" stroke="${c3}" stroke-width="2.6" fill="none" stroke-linecap="round"/><circle cx="68" cy="-28" r="5.5" fill="${c3}" stroke="#00000022" stroke-width="1"/>
        <path d="M70 -25 L86 -8 M72 -27 L91 -15 M69 -23 L79 -4 M73 -29 L95 -22" stroke="${c3}" stroke-width="2.2" stroke-linecap="round"/></g>` : ''}
      <path d="${body}" fill="${col ? `url(#bmg${id})` : '#FBFAF7'}"/>
      <g clip-path="url(#bmc${id})">
        ${deco ? `<rect x="0" y="0" width="100" height="300" fill="url(#bmp${id})" opacity=".2"/>` : ''}
        ${art ? `<circle cx="50" cy="67" r="36" fill="#fff" opacity=".22"/>${icon(big, 13, 30, 1.85)}${icon(s1, 13, 244, .75)}${icon(s2, 57, 244, .75)}`
          : `<circle cx="50" cy="66" r="30" fill="none" stroke="${col ? '#ffffffaa' : '#C9CDD6'}" stroke-width="3" stroke-dasharray="7 6"/><text x="50" y="66" dy=".35em" text-anchor="middle" font-family="Fredoka,sans-serif" font-weight="700" font-size="38" fill="${col ? '#ffffffcc' : '#C9CDD6'}">?</text>`}
        <rect x="26" y="112" width="48" height="126" rx="11" fill="#fff" opacity="${col ? .92 : 1}" ${col ? '' : 'stroke="#D5D9E0" stroke-width="1.6" stroke-dasharray="5 4"'}/>
        <g transform="translate(50 175) rotate(-90)">${text}</g>
        ${rar && rar !== 'common' ? '<g class="bm-shine"><rect x="-70" y="-30" width="30" height="380" fill="#fff" opacity=".38" transform="rotate(18 50 150)"/></g>' : ''}
        ${rar === 'legendary' ? `<rect class="bm-holo" x="-60" y="-80" width="220" height="460" fill="url(#bmh${id})" opacity=".17"/>` : ''}
        ${rar === 'epic' || rar === 'legendary' ? tw(22, 104, 7, 0) + tw(80, 98, 5, .6) + tw(78, 250, 6, 1.1) + tw(24, 160, 4, .3) : ''}
      </g>
      <path d="${body}" fill="none" stroke="${rar ? EDGE[rar] : col ? '#00000030' : '#B5BBC6'}" stroke-width="${rar ? 5 : 2.4}"${col ? '' : ' stroke-dasharray="7 5"'}/>
      ${rar === 'legendary' ? `<path d="${body}" fill="none" stroke="#FFF3B0" stroke-width="1.4" transform="translate(50 150) scale(.9) translate(-50 -150)"/>` : ''}
      ${shape === 'tab' ? `<circle cx="50" cy="20" r="5.5" fill="#00000040"/>` : ''}
    </svg>`;
  }
  const envelope = (w, seal = '#E8304A') => `<svg class="env" viewBox="0 0 120 84" width="${w}" height="${Math.round(w * .7)}" aria-hidden="true">
    <rect x="2" y="10" width="116" height="72" rx="6" fill="#F3E3C3" stroke="#D9C29A" stroke-width="2"/>
    <path d="M2 80 L52 44 Q60 39 68 44 L118 80" fill="#EAD5AE" stroke="#D9C29A" stroke-width="2"/>
    <path class="env-flap" d="M2 14 L60 52 L118 14 Q118 10 112 10 H8 Q2 10 2 14Z" fill="#F8EBD0" stroke="#D9C29A" stroke-width="2"/>
    <circle cx="60" cy="50" r="11" fill="${seal}"/><path d="M60 43 l2 4.4 4.8 .5 -3.6 3.2 1 4.7 -4.2 -2.4 -4.2 2.4 1 -4.7 -3.6 -3.2 4.8 -.5Z" fill="#FFD9D9"/></svg>`;

  const css = document.createElement('style');
  css.textContent = `
  .bm .bm-shine{animation:bmShine 3.4s ease-in-out infinite}
  @keyframes bmShine{0%{transform:translateX(-20px)}55%,100%{transform:translateX(190px)}}
  .bm .bm-holo{animation:bmHolo 3.6s ease-in-out infinite alternate}
  @keyframes bmHolo{from{transform:translate(-40px,-50px)}to{transform:translate(40px,50px)}}
  .bm .bm-tw{animation:bmTw 1.7s ease-in-out infinite;transform-box:fill-box;transform-origin:center}
  @keyframes bmTw{50%{opacity:.1;transform:scale(.4)}}
  .bm .bm-tassel{animation:bmSwing 2.6s ease-in-out infinite alternate;transform-origin:50px 0}
  @keyframes bmSwing{from{transform:rotate(-5deg)}to{transform:rotate(6deg)}}
  .bm.still *{animation:none!important}`;
  document.head.appendChild(css);

  window.RRBM = { svg, envelope, analyze, iconsFor, fallbackPal, hash, RAR, EDGE };
})();

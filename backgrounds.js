/* Reading Rocket backgrounds: a still scene behind the app (#bg) plus moving things on top of
   everything (#fx). Nothing here ever catches a tap. Swimmers, fliers and falling things are
   animated with the Web Animations API so every pass takes a fresh random path. */
(() => {
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const W = () => innerWidth, H = () => innerHeight;

  /* ======================= artwork ======================= */
  const shark = w => `<svg viewBox="0 0 300 120" width="${w}" height="${w * .4}">
    <g class="bgx-tail" style="transform-origin:32px 63px"><path d="M34 60 L2 22 C16 34 24 46 30 56 L30 70 C24 80 16 92 2 104 L34 68Z" fill="#4E6A80"/></g>
    <path d="M28 64 C50 42 110 28 182 33 C232 37 272 50 296 62 C272 73 234 85 182 89 C110 93 50 84 28 64Z" fill="#5D7A90"/>
    <path d="M70 74 C118 88 196 89 278 69 C246 82 196 92 150 92 C112 92 86 86 70 74Z" fill="#E6EDF2"/>
    <path d="M128 35 C140 10 152 2 164 0 C161 14 163 26 172 35Z" fill="#4E6A80"/>
    <path d="M152 82 C148 98 140 110 126 117 C152 113 170 101 178 87Z" fill="#4E6A80"/>
    <path d="M206 50 C204 58 204 66 206 74 M213 49 C211 57 211 65 213 73 M220 49 C218 57 218 65 220 72" stroke="#3E566A" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    <circle cx="252" cy="55" r="3.4" fill="#0e1620"/><circle cx="253" cy="54" r="1" fill="#fff"/>
    <path d="M258 70 C268 74 278 72 286 66" stroke="#2c3e4e" stroke-width="2" fill="none" stroke-linecap="round"/></svg>`;

  const fish = (w, o) => `<svg viewBox="0 0 64 36" width="${w}" height="${w * 36 / 64}">
    <g class="bgx-tail" style="transform-origin:16px 18px"><path d="M17 18 L2 5 C5 14 5 22 2 31Z" fill="${o.tail}"/></g>
    <path d="M24 9 C31 1 40 2 44 8Z" fill="${o.fin}"/><ellipse cx="36" cy="18" rx="22" ry="12" fill="${o.body}"/>${o.marks || ''}
    <path d="M30 26 C34 33 40 33 43 28Z" fill="${o.fin}"/>
    <circle cx="50" cy="15" r="2.7" fill="#fff"/><circle cx="50.8" cy="15" r="1.5" fill="#111"/></svg>`;
  const FISH = [
    { body: '#FF7A1A', tail: '#FF7A1A', fin: '#E35E00', marks: '<path d="M44 7 C41 13 41 23 44 29 L48 28 C46 22 46 14 48 8Z M29 6.5 C26 13 26 23 29 29.5 L33 30 C31 23 31 13 33 6Z" fill="#fff" stroke="#222" stroke-width="1.1"/>' },
    { body: '#2F6BEA', tail: '#FFD23F', fin: '#1B47B0', marks: '<path d="M22 13 C32 7 44 9 52 16 C44 13 34 15 27 21Z" fill="#0b1f4d"/>' },
    { body: '#FFD23F', tail: '#F7B500', fin: '#F7B500', marks: '<path d="M18 18 C30 16 44 16 56 18" stroke="#fff" stroke-width="1.6" opacity=".7"/>' },
    { body: '#B9C4D0', tail: '#2b2b2b', fin: '#2b2b2b', marks: '<path d="M26 7 L30 29 M36 6 L39 30 M46 8 L48 28" stroke="#1e1e1e" stroke-width="3.2"/>' },
    { body: '#E8457A', tail: '#B92E5B', fin: '#B92E5B', marks: '<circle cx="30" cy="15" r="2" fill="#FFD5E2"/><circle cx="38" cy="22" r="1.6" fill="#FFD5E2"/><circle cx="26" cy="22" r="1.4" fill="#FFD5E2"/>' },
  ];
  const jelly = (w, c) => `<svg viewBox="0 0 50 90" width="${w}" height="${w * 1.8}"><g class="bgx-pulse" style="transform-origin:25px 24px">
    <path d="M4 30 C4 8 46 8 46 30 C38 35 12 35 4 30Z" fill="${c}" opacity=".78"/><path d="M12 18 C16 13 22 12 26 13" stroke="#fff" stroke-width="2.4" opacity=".6" fill="none" stroke-linecap="round"/></g>
    <g class="bgx-tent" stroke="${c}" stroke-width="2.4" fill="none" opacity=".75" stroke-linecap="round">
    <path d="M12 32 C8 44 16 54 10 66 C6 74 12 80 10 88"/><path d="M20 33 C24 46 16 56 22 70"/><path d="M30 33 C26 46 34 58 28 72 C26 78 30 84 28 88"/><path d="M38 32 C42 44 34 54 40 66"/></g></svg>`;
  const seaweed = (h, c) => `<svg viewBox="0 0 30 120" width="${h / 4}" height="${h}" preserveAspectRatio="none"><path d="M15 120 C5 100 25 85 14 66 C4 48 24 34 15 14 C13 8 15 3 16 0" stroke="${c}" stroke-width="7" fill="none" stroke-linecap="round"/>
    <path d="M14 80 C24 76 28 70 28 62 M15 46 C5 42 2 36 3 28" stroke="${c}" stroke-width="5" fill="none" stroke-linecap="round"/></svg>`;

  const cloud = (w, op = 1) => `<svg viewBox="0 0 120 60" width="${w}" height="${w / 2}" opacity="${op}"><g fill="#fff">
    <circle cx="30" cy="38" r="18"/><circle cx="56" cy="28" r="24"/><circle cx="84" cy="36" r="19"/><circle cx="102" cy="44" r="12"/><rect x="18" y="38" width="90" height="18" rx="9"/></g>
    <path d="M22 54 h86" stroke="#DCEBF7" stroke-width="5" stroke-linecap="round"/></svg>`;
  const rainbow = w => `<svg viewBox="0 0 200 104" width="${w}" height="${w * .52}">${['#FF4B4B', '#FF9F2E', '#FFE03B', '#4CD964', '#3AA0FF', '#5B5BFF', '#B05BFF']
    .map((c, i) => `<path d="M${10 + i * 7} 104 A${90 - i * 7} ${90 - i * 7} 0 0 1 ${190 - i * 7} 104" stroke="${c}" stroke-width="7.4" fill="none"/>`).join('')}</svg>`;
  const flock = (n, c = '#1f2a44') => `<svg viewBox="0 0 ${n * 26} 40" width="${n * 22}" height="34">${Array.from({ length: n }, (_, i) =>
    `<g transform="translate(${i * 24} ${Math.abs(i - (n - 1) / 2) * 7})"><path class="bgx-flap" d="M0 8 Q6 0 12 8 Q18 0 24 8" stroke="${c}" stroke-width="2.6" fill="none" stroke-linecap="round" style="animation-delay:-${i * .13}s"/></g>`).join('')}</svg>`;
  const balloon = (w, a, b) => `<svg viewBox="0 0 60 90" width="${w}" height="${w * 1.5}">
    <path d="M30 2 C12 2 2 16 2 30 C2 46 18 56 24 64 L36 64 C42 56 58 46 58 30 C58 16 48 2 30 2Z" fill="${a}"/>
    <path d="M30 2 C22 10 20 46 24 64 L36 64 C40 46 38 10 30 2Z" fill="${b}"/><path d="M12 14 C10 22 10 30 14 38" stroke="#fff" stroke-width="3" opacity=".45" fill="none" stroke-linecap="round"/>
    <path d="M24 64 L25 76 M36 64 L35 76" stroke="#6b4a2b" stroke-width="1.4"/><rect x="23" y="75" width="14" height="11" rx="2" fill="#8B5A2B"/></svg>`;
  const petal = (s, c) => `<svg viewBox="0 0 20 28" width="${s}" height="${s * 1.4}"><path d="M10 0 C18 6 20 18 10 28 C0 18 2 6 10 0Z" fill="${c}"/><path d="M10 4 C11 12 11 18 10 24" stroke="#fff" stroke-width="1.2" opacity=".55" fill="none"/></svg>`;
  const flake = (s, op = 1) => `<svg viewBox="-12 -12 24 24" width="${s}" height="${s}"><g stroke="#fff" stroke-width="1.5" stroke-linecap="round" opacity="${op}" fill="none">${[0, 60, 120]
    .map(a => `<g transform="rotate(${a})"><path d="M0 -11 V11 M-3.4 -8 L0 -5 L3.4 -8 M-3.4 8 L0 5 L3.4 8 M-2 -10.5 L0 -9 L2 -10.5"/></g>`).join('')}</g><circle r="1.6" fill="#fff" opacity="${op}"/></svg>`;
  const pine = (h, cap = true) => `<svg viewBox="0 0 60 100" width="${h * .6}" height="${h}"><rect x="26" y="82" width="8" height="18" fill="#3b2a1e"/>
    <path d="M30 0 L52 34 L42 34 L58 60 L46 60 L60 86 L0 86 L14 60 L2 60 L18 34 L8 34Z" fill="#1E5A3C"/>
    ${cap ? '<path d="M30 0 L40 15 C35 18 26 18 20 15Z M18 34 C26 38 36 38 42 34 L46 40 C36 44 24 44 14 40Z M14 60 C26 65 36 65 46 60 L50 66 C36 70 24 70 10 66Z" fill="#fff"/>' : ''}</svg>`;
  const gumdrop = (s, c, d) => `<svg viewBox="0 0 30 28" width="${s}" height="${s * .93}"><path d="M3 25 C3 9 9 2 15 2 C21 2 27 9 27 25Z" fill="${c}"/><ellipse cx="15" cy="25" rx="12" ry="2.6" fill="${d}"/>
    <path d="M9 9 C10 6 12 5 14 5" stroke="#fff" stroke-width="2.2" opacity=".6" fill="none" stroke-linecap="round"/>
    <g fill="#fff" opacity=".8"><circle cx="11" cy="15" r=".9"/><circle cx="18" cy="11" r=".9"/><circle cx="20" cy="19" r=".9"/><circle cx="13" cy="21" r=".9"/><circle cx="16" cy="16" r=".8"/></g></svg>`;
  const wrapped = (s, c) => `<svg viewBox="0 0 50 24" width="${s}" height="${s * .48}"><path d="M14 12 L2 2 L5 12 L2 22Z M36 12 L48 2 L45 12 L48 22Z" fill="${c}" opacity=".85"/>
    <ellipse cx="25" cy="12" rx="12" ry="9" fill="${c}"/><path d="M18 8 C21 5 26 5 29 6" stroke="#fff" stroke-width="2" opacity=".6" fill="none" stroke-linecap="round"/></svg>`;
  const mint = s => `<svg viewBox="-14 -14 28 28" width="${s}" height="${s}"><circle r="13" fill="#fff"/>${[0, 60, 120, 180, 240, 300]
    .map(a => `<path d="M0 0 L12.6 -3.4 A13 13 0 0 1 9 9.4Z" transform="rotate(${a})" fill="#E8304A"/>`).join('')}<circle r="13" fill="none" stroke="#f1f1f1" stroke-width="1.5"/><circle r="2.5" fill="#fff"/></svg>`;
  const bean = (s, c) => `<svg viewBox="0 0 30 18" width="${s}" height="${s * .6}"><path d="M4 9 C4 2 12 1 16 4 C20 7 24 2 27 5 C30 9 26 17 16 16 C8 16 4 14 4 9Z" fill="${c}"/><path d="M9 6 C11 4 14 4 15 5" stroke="#fff" stroke-width="1.8" opacity=".6" fill="none" stroke-linecap="round"/></svg>`;
  const lolly = (s, a, b) => `<svg viewBox="0 0 30 60" width="${s}" height="${s * 2}"><rect x="13.5" y="26" width="3" height="34" rx="1.5" fill="#f4efe6"/><circle cx="15" cy="15" r="14" fill="${a}"/>
    <path d="M15 15 m0 -11 a11 11 0 1 1 -10 7 M15 15 m0 -6 a6 6 0 1 0 5 4" stroke="${b}" stroke-width="3.4" fill="none" stroke-linecap="round"/></svg>`;
  const coin = s => `<svg viewBox="0 0 30 30" width="${s}" height="${s}"><circle cx="15" cy="15" r="14" fill="#E0A100"/><circle cx="15" cy="15" r="11" fill="#FFD23F"/>
    <path d="M15 7 L17.3 12.6 L23.4 13 L18.7 16.9 L20.2 22.8 L15 19.6 L9.8 22.8 L11.3 16.9 L6.6 13 L12.7 12.6Z" fill="#E8B000"/><path d="M8 9 C10 6 13 5 15 5" stroke="#fff" stroke-width="2" opacity=".6" fill="none" stroke-linecap="round"/></svg>`;
  const star4 = (s, c = '#FFE27A') => `<svg viewBox="-10 -10 20 20" width="${s}" height="${s}"><path d="M0 -10 C1.2 -2 2 -1.2 10 0 C2 1.2 1.2 2 0 10 C-1.2 2 -2 1.2 -10 0 C-2 -1.2 -1.2 -2 0 -10Z" fill="${c}"/></svg>`;
  const rocket = w => `<svg viewBox="0 0 120 50" width="${w}" height="${w * .42}">
    <g class="bgx-flame"><path d="M22 25 L0 16 C6 22 6 28 0 34Z" fill="#FFB020"/><path d="M22 25 L8 20 C11 23 11 27 8 30Z" fill="#FFF07A"/></g>
    <path d="M22 14 L84 14 C102 14 114 20 118 25 C114 30 102 36 84 36 L22 36Z" fill="#F4F4F8"/><path d="M84 14 C102 14 114 20 118 25 C114 30 102 36 84 36Z" fill="#E8304A"/>
    <circle cx="66" cy="25" r="7" fill="#3AA0FF" stroke="#9aa3b5" stroke-width="2.4"/><path d="M28 14 L18 2 L44 14Z M28 36 L18 48 L44 36Z" fill="#E8304A"/></svg>`;
  const ufo = w => `<svg viewBox="0 0 120 110" width="${w}" height="${w * .92}"><path class="bgx-beam" d="M44 40 L76 40 L104 110 L16 110Z" fill="#B9FF7A" opacity=".28"/>
    <ellipse cx="60" cy="26" rx="20" ry="16" fill="#9FE7FF" opacity=".85"/><ellipse cx="60" cy="34" rx="54" ry="12" fill="#9AA3B5"/><ellipse cx="60" cy="31" rx="54" ry="9" fill="#C7CDD9"/>
    ${[22, 42, 60, 78, 98].map((x, i) => `<circle class="bgx-blink" cx="${x}" cy="36" r="3" fill="#FFE03B" style="animation-delay:-${i * .2}s"/>`).join('')}</svg>`;
  const astro = w => `<svg viewBox="0 0 70 80" width="${w}" height="${w * 1.14}"><rect x="8" y="30" width="14" height="26" rx="5" fill="#cfd5df"/>
    <rect x="18" y="28" width="34" height="34" rx="10" fill="#F4F4F8"/><rect x="22" y="58" width="11" height="20" rx="5" fill="#F4F4F8"/><rect x="38" y="58" width="11" height="20" rx="5" fill="#F4F4F8"/>
    <rect x="50" y="32" width="12" height="22" rx="5" fill="#F4F4F8"/><circle cx="35" cy="20" r="17" fill="#F4F4F8"/><ellipse cx="38" cy="20" rx="11" ry="9" fill="#2B3A67"/>
    <path d="M32 15 C34 13 37 13 39 14" stroke="#9FE7FF" stroke-width="2.2" fill="none" stroke-linecap="round"/><rect x="27" y="38" width="16" height="9" rx="2" fill="#3AA0FF"/></svg>`;
  const planet = (w, a, b, ring) => `<svg viewBox="0 0 100 70" width="${w}" height="${w * .7}">${ring ? `<ellipse cx="50" cy="35" rx="48" ry="11" fill="none" stroke="${ring}" stroke-width="5" opacity=".9"/>` : ''}
    <circle cx="50" cy="35" r="24" fill="${a}"/><path d="M28 28 C40 32 60 30 74 26 M27 40 C42 44 60 42 73 38" stroke="${b}" stroke-width="4" opacity=".55" fill="none"/>
    ${ring ? `<path d="M2 35 C10 44 90 44 98 35" stroke="${ring}" stroke-width="5" fill="none"/>` : ''}</svg>`;
  const parrot = w => `<svg viewBox="0 0 110 60" width="${w}" height="${w * .55}">
    <g class="bgx-wing" style="transform-origin:52px 28px;animation-delay:-.2s;opacity:.85"><path d="M52 28 C44 8 58 -2 78 2 C72 14 62 24 56 32Z" fill="#1E5BD6"/></g>
    <path d="M30 32 L0 44 L4 36 L0 30 L30 28Z" fill="#E8304A"/><path d="M4 36 L28 32" stroke="#1E5BD6" stroke-width="3"/>
    <ellipse cx="52" cy="32" rx="22" ry="11" fill="#E8304A"/><circle cx="76" cy="24" r="10" fill="#E8304A"/>
    <path d="M84 20 C92 20 96 26 92 32 C90 28 86 27 83 28Z" fill="#2b2b2b"/><circle cx="79" cy="21" r="3.2" fill="#fff"/><circle cx="79.6" cy="21" r="1.6" fill="#111"/>
    <g class="bgx-wing" style="transform-origin:54px 28px"><path d="M54 28 C44 6 60 -4 82 0 C76 14 64 24 58 33Z" fill="#FFD23F"/><path d="M58 22 C64 12 72 8 80 6" stroke="#1E5BD6" stroke-width="5" fill="none"/></g></svg>`;
  const vine = h => `<svg viewBox="0 0 40 200" width="${h / 5}" height="${h}" preserveAspectRatio="none"><path d="M20 0 C10 30 30 60 18 90 C8 120 30 150 20 200" stroke="#2F7A3A" stroke-width="4" fill="none"/>
    ${[30, 70, 110, 150, 185].map((y, i) => `<path d="M20 ${y} C${i % 2 ? 36 : 4} ${y - 8} ${i % 2 ? 38 : 2} ${y + 6} 20 ${y + 8}Z" fill="#4CAF50"/>`).join('')}</svg>`;
  const bigLeaf = (h, flip) => `<svg viewBox="0 0 60 120" width="${h / 2}" height="${h}" style="${flip ? 'transform:scaleX(-1)' : ''}"><path d="M4 120 C0 70 20 20 58 0 C50 50 40 90 4 120Z" fill="#2E8B48"/>
    <path d="M6 116 C20 80 34 40 54 6" stroke="#1B5E30" stroke-width="2.4" fill="none"/><path d="M16 90 L34 80 M22 70 L42 58 M30 50 L48 36" stroke="#1B5E30" stroke-width="1.6"/></svg>`;
  // maple0-6 are the maple picture already coloured red, orange or yellow, with its shadow drawn in.
  // (Colouring with a CSS filter made iPhones leave stuck copies of falling leaves on the screen.)
  const maple = s => `<img src="decor/maple${Math.floor(Math.random() * 7)}.webp" alt="" style="height:${Math.round(s * 1.09)}px;display:block">`;

  /* ---- holiday artwork ---- */
  const HEART_PATH = 'M16 29 C6 21 1 15 1 9 C1 4 5 1 9 1 C12 1 14.5 3 16 5.5 C17.5 3 20 1 23 1 C27 1 31 4 31 9 C31 15 26 21 16 29Z';
  const HEARTS = ['#FF1744', '#FF4F8B', '#FF80AB', '#E91E63', '#FFFFFF', '#B388FF', '#FF5252', '#FFC1D9'];
  const heart = (s, c) => `<svg viewBox="0 0 32 30" width="${s}" height="${s * .94}"><path d="${HEART_PATH}" fill="${c}"/><path d="M7 7 C8 5 10 4.3 12 4.8" stroke="#fff" stroke-width="2.2" opacity=".55" fill="none" stroke-linecap="round"/></svg>`;
  const convo = s => { const [c, t] = pick([['#FFB3C7', 'LOVE'], ['#C8F7C5', 'HUG ME'], ['#FFF3B0', 'XOXO'], ['#D7C4FF', 'BE MINE'], ['#B8E6FF', 'BFF'], ['#FFD3A8', 'SMILE'], ['#FFB3C7', 'U ROCK']]);
    return `<svg viewBox="0 0 32 30" width="${s}" height="${s * .94}"><path d="${HEART_PATH}" fill="${c}"/><text x="16" y="15.5" font-size="${t.length > 4 ? 4.4 : 6}" font-weight="900" text-anchor="middle" font-family="Arial,sans-serif" fill="#D81B60">${t}</text></svg>`; };
  const letter = s => `<svg viewBox="0 0 40 28" width="${s}" height="${s * .7}"><rect x="1" y="1" width="38" height="26" rx="3" fill="#fff" stroke="#F8BBD0" stroke-width="1.5"/><path d="M2 3 L20 16 L38 3" stroke="#F48FB1" stroke-width="1.8" fill="none"/>
    <path d="M20 22 C16 19 14 17 14 15 C14 13 16 12 17.5 12 C18.6 12 19.4 12.8 20 13.6 C20.6 12.8 21.4 12 22.5 12 C24 12 26 13 26 15 C26 17 24 19 20 22Z" fill="#E91E63"/></svg>`;

  const xmasTree = h => `<svg viewBox="0 0 100 140" width="${h * .71}" height="${h}"><rect x="44" y="118" width="12" height="18" fill="#6B3E1F"/>
    <path d="M50 14 L82 56 L66 56 L92 92 L72 92 L98 122 L2 122 L28 92 L8 92 L34 56 L18 56Z" fill="#1E7A3C"/>
    <path d="M30 60 C44 66 58 64 72 56 M22 96 C42 104 62 102 80 92" stroke="#FFD23F" stroke-width="2.4" fill="none"/>
    ${[[40, 48, '#FF3B3B'], [60, 52, '#3AA0FF'], [32, 74, '#FFD23F'], [52, 78, '#FF3B3B'], [70, 72, '#B05BFF'], [26, 104, '#3AA0FF'], [46, 110, '#FFD23F'], [66, 106, '#FF3B3B'], [84, 112, '#3AA0FF'], [50, 34, '#B05BFF']]
      .map(([x, y, c], i) => `<circle class="bgx-blink" cx="${x}" cy="${y}" r="3.6" fill="${c}" style="animation-delay:-${i * .27}s"/>`).join('')}
    <path class="bgx-glowstar" d="M50 2 L53.5 10 L62 10.5 L55.5 16 L57.5 24.5 L50 20 L42.5 24.5 L44.5 16 L38 10.5 L46.5 10Z" fill="#FFD23F"/></svg>`;
  const present = (w, a, b) => `<svg viewBox="0 0 40 36" width="${w}" height="${w * .9}"><rect x="2" y="12" width="36" height="22" rx="2" fill="${a}"/><rect x="0" y="8" width="40" height="8" rx="2" fill="${a}"/>
    <rect x="17" y="8" width="6" height="26" fill="${b}"/><path d="M20 8 C14 0 6 2 10 7 C12 9 17 8 20 8 C23 8 28 9 30 7 C34 2 26 0 20 8Z" fill="${b}"/></svg>`;
  const xmasLights = () => `<svg viewBox="0 0 400 34" style="width:100%;height:auto;display:block"><path d="M0 4 Q25 22 50 4 T100 4 T150 4 T200 4 T250 4 T300 4 T350 4 T400 4" stroke="#24331f" stroke-width="1.6" fill="none"/>
    ${Array.from({ length: 16 }, (_, i) => { const x = 12.5 + i * 25, y = 13; return `<ellipse class="bgx-blink" cx="${x}" cy="${y + 5}" rx="3.6" ry="5.4" fill="${['#FF3B3B', '#FFD23F', '#3AD06B', '#3AA0FF', '#FF7AE0'][i % 5]}" style="animation-delay:-${(i % 5) * .3}s"/><rect x="${x - 2}" y="${y - 2}" width="4" height="3" fill="#333"/>`; }).join('')}</svg>`;
  const cane = s => `<svg viewBox="0 0 20 40" width="${s * .5}" height="${s}"><path d="M6 38 V12 C6 4 16 4 16 12" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M6 38 V12 C6 4 16 4 16 12" stroke="#E8304A" stroke-width="5" fill="none" stroke-linecap="round" stroke-dasharray="4 4"/></svg>`;
  const reindeer = (x, nose) => `<g transform="translate(${x} 0)">
    <g class="bgx-gallop" style="transform-origin:12px 58px"><path d="M8 58 L2 72 M16 58 L12 72" stroke="#6B3E1F" stroke-width="3" stroke-linecap="round"/></g>
    <g class="bgx-gallop2" style="transform-origin:34px 58px"><path d="M30 58 L36 72 M38 58 L44 70" stroke="#6B3E1F" stroke-width="3" stroke-linecap="round"/></g>
    <ellipse cx="24" cy="52" rx="20" ry="9" fill="#8B5A2B"/><path d="M38 48 C42 40 44 34 48 30 L54 34 C50 38 48 44 44 52Z" fill="#8B5A2B"/>
    <ellipse cx="54" cy="30" rx="8" ry="5.5" fill="#8B5A2B"/><path d="M50 25 L46 14 M48 18 L42 16 M53 25 L55 13 M54 17 L59 13" stroke="#6B3E1F" stroke-width="2" stroke-linecap="round"/>
    <circle cx="61.5" cy="30" r="${nose ? 3.6 : 2}" fill="${nose ? '#FF2A2A' : '#3b2414'}" ${nose ? 'class="bgx-nose"' : ''}/><circle cx="54" cy="28" r="1.2" fill="#111"/>
    <path d="M4 50 C2 46 4 44 7 45" stroke="#F4E3C3" stroke-width="3" fill="none" stroke-linecap="round"/></g>`;
  const sleigh = w => `<svg viewBox="0 0 330 92" width="${w}" height="${w * 92 / 330}">
    ${[0, 1, 2, 3, 4].map(i => `<path class="bgx-tw" d="M${6 + i * 8} ${40 + (i % 2) * 8} l2 -5 l2 5 l5 2 l-5 2 l-2 5 l-2 -5 l-5 -2Z" fill="#FFE27A" style="animation-delay:-${i * .3}s"/>`).join('')}
    <path d="M128 50 L330 46" stroke="#5a3a1a" stroke-width="1.6"/>${reindeer(150)}${reindeer(205)}${reindeer(260, true)}
    <circle cx="60" cy="40" r="17" fill="#8B5A2B"/><path d="M50 30 C56 26 64 26 70 30" stroke="#6b4420" stroke-width="2" fill="none"/>
    <ellipse cx="90" cy="42" rx="14" ry="16" fill="#D62828"/><rect x="77" y="44" width="26" height="4" fill="#222"/>
    <circle cx="94" cy="22" r="8.5" fill="#F5C9A8"/><path d="M86 24 C86 36 102 36 103 24 C99 28 90 28 86 24Z" fill="#fff"/><circle cx="97" cy="20" r="1.2" fill="#222"/><circle cx="100.5" cy="23" r="1.8" fill="#F08080"/>
    <path d="M86 18 C88 8 98 6 104 12 L92 17Z" fill="#D62828"/><path d="M85 18 C90 16 98 15 104 17" stroke="#fff" stroke-width="3.4" stroke-linecap="round"/><circle cx="83" cy="12" r="3.4" fill="#fff"/>
    <path d="M44 58 C44 44 58 40 76 42 L120 44 C130 44 134 50 132 58 L128 70 C126 76 120 78 112 78 L58 78 C50 78 44 72 44 58Z" fill="#C62828"/>
    <path d="M48 60 C70 64 104 64 128 58" stroke="#FFD23F" stroke-width="2.4" fill="none"/>
    <path d="M38 84 C62 89 112 89 136 83 C144 80 146 72 139 70" stroke="#FFD23F" stroke-width="4" fill="none" stroke-linecap="round"/></svg>`;

  const shamrock = s => `<svg viewBox="-16 -16 32 34" width="${s}" height="${s * 1.06}"><g fill="#2EAD4B">${[0, 120, 240].map(a => `<path transform="rotate(${a}) translate(0 -7)" d="M0 5 C-7 0 -8 -6 -4 -8 C-2 -9 -.5 -8 0 -6.5 C.5 -8 2 -9 4 -8 C8 -6 7 0 0 5Z"/>`).join('')}</g>
    <path d="M0 2 C1 8 3 13 6 17" stroke="#1E7A34" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M-3 -9 C-1 -10 1 -10 2 -9" stroke="#8EE09B" stroke-width="1.4" fill="none"/></svg>`;
  const lepHat = s => `<svg viewBox="0 0 40 34" width="${s}" height="${s * .85}"><ellipse cx="20" cy="29" rx="19" ry="4.5" fill="#1B7A34"/><path d="M9 29 L11 4 C16 2 24 2 29 4 L31 29Z" fill="#22A045"/>
    <rect x="10" y="19" width="20" height="5" fill="#222"/><rect x="17" y="18" width="6" height="7" fill="none" stroke="#FFD23F" stroke-width="1.8"/></svg>`;
  const potOfGold = w => `<svg viewBox="0 0 100 80" width="${w}" height="${w * .8}"><ellipse cx="50" cy="22" rx="40" ry="10" fill="#FFD23F"/>
    ${[[30, 16], [44, 12], [58, 14], [70, 18], [38, 22], [52, 20], [64, 24]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="7" fill="#F2B705" stroke="#C99400" stroke-width="1.4"/>`).join('')}
    <path d="M10 26 C8 60 24 78 50 78 C76 78 92 60 90 26 C70 34 30 34 10 26Z" fill="#1d1d1d"/><path d="M8 24 C30 34 70 34 92 24" stroke="#333" stroke-width="6" fill="none" stroke-linecap="round"/>
    <path d="M22 40 C24 52 30 60 38 64" stroke="#444" stroke-width="3" fill="none" stroke-linecap="round"/></svg>`;
  const snowPile = s => `<span class="bgx-mound" style="width:${s * 1.5}px;height:${s * .8}px"></span>`;
  const flatCoin = s => `<div style="transform:scaleY(.5)">${coin(s)}</div>`;

  const darkCloud = (w, c = '#566170', sh = '#424C59') => `<svg viewBox="0 0 120 60" width="${w}" height="${w / 2}"><g fill="${c}"><circle cx="30" cy="36" r="18"/><circle cx="56" cy="26" r="24"/><circle cx="84" cy="34" r="19"/><circle cx="102" cy="42" r="12"/><rect x="16" y="36" width="94" height="20" rx="10"/></g>
    <rect x="20" y="46" width="88" height="10" rx="5" fill="${sh}"/></svg>`;
  const bolt = h => `<svg viewBox="0 0 40 100" width="${h * .4}" height="${h}"><path d="M24 0 L6 52 L20 52 L10 100 L36 38 L22 38 L32 0Z" fill="#FFF59D" stroke="#fff" stroke-width="2" stroke-linejoin="round"/></svg>`;
  const umbrella = w => `<svg viewBox="0 0 60 60" width="${w}" height="${w}"><path d="M2 28 C4 10 18 2 30 2 C42 2 56 10 58 28 C52 24 46 24 40 28 C36 24 24 24 20 28 C14 24 8 24 2 28Z" fill="#FFC107"/>
    <path d="M20 28 C20 14 26 4 30 2 C34 4 40 14 40 28" stroke="#F57F17" stroke-width="1.5" fill="none"/><path d="M30 28 V52 C30 58 22 58 22 52" stroke="#3b2a1e" stroke-width="3" fill="none" stroke-linecap="round"/></svg>`;
  const boat = w => `<svg viewBox="0 0 60 40" width="${w}" height="${w * .67}"><path d="M4 24 L56 24 L46 36 L14 36Z" fill="#FAFAFA" stroke="#B0BEC5" stroke-width="1"/>
    <path d="M30 2 L30 24 L12 24Z" fill="#fff" stroke="#B0BEC5" stroke-width="1"/><path d="M30 6 L44 24 L30 24Z" fill="#ECEFF1" stroke="#B0BEC5" stroke-width="1"/></svg>`;

  const EGG = 'M12 1 C19 1 23 12 23 18 C23 25 18 29 12 29 C6 29 1 25 1 18 C1 12 5 1 12 1Z';
  const egg = s => { const base = pick(['#FF8FB8', '#8FD3FF', '#B39DFF', '#FFE066', '#8BE38B', '#FFB36B', '#FF6B6B']), acc = pick(['#fff', '#E91E63', '#3F51B5', '#FF9800', '#4CAF50', '#7C3AED']), k = Math.floor(Math.random() * 3);
    const marks = k === 0 ? `<path d="M0 14 L4 11 L8 14 L12 11 L16 14 L20 11 L24 14 M0 20 L4 17 L8 20 L12 17 L16 20 L20 17 L24 20" stroke="${acc}" stroke-width="2.2" fill="none"/>`
      : k === 1 ? [[7, 9], [15, 8], [11, 15], [6, 21], [17, 20], [12, 25]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.9" fill="${acc}"/>`).join('')
      : `<rect x="0" y="12" width="24" height="3" fill="${acc}"/><rect x="0" y="19" width="24" height="3" fill="${acc}"/>`;
    return `<svg viewBox="0 0 24 30" width="${s * .8}" height="${s}"><path d="${EGG}" fill="${base}"/><g clip-path="url(#rr-egg)">${marks}</g><path d="M7 7 C8 5 10 4 11 4" stroke="#fff" stroke-width="1.6" opacity=".6" fill="none" stroke-linecap="round"/></svg>`; };
  const chick = w => `<svg viewBox="0 0 40 42" width="${w}" height="${w * 1.05}"><g class="bgx-hop"><circle cx="18" cy="24" r="12" fill="#FFE03B"/><circle cx="28" cy="13" r="8" fill="#FFE03B"/>
    <path d="M35 12 L41 14.5 L35 17Z" fill="#FF9800"/><circle cx="30" cy="11" r="1.4" fill="#111"/><path d="M10 22 C14 18 20 20 20 26" stroke="#F4C400" stroke-width="2.2" fill="none"/></g>
    <path d="M15 35 L14 40 M21 35 L22 40" stroke="#FF9800" stroke-width="2" stroke-linecap="round"/></svg>`;
  const basket = w => `<svg viewBox="0 0 100 74" width="${w}" height="${w * .74}"><path d="M18 34 C18 4 82 4 82 34" stroke="#8B5A2B" stroke-width="5" fill="none"/>
    <path d="M30 30 C30 22 40 22 40 30Z M44 28 C44 18 56 18 56 28Z M60 30 C60 22 70 22 70 30Z" fill="#FF8FB8"/><path d="M44 28 C44 18 56 18 56 28Z" fill="#8FD3FF"/><path d="M60 30 C60 22 70 22 70 30Z" fill="#FFE066"/>
    <path d="M10 32 L90 32 L80 72 L20 72Z" fill="#C68A4E"/><path d="M14 44 H86 M17 56 H83 M30 32 L34 72 M50 32 V72 M70 32 L66 72" stroke="#9C6A36" stroke-width="2.4"/>
    <path d="M10 32 L90 32" stroke="#A8743E" stroke-width="5"/></svg>`;

  const bigStar = w => `<svg viewBox="-50 -50 100 100" width="${w}" height="${w}"><path d="M0 -48 L6 -8 L40 -28 L10 -2 L48 0 L10 4 L30 34 L4 10 L0 48 L-4 10 L-30 34 L-10 4 L-48 0 L-10 -2 L-40 -28 L-6 -8Z" fill="#FFF6C8"/><circle r="9" fill="#fff"/></svg>`;
  const crossesHill = () => `<svg viewBox="0 0 400 170" preserveAspectRatio="xMidYMax slice" style="width:100%;height:230px;display:block">
    <path d="M0 150 C80 120 140 70 200 66 C260 70 320 120 400 150 L400 170 L0 170Z" fill="#1A1433"/>
    <g fill="#120D26"><rect x="195" y="0" width="10" height="72"/><rect x="176" y="18" width="48" height="9"/><rect x="133" y="40" width="7" height="50"/><rect x="120" y="52" width="33" height="6"/>
    <rect x="260" y="40" width="7" height="50"/><rect x="247" y="52" width="33" height="6"/></g></svg>`;
  const dove = w => `<svg viewBox="0 0 100 56" width="${w}" height="${w * .56}">
    <g class="bgx-wing" style="transform-origin:46px 30px;animation-delay:-.2s;opacity:.85"><path d="M46 30 C38 10 52 0 72 2 C66 14 58 24 50 34Z" fill="#E1E8F2"/></g>
    <path d="M24 34 L4 28 L8 36 L4 42 L24 38Z" fill="#F2F5FA"/><ellipse cx="46" cy="36" rx="22" ry="10" fill="#fff"/><circle cx="70" cy="28" r="8" fill="#fff"/>
    <path d="M77 27 L84 29 L77 31Z" fill="#F4A261"/><circle cx="72" cy="26" r="1.3" fill="#222"/>
    <path d="M82 30 C88 34 92 36 97 35" stroke="#4CAF50" stroke-width="1.6" fill="none"/><ellipse cx="89" cy="33" rx="3" ry="1.4" fill="#66BB6A" transform="rotate(20 89 33)"/><ellipse cx="95" cy="36.5" rx="3" ry="1.4" fill="#66BB6A" transform="rotate(-10 95 36.5)"/>
    <g class="bgx-wing" style="transform-origin:48px 30px"><path d="M48 30 C38 6 54 -4 76 0 C70 14 60 24 52 35Z" fill="#fff"/><path d="M54 14 L66 8 M53 20 L64 16" stroke="#DDE3EC" stroke-width="1.5"/></g></svg>`;
  const crossIcon = '<svg viewBox="0 0 20 30" width="20" height="30"><rect x="8" y="0" width="4" height="30" fill="#FFE7A0"/><rect x="2" y="7" width="16" height="4" fill="#FFE7A0"/></svg>';

  /* ---- Arizona desert artwork ---- */
  const saguaro = (h, flower) => `<svg viewBox="0 0 60 120" width="${h / 2}" height="${h}">
    <path d="M8 66 C8 74 14 76 24 76 L24 66 L19 66 C17 66 17 64 17 62 L17 40 C17 33 8 33 8 40Z" fill="#3E8C4C"/>
    <path d="M52 52 C52 60 46 62 36 62 L36 52 L41 52 C43 52 43 50 43 48 L43 26 C43 19 52 19 52 26Z" fill="#3E8C4C"/>
    <path d="M23 120 L23 14 C23 4 37 4 37 14 L37 120Z" fill="#46A055"/>
    <path d="M27 10 V120 M30 7 V120 M33 10 V120 M12 38 V70 M48 24 V56" stroke="#2F7A3D" stroke-width="1.3" fill="none"/>
    <path d="M25.5 14 C25.5 10 27 8 28.5 7.5" stroke="#8EDB8F" stroke-width="1.6" fill="none" stroke-linecap="round"/>
    ${flower ? '<circle cx="27" cy="7" r="3" fill="#FFF7E0"/><circle cx="33" cy="6" r="3" fill="#FFF7E0"/><circle cx="27" cy="7" r="1.2" fill="#FFD23F"/><circle cx="33" cy="6" r="1.2" fill="#FFD23F"/>' : ''}</svg>`;
  const pear = h => `<svg viewBox="0 0 70 70" width="${h}" height="${h}"><g fill="#5FA34E" stroke="#3F7C33" stroke-width="1.5">
    <ellipse cx="35" cy="54" rx="13" ry="16"/><ellipse cx="18" cy="34" rx="11" ry="14" transform="rotate(-24 18 34)"/><ellipse cx="50" cy="30" rx="11" ry="14" transform="rotate(20 50 30)"/><ellipse cx="34" cy="22" rx="9" ry="12"/></g>
    <g fill="#E83E8C"><ellipse cx="30" cy="10" rx="3.4" ry="4"/><ellipse cx="38" cy="10" rx="3.4" ry="4"/><ellipse cx="56" cy="17" rx="3.4" ry="4"/><ellipse cx="12" cy="21" rx="3.4" ry="4"/></g>
    <g fill="#F7F0C8"><circle cx="30" cy="48" r=".9"/><circle cx="40" cy="58" r=".9"/><circle cx="16" cy="32" r=".9"/><circle cx="50" cy="26" r=".9"/><circle cx="34" cy="20" r=".9"/><circle cx="38" cy="44" r=".9"/></g></svg>`;
  const barrel = h => `<svg viewBox="0 0 50 50" width="${h}" height="${h}"><ellipse cx="25" cy="30" rx="20" ry="19" fill="#4F9A4A"/>
    <path d="M25 11 V49 M15 14 C11 24 11 38 15 47 M35 14 C39 24 39 38 35 47 M8 22 C5 30 6 40 10 45 M42 22 C45 30 44 40 40 45" stroke="#356F33" stroke-width="1.5" fill="none"/>
    <g fill="#FF8A1F"><circle cx="19" cy="12" r="3.5"/><circle cx="25" cy="10" r="3.8"/><circle cx="31" cy="12" r="3.5"/></g><circle cx="25" cy="10" r="1.4" fill="#FFE03B"/></svg>`;
  const tumbleweed = s => { const r = [0, 22, 45, 67, 90, 112, 135, 157].map(a => `<ellipse rx="17" ry="${6 + (a % 3) * 2}" transform="rotate(${a})"/>`).join('');
    const r2 = [10, 50, 95, 140].map(a => `<ellipse rx="11" ry="8" transform="rotate(${a}) translate(2 1)"/>`).join('');
    return `<svg viewBox="-20 -20 40 40" width="${s}" height="${s}"><circle r="17" fill="#C9A066" opacity=".25"/><g fill="none" stroke="#8C5E2E" stroke-width="1.4" stroke-linecap="round">${r}</g>
      <g fill="none" stroke="#C99A5B" stroke-width="1" stroke-linecap="round">${r2}</g><path d="M-17 -4 l-3 -2 M15 9 l4 1 M3 -17 l1 -3 M-8 15 l-2 3" stroke="#8C5E2E" stroke-width="1.3" stroke-linecap="round"/></svg>`; };
  // The rattlesnake is a row of beads; each bead bobs a moment after the one behind it, so a wave runs down the body.
  const snake = w => { const n = 22, seg = w / (n + 3), out = [];
    // two passes: a dark outline bead under every bead first, then the coloured beads on top
    for (const pass2 of [0, 1]) for (let i = 0; i < n; i++) { const t = i / (n - 1), r = seg * (.38 + .7 * Math.min(1, t * 2.4)) * (t > .93 ? .85 : 1), cx = seg * 2 + i * seg;
      out.push(`<g class="bgx-sn" style="animation-delay:-${(i * .07).toFixed(2)}s">${pass2 ? `<circle cx="${cx}" cy="0" r="${r.toFixed(1)}" fill="${i % 3 === 1 ? '#5A3618' : '#B07E43'}"/>${i % 3 === 1 ? `<circle cx="${cx}" cy="0" r="${(r * .45).toFixed(1)}" fill="#EBCB8E"/>` : ''}`
        : `<circle cx="${cx}" cy="0" r="${(r + seg * .18).toFixed(1)}" fill="#3B2410"/>`}</g>`); }
    const hx = seg * 2 + n * seg;
    return `<svg viewBox="0 ${-seg * 2} ${w + seg * 2} ${seg * 4}" width="${w + seg * 2}" height="${seg * 4}" style="overflow:visible">
      <g class="bgx-sn bgx-rattle" style="animation-delay:.07s"><ellipse cx="${seg * .6}" cy="0" rx="${seg * .5}" ry="${seg * .32}" fill="#E9D7A8"/><ellipse cx="${seg * 1.3}" cy="0" rx="${seg * .5}" ry="${seg * .36}" fill="#D9C38E"/></g>
      ${out.join('')}
      <g class="bgx-sn" style="animation-delay:-${(n * .07).toFixed(2)}s"><path class="bgx-tongue" d="M${hx + seg * 1.1} 0 l${seg * 1.2} 0 l${seg * .4} -${seg * .3} M${hx + seg * 2.3} 0 l${seg * .4} ${seg * .3}" stroke="#E8304A" stroke-width="${seg * .14}" fill="none" stroke-linecap="round" style="transform-origin:${hx + seg}px 0"/>
        <ellipse cx="${hx}" cy="0" rx="${seg * 1.3}" ry="${seg * .8}" fill="#9C6B36" stroke="#3B2410" stroke-width="${seg * .18}"/><circle cx="${hx + seg * .5}" cy="-${seg * .3}" r="${seg * .22}" fill="#111"/></g></svg>`; };
  const hawk = w => `<svg viewBox="0 0 120 50" width="${w}" height="${w * .42}"><g class="bgx-glide" style="transform-origin:60px 26px">
    <path d="M60 26 C46 14 26 8 2 12 C20 16 36 22 50 30Z M60 26 C74 14 94 8 118 12 C100 16 84 22 70 30Z" fill="#5A3A22"/>
    <path d="M2 12 l6 3 M118 12 l-6 3" stroke="#2c1c10" stroke-width="2"/>
    <ellipse cx="60" cy="28" rx="7" ry="11" fill="#6E4A2C"/><path d="M55 37 L60 48 L65 37Z" fill="#C2552A"/><circle cx="60" cy="18" r="4.5" fill="#6E4A2C"/></g></svg>`;
  const mesas = () => `<svg viewBox="0 0 400 130" preserveAspectRatio="none" style="width:100%;height:100%;display:block">
    <path d="M0 130 L0 92 L18 92 L26 60 L70 60 L80 96 L130 100 L142 74 L150 74 L156 102 L240 104 L252 44 L262 40 L300 40 L310 46 L322 104 L360 100 L368 80 L380 80 L388 98 L400 96 L400 130Z" fill="#E49A6A"/>
    <path d="M0 130 L0 110 L40 108 L56 84 L64 70 L74 70 L80 86 L96 112 L180 116 L200 92 L206 64 L214 62 L220 66 L226 94 L250 118 L400 114 L400 130Z" fill="#C4592F"/>
    <path d="M64 70 L74 70 L76 76 L66 76Z M206 64 L214 62 L216 70 L207 71Z M252 44 L300 40 L302 48 L254 50Z" fill="#9C3F20" opacity=".6"/></svg>`;
  const dunes = () => `<svg viewBox="0 0 400 80" preserveAspectRatio="none" style="width:100%;height:100%;display:block">
    <path d="M0 30 C70 10 140 22 210 30 C280 38 340 16 400 24 L400 80 L0 80Z" fill="#EDBB7A"/>
    <path d="M0 52 C90 38 170 46 250 56 C320 64 360 48 400 50 L400 80 L0 80Z" fill="#DFA05C"/>
    <g fill="#B97A3E" opacity=".55"><ellipse cx="60" cy="60" rx="10" ry="4"/><ellipse cx="300" cy="66" rx="14" ry="5"/><ellipse cx="180" cy="44" rx="6" ry="2.5"/></g></svg>`;

  /* ---- harvest, northern lights, city at midnight, beach, campfire, flag ---- */
  const hayBale = w => `<svg viewBox="0 0 60 40" width="${w}" height="${w * .67}"><rect x="2" y="6" width="56" height="32" rx="7" fill="#E9B949" stroke="#C99A33" stroke-width="2"/>
    <path d="M2 17 H58 M2 28 H58" stroke="#B9852A" stroke-width="2.4"/><path d="M8 10 l3 -6 M18 9 l2 -7 M30 9 l3 -6 M42 9 l2 -6 M52 10 l3 -5" stroke="#F2CF6B" stroke-width="2" stroke-linecap="round"/></svg>`;
  const cornStalk = h => `<svg viewBox="0 0 30 100" width="${h * .3}" height="${h}"><path d="M15 100 V8" stroke="#B8923A" stroke-width="3"/>
    <path d="M15 30 C6 26 2 18 1 10 C8 16 12 22 15 26Z M15 52 C24 48 28 40 29 32 C22 38 18 44 15 48Z M15 74 C6 70 2 62 1 54 C8 60 12 66 15 70Z" fill="#D9B45A"/>
    <path d="M17 42 C23 38 25 30 23 23 C18 27 16 34 17 42Z" fill="#F2C744"/><path d="M15 8 l-3 -7 M15 8 l3 -7 M15 8 v-8" stroke="#C9A04A" stroke-width="1.6"/></svg>`;
  const scarecrow = h => `<svg viewBox="0 0 60 100" width="${h * .6}" height="${h}"><path d="M30 100 V20 M6 40 H54" stroke="#7A5230" stroke-width="4"/>
    <path d="M14 36 L46 36 L44 66 L16 66Z" fill="#C2410C" stroke="#7C2D12" stroke-width="1.5"/><path d="M22 36 V66 M30 36 V66 M38 36 V66" stroke="#9A3412" stroke-width="1.2" opacity=".6"/>
    <path d="M8 36 L16 36 L14 46 L6 44Z M52 36 L44 36 L46 46 L54 44Z" fill="#2563EB"/>
    <path d="M6 44 l-3 4 M8 45 l-1 5 M54 44 l3 4 M52 45 l1 5 M24 66 l-2 6 M30 66 v7 M36 66 l2 6" stroke="#E9B949" stroke-width="2" stroke-linecap="round"/>
    <circle cx="30" cy="24" r="10" fill="#F2D29B"/><circle cx="26.5" cy="23" r="1.4" fill="#222"/><circle cx="33.5" cy="23" r="1.4" fill="#222"/><path d="M25 28 C28 31 32 31 35 28" stroke="#222" stroke-width="1.4" fill="none"/>
    <path d="M12 15 C20 12 40 12 48 15 C46 18 14 18 12 15Z" fill="#8B5A2B"/><path d="M21 15 C21 4 39 4 39 15Z" fill="#A0693A"/><path d="M21 12 H39" stroke="#C2410C" stroke-width="2"/></svg>`;
  const pumpkin = w => `<svg viewBox="0 0 60 50" width="${w}" height="${w * .83}"><path d="M30 12 C28 6 30 2 34 1" stroke="#4E7D3A" stroke-width="3" fill="none" stroke-linecap="round"/>
    <ellipse cx="18" cy="31" rx="14" ry="17" fill="#E06A16"/><ellipse cx="42" cy="31" rx="14" ry="17" fill="#E06A16"/><ellipse cx="30" cy="31" rx="13" ry="18" fill="#F2862A"/>
    <path d="M30 13 C26 22 26 40 30 49 M18 14 C12 22 12 40 18 48 M42 14 C48 22 48 40 42 48" stroke="#B9530E" stroke-width="1.6" fill="none"/>
    <path d="M24 20 C24 26 25 32 27 36" stroke="#FFB067" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".7"/><path d="M35 8 C39 5 44 7 44 10 C40 11 37 10 35 8Z" fill="#5FA34E"/></svg>`;
  const fields = () => `<svg viewBox="0 0 400 140" preserveAspectRatio="none" style="width:100%;height:100%;display:block">
    <path d="M0 60 C80 30 160 40 240 56 C310 70 360 44 400 50 V140 H0Z" fill="#D9A441"/>
    <path d="M0 96 C90 76 180 84 260 98 C330 110 370 92 400 94 V140 H0Z" fill="#B7791F"/>
    <path d="M20 70 C80 52 150 58 220 70 M10 84 C90 68 170 74 250 84 M40 118 C120 102 200 108 300 120" stroke="#F2C76B" stroke-width="2" fill="none" opacity=".6"/></svg>`;
  const peaks = () => `<svg viewBox="0 0 400 150" preserveAspectRatio="none" style="width:100%;height:100%;display:block">
    <path d="M0 150 V90 L50 40 L90 80 L140 20 L200 90 L250 50 L300 100 L350 30 L400 80 V150Z" fill="#1E3A5F"/>
    <path d="M50 40 L62 52 L56 54 L48 48 L40 54Z M140 20 L156 40 L146 38 L138 44 L128 36Z M250 50 L262 62 L252 60 L244 62Z M350 30 L364 46 L354 44 L346 48 L338 42Z" fill="#E8F1FA"/>
    <path d="M0 150 V118 L60 100 L120 120 L190 96 L260 122 L330 104 L400 118 V150Z" fill="#0F2440"/></svg>`;
  const skyline = () => { let x = 0, out = '', i = 0;
    while (x < 400) { const w = 22 + (i * 13) % 26, h = 40 + (i * 29) % 70; out += `<rect x="${x}" y="${150 - h}" width="${w}" height="${h}" fill="#140C2E"/>`;
      for (let wy = 150 - h + 6; wy < 146; wy += 9) for (let wx = x + 4; wx < x + w - 4; wx += 7) if ((wx * 7 + wy * 3 + i) % 5 < 2)
        out += `<rect ${(wx + wy) % 4 ? '' : `class="bgx-win" style="animation-delay:-${(wx % 9) * .7}s"`} x="${wx}" y="${wy}" width="3" height="4" fill="#FFD66B"/>`;
      x += w + 2; i++; }
    return `<svg viewBox="0 0 400 150" preserveAspectRatio="xMidYMax slice" style="width:100%;height:100%;display:block">${out}</svg>`; };
  const clockTower = h => `<svg viewBox="0 0 60 160" width="${h * .375}" height="${h}"><rect x="12" y="40" width="36" height="120" fill="#1B1240"/><path d="M8 42 L30 4 L52 42Z" fill="#1B1240"/>
    <circle cx="30" cy="62" r="15" fill="#FFF3C4" stroke="#FFD66B" stroke-width="2.4"/>
    ${[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(a => `<path d="M30 49 V51.6" stroke="#2A1B5A" stroke-width="1.4" transform="rotate(${a} 30 62)"/>`).join('')}
    <path d="M30 62 V50 M30 62 V53" stroke="#2A1B5A" stroke-width="2.6" stroke-linecap="round"/><circle cx="30" cy="62" r="2" fill="#2A1B5A"/>
    <rect x="22" y="90" width="5" height="8" fill="#FFD66B"/><rect x="33" y="90" width="5" height="8" fill="#FFD66B"/><rect x="22" y="112" width="5" height="8" fill="#FFD66B"/><rect x="33" y="112" width="5" height="8" fill="#FFD66B"/></svg>`;
  const tent = w => `<svg viewBox="0 0 100 70" width="${w}" height="${w * .7}"><path d="M4 68 L50 6 L96 68Z" fill="#F97316"/><path d="M50 6 L96 68 H70Z" fill="#C2410C"/>
    <path d="M50 6 L38 68 H62Z" fill="#FFD27A"/><path d="M50 6 L44 68 H56Z" fill="#FFF0B8"/><path d="M50 6 V0" stroke="#5B3A1A" stroke-width="2.4"/><path d="M2 68 H98" stroke="#3B2414" stroke-width="2"/></svg>`;
  const campfire = w => `<svg viewBox="0 0 120 112" width="${w}" height="${w * 112 / 120}" style="overflow:visible">
    <g class="bgx-fire" style="transform-origin:60px 94px">
      <path d="M60 4 C70 28 92 40 90 66 C88 86 76 96 60 96 C44 96 32 86 30 66 C28 46 44 36 50 18 C54 32 58 36 62 36 C58 26 57 14 60 4Z" fill="#FF6A1A"/>
      <path d="M60 30 C66 46 80 54 78 72 C76 86 68 94 60 94 C52 94 44 86 43 74 C42 62 50 56 54 46 C56 54 58 56 61 56 C59 48 58 40 60 30Z" fill="#FFB020"/>
      <path d="M60 56 C64 64 70 70 69 80 C68 88 64 92 60 92 C56 92 52 88 52 82 C52 76 56 72 58 66 C59 70 60 70 61 70 C60 66 60 60 60 56Z" fill="#FFF07A"/></g>
    <path d="M16 100 L104 88" stroke="#6B3E1F" stroke-width="12" stroke-linecap="round"/><path d="M16 88 L104 102" stroke="#7A4A26" stroke-width="12" stroke-linecap="round"/>
    <circle cx="16" cy="100" r="5" fill="#C99A6B"/><circle cx="104" cy="102" r="5" fill="#C99A6B"/>
    ${[[6, 106], [24, 108], [44, 110], [78, 110], [98, 108], [114, 106]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="9" ry="5.5" fill="#6B7280"/>`).join('')}</svg>`;
  const forest = c => `<svg viewBox="0 0 400 120" preserveAspectRatio="none" style="width:100%;height:100%;display:block">${Array.from({ length: 22 }, (_, i) => {
    const x = i * 19 - 6, h = 60 + ((i * 37) % 50); return `<path d="M${x} 120 L${x + 12} ${120 - h} L${x + 24} 120Z" fill="${c}"/>`; }).join('')}<rect y="108" width="400" height="12" fill="${c}"/></svg>`;
  const beachUmbrella = w => `<svg viewBox="0 0 100 92" width="${w}" height="${w * .92}"><path d="M52 18 L44 92" stroke="#8B5A2B" stroke-width="3"/>
    <path d="M2 36 C12 8 80 -4 98 24Z" fill="#EF4444"/><path d="M2 36 C14 18 30 10 46 6 L54 22Z M66 6 C80 8 92 14 98 24 L62 22Z" fill="#fff"/></svg>`;
  const sandcastle = w => `<svg viewBox="0 0 80 62" width="${w}" height="${w * .775}"><g fill="#E8C27A"><rect x="8" y="32" width="64" height="30"/><rect x="4" y="20" width="18" height="42"/><rect x="58" y="20" width="18" height="42"/><rect x="30" y="12" width="20" height="50"/>
    <path d="M4 20 v-5 h4 v5 h3 v-5 h4 v5 h3 v-5 h4 v5Z M58 20 v-5 h4 v5 h3 v-5 h4 v5 h3 v-5 h4 v5Z M30 12 v-5 h4 v5 h4 v-5 h4 v5 h4 v-5 h4 v5Z"/></g>
    <path d="M36 62 v-12 a4 4 0 0 1 8 0 v12Z" fill="#B9853F"/><path d="M40 12 V2" stroke="#6B4A2B" stroke-width="1.4"/><path d="M40 2 L50 5 L40 8Z" fill="#EF4444"/></svg>`;
  const crab = w => `<svg viewBox="0 0 60 38" width="${w}" height="${w * .63}"><g stroke="#C2410C" stroke-width="2.6" stroke-linecap="round" fill="none">
    <path class="bgx-scut" d="M18 26 L8 34 M22 28 L14 36"/><path class="bgx-scut bgx-scut2" d="M42 26 L52 34 M38 28 L46 36"/><path d="M16 20 C10 16 6 10 8 6 M44 20 C50 16 54 10 52 6"/></g>
    <path d="M3 8 C3 1 13 1 13 8 C11 5 6 5 3 8Z M47 8 C47 1 57 1 57 8 C55 5 50 5 47 8Z" fill="#EA580C"/>
    <ellipse cx="30" cy="24" rx="16" ry="10" fill="#F97316"/><path d="M24 14 V9 M36 14 V9" stroke="#C2410C" stroke-width="2"/>
    <circle cx="24" cy="8" r="2.8" fill="#fff"/><circle cx="36" cy="8" r="2.8" fill="#fff"/><circle cx="24" cy="8" r="1.4" fill="#111"/><circle cx="36" cy="8" r="1.4" fill="#111"/>
    <path d="M25 26 C28 28 32 28 35 26" stroke="#9A3412" stroke-width="1.4" fill="none"/></svg>`;
  const beachBall = s => `<svg viewBox="-20 -20 40 40" width="${s}" height="${s}">${['#EF4444', '#fff', '#3B82F6', '#fff', '#FACC15', '#fff'].map((c, i) =>
    `<path d="M0 0 L0 -18 A18 18 0 0 1 15.59 -9Z" fill="${c}" transform="rotate(${i * 60})"/>`).join('')}<circle r="4" fill="#fff"/><circle r="18" fill="none" stroke="#00000022"/></svg>`;
  const star5 = (s, c) => `<svg viewBox="-12 -12 24 24" width="${s}" height="${s}"><path d="M0 -11 L3.2 -3.6 L11 -3.4 L4.9 1.6 L7 9.3 L0 4.8 L-7 9.3 L-4.9 1.6 L-11 -3.4 L-3.2 -3.6Z" fill="${c}" stroke="#00000026" stroke-width=".8"/></svg>`;
  // The flag is cut into thin strips that each bob a moment after the last, so it ripples like it is in the wind.
  const flag = w => { const n = 14, sw = 190 / n;
    const stars = Array.from({ length: 30 }, (_, i) => `<circle cx="${6.5 + (i % 6) * 12 + (Math.floor(i / 6) % 2) * 6}" cy="${5.5 + Math.floor(i / 6) * 10.5}" r="2" fill="#fff"/>`).join('');
    const inner = `<rect width="190" height="100" fill="#B22234"/>${[1, 3, 5, 7, 9, 11].map(i => `<rect y="${(i * 100 / 13).toFixed(2)}" width="190" height="${(100 / 13).toFixed(2)}" fill="#fff"/>`).join('')}<rect width="76" height="${(700 / 13).toFixed(2)}" fill="#3C3B6E"/>${stars}`;
    return `<svg viewBox="-2 -14 196 128" width="${w}" height="${Math.round(w * 128 / 196)}" style="overflow:visible"><defs>${Array.from({ length: n }, (_, k) => `<clipPath id="rrfl${k}"><rect x="${(k * sw - .3).toFixed(2)}" y="-20" width="${(sw + .6).toFixed(2)}" height="140"/></clipPath>`).join('')}</defs>
      ${Array.from({ length: n }, (_, k) => `<g clip-path="url(#rrfl${k})"><g class="bgx-flagwave" style="--fa:${(1 + k * .6).toFixed(1)}px;animation-delay:-${(k * .11).toFixed(2)}s">${inner}<rect x="${(k * sw).toFixed(2)}" width="${sw.toFixed(2)}" height="100" fill="${k % 2 ? '#000' : '#fff'}" opacity=".07"/></g></g>`).join('')}</svg>`; };
  const flagPole = (w, poleH) => `<div style="position:relative;width:${w + 10}px;height:${poleH}px"><div style="position:absolute;left:0;top:0;width:6px;height:${poleH}px;border-radius:3px;background:linear-gradient(90deg,#E2E6EC,#8A93A0)"></div>
    <div style="position:absolute;left:-3px;top:-9px;width:12px;height:12px;border-radius:50%;background:#FFD23F"></div><div style="position:absolute;left:6px;top:4px">${flag(w)}</div></div>`;
  const miniFlag = `<svg viewBox="0 0 30 20" width="30" height="20"><rect width="30" height="20" fill="#B22234"/>${[1, 3, 5].map(i => `<rect y="${i * 20 / 7}" width="30" height="${20 / 7}" fill="#fff"/>`).join('')}<rect width="13" height="${60 / 7}" fill="#3C3B6E"/></svg>`;
  const poppy = h => `<svg viewBox="0 0 40 100" width="${h * .4}" height="${h}"><path d="M20 100 C20 80 22 60 20 34" stroke="#3E7C3A" stroke-width="2.4" fill="none"/><path d="M20 72 C12 68 8 62 8 56 C14 60 18 64 20 68Z" fill="#4E9A48"/>
    <g transform="translate(20 24)">${[0, 72, 144, 216, 288].map(a => `<ellipse rx="9" ry="11" cy="-8" fill="#D62828" transform="rotate(${a})"/>`).join('')}<circle r="5" fill="#1F1F1F"/><circle r="2" fill="#444"/></g></svg>`;
  const jets = w => `<svg viewBox="0 0 300 80" width="${w}" height="${w * .27}"><defs><linearGradient id="rrtrail" gradientUnits="userSpaceOnUse" x1="0" x2="190"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity=".95"/></linearGradient></defs>
    ${[[200, 30], [160, 12], [160, 50]].map(([x, y]) => `<path d="M${x - 150} ${y + 4} H${x - 4}" stroke="url(#rrtrail)" stroke-width="4" stroke-linecap="round"/>
    <g transform="translate(${x} ${y})"><path d="M0 4 L30 2 C36 2 40 4 40 4 C40 4 36 6 30 6Z" fill="#5B6676"/><path d="M14 4 L4 -10 L10 -10 L22 3Z M14 4 L4 18 L10 18 L22 5Z" fill="#475263"/>
      <path d="M0 4 L-4 -4 L2 -4 L6 3Z" fill="#475263"/><path d="M28 3 C30 2 33 2 35 3.5" stroke="#9FD3FF" stroke-width="1.6"/></g>`).join('')}</svg>`;
  const ribbonBanner = (text, w) => `<svg viewBox="0 0 320 60" width="${w}" height="${w * 60 / 320}"><path d="M22 14 L4 14 L14 32 L4 50 L38 50Z" fill="#7F1D1D"/><path d="M298 14 L316 14 L306 32 L316 50 L282 50Z" fill="#7F1D1D"/>
    <path d="M26 6 H294 V44 H26Z" fill="#B91C1C"/><path d="M26 9 H294" stroke="#FCA5A5" stroke-width="2"/><text x="160" y="32" text-anchor="middle" font-family="Fredoka,Arial,sans-serif" font-weight="700" font-size="21" fill="#fff" letter-spacing="1">${text}</text></svg>`;
  const burstIcon = `<svg viewBox="-15 -15 30 30" width="30" height="30">${[0, 45, 90, 135, 180, 225, 270, 315].map((a, i) => `<path d="M0 -4 V-13" stroke="${['#FFD23F', '#FF5C8A', '#5CF2C2', '#7CC4FF'][i % 4]}" stroke-width="2.6" stroke-linecap="round" transform="rotate(${a})"/>`).join('')}</svg>`;
  const auroraIcon = '<svg viewBox="0 0 30 30" width="30" height="30"><path d="M2 18 C8 4 16 14 22 5 C24 3 27 3 28 5" stroke="#34D399" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M2 26 C8 14 16 22 28 12" stroke="#A78BFA" stroke-width="3" fill="none" stroke-linecap="round"/></svg>';

  /* ======================= engine ======================= */
  let fxEl, bgEl, anims = [], timers = [], current = '';
  function box(html, layer, css = '') {
    const d = document.createElement('div');
    d.style.cssText = `position:absolute;left:0;top:0;pointer-events:none;${css}`;
    d.innerHTML = html;
    (layer === 'bg' ? bgEl : fxEl).appendChild(d);
    return d;
  }
  function track(a) { anims.push(a); a.addEventListener('finish', () => { const i = anims.indexOf(a); if (i >= 0) anims.splice(i, 1); }); return a; }

  // ---- the pile: falling things land on the floor (top of the bottom bar, or the bottom of the screen
  // in Watch mode), stack up, and the oldest pieces fade away as the pile grows.
  const BIN = 8;
  let heights = [], settled = [];
  const floorY = () => {
    if (document.body.classList.contains('watch')) return H();
    // The bar is pinned to the bottom, so use its height: its on-screen position can jump while
    // the page bounces or the keyboard is open, and leaves would then land in mid-air.
    const nav = document.querySelector('nav');
    return nav ? H() - nav.offsetHeight : H();
  };
  function resetPile() { settled.forEach(q => q.el.remove()); settled = []; heights = new Array(Math.ceil(W() / BIN) + 2).fill(0); }
  const binsFor = (x, w) => { const out = []; for (let b = Math.max(0, Math.floor(x / BIN)); b <= Math.min(heights.length - 1, Math.floor((x + w) / BIN)); b++) out.push(b); return out; };
  const landY = (x, s, sink) => { if (!heights.length) resetPile(); return Math.max(H() * .6, floorY() - Math.max(0, ...binsFor(x, s).map(b => heights[b])) - s * sink); };
  function fadeOut(q) {
    q.bins.forEach(b => { heights[b] = Math.max(0, heights[b] - q.add); });
    const a = q.el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 2600, fill: 'forwards' });
    a.onfinish = () => q.el.remove();
  }
  function settle(html, x, y, rot, s) {
    if (!heights.length) resetPile();
    const q = { el: box(html, 'fx', `transform:translate(${x}px,${y}px) rotate(${rot}deg)`), bins: binsFor(x, s), add: s * .38 };
    q.bins.forEach(b => { heights[b] += q.add; });
    settled.push(q);
    const maxH = Math.max(44, Math.min(80, H() * .1));
    for (let guard = 0; guard < 40 && settled.length; guard++) {
      const top = Math.max(...heights), tall = heights.indexOf(top);
      if (top <= maxH && settled.length <= 90) break;
      const i = settled.length > 90 ? 0 : Math.max(0, settled.findIndex(o => o.bins.includes(tall)));
      fadeOut(settled.splice(i, 1)[0]);
    }
    timers.push(setTimeout(() => { const i = settled.indexOf(q); if (i >= 0) fadeOut(settled.splice(i, 1)[0]); }, rnd(40, 70) * 1000));
  }

  // An endless stream: each particle gets a new random look and path every time it finishes.
  // If the path has a landing spot, the piece is left on the pile before the next one starts.
  function stream(n, make, layer = 'fx') {
    for (let i = 0; i < n; i++) {
      const d = box('', layer);
      let prev;
      const run = first => {
        if (prev) { const j = anims.indexOf(prev); if (j >= 0) anims.splice(j, 1); prev.cancel(); }
        const p = make(i);
        d.innerHTML = p.html;
        const a = d.animate(p.frames, { duration: p.dur, easing: p.ease || 'linear', fill: 'both' });
        if (first) a.currentTime = Math.random() * p.dur * (p.land ? .8 : 1);
        a.onfinish = () => {
          if (!d.isConnected) return;
          if (p.land) settle(p.pile || p.html, p.land.x, p.land.y, p.land.rot, p.land.s);
          if (p.onEnd) p.onEnd();
          run(false);
        };
        anims.push(a); prev = a;
      };
      run(true);
    }
  }
  // Something that crosses once, then is gone (or does something when it arrives).
  function pass(html, frames, dur, layer = 'fx', css = '', ease = 'linear', onDone) {
    const d = box(html, layer, css);
    track(d.animate(frames, { duration: dur, easing: ease, fill: 'both' })).onfinish = () => { d.remove(); if (onDone) onDone(); };
  }
  function every(lo, hi, fn, first) {
    const go = (a, b) => { const id = setTimeout(() => { if (!document.hidden) fn(); go(lo, hi); }, rnd(a, b) * 1000); timers.push(id); };
    go(...(first || [lo * .3, hi * .5]));
  }
  // Straight through the screen (used for things that rise, like bubbles and balloons).
  const fall = (x, s, dur, sway = 40, spin = 360, up = false) => {
    const h = H(), frames = [];
    for (let k = 0; k <= 6; k++) {
      const t = k / 6, y = up ? h + s - t * (h + s * 2) : -s - 10 + t * (h + s * 2);
      frames.push({ transform: `translate(${x + Math.sin(t * Math.PI * 2 + x) * sway}px,${y}px) rotate(${t * spin}deg)` });
    }
    return { frames, dur };
  };
  // Falls from the top, swaying and spinning, and comes to rest on the pile.
  const drop = (s, dur, sway = 40, spin = 360, sink = .6) => {
    const w = W(), x0 = rnd(0, w - s), x1 = Math.min(w - s, Math.max(0, x0 + rnd(-sway, sway))), y1 = landY(x1, s, sink), frames = [];
    for (let k = 0; k <= 8; k++) {
      const t = k / 8, y = -s - 10 + Math.pow(t, 1.08) * (y1 + s + 10);
      const x = x0 + (x1 - x0) * t + Math.sin(t * Math.PI * 3 + x0) * sway * (1 - t);
      frames.push({ transform: `translate(${x}px,${y}px) rotate(${t * spin}deg)` });
    }
    return { frames, dur: dur * Math.max(.35, (y1 + s) / (H() + s)), land: { x: x1, y: y1, rot: spin, s } };
  };
  const across = (y, w, ltr, dy = 0) => {
    const x0 = ltr ? -w - 20 : W() + 20, x1 = ltr ? W() + 20 : -w - 20, f = ltr ? 1 : -1;
    return [{ transform: `translate(${x0}px,${y}px) scaleX(${f})` }, { transform: `translate(${(x0 + x1) / 2}px,${y + dy / 2}px) scaleX(${f})` }, { transform: `translate(${x1}px,${y + dy}px) scaleX(${f})` }];
  };
  const wavy = (y, w, ltr, amp, waves = 2) => {
    const x0 = ltr ? -w - 20 : W() + 20, x1 = ltr ? W() + 20 : -w - 20, f = ltr ? 1 : -1, out = [];
    for (let k = 0; k <= 10; k++) { const t = k / 10; out.push({ transform: `translate(${x0 + (x1 - x0) * t}px,${y + Math.sin(t * Math.PI * 2 * waves) * amp}px) scaleX(${f})` }); }
    return out;
  };
  const twinkles = (n, maxTop, c, layer = 'bg') => Array.from({ length: n }, (_, i) =>
    `<span class="bgx-tw" style="left:${(i * 37 + 7) % 100}%;top:${(i * 53 + 11) % maxTop}%;width:${2 + (i % 3)}px;height:${2 + (i % 3)}px;background:${c};animation-delay:-${(i % 7) * .45}s"></span>`).join('');
  const full = 'inset:0;width:100%;height:100%';

  // Fireworks: a rocket trail shoots up from the floor, then bursts into sparks that drift down.
  function burst(x, y, colors, n = 20) {
    const r = rnd(70, 120);
    for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + rnd(-.1, .1), d = r * rnd(.75, 1), c = pick(colors);
      pass(`<span class="bgx-spark" style="background:${c};box-shadow:0 0 8px 2px ${c}"></span>`,
        [{ transform: `translate(${x}px,${y}px) scale(1.2)`, opacity: 1 }, { transform: `translate(${x + Math.cos(a) * d}px,${y + Math.sin(a) * d}px) scale(1)`, opacity: 1, offset: .6 },
          { transform: `translate(${x + Math.cos(a) * d * 1.1}px,${y + Math.sin(a) * d * 1.1 + 40}px) scale(.3)`, opacity: 0 }], rnd(1300, 1900), 'fx', '', 'cubic-bezier(.15,.75,.35,1)'); }
    pass('<span class="bgx-boom"></span>', [{ transform: `translate(${x - 60}px,${y - 60}px) scale(.2)`, opacity: .9 }, { transform: `translate(${x - 60}px,${y - 60}px) scale(1.4)`, opacity: 0 }], 600, 'fx');
  }
  function firework(colors) {
    const x = rnd(W() * .12, W() * .88), y = rnd(H() * .1, H() * .38), x0 = x + rnd(-40, 40);
    pass('<span class="bgx-trail"></span>', [{ transform: `translate(${x0}px,${floorY()}px)`, opacity: 1 }, { transform: `translate(${x}px,${y}px)`, opacity: .6 }],
      rnd(800, 1100), 'fx', '', 'cubic-bezier(.3,.6,.4,1)', () => burst(x, y, colors));
  }

  /* ======================= the land =======================
     Scenes with ground fill the bottom half of the screen. Things on the land are placed by depth:
     t = 0 is far away at the horizon (small), t = 1 is right at the front (full size). */
  const HZ = () => Math.round(H() * .5);
  const dY = t => HZ() + 14 + t * (floorY() - HZ() - 14);
  const dS = t => .42 + .58 * t;
  const zOf = t => 10 + Math.round(t * 100);
  function ground(top, bottom, edge, extra = '') {
    box(`<svg viewBox="0 0 400 44" preserveAspectRatio="none" style="position:absolute;left:0;top:-22px;width:100%;height:44px;display:block"><path d="M0 24 C60 12 130 28 200 20 C270 12 340 26 400 18 V44 H0Z" fill="${edge}"/></svg>${extra}`,
      'bg', `top:${HZ()}px;bottom:0;right:0;background:linear-gradient(${edge},${top} 14%,${bottom});z-index:1`);
  }
  // Something standing on the land at x (0 to 1 across the screen) and depth t.
  const put = (html, x, t, layer = 'bg', css = '') => box(`<div style="position:absolute;left:0;top:0;transform:translate(-50%,-100%) scale(${dS(t).toFixed(3)});transform-origin:50% 100%;${css}">${html}</div>`,
    layer, `left:${(x * 100).toFixed(1)}%;top:${dY(t).toFixed(0)}px;z-index:${zOf(t)}`);
  // n things spread evenly across the screen at random depths.
  const spread = (n, fn, t0 = 0, t1 = 1) => { for (let i = 0; i < n; i++) fn((i + rnd(.15, .85)) / n, rnd(t0, t1), i); };
  // An animal walks across the land at a random depth: smaller and slower-looking when far away.
  function roam(id, h, secs, o = {}) {
    if (!window.PETART || !PETART[id] || !window.petSVG) return;
    const t = o.t ?? rnd(.04, 1), s = dS(t), hh = Math.max(14, Math.round(h * s)), ww = hh * PETART[id].w / PETART[id].h;
    const feet = window.RIG && RIG[id] ? RIG[id].ground / RIG[id].h : .97;
    pass(`<div class="walking"${o.filter ? ` style="filter:${o.filter}"` : ''}>${petSVG(id, hh)}</div>`, across(dY(t) - hh * feet, ww, Math.random() < .5),
      secs * 1000 * rnd(.85, 1.15) / (.55 + .45 * s), 'bg', `z-index:${zOf(t)}`);
  }
  // Same for a drawing that is not one of the pets (crabs, astronauts...): hr = its height compared with its width.
  function roamArt(make, w, hr, secs, o = {}) {
    const t = o.t ?? rnd(.04, 1), ww = w * dS(t);
    pass(`<div${o.cls ? ` class="${o.cls}"` : ''}>${make(ww)}</div>`, across(dY(t) - ww * hr, ww, Math.random() < .5), secs * 1000 / (.55 + .45 * dS(t)), 'bg', `z-index:${zOf(t)}`);
  }
  // A steady stream of animals from a list of [id, height, seconds to cross, options].
  const herd = (list, lo, hi, first = [.3, 2.5]) => every(lo, hi, () => { const [id, h, secs, o] = pick(list); roam(id, h, secs, o); }, first);

  /* ---- scenery for the land ---- */
  const tuft = c => `<svg viewBox="0 0 30 16" width="30" height="16"><path d="M2 16 C4 8 6 4 8 2 C8 8 9 12 10 16 M10 16 C12 6 15 2 18 0 C17 8 17 12 18 16 M18 16 C20 8 24 4 28 4 C25 9 24 13 24 16" fill="none" stroke="${c}" stroke-width="2.2" stroke-linecap="round"/></svg>`;
  const bush = (w, a, b) => `<svg viewBox="0 0 80 46" width="${w}" height="${w * .575}"><g fill="${b}"><circle cx="20" cy="30" r="16"/><circle cx="60" cy="30" r="16"/></g><g fill="${a}"><circle cx="40" cy="22" r="20"/><circle cx="24" cy="30" r="13"/><circle cx="56" cy="30" r="14"/></g>
    <path d="M30 14 C34 10 40 9 44 10" stroke="#fff" stroke-width="2.4" opacity=".3" fill="none" stroke-linecap="round"/><rect x="6" y="40" width="68" height="6" rx="3" fill="${b}"/></svg>`;
  const rock = (w, a = '#9AA0A8', b = '#6E747C') => `<svg viewBox="0 0 60 34" width="${w}" height="${w * .57}"><path d="M3 34 C1 22 10 10 24 8 C36 4 52 10 56 22 C58 28 58 32 57 34Z" fill="${a}"/><path d="M30 34 C40 30 50 24 56 22 C58 28 58 32 57 34Z" fill="${b}"/>
    <path d="M14 18 C20 12 28 10 36 11" stroke="#fff" stroke-width="2.4" opacity=".3" fill="none" stroke-linecap="round"/></svg>`;
  const leafTree = (h, a, b, trunk = '#7A4E2C') => `<svg viewBox="0 0 80 110" width="${h * .73}" height="${h}"><path d="M36 110 L38 60 L42 60 L44 110Z M40 74 L26 56 M40 70 L54 52" stroke="${trunk}" stroke-width="5" fill="${trunk}" stroke-linecap="round"/>
    <g fill="${b}"><circle cx="22" cy="48" r="18"/><circle cx="58" cy="46" r="19"/><circle cx="40" cy="58" r="18"/></g><g fill="${a}"><circle cx="40" cy="28" r="24"/><circle cx="22" cy="40" r="15"/><circle cx="58" cy="38" r="15"/></g>
    <path d="M26 20 C32 12 42 10 50 13" stroke="#fff" stroke-width="3" opacity=".25" fill="none" stroke-linecap="round"/></svg>`;
  const fern = (h, c) => `<svg viewBox="0 0 60 50" width="${h * 1.2}" height="${h}">${[-60, -35, -12, 12, 35, 60].map(a => `<path d="M30 50 C30 30 30 18 30 6" transform="rotate(${a} 30 50)" stroke="${c}" stroke-width="3.4" fill="none" stroke-linecap="round" stroke-dasharray="1 0"/>
    <path d="M30 40 l-6 -3 M30 40 l6 -3 M30 30 l-6 -3 M30 30 l6 -3 M30 20 l-5 -3 M30 20 l5 -3" transform="rotate(${a} 30 50)" stroke="${c}" stroke-width="2.2" stroke-linecap="round"/>`).join('')}</svg>`;
  const coral = (h, c) => `<svg viewBox="0 0 50 60" width="${h * .83}" height="${h}"><path d="M25 60 V30 M25 42 C16 38 12 30 12 18 M25 36 C34 32 38 24 38 12 M12 26 C6 24 4 18 4 12 M38 20 C44 18 46 12 46 6 M25 30 C25 22 27 14 30 8" stroke="${c}" stroke-width="6" fill="none" stroke-linecap="round"/></svg>`;
  const starfish = (s, c) => `<svg viewBox="-12 -12 24 24" width="${s}" height="${s}"><path d="M0 -11 C1.6 -4 2 -3.6 10.5 -3.4 C4 0.6 3.6 1.6 6.5 9 C1 4.6 -1 4.6 -6.5 9 C-3.6 1.6 -4 0.6 -10.5 -3.4 C-2 -3.6 -1.6 -4 0 -11Z" fill="${c}"/>
    <g fill="#fff" opacity=".55"><circle cx="0" cy="-5" r=".9"/><circle cx="4" cy="-1" r=".9"/><circle cx="-4" cy="-1" r=".9"/><circle cx="2.4" cy="4" r=".9"/><circle cx="-2.4" cy="4" r=".9"/></g></svg>`;
  const crater = w => `<svg viewBox="0 0 60 20" width="${w}" height="${w / 3}"><ellipse cx="30" cy="12" rx="28" ry="8" fill="#7C8296"/><ellipse cx="30" cy="11" rx="22" ry="5.5" fill="#5E6478"/><path d="M8 12 C14 6 46 6 52 12" stroke="#B9BFD0" stroke-width="2" fill="none"/></svg>`;
  const lamp = h => `<svg viewBox="0 0 30 120" width="${h / 4}" height="${h}"><rect x="13" y="20" width="4" height="100" fill="#1F1A33"/><rect x="8" y="114" width="14" height="6" rx="2" fill="#1F1A33"/>
    <path d="M7 20 L23 20 L20 6 L10 6Z" fill="#2A2347"/><circle cx="15" cy="14" r="5" fill="#FFE9A0"/><circle cx="15" cy="14" r="14" fill="#FFE9A0" opacity=".25"/></svg>`;
  const chest = w => `<svg viewBox="0 0 60 44" width="${w}" height="${w * .73}"><rect x="4" y="20" width="52" height="22" rx="3" fill="#8B5A2B"/><path d="M4 22 C4 6 56 6 56 22Z" fill="#A0693A"/>
    <path d="M4 22 H56 M18 20 V42 M42 20 V42" stroke="#E2B13C" stroke-width="3"/><rect x="26" y="20" width="8" height="9" rx="1.5" fill="#E2B13C"/>
    <g fill="#FFD23F"><circle cx="16" cy="12" r="4"/><circle cx="26" cy="9" r="4"/><circle cx="36" cy="10" r="4"/><circle cx="45" cy="13" r="4"/></g><path d="M30 6 l2 -4 l2 4" fill="#E83E8C"/></svg>`;
  const flowerDot = (s, c) => `<svg viewBox="-10 -10 20 30" width="${s}" height="${s * 1.5}"><path d="M0 4 V20" stroke="#3E8C3A" stroke-width="2"/>${[0, 72, 144, 216, 288].map(a => `<ellipse cy="-4.5" rx="3.6" ry="5" fill="${c}" transform="rotate(${a})"/>`).join('')}<circle r="3" fill="#FFD23F"/></svg>`;
  const iceberg = w => `<svg viewBox="0 0 80 40" width="${w}" height="${w / 2}"><path d="M2 40 L16 14 L28 22 L40 2 L56 20 L66 12 L78 40Z" fill="#F4FAFF"/><path d="M40 2 L56 20 L66 12 L78 40 L44 40Z" fill="#CFE2F4"/></svg>`;
  const img = (src, h, cls = '') => `<img ${cls ? `class="${cls}" ` : ''}src="decor/${src}.webp" alt="" style="height:${h}px;display:block">`;

  /* ======================= the backgrounds ======================= */
  const HDR = {
    purple: 'linear-gradient(135deg,#6C4BF4,#8B5CF6 60%,#A855F7)', blue: 'linear-gradient(135deg,#075985,#0284C7 55%,#0EA5E9)',
    green: 'linear-gradient(135deg,#166534,#15803D 55%,#22C55E)', sunset: 'linear-gradient(135deg,#4C1D95,#9D174D 55%,#EA580C)',
    sea: 'linear-gradient(135deg,#082F49,#075985 55%,#0E7490)', amber: 'linear-gradient(135deg,#9A3412,#C2410C 50%,#D97706)',
    ice: 'linear-gradient(135deg,#0F1E45,#1E3A8A 55%,#3B5BA9)', candy: 'linear-gradient(135deg,#BE185D,#DB2777 50%,#9333EA)',
    jungle: 'linear-gradient(135deg,#052E16,#14532D 55%,#166534)', space: 'linear-gradient(135deg,#05021A,#1E1B4B 55%,#3730A3)',
    rainbow: 'linear-gradient(135deg,#EF4444,#F59E0B 25%,#22C55E 50%,#3B82F6 75%,#A855F7)', gold: 'linear-gradient(135deg,#2A0F4A,#4C1D95 55%,#B45309)',
  };
  const BG = [
    { id: 'cream', e: '📖', n: 'Classic', cost: 0, hdr: HDR.purple, tc: '#6C4BF4', base: '#FFF6E8', sky: '#FFF6E8', thumb: '', build() {} },

    { id: 'sky', e: '☁️', n: 'Blue Sky', cost: 100, hdr: HDR.blue, tc: '#0284C7', base: '#7CC6FA', sky: 'linear-gradient(#2F9BEA,#6EC1F7 45%,#B5E1FF)',
      thumb: cloud(34), build() {
        box('<div class="bgx-sun"></div>', 'bg', 'left:auto;right:18px;top:96px');
        stream(4, i => { const w = rnd(90, 190), y = rnd(80, H() * .7); return { html: cloud(w, .95), dur: rnd(50, 90) * 1000, frames: across(y, w, true) }; }, 'bg');
        every(16, 28, () => pass(flock(Math.round(rnd(3, 6))), across(rnd(100, H() * .5), 140, Math.random() < .5, rnd(-60, 60)), rnd(12, 18) * 1000));
        every(28, 45, () => { const w = Math.min(W() * .9, 520); pass(rainbow(w), [{ opacity: 0, transform: 'scale(.92)' }, { opacity: .85, offset: .2 }, { opacity: .85, offset: .75 }, { opacity: 0, transform: 'scale(1.04)' }],
          9000, 'bg', `left:${(W() - w) / 2}px;top:${H() * .22}px`); }, [4, 8]);
        every(35, 55, () => { const w = rnd(46, 70), x = rnd(20, W() - 90); pass(balloon(w, pick(['#E8304A', '#FF9F2E', '#7C3AED', '#10B981']), '#FFE03B'),
          [{ transform: `translate(${x}px,${H() + 40}px)` }, { transform: `translate(${x + rnd(-80, 80)}px,${H() * .45}px)` }, { transform: `translate(${x + rnd(-120, 120)}px,${-w * 2}px)` }], rnd(20, 26) * 1000); }, [10, 20]);
      } },

    { id: 'meadow', e: '🌼', n: 'Flower Field', cost: 200, land: true, hdr: HDR.green, tc: '#15803D', base: '#9FDB8A', sky: 'linear-gradient(#7CC8FF,#B9E4FF 38%,#E4F6FF 50%)',
      thumb: petal(16, '#FF8FB8'), build() {
        box(cloud(150, .9), 'bg', `left:6%;top:${H() * .14}px`); box(cloud(110, .8), 'bg', `left:auto;right:6%;top:${H() * .25}px`);
        box(`<svg viewBox="0 0 400 60" preserveAspectRatio="none" style="width:100%;height:100%;display:block"><path d="M0 60 V34 C50 10 110 14 160 30 C210 44 260 6 320 12 C360 16 384 26 400 30 V60Z" fill="#8CCB76"/></svg>`, 'bg', `top:${HZ() - 66}px;width:100%;height:84px`);
        ground('#86CE6C', '#4E9E3C', '#9ADB80');
        spread(5, (x, t) => put(leafTree(150, '#5DB64A', '#3F9636'), x, t * .22));
        spread(4, (x, t) => put(bush(90, '#5DB64A', '#3F8F33'), x, .1 + t * .5));
        spread(14, (x, t) => put(tuft('#3F8F33'), x, t));
        spread(22, (x, t, i) => put(img(['blossom', 'tulip', 'sunflower'][i % 3], 56, 'bgx-sway'), x, t));
        stream(20, () => { const s = rnd(16, 30); return { html: petal(s, pick(['#FF4F9A', '#FF8FB8', '#FFFFFF', '#F472B6', '#C084FC', '#FDE047', '#FB7185'])), ...drop(s, rnd(9, 16) * 1000, rnd(30, 80), rnd(-540, 540), .55) }; });
        every(9, 16, () => { const w = rnd(30, 44); pass(petSVG('butterfly', w), across(rnd(120, H() * .7), w, Math.random() < .5, rnd(-120, 120)), rnd(9, 14) * 1000); }, [2, 5]);
        herd([['bunny', 60, 9], ['lamb', 64, 14], ['sheep', 76, 16], ['cow', 96, 20], ['horse', 108, 12], ['chicken', 56, 14], ['deer', 104, 11], ['goat', 76, 13]], 4, 8);
      } },

    { id: 'sunset', e: '🌅', n: 'Sunset', cost: 350, land: true, dark: true, hdr: HDR.sunset, tc: '#9D174D', base: '#C2416B', sky: 'linear-gradient(#2E1065,#7E22CE 22%,#DB2777 38%,#FB923C 48%,#FDBA74 54%)',
      thumb: '<svg viewBox="0 0 30 30" width="30" height="30"><circle cx="15" cy="18" r="11" fill="#FFB347"/></svg>', build() {
        box(twinkles(26, 25, '#FFF6D5'), 'bg', 'inset:0;width:100%;height:100%');
        box('<div class="bgx-sunset"></div>', 'bg', `left:50%;top:${HZ() - 120}px;transform:translateX(-50%)`);
        box(`<svg viewBox="0 0 400 60" preserveAspectRatio="none" style="width:100%;height:100%;display:block"><path d="M0 60 V30 C60 4 120 10 180 28 C240 46 300 0 400 18 V60Z" fill="#6E2460"/></svg>`, 'bg', `top:${HZ() - 60}px;width:100%;height:80px`);
        ground('#4A1846', '#1E0A24', '#5B1E54');
        spread(7, (x, t) => put(pine(140, false), x, t * .4, 'bg', 'filter:brightness(.18) saturate(0)'));
        spread(10, (x, t) => put(tuft('#2E0F33'), x, t));
        every(12, 22, () => pass(flock(Math.round(rnd(3, 7)), '#1a0b24'), across(rnd(110, H() * .4), 150, Math.random() < .5, rnd(-50, 50)), rnd(14, 20) * 1000));
        every(30, 50, () => { const w = rnd(40, 60), x = rnd(30, W() - 80); pass(balloon(w, '#2a0d2e', '#3d1442'),
          [{ transform: `translate(${x}px,${H() + 30}px)` }, { transform: `translate(${x + rnd(-60, 60)}px,${-w * 2}px)` }], rnd(24, 30) * 1000); }, [8, 16]);
        const shade = { filter: 'brightness(.22) saturate(.4)' };
        herd([['horse', 108, 13, shade], ['deer', 104, 11, shade], ['wolf', 80, 12, shade], ['moose', 120, 16, shade], ['fox', 62, 10, shade], ['giraffe', 170, 18, shade]], 5, 9);
      } },

    { id: 'ocean', e: '🦈', n: 'Under the Sea', cost: 500, land: true, dark: true, hdr: HDR.sea, tc: '#075985', base: '#0B4F8A', sky: 'linear-gradient(#1A7FC0,#0B4F8A 30%,#063661 50%)',
      thumb: fish(30, FISH[0]), build() {
        box(Array.from({ length: 6 }, (_, i) => `<span class="bgx-ray" style="left:${i * 18 - 6}%;animation-delay:-${i * 1.3}s"></span>`).join(''), 'bg', 'inset:0;width:100%;height:100%');
        ground('#C9A866', '#8E6E40', '#D4B678');
        spread(5, (x, t) => put(rock(90, '#7C8A8E', '#5A666A'), x, t * .7));
        spread(12, (x, t, i) => put(`<div class="bgx-sway" style="animation-delay:-${i * .6}s">${seaweed(120 + (i % 3) * 50, i % 2 ? '#1F9D55' : '#2BBF6A')}</div>`, x, t));
        spread(8, (x, t, i) => put(coral(70 + (i % 3) * 16, pick(['#FF6F91', '#FF9A5A', '#C77DFF', '#FFD23F'])), x, t));
        spread(8, (x, t) => put(starfish(28, pick(['#FF7A45', '#FF4F9A', '#FFC93C'])), x, .3 + t * .7));
        spread(4, (x, t) => put(img('shell', 26), x, .4 + t * .6));
        stream(16, () => { const s = rnd(7, 26); return { html: `<span class="bgx-bub" style="width:${s}px;height:${s}px"></span>`, ...fall(rnd(0, W()), s, rnd(7, 13) * 1000, rnd(8, 24), 0, true) }; });
        every(5, 9, () => { const f = pick(FISH), n = Math.round(rnd(1, 6)), w = rnd(34, 54), ltr = Math.random() < .5, y = rnd(110, H() - 170);
          const school = Array.from({ length: n }, (_, k) => `<div style="position:absolute;left:${(k % 3) * w * .9}px;top:${Math.floor(k / 3) * w * .6 + (k % 2) * 8}px">${fish(w, f)}</div>`).join('');
          pass(`<div style="position:relative;width:${w * 3}px;height:${w * 1.4}px">${school}</div>`, across(y, w * 3, ltr, rnd(-40, 40)), rnd(9, 15) * 1000); }, [1, 3]);
        every(14, 24, () => { const id = pick(['dolphin', 'greatwhite', 'orca', 'spermwhale', 'dolphin']), h = { dolphin: 60, greatwhite: 70, orca: 80, spermwhale: 90 }[id], y = rnd(100, HZ() - 40);
          if (PETART[id]) pass(`<div class="walking">${petSVG(id, h)}</div>`, across(y, h * PETART[id].w / PETART[id].h, Math.random() < .5, rnd(-40, 40)), rnd(12, 18) * 1000, 'bg', 'z-index:5'); }, [3, 7]);
        every(14, 24, () => { const w = rnd(26, 40), x = rnd(20, W() - 60); pass(jelly(w, pick(['#FF8BD8', '#B794FF', '#7FE3FF'])),
          [{ transform: `translate(${x}px,${H() + 40}px)` }, { transform: `translate(${x + rnd(-40, 40)}px,${H() * .5}px)` }, { transform: `translate(${x + rnd(-60, 60)}px,${-w * 2}px)` }], rnd(18, 26) * 1000); }, [3, 8]);
        every(6, 11, () => roamArt(crab, 46, .63, 9), [1, 4]);
        every(16, 26, () => roam('seal', 60, 18), [6, 12]);
      } },

    { id: 'autumn', e: '🍁', n: 'Autumn Leaves', cost: 700, land: true, hdr: HDR.amber, tc: '#C2410C', base: '#FFE7C4', sky: 'linear-gradient(#9FD0F0,#FFE9C8 40%,#FFD9A8 50%)',
      thumb: maple(26), build() {
        ground('#E2A055', '#A65E26', '#EAB36A');
        spread(6, (x, t, i) => put(leafTree(170, pick(['#F2862A', '#E85D2A', '#F5B533', '#D9481F']), pick(['#C2551A', '#B8401A', '#D98B1F'])), x, t * .3));
        spread(4, (x, t) => put(bush(84, '#D97A2A', '#A8501A'), x, .2 + t * .5));
        spread(12, (x, t) => put(tuft('#9A6A2A'), x, t));
        spread(6, (x, t, i) => put(i % 3 ? pumpkin(54) : img('chestnut', 34), x, .3 + t * .7));
        spread(3, (x, t) => put(hayBale(80), x, .2 + t * .6));
        spread(3, (x, t) => put(img('mushroom', 34), x, .4 + t * .6));
        stream(12, () => { const s = rnd(28, 52); return { html: maple(s), ...drop(s, rnd(11, 18) * 1000, rnd(30, 60), rnd(-300, 300), .55) }; });
        every(14, 24, () => { for (let k = 0; k < 7; k++) { const s = rnd(26, 46), y = rnd(80, H() - 120);
          pass(maple(s), [{ transform: `translate(${-s - 20}px,${y}px) rotate(0)` }, { transform: `translate(${W() * .5}px,${y + rnd(-90, 90)}px) rotate(${rnd(200, 400)}deg)` },
            { transform: `translate(${W() + 40}px,${y + rnd(-60, 160)}px) rotate(${rnd(500, 800)}deg)` }], rnd(3.2, 5) * 1000 + k * 160); } }, [6, 10]);
        herd([['fox', 62, 10], ['squirrel', 50, 7], ['chipmunk', 40, 7], ['deer', 104, 11], ['raccoon', 52, 10], ['hedgehog', 34, 12], ['moose', 124, 16], ['grizzly', 84, 16]], 4, 8);
      } },

    { id: 'snow', e: '❄️', n: 'Snow Day', cost: 900, land: true, dark: true, hdr: HDR.ice, tc: '#1E3A8A', base: '#2C4A7A', sky: 'linear-gradient(#0F1E45,#1E3A6B 30%,#3B5B92 46%,#5876A8 52%)',
      thumb: flake(26), build() {
        box('<div class="bgx-aurora"></div>', 'bg', 'inset:0;width:100%;height:100%');
        box(peaks(), 'bg', `top:${HZ() - Math.min(150, H() * .18) + 16}px;width:100%;height:${Math.min(150, H() * .18)}px`);
        ground('#EEF4FC', '#C8D8EC', '#F6FAFF');
        spread(9, (x, t) => put(pine(150), x, t * .7));
        spread(2, (x, t) => put(img('snowman', 90), x, .45 + t * .5));
        spread(6, (x, t) => put(`<span class="bgx-mound" style="width:70px;height:26px"></span>`, x, t));
        stream(30, i => { const s = i % 5 === 0 ? rnd(26, 40) : rnd(6, 18); return { html: i % 3 ? flake(s, rnd(.75, 1)) : `<span class="bgx-dot" style="width:${s / 2}px;height:${s / 2}px"></span>`,
          ...drop(s, rnd(8, 16) * 1000, rnd(20, 50), rnd(-200, 200), .45), pile: snowPile(s) }; });
        every(10, 18, () => { const s = rnd(170, 300), x = rnd(-60, W() - s * .6);
          pass(flake(s, .55), [{ transform: `translate(${x}px,${-s}px) rotate(0)` }, { transform: `translate(${x + rnd(-60, 60)}px,${H() + s * .2}px) rotate(${rnd(60, 140)}deg)` }], rnd(7, 10) * 1000, 'fx', 'filter:blur(1.5px)'); }, [3, 6]);
        herd([['penguin', 64, 16], ['reindeer', 110, 12], ['wolf', 80, 11], ['polarbear', 80, 16], ['mammoth', 130, 20], ['fox', 62, 10]], 4, 8);
        every(16, 26, () => { const w = 48; pass(`<div class="walking">${petSVG('snowyowl', w)}</div>`, wavy(rnd(110, H() * .35), w * 1.3, Math.random() < .5, rnd(15, 30), 1.5), rnd(10, 14) * 1000); }, [5, 9]);
      } },

    { id: 'candy', e: '🍬', n: 'Candy Land', cost: 1200, land: true, hdr: HDR.candy, tc: '#DB2777', base: '#FFB3DE', sky: 'linear-gradient(#FF9AD5,#FFB8E2 30%,#E6C2FF 50%)',
      thumb: gumdrop(24, '#E8304A', '#B91C3B'), build() {
        box(cloud(140, .85), 'bg', `left:5%;top:${H() * .15}px`); box(cloud(100, .75), 'bg', `left:auto;right:8%;top:${H() * .27}px`);
        ground('#FFD3EC', '#F59BCB', '#FFE4F3', `<svg viewBox="0 0 400 30" preserveAspectRatio="none" style="position:absolute;left:0;top:0;width:100%;height:30px">${Array.from({ length: 16 }, (_, i) => `<path d="M${i * 25} 0 h25 v6 c0 8 -4 14 -6 14 c-3 0 -4 -6 -6 -10 c-2 4 -4 6 -7 6 c-3 0 -6 -6 -6 -10Z" fill="${['#FF4FA0', '#7C3AED', '#22C55E', '#FACC15'][i % 4]}" opacity=".55"/>`).join('')}</svg>`);
        const GD = [['#E8304A', '#B91C3B'], ['#22C55E', '#15803D'], ['#FACC15', '#CA8A04'], ['#A855F7', '#7E22CE'], ['#FB923C', '#C2410C'], ['#38BDF8', '#0369A1']];
        spread(6, (x, t, i) => put(lolly(70 + (i % 3) * 14, pick(['#FF4FA0', '#7C3AED', '#10B981', '#38BDF8']), pick(['#fff', '#FFE03B'])), x, t * .5));
        spread(5, (x, t) => put(cane(80), x, t * .8));
        spread(10, (x, t) => put(gumdrop(40, ...pick(GD)), x, .2 + t * .8));
        spread(4, (x, t, i) => put(img(['cupcake', 'donut', 'candy', 'lollipop'][i % 4], 48), x, .3 + t * .7));
        const candies = [() => { const g = pick(GD), s = rnd(32, 50); return [gumdrop(s, ...g), s]; }, () => { const s = rnd(52, 74); return [wrapped(s, pick(['#E8304A', '#3B82F6', '#22C55E', '#FACC15', '#A855F7'])), s]; },
          () => { const s = rnd(34, 48); return [mint(s), s]; }, () => { const s = rnd(30, 42); return [bean(s, pick(['#E8304A', '#FACC15', '#22C55E', '#FB923C', '#A855F7', '#111'])), s]; }];
        stream(14, () => { const [html, s] = pick(candies)(); return { html, ...drop(s, rnd(8, 14) * 1000, rnd(20, 50), rnd(-420, 420), .6) }; });
        herd([['unicorn', 104, 12], ['bunny', 60, 9], ['guineapig', 38, 11], ['hamster', 34, 9], ['lamb', 64, 13], ['cat', 66, 10], ['pig', 66, 14]], 4, 8);
      } },

    { id: 'jungle', e: '🌴', n: 'Jungle', cost: 1600, land: true, dark: true, hdr: HDR.jungle, tc: '#14532D', base: '#14532D', sky: 'linear-gradient(#2E9A58,#1B7A43 30%,#14632F 50%)',
      thumb: parrot(32), build() {
        box(Array.from({ length: 7 }, (_, i) => `<div class="bgx-swing" style="position:absolute;top:-10px;left:${i * 15 + 2}%;animation-delay:-${i * .8}s">${vine(140 + (i % 3) * 70)}</div>`).join(''), 'bg', 'inset:0;width:100%;height:100%');
        box(forest('#0F4A26'), 'bg', `top:${HZ() - 100}px;width:100%;height:116px`);
        ground('#2F7D3A', '#123F20', '#3A8A44');
        spread(6, (x, t) => put(img('palm', 200, 'bgx-sway'), x, t * .35));
        spread(8, (x, t, i) => put(bigLeaf(130, i % 2), x, t));
        spread(8, (x, t) => put(fern(54, '#4CAF50'), x, t));
        spread(6, (x, t) => put(img('hibiscus', 34), x, .3 + t * .7));
        stream(14, () => { const x = rnd(0, W()), y = rnd(80, H() - 80);
          return { html: '<span class="bgx-fly"></span>', dur: rnd(5, 9) * 1000, ease: 'ease-in-out',
            frames: [{ transform: `translate(${x}px,${y}px)`, opacity: 0 }, { transform: `translate(${x + rnd(-50, 50)}px,${y + rnd(-50, 50)}px)`, opacity: 1, offset: .4 },
              { transform: `translate(${x + rnd(-90, 90)}px,${y + rnd(-90, 90)}px)`, opacity: 0 }] }; });
        every(14, 24, () => { const w = rnd(70, 100); pass(parrot(w), across(rnd(100, H() * .45), w, Math.random() < .5, rnd(-80, 80)), rnd(7, 10) * 1000); }, [2, 6]);
        every(16, 26, () => { const w = rnd(30, 40); pass(petSVG('butterfly', w), across(rnd(150, H() - 150), w, Math.random() < .5, rnd(-100, 100)), rnd(10, 14) * 1000); }, [8, 12]);
        herd([['monkey', 62, 9], ['tiger', 80, 12], ['gorilla', 96, 16], ['frog', 36, 8], ['crocodile', 40, 18], ['elephant', 140, 20], ['hippo', 80, 18], ['raptor', 80, 8]], 4, 8);
      } },

    { id: 'space', e: '🪐', n: 'Outer Space', cost: 2000, land: true, dark: true, hdr: HDR.space, tc: '#1E1B4B', base: '#0B0730', sky: 'radial-gradient(ellipse at 70% 20%,#3B1D7A 0%,#140A3D 30%,#05021A 55%)',
      thumb: planet(34, '#F59E0B', '#B45309', '#FDE68A'), build() {
        box(twinkles(70, 50, '#fff'), 'bg', 'inset:0;width:100%;height:100%');
        box(`<div class="bgx-float" style="position:absolute;right:6%;top:14%">${planet(130, '#F59E0B', '#B45309', '#FDE68A')}</div>
          <div class="bgx-float" style="position:absolute;left:5%;top:30%;animation-delay:-4s">${planet(70, '#EF4444', '#991B1B')}</div>
          <div class="bgx-float" style="position:absolute;left:44%;top:8%;animation-delay:-7s">${planet(50, '#38BDF8', '#0369A1')}</div>`, 'bg', 'inset:0;width:100%;height:100%');
        ground('#8A90A6', '#4A4F62', '#A4AABE');
        spread(10, (x, t) => put(crater(rnd(60, 110)), x, t));
        spread(6, (x, t) => put(rock(60, '#9AA0B4', '#6E7488'), x, t));
        spread(2, (x, t) => put(`<div style="position:relative"><div style="position:absolute;left:28px;bottom:58px">${star4(18, '#FFE27A')}</div>${rocket(110).replace('viewBox="0 0 120 50"', 'viewBox="0 0 120 50" style="transform:rotate(-90deg);transform-origin:50% 50%"')}</div>`, x, t * .4));
        every(3, 7, () => { const x = rnd(W() * .2, W() * 1.1), y = rnd(60, H() * .4), len = rnd(120, 220);
          pass(`<span class="bgx-shoot" style="width:${len}px"></span>`, [{ transform: `translate(${x}px,${y}px) rotate(150deg)`, opacity: 0 }, { opacity: 1, offset: .15 },
            { transform: `translate(${x - 420}px,${y + 240}px) rotate(150deg)`, opacity: 0 }], 1300); }, [1, 3]);
        every(18, 30, () => { const w = rnd(100, 150); pass(rocket(w), across(rnd(100, HZ() - 80), w, Math.random() < .5, rnd(-100, 60)), rnd(7, 10) * 1000); }, [4, 8]);
        every(26, 40, () => { const w = rnd(90, 130); pass(ufo(w), across(rnd(90, H() * .35), w, Math.random() < .5, rnd(-40, 40)), rnd(14, 20) * 1000); }, [12, 18]);
        every(8, 14, () => roamArt(astro, 64, 1.14, 16, { cls: 'bgx-hop' }), [1, 4]);
      } },

    { id: 'rainbow', e: '🌈', n: 'Rainbow', cost: 2500, land: true, hdr: HDR.rainbow, tc: '#8B5CF6', base: '#FFD6E8', sky: 'linear-gradient(120deg,#FF9A9E,#FECF8A,#FFF59D,#A8F0C6,#9AD7FF,#C7A6FF,#FF9A9E)',
      thumb: rainbow(34), build() {
        bgEl.classList.add('bgx-shift');
        const rw = Math.min(W() * 1.1, 560); box(rainbow(rw), 'bg', `left:${(W() - rw) / 2}px;top:${HZ() - rw * .5}px;opacity:.85`);
        ground('#FFFFFF', '#F6E2F4', '#FFFFFF', `<svg viewBox="0 0 400 30" preserveAspectRatio="none" style="position:absolute;left:0;top:-14px;width:100%;height:30px">${Array.from({ length: 14 }, (_, i) => `<circle cx="${i * 30 + 14}" cy="18" r="${16 + (i % 3) * 4}" fill="#fff"/>`).join('')}</svg>`);
        spread(8, (x, t) => put(cloud(110, 1), x, t));
        spread(10, (x, t) => put(star4(26, pick(['#FFD23F', '#FF8AC8', '#8ADC8A', '#7AB8FF'])), x, t));
        stream(7, () => { const w = rnd(34, 56), x = rnd(0, W() - w); return { html: balloon(w, pick(['#EF4444', '#F59E0B', '#22C55E', '#3B82F6', '#A855F7', '#EC4899']), '#ffffff55'),
          dur: rnd(14, 22) * 1000, frames: [{ transform: `translate(${x}px,${H() + 30}px)` }, { transform: `translate(${x + rnd(-50, 50)}px,${H() * .5}px)` }, { transform: `translate(${x + rnd(-70, 70)}px,${-w * 2}px)` }] }; });
        stream(12, () => { const x = rnd(0, W()), y = rnd(80, H() - 60), s = rnd(12, 26);
          return { html: star4(s, '#fff'), dur: rnd(2.5, 4.5) * 1000, frames: [{ transform: `translate(${x}px,${y}px) scale(0)`, opacity: 0 }, { transform: `translate(${x}px,${y}px) scale(1) rotate(90deg)`, opacity: 1, offset: .5 }, { transform: `translate(${x}px,${y}px) scale(0) rotate(180deg)`, opacity: 0 }] }; });
        every(9, 15, () => { const w = rnd(30, 40); pass(petSVG('butterfly', w), across(rnd(120, H() * .5), w, Math.random() < .5, rnd(-100, 100)), rnd(9, 13) * 1000); }, [3, 6]);
        herd([['unicorn', 108, 11], ['bunny', 60, 9], ['lamb', 64, 13], ['kangaroo', 90, 9], ['koala', 60, 16], ['panda', 80, 18]], 4, 8);
      } },

    { id: 'gold', e: '👑', n: 'Royal Gold', cost: 3500, land: true, dark: true, hdr: HDR.gold, tc: '#4C1D95', base: '#2A0F4A', sky: 'radial-gradient(ellipse at 50% 0%,#5B2A8C 0%,#2A0F4A 35%,#14062A 55%)',
      thumb: coin(26), build() {
        box(`<img src="decor/crown.webp" alt="" class="bgx-float" style="position:absolute;right:8%;top:16%;height:64px"><img src="decor/gem.webp" alt="" class="bgx-float" style="position:absolute;left:7%;top:30%;height:46px;animation-delay:-3s">`, 'bg', 'inset:0;width:100%;height:100%');
        ground('#5B2A8C', '#2A0F4A', '#E2B13C', `<div style="position:absolute;left:50%;top:0;bottom:0;width:46%;transform:translateX(-50%);background:linear-gradient(#B91C1C,#7F1D1D);clip-path:polygon(40% 0,60% 0,100% 100%,0 100%);opacity:.85"></div>
          <div style="position:absolute;left:50%;top:0;bottom:0;width:50%;transform:translateX(-50%);clip-path:polygon(39% 0,41% 0,2% 100%,0 100%,0 100%);background:#E2B13C"></div>
          <div style="position:absolute;left:50%;top:0;bottom:0;width:50%;transform:translateX(-50%);clip-path:polygon(59% 0,61% 0,100% 100%,98% 100%);background:#E2B13C"></div>`);
        spread(5, (x, t) => put(chest(70), x, .2 + t * .8));
        spread(4, (x, t) => put(img('trophy', 66), x, t * .7));
        spread(8, (x, t) => put(`<div style="display:flex;gap:2px">${coin(20)}${coin(20)}</div>`, x, t));
        spread(4, (x, t) => put(img('gem', 30), x, t));
        stream(10, () => { const s = rnd(22, 36); return { html: `<div class="bgx-spin">${coin(s)}</div>`, ...drop(s, rnd(7, 12) * 1000, rnd(10, 30), 0, .45), pile: flatCoin(s) }; });
        stream(18, () => { const x = rnd(0, W()), y = rnd(80, H() - 40), s = rnd(10, 22);
          return { html: star4(s), dur: rnd(2, 4) * 1000, frames: [{ transform: `translate(${x}px,${y}px) scale(0)`, opacity: 0 }, { transform: `translate(${x}px,${y}px) scale(1) rotate(45deg)`, opacity: 1, offset: .5 }, { transform: `translate(${x}px,${y}px) scale(0) rotate(90deg)`, opacity: 0 }] }; });
        herd([['lion', 84, 12], ['unicorn', 108, 11], ['horse', 108, 12], ['tiger', 80, 12], ['cat', 64, 10]], 5, 9);
        every(18, 30, () => { const w = 110; pass(`<div class="walking">${petSVG('dragon', w * .64)}</div>`, wavy(rnd(110, H() * .3), w, Math.random() < .5, 20, 1), rnd(10, 14) * 1000); }, [6, 10]);
      } },

    { id: 'faith', e: '✝️', n: 'Faith', cost: 0, land: true, dark: true, hdr: 'linear-gradient(135deg,#0B1B4D,#27407A 55%,#B7791F)', tc: '#0B1B4D', base: '#27407A',
      sky: 'linear-gradient(#081638 0%,#1E3A7A 20%,#7E5BA0 36%,#F2A65A 46%,#FFD79A 52%)', thumb: crossIcon, build() {
        box(twinkles(44, 30, '#fff'), 'bg', full);
        box('<div class="bgx-dawn"></div>', 'bg', `left:50%;top:${HZ() - 210}px;transform:translateX(-50%)`);
        box('<div class="bgx-holyrays"></div>', 'bg', `left:50%;top:${HZ() - 330}px;transform:translateX(-50%)`);
        box(`<div class="bgx-bigstar">${bigStar(110)}</div>`, 'bg', `left:50%;top:${Math.max(84, H() * .11)}px;transform:translateX(-50%)`);
        box(crossesHill().replace('height:230px', 'height:100%'), 'bg', `top:${HZ() - 150}px;width:100%;height:180px`);
        ground('#2A2048', '#100B22', '#1A1433');
        spread(6, (x, t) => put(leafTree(130, '#1F1838', '#15102A', '#120D26'), x, t * .4));
        spread(12, (x, t) => put(tuft('#2E2650'), x, t));
        spread(8, (x, t) => put(flowerDot(18, pick(['#FFF7D6', '#FFE7A0', '#F8D0FF'])), x, .3 + t * .7));
        stream(18, () => { const x = rnd(0, W()), s = rnd(8, 18), y0 = H() - rnd(60, 260);
          return { html: star4(s, '#FFE7A0'), dur: rnd(6, 10) * 1000, ease: 'ease-out',
            frames: [{ transform: `translate(${x}px,${y0}px) scale(.4)`, opacity: 0 }, { opacity: 1, offset: .3 }, { transform: `translate(${x + rnd(-40, 40)}px,${y0 - rnd(200, 380)}px) scale(1) rotate(90deg)`, opacity: 0 }] }; });
        every(9, 16, () => { const w = rnd(70, 100); pass(dove(w), wavy(rnd(100, H() * .4), w, Math.random() < .5, rnd(10, 30), 1.5), rnd(10, 15) * 1000); }, [2, 5]);
        const soft = { filter: 'brightness(.85)' };
        herd([['lamb', 64, 14, soft], ['sheep', 76, 16, soft], ['goat', 76, 13, soft], ['cow', 96, 20, soft]], 5, 9);
      } },

    { id: 'valentine', e: '💘', n: "Valentine's Day", cost: 600, dark: true, hdr: 'linear-gradient(135deg,#880E4F,#D81B60 55%,#FF4081)', tc: '#C2185B', base: '#D81B60',
      sky: 'radial-gradient(ellipse at 50% 35%,#FF7EB0 0%,#E91E63 50%,#9C0F4E 100%)', thumb: heart(26, '#FF1744'), build() {
        box([[8, 18, 120], [70, 40, 160], [20, 64, 140], [76, 78, 110]].map(([x, y, z], i) =>
          `<div class="bgx-beat" style="position:absolute;left:${x}%;top:${y}%;opacity:.13;animation-delay:-${i * .4}s">${heart(z, '#fff')}</div>`).join(''), 'bg', full);
        stream(16, () => { const s = rnd(20, 40), r = Math.random();
          return { html: r < .62 ? heart(s, pick(HEARTS)) : r < .86 ? convo(s * 1.25) : letter(s * 1.3), ...drop(s, rnd(8, 13) * 1000, rnd(30, 70), rnd(-220, 220), .5) }; });
        stream(8, () => { const s = rnd(16, 34); return { html: heart(s, pick(HEARTS)), ...fall(rnd(0, W()), s, rnd(9, 14) * 1000, rnd(20, 50), rnd(-60, 60), true) }; });
        stream(6, () => { const s = rnd(20, 36); return { html: heart(s, pick(HEARTS)), dur: rnd(8, 13) * 1000, frames: wavy(rnd(120, H() - 200), s, Math.random() < .5, rnd(20, 50), rnd(1.5, 3)) }; });
        every(3, 6, () => { const cx = rnd(60, W() - 60), cy = rnd(140, H() - 220), n = 12;
          for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2, dist = rnd(70, 140), s = rnd(14, 26);
            pass(heart(s, pick(HEARTS)), [{ transform: `translate(${cx}px,${cy}px) scale(.2)`, opacity: 1 }, { transform: `translate(${cx + Math.cos(a) * dist}px,${cy + Math.sin(a) * dist}px) scale(1) rotate(${rnd(-60, 60)}deg)`, opacity: 0 }],
              rnd(1, 1.5) * 1000, 'fx', '', 'cubic-bezier(.2,.7,.4,1)'); } }, [1, 2]);
      } },

    { id: 'rain', e: '⛈️', n: 'Rainy Day', cost: 800, land: true, dark: true, hdr: 'linear-gradient(135deg,#111827,#1F2937 55%,#4B5563)', tc: '#1F2937', base: '#3A4655',
      sky: 'linear-gradient(#141B24,#26313E 30%,#3E4C5E 50%)', thumb: darkCloud(34), build() {
        stream(5, () => { const w = rnd(170, 300), y = rnd(60, H() * .3); return { html: darkCloud(w, pick(['#566170', '#4A5462', '#606B7A'])), dur: rnd(40, 70) * 1000, frames: across(y, w, Math.random() < .5) }; }, 'bg');
        box(forest('#2A3A30'), 'bg', `top:${HZ() - 80}px;width:100%;height:96px`);
        ground('#3E5A42', '#1E2C22', '#4A6A4E');
        spread(5, (x, t) => put(`<div class="bgx-puddle" style="position:relative;width:120px;height:22px"><i></i><i style="animation-delay:-1s"></i></div>`, x, t));
        spread(5, (x, t) => put(bush(90, '#3E6A44', '#2A4A30'), x, t * .6));
        spread(12, (x, t) => put(tuft('#2E4A32'), x, t));
        spread(4, (x, t) => put(img('mushroom', 32), x, .4 + t * .6));
        stream(54, () => { const len = rnd(16, 34), x = rnd(-40, W() + 120), fy = floorY();
          return { html: `<span class="bgx-rain" style="height:${len}px"></span>`, dur: rnd(.5, .85) * 1000,
            frames: [{ transform: `translate(${x}px,${-len}px) rotate(14deg)` }, { transform: `translate(${x - (fy + len) * .25}px,${fy - len}px) rotate(14deg)` }],
            onEnd: Math.random() < .3 ? () => { const sx = x - (fy + len) * .25; pass('<span class="bgx-splash"></span>', [{ transform: `translate(${sx - 8}px,${fy - 8}px) scale(.3)`, opacity: .9 }, { transform: `translate(${sx - 8}px,${fy - 8}px) scale(1.4)`, opacity: 0 }], 420); } : null }; });
        every(6, 13, () => {
          pass('<div class="bgx-flash"></div>', [{ opacity: 0 }, { opacity: .85, offset: .08 }, { opacity: .1, offset: .2 }, { opacity: .6, offset: .3 }, { opacity: 0 }], 900, 'fx', full);
          const h = rnd(180, 300), x = rnd(20, W() - 100);
          pass(bolt(h), [{ opacity: 0 }, { opacity: 1, offset: .08 }, { opacity: .2, offset: .2 }, { opacity: 1, offset: .3 }, { opacity: 0 }], 900, 'fx', `left:${x}px;top:${rnd(40, 120)}px;filter:drop-shadow(0 0 12px #fff)`);
        }, [2, 4]);
        every(20, 34, () => { const w = rnd(50, 70), ltr = Math.random() < .5, y = rnd(150, H() * .45), x0 = ltr ? -w : W() + w, x1 = ltr ? W() + w : -w;
          pass(umbrella(w), [{ transform: `translate(${x0}px,${y}px) rotate(0)` }, { transform: `translate(${(x0 + x1) / 2}px,${y - rnd(30, 80)}px) rotate(${ltr ? 300 : -300}deg)` }, { transform: `translate(${x1}px,${y + rnd(-40, 80)}px) rotate(${ltr ? 640 : -640}deg)` }], rnd(4, 6) * 1000); }, [8, 14]);
        herd([['duck', 56, 12], ['frog', 36, 8], ['hedgehog', 34, 12], ['chicken', 56, 13], ['dog', 70, 9], ['otter', 40, 10]], 4, 8);
      } },

    { id: 'stpat', e: '☘️', n: "St. Patrick's Day", cost: 1000, land: true, dark: true, hdr: 'linear-gradient(135deg,#064E3B,#047857 55%,#10B981)', tc: '#047857', base: '#0E7A45',
      sky: 'linear-gradient(#0B5D3B,#138A55 35%,#36B47A 50%)', thumb: shamrock(26), build() {
        const rw = Math.max(320, W() * 1.05), potW = Math.min(110, W() * .26), potX = W() - potW - 14;
        box(`<div style="position:absolute;left:${potX + potW * .5 - rw * .97}px;bottom:${H() - floorY() + potW * .45}px;opacity:.9">${rainbow(rw)}</div>`, 'bg', full);
        box(`<svg viewBox="0 0 400 60" preserveAspectRatio="none" style="width:100%;height:100%;display:block"><path d="M0 60 V30 C70 6 140 12 200 30 C260 48 330 8 400 22 V60Z" fill="#1E9A55"/></svg>`, 'bg', `top:${HZ() - 60}px;width:100%;height:80px`);
        ground('#22A055', '#0B5A30', '#2CB262');
        spread(12, (x, t) => put(tuft('#14743C'), x, t));
        spread(10, (x, t) => put(shamrock(30), x, t));
        spread(4, (x, t) => put(img('clover', 34), x, .3 + t * .7));
        spread(3, (x, t) => put(lepHat(40), x, .2 + t * .6));
        box(`<div class="bgx-goldglow" style="left:${potX - 20}px;bottom:${H() - floorY() - 10}px;width:${potW + 40}px;height:${potW}px"></div>`, 'fx', full);
        box(`<div style="position:absolute;left:${potX}px;top:${floorY() - potW * .8}px">${potOfGold(potW)}</div>`, 'fx', full);
        stream(12, () => { const r = Math.random();
          if (r < .6) { const s = rnd(28, 46); return { html: shamrock(s), ...drop(s, rnd(8, 13) * 1000, rnd(30, 60), rnd(-300, 300), .55) }; }
          if (r < .9) { const s = rnd(20, 28); return { html: `<div class="bgx-spin">${coin(s)}</div>`, ...drop(s, rnd(7, 11) * 1000, rnd(10, 30), 0, .45), pile: flatCoin(s) }; }
          const s = rnd(30, 40); return { html: lepHat(s), ...drop(s, rnd(9, 13) * 1000, rnd(20, 40), rnd(-120, 120), .5) }; });
        stream(12, () => { const x = rnd(0, W()), y = rnd(100, H() - 80), s = rnd(10, 20);
          return { html: star4(s, '#FFE27A'), dur: rnd(2, 4) * 1000, frames: [{ transform: `translate(${x}px,${y}px) scale(0)`, opacity: 0 }, { transform: `translate(${x}px,${y}px) scale(1) rotate(45deg)`, opacity: 1, offset: .5 }, { transform: `translate(${x}px,${y}px) scale(0)`, opacity: 0 }] }; });
        every(9, 15, () => { const px = potX + potW * .4, py = floorY() - potW * .8;
          for (let k = 0; k < 9; k++) { const s = rnd(18, 26), x1 = Math.min(W() - s, Math.max(0, px + rnd(-W() * .55, W() * .1))), y1 = landY(x1, s, .45), peak = py - rnd(120, 240);
            pass(`<div class="bgx-spin">${coin(s)}</div>`, [{ transform: `translate(${px}px,${py}px)` }, { transform: `translate(${(px + x1) / 2}px,${peak}px)`, offset: .45 }, { transform: `translate(${x1}px,${y1}px)` }],
              rnd(1.3, 1.9) * 1000 + k * 90, 'fx', '', 'linear', () => settle(flatCoin(s), x1, y1, 0, s)); } }, [3, 6]);
        herd([['bunny', 60, 9], ['lamb', 64, 13], ['sheep', 76, 16], ['horse', 108, 12], ['goat', 76, 13], ['highland', 96, 18]], 4, 8);
      } },

    { id: 'easter', e: '🐣', n: 'Easter', cost: 1400, land: true, hdr: 'linear-gradient(135deg,#6D28D9,#8B5CF6 50%,#10B981)', tc: '#7C3AED', base: '#BFE9C9',
      sky: 'linear-gradient(#7CC8FF,#C4EBFF 40%,#E8F8FF 50%)', thumb: egg(28), build() {
        box(cloud(140, .9), 'bg', `left:6%;top:${H() * .15}px`); box(cloud(100, .8), 'bg', `left:auto;right:6%;top:${H() * .26}px`);
        ground('#A6E68E', '#5CB848', '#B8EE9E');
        spread(4, (x, t) => put(leafTree(150, '#FFC1DA', '#F59AC0'), x, t * .25));
        spread(12, (x, t) => put(tuft('#4E9E3C'), x, t));
        spread(14, (x, t, i) => put(img(['tulip', 'blossom', 'sunflower'][i % 3], 50, 'bgx-sway'), x, t));
        spread(10, (x, t) => put(egg(30), x, .15 + t * .85));
        spread(2, (x, t) => put(basket(110), x, .5 + t * .5));
        stream(10, () => { const s = rnd(30, 46); return { html: egg(s), ...drop(s, rnd(8, 13) * 1000, rnd(20, 50), rnd(-260, 260), .55) }; });
        every(10, 18, () => { const ltr = Math.random() < .5, n = Math.round(rnd(2, 4)), t = rnd(.2, 1), w = rnd(30, 38) * dS(t);
          const parade = Array.from({ length: n }, (_, k) => `<div style="position:absolute;left:${k * w * 1.15}px;top:0">${chick(w * (k ? .85 : 1))}</div>`).join('');
          pass(`<div style="position:relative;width:${n * w * 1.2}px;height:${w * 1.1}px">${parade}</div>`, across(dY(t) - w * 1.05, n * w * 1.2, ltr), rnd(12, 16) * 1000, 'bg', `z-index:${zOf(t)}`); }, [3, 6]);
        every(12, 20, () => { const w = rnd(30, 40); pass(petSVG('butterfly', w), across(rnd(120, H() * .5), w, Math.random() < .5, rnd(-100, 100)), rnd(9, 13) * 1000); }, [4, 8]);
        herd([['bunny', 60, 8], ['bunny', 60, 8], ['lamb', 64, 13], ['duck', 56, 12], ['chicken', 56, 13], ['guineapig', 38, 11]], 3, 7);
      } },

    { id: 'christmas', e: '🎅', n: 'Christmas', cost: 2200, land: true, dark: true, hdr: 'linear-gradient(135deg,#7F1D1D,#B91C1C 50%,#166534)', tc: '#B91C1C', base: '#13234F',
      sky: 'linear-gradient(#08122E,#13234F 35%,#26407A 50%)', thumb: xmasTree(30), build() {
        box(twinkles(46, 40, '#fff'), 'bg', full);
        box('<div class="bgx-moon"></div>', 'bg', `left:10%;top:${Math.max(90, H() * .13)}px`);
        ground('#EEF4FC', '#C8D8EC', '#F6FAFF');
        spread(7, (x, t) => put(pine(150), x, t * .6));
        spread(2, (x, t) => put(xmasTree(170), x, .3 + t * .5));
        spread(6, (x, t) => put(present(46, ...pick([['#E8304A', '#FFD23F'], ['#3AA0FF', '#fff'], ['#22C55E', '#E8304A'], ['#A855F7', '#FFD23F']])), x, .3 + t * .7));
        spread(4, (x, t) => put(cane(60), x, t));
        spread(2, (x, t) => put(img('snowman', 90), x, .4 + t * .5));
        box(xmasLights(), 'fx', 'left:0;right:0;width:100%');
        stream(24, i => { const s = i % 5 === 0 ? rnd(22, 32) : rnd(6, 16);
          return { html: i % 3 ? flake(s, rnd(.8, 1)) : `<span class="bgx-dot" style="width:${s / 2}px;height:${s / 2}px"></span>`, ...drop(s, rnd(9, 16) * 1000, rnd(20, 50), rnd(-200, 200), .45), pile: snowPile(s) }; });
        every(16, 28, () => { const w = Math.min(W() * 1.1, rnd(320, 460)), y = rnd(90, H() * .28);
          pass(sleigh(w), wavy(y, w, Math.random() < .7, rnd(12, 26), 1.5), rnd(9, 13) * 1000); }, [3, 6]);
        herd([['reindeer', 110, 12], ['reindeer', 110, 12], ['penguin', 64, 16], ['polarbear', 80, 16], ['lamb', 64, 13]], 4, 8);
      } },

    { id: 'desert', e: '🌵', n: 'Arizona Desert', cost: 1800, land: true, hdr: 'linear-gradient(135deg,#7C2D12,#C2410C 55%,#0E9F9A)', tc: '#B4461B', base: '#F2C38A',
      sky: 'linear-gradient(#2F86DA,#74BDF2 26%,#FFE2AE 46%,#F5B46A 52%)', thumb: saguaro(30, true), build() {
        const fy = floorY();
        box('<div class="bgx-sun"></div>', 'bg', `left:auto;right:12%;top:${Math.max(100, H() * .13)}px`);
        box(mesas(), 'bg', `top:${HZ() - Math.min(150, H() * .18) + 16}px;width:100%;height:${Math.min(150, H() * .18)}px`);
        ground('#EDBB7A', '#C98A48', '#F2C88A', `<svg viewBox="0 0 400 100" preserveAspectRatio="none" style="position:absolute;left:0;top:0;width:100%;height:100%"><path d="M0 30 C90 18 170 26 250 36 C320 44 360 30 400 32" stroke="#DFA05C" stroke-width="3" fill="none" opacity=".6"/><path d="M0 64 C90 52 170 60 250 70 C320 78 360 64 400 66" stroke="#DFA05C" stroke-width="3" fill="none" opacity=".6"/></svg>`);
        spread(6, (x, t, i) => put(saguaro(190, i % 2 === 0), x, t * .7));
        spread(5, (x, t) => put(barrel(44), x, t));
        spread(4, (x, t) => put(pear(64), x, t));
        spread(5, (x, t) => put(rock(64, '#C47A4A', '#9C5A30'), x, t));
        stream(20, () => { const y = rnd(H() * .35, fy - 6), x = rnd(-40, W() * .3), s = rnd(2, 4.5);
          return { html: `<span class="bgx-sand" style="width:${s}px;height:${s}px"></span>`, dur: rnd(1.4, 2.8) * 1000,
            frames: [{ transform: `translate(${x}px,${y}px)`, opacity: 0 }, { opacity: .8, offset: .2 }, { transform: `translate(${x + W() * rnd(.6, 1)}px,${y + rnd(-30, 20)}px)`, opacity: 0 }] }; });
        const roll = (s0, delay = 0) => { const t = rnd(.1, 1), s = s0 * dS(t), base = dY(t), x0 = -s - 30, x1 = W() + 30, hops = Math.round(rnd(3, 6)), N = hops * 8, hh = Array.from({ length: hops }, () => rnd(.35, 1) * rnd(30, 90) * dS(t)), frames = [];
          for (let k = 0; k <= N; k++) { const tt = k / N, j = Math.min(hops - 1, Math.floor(tt * hops)), ph = tt * hops - j, x = x0 + (x1 - x0) * tt;
            frames.push({ transform: `translate(${x}px,${base - s * .92 - Math.sin(ph * Math.PI) * hh[j]}px) rotate(${(x - x0) / (Math.PI * s) * 360}deg)` }); }
          timers.push(setTimeout(() => pass(tumbleweed(s), frames, rnd(4.5, 7.5) * 1000, 'bg', `z-index:${zOf(t)}`), delay)); };
        every(5, 10, () => { roll(rnd(42, 74)); if (Math.random() < .35) roll(rnd(30, 48), rnd(600, 1600)); }, [1, 3]);
        every(12, 20, () => { const w = rnd(160, 260), h = w * .45, y = dY(rnd(.2, 1));
          pass(`<div class="bgx-dust" style="width:${w}px;height:${h}px"></div>`, [{ transform: `translate(${-w}px,${y - h * .8}px)`, opacity: 0 }, { opacity: .9, offset: .2 }, { opacity: .7, offset: .8 }, { transform: `translate(${W() + 20}px,${y - h * .9}px)`, opacity: 0 }], rnd(5, 8) * 1000);
          roll(rnd(50, 70), 400); }, [6, 10]);
        herd([['lizard', 30, 4], ['roadrunner', 70, 3], ['turtle', 40, 22], ['wolf', 76, 11, { filter: 'sepia(.5) saturate(1.3)' }], ['lizard', 30, 4]], 3, 7);
        every(14, 24, () => roamArt(snake, 170, .12, 15), [5, 9]);
        every(18, 30, () => { const w = rnd(70, 100); pass(hawk(w), wavy(rnd(110, H() * .3), w, Math.random() < .5, rnd(20, 40), 1), rnd(14, 20) * 1000); }, [4, 9]);
      } },

    { id: 'harvest', e: '🦃', n: 'Thanksgiving Harvest', cost: 3150, land: true, hdr: 'linear-gradient(135deg,#7C2D12,#B45309 55%,#D97706)', tc: '#B45309', base: '#F6D7A7',
      sky: 'linear-gradient(#FF9F5A,#FFC98A 26%,#FFE3B8 44%,#F4D29A 52%)', thumb: pumpkin(30), build() {
        box('<div class="bgx-sunset" style="width:150px;height:150px"></div>', 'bg', `left:auto;right:10%;top:${HZ() - 150}px`);
        ground('#D9A441', '#9A6418', '#E2B456', `<svg viewBox="0 0 400 100" preserveAspectRatio="none" style="position:absolute;left:0;top:0;width:100%;height:100%">${[14, 30, 48, 68, 90].map((y, i) => `<path d="M0 ${y} C100 ${y - 6} 300 ${y + 6} 400 ${y}" stroke="#B7791F" stroke-width="${1.5 + i}" fill="none" opacity=".45"/>`).join('')}</svg>`);
        spread(4, (x, t) => put(leafTree(150, '#E8792A', '#C2551A'), x, t * .2));
        spread(10, (x, t) => put(`<div style="display:flex;align-items:flex-end">${cornStalk(110)}${cornStalk(130)}</div>`, x, t * .35));
        spread(2, (x, t) => put(scarecrow(110), x, .35 + t * .4));
        spread(4, (x, t) => put(hayBale(84), x, .2 + t * .8));
        spread(8, (x, t) => put(pumpkin(50), x, .3 + t * .7));
        stream(10, () => { const s = rnd(26, 46); return { html: maple(s), ...drop(s, rnd(10, 16) * 1000, rnd(30, 60), rnd(-300, 300), .55) }; });
        herd([['turkey', 64, 13], ['turkey', 64, 13], ['chicken', 56, 13], ['pig', 66, 14], ['cow', 96, 20], ['horse', 108, 12], ['goat', 76, 13], ['sheep', 76, 16]], 3, 7);
        every(12, 20, () => pass(flock(Math.round(rnd(5, 8)), '#3b2a1a'), across(rnd(90, H() * .32), 170, Math.random() < .5, rnd(-40, 40)), rnd(12, 17) * 1000), [3, 7]);
      } },

    { id: 'beach', e: '🏖️', n: 'Sunny Beach', cost: 3300, land: true, hdr: 'linear-gradient(135deg,#0369A1,#0EA5E9 55%,#F59E0B)', tc: '#0284C7', base: '#F9E3B4',
      sky: 'linear-gradient(#1E90E8,#62BDF6 22%,#B8E6FF 34%)', thumb: beachBall(26), build() {
        const sea = Math.round(H() * .32);
        box('<div class="bgx-sun"></div>', 'bg', `left:auto;right:12%;top:${Math.max(84, H() * .1)}px`);
        stream(3, () => { const w = rnd(110, 180); return { html: cloud(w, .95), dur: rnd(40, 60) * 1000, frames: across(rnd(60, sea - 80), w, true) }; }, 'bg');
        box(`<div class="bgx-sea" style="top:${sea}px;height:${H() - sea}px"><div class="bgx-crest"></div><div class="bgx-crest" style="top:30px;opacity:.5;animation-duration:5s"></div></div>`, 'bg', full);
        ground('#F7DFA6', '#E2BC78', '#FCEBC4', `<svg viewBox="0 0 400 20" preserveAspectRatio="none" style="position:absolute;left:0;top:-14px;width:100%;height:20px"><path d="M0 12 C60 2 120 18 200 8 C280 0 340 16 400 6" stroke="#fff" stroke-width="3" fill="none" class="bgx-surf"/></svg>`);
        spread(3, (x, t) => put(img('palm', 190, 'bgx-sway'), x, t * .5));
        spread(3, (x, t) => put(beachUmbrella(100), x, .3 + t * .6));
        spread(2, (x, t) => put(sandcastle(74), x, .4 + t * .6));
        spread(8, (x, t) => put(img('shell', 22), x, t));
        spread(5, (x, t) => put(starfish(26, pick(['#FF7A45', '#FF4F9A', '#FFC93C'])), x, t));
        spread(3, (x, t, i) => put(`<div style="width:90px;height:22px;border-radius:5px;background:repeating-linear-gradient(90deg,${['#EF4444', '#3B82F6', '#22C55E'][i % 3]} 0 12px,#fff 12px 24px);transform:skewX(-30deg)"></div>`, x, .3 + t * .7));
        every(14, 24, () => { const w = rnd(46, 60); pass(`<div class="bgx-bob">${boat(w)}</div>`, across(sea + rnd(10, 60), w, Math.random() < .5), rnd(22, 30) * 1000, 'bg'); }, [2, 6]);
        every(10, 18, () => pass(flock(Math.round(rnd(2, 4)), '#F8FAFC'), across(rnd(70, sea - 40), 100, Math.random() < .5, rnd(-50, 50)), rnd(10, 14) * 1000), [3, 6]);
        every(6, 11, () => roamArt(crab, 46, .63, 9), [1, 4]);
        every(10, 18, () => { const h = 44, x = rnd(30, W() - 220), ltr = Math.random() < .5, x0 = ltr ? x : x + 180, x1 = ltr ? x + 180 : x, sy = sea + rnd(30, HZ() - sea - 20);
          pass(`<div class="walking" style="transform:scaleX(${ltr ? 1 : -1})">${petSVG('dolphin', h)}</div>`, [{ transform: `translate(${x0}px,${sy}px) rotate(${ltr ? -35 : 35}deg)`, opacity: 0 }, { opacity: 1, offset: .1 },
            { transform: `translate(${(x0 + x1) / 2}px,${sy - 100}px) rotate(0)`, offset: .5 }, { opacity: 1, offset: .9 }, { transform: `translate(${x1}px,${sy}px) rotate(${ltr ? 35 : -35}deg)`, opacity: 0 }], 1800, 'bg', 'z-index:2', 'ease-in-out'); }, [4, 8]);
        every(13, 22, () => { const t = rnd(.3, 1), s = 44 * dS(t), base = dY(t), x0 = -s - 30, x1 = W() + 30, hops = 4, N = 32, frames = [];
          for (let k = 0; k <= N; k++) { const tt = k / N, ph = tt * hops % 1, x = x0 + (x1 - x0) * tt; frames.push({ transform: `translate(${x}px,${base - s - Math.sin(ph * Math.PI) * 70 * dS(t) * (1 - tt * .5)}px) rotate(${(x - x0) / (Math.PI * s) * 360}deg)` }); }
          pass(beachBall(s), frames, rnd(5, 7) * 1000, 'bg', `z-index:${zOf(t)}`); }, [8, 12]);
        herd([['seal', 60, 18], ['dog', 70, 9], ['turtle', 40, 22], ['penguin', 60, 16]], 5, 9);
      } },

    { id: 'campfire', e: '🏕️', n: 'Campfire Night', cost: 3600, land: true, dark: true, hdr: 'linear-gradient(135deg,#1C1917,#7C2D12 55%,#F97316)', tc: '#7C2D12', base: '#0B1736',
      sky: 'linear-gradient(#030712,#0B1736 35%,#1C2A4A 50%)', thumb: campfire(28), build() {
        const fy = floorY(), cx = W() * .56, ft = .62, fireY = dY(ft);
        box(twinkles(60, 40, '#fff'), 'bg', full);
        box('<div class="bgx-moon"></div>', 'bg', `left:8%;top:${Math.max(96, H() * .12)}px`);
        box(forest('#0A1220'), 'bg', `top:${HZ() - 104}px;width:100%;height:120px`);
        ground('#231A12', '#0E0B08', '#2A2016');
        spread(7, (x, t) => put(pine(150, false), x, t * .35, 'bg', 'filter:brightness(.35)'));
        put(tent(150), .18, .55);
        box(`<div class="bgx-fireglow" style="left:${cx - 130}px;top:${fireY - 190}px;z-index:${zOf(ft) - 1}"></div>`, 'bg', full);
        put(campfire(120), cx / W(), ft);
        spread(6, (x, t) => put(rock(40, '#4A4440', '#2E2A26'), x, t));
        stream(14, () => { const x = cx + rnd(-20, 20), y = fireY - rnd(50, 80), s = rnd(3, 5);
          return { html: `<span class="bgx-ember" style="width:${s}px;height:${s}px"></span>`, dur: rnd(1.6, 3) * 1000, ease: 'ease-out',
            frames: [{ transform: `translate(${x}px,${y}px)`, opacity: 1 }, { transform: `translate(${x + rnd(-40, 40)}px,${y - rnd(120, 260)}px)`, opacity: 0 }] }; });
        stream(12, () => { const x = rnd(0, W()), y = rnd(H() * .35, fy - 40);
          return { html: '<span class="bgx-fly"></span>', dur: rnd(5, 9) * 1000, ease: 'ease-in-out',
            frames: [{ transform: `translate(${x}px,${y}px)`, opacity: 0 }, { transform: `translate(${x + rnd(-50, 50)}px,${y + rnd(-50, 50)}px)`, opacity: 1, offset: .4 }, { transform: `translate(${x + rnd(-90, 90)}px,${y + rnd(-90, 90)}px)`, opacity: 0 }] }; });
        every(5, 10, () => { const x = rnd(W() * .3, W() * 1.1), y = rnd(60, H() * .3), len = rnd(100, 180);
          pass(`<span class="bgx-shoot" style="width:${len}px"></span>`, [{ transform: `translate(${x}px,${y}px) rotate(150deg)`, opacity: 0 }, { opacity: 1, offset: .15 }, { transform: `translate(${x - 380}px,${y + 220}px) rotate(150deg)`, opacity: 0 }], 1300); }, [2, 4]);
        every(18, 30, () => { const w = 44; pass(`<div class="walking">${petSVG('owl', w)}</div>`, wavy(rnd(110, H() * .35), w * 1.3, Math.random() < .5, rnd(15, 30), 1.5), rnd(10, 14) * 1000); }, [6, 10]);
        const night = { filter: 'brightness(.6) saturate(.8)' };
        herd([['raccoon', 52, 10, night], ['fox', 62, 10, night], ['deer', 104, 11, night], ['hedgehog', 34, 12, night], ['grizzly', 84, 16, night], ['moose', 124, 16, night]], 5, 9);
      } },

    { id: 'veterans', e: '🎖️', n: 'Veterans Day', cost: 3900, land: true, hdr: 'linear-gradient(135deg,#1E3A8A,#334155 55%,#B91C1C)', tc: '#1E3A8A', base: '#DCE8F5',
      sky: 'linear-gradient(#6FA6DF,#A9CDEF 34%,#E6F0FA 50%)', thumb: poppy(30), build() {
        const fw = Math.min(190, W() * .46);
        stream(3, () => { const w = rnd(110, 180); return { html: cloud(w, .9), dur: rnd(45, 65) * 1000, frames: across(rnd(70, H() * .3), w, true) }; }, 'bg');
        box(`<div style="position:absolute;left:50%;transform:translateX(-50%);top:${Math.max(96, H() * .13)}px">${ribbonBanner('THANK YOU, VETERANS', Math.min(330, W() * .86))}</div>`, 'bg', full);
        ground('#6DAF5E', '#3A7A34', '#7EBE6E');
        put(flagPole(fw, Math.min(280, H() * .36)), .22, .35);
        spread(4, (x, t) => put(leafTree(140, '#4E9A48', '#3A7A34'), x, t * .2));
        spread(12, (x, t) => put(tuft('#3E8A38'), x, t));
        spread(16, (x, t, i) => put(`<div class="bgx-sway" style="animation-delay:-${i * .5}s">${poppy(56)}</div>`, x, t));
        stream(8, () => { const s = rnd(12, 18); return { html: petal(s, pick(['#D62828', '#B91C1C', '#E63946'])), ...drop(s, rnd(10, 16) * 1000, rnd(30, 60), rnd(-200, 200), .5) }; });
        every(16, 26, () => { const w = Math.min(300, W() * .8); pass(jets(w), across(rnd(80, H() * .28), w, true, rnd(-30, 10)), rnd(6, 8) * 1000); }, [3, 6]);
        every(20, 32, () => { const w = 70; pass(`<div class="walking">${petSVG('eagle', w * .55)}</div>`, wavy(rnd(120, H() * .35), w, Math.random() < .5, 20, 1), rnd(11, 15) * 1000); }, [10, 16]);
        herd([['horse', 108, 12], ['dog', 70, 9], ['deer', 104, 11], ['bunny', 60, 9]], 5, 9);
      } },

    { id: 'aurora', e: '🌌', n: 'Northern Lights', cost: 4200, land: true, dark: true, hdr: 'linear-gradient(135deg,#022C22,#0F766E 50%,#6D28D9)', tc: '#0F766E', base: '#0B1638',
      sky: 'linear-gradient(#020617,#0B1638 30%,#12305A 46%,#1D4A6E 52%)', thumb: auroraIcon, build() {
        box(twinkles(80, 45, '#fff'), 'bg', full);
        box([['#34D399', 4, -10, 0], ['#22D3EE', 10, 6, 30], ['#4ADE80', 16, -4, -20], ['#A78BFA', 2, 12, 40], ['#F472B6', 20, -14, -40]].map(([c, top, rot, dx], i) =>
          `<div style="position:absolute;left:${dx - 30}%;width:160%;top:${top}%;height:24%;transform:rotate(${rot}deg)"><div class="bgx-rib" style="--c:${c};animation-delay:-${(i * 2.3).toFixed(1)}s;animation-duration:${8 + i * 2}s"></div></div>`).join(''), 'bg', full);
        box(peaks(), 'bg', `top:${HZ() - Math.min(150, H() * .18) + 16}px;width:100%;height:${Math.min(150, H() * .18)}px`);
        ground('#E8F1FA', '#B8CCE2', '#F2F8FF');
        spread(9, (x, t) => put(pine(150), x, t * .7));
        spread(3, (x, t) => put(iceberg(90), x, t * .4));
        spread(6, (x, t) => put(`<span class="bgx-mound" style="width:70px;height:26px"></span>`, x, t));
        stream(14, i => { const s = i % 5 === 0 ? rnd(18, 28) : rnd(6, 14); return { html: i % 3 ? flake(s, rnd(.75, 1)) : `<span class="bgx-dot" style="width:${s / 2}px;height:${s / 2}px"></span>`,
          ...drop(s, rnd(9, 16) * 1000, rnd(20, 50), rnd(-200, 200), .45), pile: snowPile(s) }; });
        every(5, 10, () => { const x = rnd(W() * .3, W() * 1.1), y = rnd(60, H() * .3), len = rnd(120, 200);
          pass(`<span class="bgx-shoot" style="width:${len}px"></span>`, [{ transform: `translate(${x}px,${y}px) rotate(150deg)`, opacity: 0 }, { opacity: 1, offset: .15 }, { transform: `translate(${x - 400}px,${y + 230}px) rotate(150deg)`, opacity: 0 }], 1300); }, [2, 4]);
        every(15, 24, () => { const w = 48; pass(`<div class="walking">${petSVG('snowyowl', w)}</div>`, wavy(rnd(110, H() * .35), w * 1.3, Math.random() < .5, rnd(15, 30), 1.5), rnd(10, 14) * 1000); }, [4, 8]);
        herd([['polarbear', 80, 16], ['reindeer', 110, 12], ['wolf', 80, 11], ['moose', 124, 16], ['fox', 62, 10], ['penguin', 64, 16]], 4, 8);
      } },

    { id: 'newyear', e: '🎆', n: 'New Year’s Midnight', cost: 4600, land: true, dark: true, hdr: 'linear-gradient(135deg,#0F0A2E,#4C1D95 55%,#C026D3)', tc: '#4C1D95', base: '#120B33',
      sky: 'linear-gradient(#05030F,#120B33 30%,#2A1650 46%,#3B1E5E 52%)', thumb: burstIcon, build() {
        const sh = Math.min(200, H() * .26);
        box(twinkles(60, 30, '#fff'), 'bg', full);
        box(skyline(), 'bg', `top:${HZ() - sh + 4}px;width:100%;height:${sh}px`);
        box(`<div style="position:absolute;left:50%;transform:translateX(-50%);top:${HZ() - sh * 1.3 + 4}px">${clockTower(sh * 1.3)}</div>`, 'bg', full);
        ground('#2A1F4A', '#0E0820', '#3A2C60', `<div style="position:absolute;left:0;right:0;top:46%;height:16%;background:linear-gradient(#1A1236,#120B26)"></div><div style="position:absolute;left:0;right:0;top:53%;height:2px;background:repeating-linear-gradient(90deg,#FFE9A0 0 26px,transparent 26px 52px);opacity:.6"></div>`);
        spread(7, (x, t) => put(lamp(130), x, t < .5 ? .05 : .95));
        spread(5, (x, t) => put(`<div class="bgx-float">${balloon(36, pick(['#FFD23F', '#C0C7D2', '#C77DFF', '#FF5C8A']), '#ffffff55')}</div>`, x, t));
        const NY = ['#FFD23F', '#FF5C8A', '#5CF2C2', '#7CC4FF', '#C77DFF', '#FFFFFF', '#FF9A3C'];
        every(1.4, 2.8, () => firework(NY), [.3, 1]);
        stream(16, () => { const s = rnd(9, 15), c = pick(NY); return { html: `<span class="bgx-conf" style="background:${c};width:${s}px;height:${(s * .45).toFixed(1)}px"></span>`,
          ...drop(s, rnd(7, 12) * 1000, rnd(30, 60), rnd(-500, 500), .3) }; });
        every(16, 26, () => { const w = rnd(34, 46), x = rnd(20, W() - 60); pass(balloon(w, pick(['#FFD23F', '#C0C7D2', '#C77DFF']), '#ffffff55'),
          [{ transform: `translate(${x}px,${H() + 30}px)` }, { transform: `translate(${x + rnd(-60, 60)}px,${-w * 2}px)` }], rnd(14, 20) * 1000); }, [4, 8]);
        herd([['dog', 70, 9], ['cat', 64, 10], ['dog', 70, 9], ['penguin', 60, 16]], 6, 11);
      } },

    { id: 'july4', e: '🎇', n: '4th of July', cost: 5200, land: true, dark: true, hdr: 'linear-gradient(135deg,#B91C1C,#7F1D1D 40%,#1E3A8A)', tc: '#1E3A8A', base: '#1B2A5E',
      sky: 'linear-gradient(#0A1430,#1B2A5E 35%,#3A3F7A 50%)', thumb: miniFlag, build() {
        const fw = Math.min(170, W() * .42);
        box(twinkles(50, 40, '#fff'), 'bg', full);
        box(forest('#0B1024'), 'bg', `top:${HZ() - 84}px;width:100%;height:100px`);
        ground('#1E3A2A', '#0B1A12', '#24452F');
        put(flagPole(fw, Math.min(260, H() * .34)), .2, .4);
        spread(10, (x, t) => put(tuft('#14301F'), x, t));
        spread(3, (x, t, i) => put(`<div style="width:100px;height:28px;border-radius:5px;background:repeating-linear-gradient(90deg,#B22234 0 14px,#fff 14px 28px);transform:skewX(-30deg);opacity:.85"></div>`, x, .45 + t * .5));
        spread(8, (x, t) => put(`<span class="bgx-fly"></span>`, x, t));
        const USA = ['#EF4444', '#FFFFFF', '#3B82F6', '#F87171', '#93C5FD'];
        every(1.2, 2.4, () => firework(USA), [.3, 1]);
        stream(10, () => { const s = rnd(16, 26); return { html: star5(s, pick(['#EF4444', '#FFFFFF', '#3B82F6'])), ...drop(s, rnd(9, 14) * 1000, rnd(20, 50), rnd(-260, 260), .5) }; });
        every(18, 28, () => { const w = 80; pass(`<div class="walking">${petSVG('eagle', w * .55)}</div>`, wavy(rnd(110, H() * .35), w, Math.random() < .5, 20, 1), rnd(10, 14) * 1000); }, [6, 10]);
        const dusk = { filter: 'brightness(.7)' };
        herd([['dog', 70, 9, dusk], ['horse', 108, 12, dusk], ['raccoon', 52, 10, dusk], ['deer', 104, 11, dusk]], 5, 9);
      } },
  ];
  BG.sort((a, b) => a.cost - b.cost);  // the grid shows them in unlock order

  /* ======================= styles ======================= */
  const css = document.createElement('style');
  css.textContent = `
  .bgx-sn{animation:bgxSn .8s ease-in-out infinite alternate}
  @keyframes bgxSn{from{transform:translateY(-5px)}to{transform:translateY(5px)}}
  .bgx-rattle ellipse{animation:bgxRattle .08s linear infinite alternate}
  @keyframes bgxRattle{to{transform:translateY(-1.5px)}}
  .bgx-tongue{animation:bgxTongue 1.2s ease-in-out infinite}
  @keyframes bgxTongue{0%,60%,100%{transform:scaleX(0)}70%,90%{transform:scaleX(1)}}
  .bgx-glide{animation:bgxGlide 3s ease-in-out infinite alternate}
  @keyframes bgxGlide{from{transform:rotate(-7deg)}to{transform:rotate(7deg)}}
  .bgx-sand{display:block;border-radius:50%;background:#C98B45}
  .bgx-dust{border-radius:50%;background:radial-gradient(ellipse,rgba(222,170,110,.75),rgba(222,170,110,.35) 45%,rgba(222,170,110,0) 70%)}
  .bgx-rib{position:absolute;inset:0;opacity:.5;background:radial-gradient(ellipse 50% 50% at 50% 55%,var(--c) 0%,transparent 72%);
    -webkit-mask:repeating-linear-gradient(90deg,#000 0 3px,rgba(0,0,0,.72) 3px 7px);mask:repeating-linear-gradient(90deg,#000 0 3px,rgba(0,0,0,.72) 3px 7px);animation:bgxRib 10s ease-in-out infinite alternate}
  @keyframes bgxRib{from{transform:translateX(-6%) skewY(-6deg) scaleY(.85)}to{transform:translateX(6%) skewY(5deg) scaleY(1.2)}}
  .bgx-win{animation:bgxWin 6s steps(1) infinite}
  @keyframes bgxWin{0%,70%{opacity:1}75%,100%{opacity:.12}}
  .bgx-spark{display:block;width:5px;height:5px;border-radius:50%}
  .bgx-trail{display:block;width:3px;height:16px;border-radius:3px;background:linear-gradient(#fff,rgba(255,200,120,0))}
  .bgx-boom{display:block;width:120px;height:120px;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,.5),rgba(255,255,255,0) 60%)}
  .bgx-conf{display:block;border-radius:2px}
  .bgx-fire{animation:bgxFire .45s ease-in-out infinite alternate}
  @keyframes bgxFire{0%{transform:scale(1,1) skewX(0)}50%{transform:scale(.94,1.07) skewX(3deg)}100%{transform:scale(1.04,.95) skewX(-3deg)}}
  .bgx-fireglow{position:absolute;width:260px;height:260px;border-radius:50%;background:radial-gradient(circle,rgba(255,150,60,.55),rgba(255,110,40,0) 68%);animation:bgxGlow2 1.4s ease-in-out infinite alternate}
  @keyframes bgxGlow2{to{opacity:.65;transform:scale(.93)}}
  .bgx-ember{display:block;border-radius:50%;background:#FFB020;box-shadow:0 0 6px 2px rgba(255,140,40,.8)}
  .bgx-sea{position:absolute;left:0;right:0;background:linear-gradient(#1FA2E0,#0E7CC2 60%,#0B6AA8)}
  .bgx-crest{position:absolute;left:0;right:0;top:-6px;height:14px;background:radial-gradient(circle at 10px -3px,transparent 11px,#E6F7FF 12px) repeat-x;background-size:20px 14px;animation:bgxCrest 3s linear infinite}
  @keyframes bgxCrest{to{background-position:40px 0}}
  .bgx-surf{animation:bgxSurf 3.2s ease-in-out infinite alternate}
  @keyframes bgxSurf{to{transform:translateY(-6px)}}
  .bgx-scut{transform-box:fill-box;transform-origin:50% 0;animation:bgxScut .16s linear infinite alternate}
  .bgx-scut2{animation-direction:alternate-reverse}
  @keyframes bgxScut{from{transform:rotate(-14deg)}to{transform:rotate(14deg)}}
  .bgx-flagwave{animation:bgxFlag 1.3s ease-in-out infinite alternate}
  @keyframes bgxFlag{from{transform:translateY(calc(var(--fa) * -1))}to{transform:translateY(var(--fa))}}
  .bgx-tail{animation:bgxWag .5s ease-in-out infinite alternate}
  @keyframes bgxWag{from{transform:rotate(-12deg)}to{transform:rotate(12deg)}}
  .bgx-pulse{animation:bgxPulse 1.4s ease-in-out infinite}
  @keyframes bgxPulse{50%{transform:scale(1.08,.86)}}
  .bgx-tent{animation:bgxPulse 1.4s ease-in-out infinite;transform-origin:25px 32px}
  .bgx-sway{transform-origin:50% 100%;animation:bgxSway 4s ease-in-out infinite alternate}
  @keyframes bgxSway{from{transform:rotate(-5deg)}to{transform:rotate(5deg)}}
  .bgx-swing{transform-origin:50% 0;animation:bgxSway 5s ease-in-out infinite alternate}
  .bgx-ray{position:absolute;top:-10%;width:16%;height:120%;background:linear-gradient(rgba(255,255,255,.22),rgba(255,255,255,0) 75%);transform:skewX(-14deg);animation:bgxRay 7s ease-in-out infinite}
  @keyframes bgxRay{50%{opacity:.25}}
  .bgx-bub{display:block;border-radius:50%;border:2px solid rgba(255,255,255,.9);background:radial-gradient(circle at 32% 30%,rgba(255,255,255,.95) 0 14%,rgba(255,255,255,.15) 16%,rgba(255,255,255,.08) 60%);box-shadow:0 0 6px rgba(255,255,255,.35)}
  .bgx-sun{width:86px;height:86px;border-radius:50%;background:radial-gradient(circle,#FFF7B0 0 40%,#FFD84D 62%,#FFB800);box-shadow:0 0 50px 18px rgba(255,220,80,.55);position:relative}
  .bgx-sun::before{content:"";position:absolute;inset:-60px;border-radius:50%;background:repeating-conic-gradient(rgba(255,240,150,.5) 0 7deg,transparent 7deg 22deg);
    -webkit-mask:radial-gradient(circle,transparent 0 44px,#000 46px 100%);mask:radial-gradient(circle,transparent 0 44px,#000 46px 100%);animation:bgxSpin 40s linear infinite}
  @keyframes bgxSpin{to{transform:rotate(360deg)}}
  .bgx-sunset{width:190px;height:190px;border-radius:50%;background:radial-gradient(circle,#FFF1B8 0 30%,#FFC46B 55%,#FF8A3D 80%);box-shadow:0 0 80px 30px rgba(255,150,80,.55);animation:bgxGlow 6s ease-in-out infinite}
  @keyframes bgxGlow{50%{box-shadow:0 0 110px 44px rgba(255,150,80,.65)}}
  .bgx-flap{transform-box:fill-box;transform-origin:50% 100%;animation:bgxFlap .45s ease-in-out infinite alternate}
  @keyframes bgxFlap{to{transform:scaleY(-.6)}}
  .bgx-tw{position:absolute;border-radius:50%;animation:bgxTw 2.6s ease-in-out infinite}
  @keyframes bgxTw{50%{opacity:.15;transform:scale(.6)}}
  .bgx-dot{display:block;border-radius:50%;background:#fff;box-shadow:0 0 6px rgba(255,255,255,.8)}
  .bgx-aurora{position:absolute;left:-20%;right:-20%;top:4%;height:34%;filter:blur(28px);opacity:.55;
    background:linear-gradient(100deg,transparent 10%,#34D399 30%,#22D3EE 45%,#A78BFA 60%,transparent 80%);animation:bgxAurora 12s ease-in-out infinite alternate}
  @keyframes bgxAurora{from{transform:translateX(-8%) skewY(-4deg)}to{transform:translateX(8%) skewY(4deg)}}
  .bgx-fly{display:block;width:7px;height:7px;border-radius:50%;background:#F7FF8A;box-shadow:0 0 10px 4px rgba(240,255,120,.75)}
  .bgx-float{animation:bgxFloat 9s ease-in-out infinite alternate}
  @keyframes bgxFloat{from{transform:translateY(-10px) rotate(-4deg)}to{transform:translateY(10px) rotate(4deg)}}
  .bgx-shoot{display:block;height:3px;border-radius:3px;background:linear-gradient(90deg,#fff,rgba(255,255,255,0));box-shadow:0 0 8px #fff}
  .bgx-flame{animation:bgxFlicker .12s steps(2) infinite}
  @keyframes bgxFlicker{50%{transform:scaleX(.75);transform-origin:22px 25px}}
  .bgx-beam{animation:bgxTw 1.6s ease-in-out infinite}
  .bgx-blink{animation:bgxTw .8s steps(2) infinite}
  .bgx-wing{animation:bgxWing .3s ease-in-out infinite alternate}
  @keyframes bgxWing{from{transform:rotate(-34deg)}to{transform:rotate(26deg)}}
  .bgx-spin{animation:bgxCoin 1.2s linear infinite}
  @keyframes bgxCoin{50%{transform:scaleX(.15)}}
  .bgx-shift{background-size:400% 400% !important;animation:bgxShift 24s ease-in-out infinite alternate}
  @keyframes bgxShift{from{background-position:0% 50%}to{background-position:100% 50%}}
  .bgx-mound{display:block;border-radius:50% 50% 40% 40%;background:radial-gradient(ellipse at 50% 30%,#fff 0 55%,#E3ECF8 100%);box-shadow:0 2px 3px rgba(0,0,0,.12)}
  .bgx-rain{display:block;width:2.6px;border-radius:2px;background:linear-gradient(rgba(190,215,255,0),rgba(215,232,255,1))}
  .bgx-splash{display:block;width:16px;height:6px;border-radius:50%;border:2px solid rgba(200,225,255,.85)}
  .bgx-puddle{position:absolute;width:90px;height:16px;border-radius:50%;background:rgba(120,150,190,.35)}
  .bgx-puddle i{position:absolute;inset:3px 20px;border-radius:50%;border:1.5px solid rgba(220,235,255,.7);animation:bgxRipple 2s ease-out infinite}
  @keyframes bgxRipple{from{transform:scale(.2);opacity:1}to{transform:scale(1.6);opacity:0}}
  .bgx-flash{position:absolute;inset:0;background:#EAF2FF}
  .bgx-bob{animation:bgxBob 1.4s ease-in-out infinite alternate}
  @keyframes bgxBob{from{transform:translateY(-3px) rotate(-4deg)}to{transform:translateY(3px) rotate(4deg)}}
  .bgx-moon{width:74px;height:74px;border-radius:50%;background:radial-gradient(circle at 38% 38%,#FFFDEB,#F3EAC0 70%);box-shadow:0 0 40px 12px rgba(255,248,200,.35)}
  .bgx-dawn{width:820px;height:420px;border-radius:50%;background:radial-gradient(ellipse,rgba(255,226,150,.95) 0%,rgba(255,180,90,.55) 35%,rgba(255,160,80,0) 70%)}
  .bgx-holyrays{width:620px;height:620px;border-radius:50%;margin-bottom:-310px;opacity:.45;
    background:repeating-conic-gradient(from 0deg,rgba(255,236,170,.9) 0 5deg,transparent 5deg 15deg);
    -webkit-mask:radial-gradient(circle,#000 0 20%,transparent 70%);mask:radial-gradient(circle,#000 0 20%,transparent 70%);animation:bgxSpin 90s linear infinite}
  .bgx-bigstar{filter:drop-shadow(0 0 18px rgba(255,240,170,.95)) drop-shadow(0 0 40px rgba(255,220,120,.6));animation:bgxShine 3.4s ease-in-out infinite}
  @keyframes bgxShine{50%{transform:scale(1.08);filter:drop-shadow(0 0 26px rgba(255,245,190,1)) drop-shadow(0 0 60px rgba(255,220,120,.8))}}
  .bgx-beat{animation:bgxBeat 1.6s ease-in-out infinite}
  @keyframes bgxBeat{0%,100%{transform:scale(1)}15%{transform:scale(1.12)}30%{transform:scale(1)}45%{transform:scale(1.08)}}
  .bgx-gallop{animation:bgxGallop .32s ease-in-out infinite alternate}
  .bgx-gallop2{animation:bgxGallop .32s ease-in-out infinite alternate-reverse}
  @keyframes bgxGallop{from{transform:rotate(-24deg)}to{transform:rotate(24deg)}}
  .bgx-nose{filter:drop-shadow(0 0 4px #ff3b3b);animation:bgxTw 1s ease-in-out infinite}
  .bgx-glowstar{filter:drop-shadow(0 0 4px #FFE27A);animation:bgxTw 1.8s ease-in-out infinite}
  .bgx-hop{animation:bgxHop .5s ease-in-out infinite}
  @keyframes bgxHop{50%{transform:translateY(-5px)}}
  .bgx-goldglow{position:absolute;border-radius:50%;background:radial-gradient(ellipse,rgba(255,220,80,.6),rgba(255,220,80,0) 70%);animation:bgxTw 2.4s ease-in-out infinite}`;
  const eggDefs = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  eggDefs.setAttribute('width', 0); eggDefs.setAttribute('height', 0); eggDefs.style.position = 'absolute';
  eggDefs.innerHTML = `<defs><clipPath id="rr-egg"><path d="${EGG}"/></clipPath></defs>`;
  (document.body ? Promise.resolve() : new Promise(r => addEventListener('DOMContentLoaded', r))).then(() => document.body.prepend(eggDefs));
  document.head.appendChild(css);

  /* ======================= public ======================= */
  function stop() {
    timers.forEach(clearTimeout); timers = [];
    anims.forEach(a => { try { a.cancel(); } catch (e) {} }); anims = [];
    if (fxEl) fxEl.innerHTML = '';
    settled = []; heights = [];
    if (bgEl) { bgEl.innerHTML = ''; bgEl.classList.remove('bgx-shift'); }
  }
  function apply(id, force) {
    fxEl = document.getElementById('fx'); bgEl = document.getElementById('bg');
    if (!fxEl || !bgEl || (id === current && !force)) return;
    stop(); current = id;
    const b = BG.find(x => x.id === id) || BG[0];
    bgEl.style.background = b.sky;
    resetPile();
    b.build();
  }
  // Rebuild after the phone turns or the window changes size, so paths fit the new screen.
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => current && apply(current, true), 400); });
  // Watch mode moves the floor, so the pile starts fresh; the scene is rebuilt to fit the new floor.
  const reflow = () => current && apply(current, true);
  // Coming back after the phone slept: start the scene fresh so nothing is left frozen mid-screen.
  document.addEventListener('visibilitychange', () => { if (!document.hidden) reflow(); });
  window.RRBG = { list: BG.map(({ build, ...rest }) => rest), apply, reflow, horizon: () => HZ() };
})();

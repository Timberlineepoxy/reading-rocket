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
  const maple = s => `<img src="decor/maple.webp" alt="" style="height:${s}px;display:block;filter:${pick(LEAF_TINTS)} drop-shadow(0 4px 4px rgba(0,0,0,.18))">`;
  // The maple picture is pinkish red (hue 337), so each tint turns it toward red, orange or yellow.
  const LEAF_TINTS = ['hue-rotate(52deg) saturate(1.3)', 'hue-rotate(26deg) saturate(1.15)', 'hue-rotate(72deg) saturate(1.5) brightness(1.2)', 'hue-rotate(44deg) saturate(1.3)',
    'hue-rotate(60deg) saturate(1.4) brightness(1.1)', 'hue-rotate(34deg) saturate(1.2)', 'hue-rotate(80deg) saturate(1.6) brightness(1.25)'];

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
  // An endless stream: each particle gets a new random look and path every time it finishes.
  function stream(n, make, layer = 'fx') {
    for (let i = 0; i < n; i++) {
      const d = box('', layer);
      const run = first => {
        const p = make(i);
        d.innerHTML = p.html;
        const a = d.animate(p.frames, { duration: p.dur, easing: p.ease || 'linear', fill: 'both' });
        if (first) a.currentTime = Math.random() * p.dur;
        a.onfinish = () => { if (d.isConnected) run(false); };
        anims.push(a);
      };
      run(true);
    }
  }
  // Something that crosses once, then is gone.
  function pass(html, frames, dur, layer = 'fx', css = '', ease = 'linear') {
    const d = box(html, layer, css);
    track(d.animate(frames, { duration: dur, easing: ease, fill: 'both' })).onfinish = () => d.remove();
  }
  function every(lo, hi, fn, first) {
    const go = (a, b) => { const id = setTimeout(() => { if (!document.hidden) fn(); go(lo, hi); }, rnd(a, b) * 1000); timers.push(id); };
    go(...(first || [lo * .3, hi * .5]));
  }
  const fall = (x, s, dur, sway = 40, spin = 360, up = false) => {
    const h = H(), frames = [];
    for (let k = 0; k <= 6; k++) {
      const t = k / 6, y = up ? h + s - t * (h + s * 2) : -s - 10 + t * (h + s * 2);
      frames.push({ transform: `translate(${x + Math.sin(t * Math.PI * 2 + x) * sway}px,${y}px) rotate(${t * spin}deg)` });
    }
    return { frames, dur };
  };
  const across = (y, w, ltr, dy = 0) => {
    const x0 = ltr ? -w - 20 : W() + 20, x1 = ltr ? W() + 20 : -w - 20, f = ltr ? 1 : -1;
    return [{ transform: `translate(${x0}px,${y}px) scaleX(${f})` }, { transform: `translate(${(x0 + x1) / 2}px,${y + dy / 2}px) scaleX(${f})` }, { transform: `translate(${x1}px,${y + dy}px) scaleX(${f})` }];
  };
  const twinkles = (n, maxTop, c, layer = 'bg') => Array.from({ length: n }, (_, i) =>
    `<span class="bgx-tw" style="left:${(i * 37 + 7) % 100}%;top:${(i * 53 + 11) % maxTop}%;width:${2 + (i % 3)}px;height:${2 + (i % 3)}px;background:${c};animation-delay:-${(i % 7) * .45}s"></span>`).join('');

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

    { id: 'meadow', e: '🌼', n: 'Flower Field', cost: 200, hdr: HDR.green, tc: '#15803D', base: '#9FDB8A', sky: 'linear-gradient(#8ED1FF,#C9ECFF 35%,#A6E08F 62%,#5DBB4F)',
      thumb: petal(16, '#FF8FB8'), build() {
        box(['blossom', 'tulip', 'sunflower', 'tulip', 'blossom', 'sunflower', 'tulip', 'blossom', 'sunflower'].map((f, i) =>
          `<img class="bgx-sway" src="decor/${f}.webp" alt="" style="position:absolute;bottom:${4 + (i % 3) * 9}px;left:${i * 11.5}%;height:${44 + (i % 3) * 10}px;animation-delay:-${i * .5}s">`).join(''), 'bg', 'inset:0;width:100%;height:100%');
        stream(26, () => { const s = rnd(16, 30); return { html: petal(s, pick(['#FF4F9A', '#FF8FB8', '#FFFFFF', '#F472B6', '#C084FC', '#FDE047', '#FB7185'])), ...fall(rnd(0, W()), s, rnd(9, 16) * 1000, rnd(30, 80), rnd(-540, 540)) }; });
        every(9, 16, () => { const w = rnd(30, 44); pass(petSVG('butterfly', w), across(rnd(120, H() * .7), w, Math.random() < .5, rnd(-120, 120)), rnd(9, 14) * 1000); }, [2, 5]);
      } },

    { id: 'sunset', e: '🌅', n: 'Sunset', cost: 350, dark: true, hdr: HDR.sunset, tc: '#9D174D', base: '#C2416B', sky: 'linear-gradient(#2E1065,#7E22CE 30%,#DB2777 62%,#FB923C 88%,#FDBA74)',
      thumb: '<svg viewBox="0 0 30 30" width="30" height="30"><circle cx="15" cy="18" r="11" fill="#FFB347"/></svg>', build() {
        box(twinkles(26, 30, '#FFF6D5'), 'bg', 'inset:0;width:100%;height:100%');
        box('<div class="bgx-sunset"></div>', 'bg', 'left:50%;top:auto;bottom:70px;transform:translateX(-50%)');
        box(`<svg viewBox="0 0 400 120" preserveAspectRatio="none" style="width:100%;height:150px;display:block"><path d="M0 70 C60 30 120 40 180 64 C240 88 300 30 400 50 L400 120 L0 120Z" fill="#5B1E54"/>
          <path d="M0 96 C80 70 150 80 220 98 C290 114 340 80 400 88 L400 120 L0 120Z" fill="#2E0F33"/></svg>`, 'bg', 'top:auto;bottom:0;width:100%');
        every(12, 22, () => pass(flock(Math.round(rnd(3, 7)), '#1a0b24'), across(rnd(110, H() * .55), 150, Math.random() < .5, rnd(-50, 50)), rnd(14, 20) * 1000));
        every(30, 50, () => { const w = rnd(40, 60), x = rnd(30, W() - 80); pass(balloon(w, '#2a0d2e', '#3d1442'),
          [{ transform: `translate(${x}px,${H() + 30}px)` }, { transform: `translate(${x + rnd(-60, 60)}px,${-w * 2}px)` }], rnd(24, 30) * 1000); }, [8, 16]);
      } },

    { id: 'ocean', e: '🦈', n: 'Under the Sea', cost: 500, dark: true, hdr: HDR.sea, tc: '#075985', base: '#0B4F8A', sky: 'linear-gradient(#1A7FC0,#0B4F8A 40%,#063661 80%,#052A4D)',
      thumb: fish(30, FISH[0]), build() {
        box(Array.from({ length: 6 }, (_, i) => `<span class="bgx-ray" style="left:${i * 18 - 6}%;animation-delay:-${i * 1.3}s"></span>`).join(''), 'bg', 'inset:0;width:100%;height:100%');
        box(`<div style="position:absolute;left:0;right:0;bottom:0;height:46px;background:linear-gradient(#D9B97A,#C29A5B)"></div>` +
          Array.from({ length: 9 }, (_, i) => `<div class="bgx-sway" style="position:absolute;bottom:26px;left:${i * 11.6 + (i % 2) * 3}%;animation-delay:-${i * .7}s">${seaweed(90 + (i % 3) * 40, i % 2 ? '#1F9D55' : '#2BBF6A')}</div>`).join(''),
          'bg', 'inset:0;width:100%;height:100%');
        stream(16, () => { const s = rnd(7, 26); return { html: `<span class="bgx-bub" style="width:${s}px;height:${s}px"></span>`, ...fall(rnd(0, W()), s, rnd(7, 13) * 1000, rnd(8, 24), 0, true) }; });
        every(6, 11, () => { const f = pick(FISH), n = Math.round(rnd(1, 6)), w = rnd(34, 54), ltr = Math.random() < .5, y = rnd(110, H() - 170);
          const school = Array.from({ length: n }, (_, k) => `<div style="position:absolute;left:${(k % 3) * w * .9}px;top:${Math.floor(k / 3) * w * .6 + (k % 2) * 8}px">${fish(w, f)}</div>`).join('');
          pass(`<div style="position:relative;width:${w * 3}px;height:${w * 1.4}px">${school}</div>`, across(y, w * 3, ltr, rnd(-40, 40)), rnd(9, 15) * 1000); }, [1, 3]);
        every(22, 38, () => { const w = Math.min(W() * .95, rnd(320, 520)); pass(shark(w), across(rnd(120, H() - w * .4 - 120), w, Math.random() < .5, rnd(-40, 40)), rnd(10, 14) * 1000); }, [6, 12]);
        every(14, 24, () => { const w = rnd(26, 40), x = rnd(20, W() - 60); pass(jelly(w, pick(['#FF8BD8', '#B794FF', '#7FE3FF'])),
          [{ transform: `translate(${x}px,${H() + 40}px)` }, { transform: `translate(${x + rnd(-40, 40)}px,${H() * .5}px)` }, { transform: `translate(${x + rnd(-60, 60)}px,${-w * 2}px)` }], rnd(18, 26) * 1000); }, [3, 8]);
      } },

    { id: 'autumn', e: '🍁', n: 'Autumn Leaves', cost: 700, hdr: HDR.amber, tc: '#C2410C', base: '#FFE7C4', sky: 'linear-gradient(#FFF3DF,#FFE2B8 55%,#F8C98E)',
      thumb: maple(26), build() {
        box(`<img src="decor/pumpkin.webp" alt="" style="position:absolute;right:6%;bottom:14px;height:58px"><img src="decor/pumpkin.webp" alt="" style="position:absolute;right:20%;bottom:10px;height:40px">
          <img src="decor/chestnut.webp" alt="" style="position:absolute;left:8%;bottom:14px;height:34px">`, 'bg', 'inset:0;width:100%;height:100%');
        stream(10, () => { const s = rnd(28, 52); return { html: maple(s), ...fall(rnd(0, W()), s, rnd(11, 18) * 1000, rnd(30, 60), rnd(-300, 300)) }; });
        every(14, 24, () => { for (let k = 0; k < 7; k++) { const s = rnd(26, 46), y = rnd(80, H() - 120);
          pass(maple(s), [{ transform: `translate(${-s - 20}px,${y}px) rotate(0)` }, { transform: `translate(${W() * .5}px,${y + rnd(-90, 90)}px) rotate(${rnd(200, 400)}deg)` },
            { transform: `translate(${W() + 40}px,${y + rnd(-60, 160)}px) rotate(${rnd(500, 800)}deg)` }], rnd(3.2, 5) * 1000 + k * 160); } }, [6, 10]);
      } },

    { id: 'snow', e: '❄️', n: 'Snow Day', cost: 900, dark: true, hdr: HDR.ice, tc: '#1E3A8A', base: '#2C4A7A', sky: 'linear-gradient(#0F1E45,#1E3A6B 40%,#3B5B92 80%,#5876A8)',
      thumb: flake(26), build() {
        box('<div class="bgx-aurora"></div>', 'bg', 'inset:0;width:100%;height:100%');
        box(`<svg viewBox="0 0 400 90" preserveAspectRatio="none" style="position:absolute;left:0;bottom:0;width:100%;height:110px"><path d="M0 40 C80 10 160 20 230 40 C300 60 350 30 400 36 L400 90 L0 90Z" fill="#E8F0FB"/><path d="M0 64 C90 46 170 56 250 70 C320 82 360 62 400 66 L400 90 L0 90Z" fill="#FFFFFF"/></svg>
          <div style="position:absolute;left:4%;bottom:52px">${pine(110)}</div><div style="position:absolute;left:19%;bottom:44px">${pine(80)}</div>
          <div style="position:absolute;right:5%;bottom:50px">${pine(120)}</div><img src="decor/snowman.webp" alt="" style="position:absolute;right:28%;bottom:26px;height:70px">`, 'bg', 'inset:0;width:100%;height:100%');
        stream(30, i => { const s = i % 5 === 0 ? rnd(26, 40) : rnd(6, 18); return { html: i % 3 ? flake(s, rnd(.75, 1)) : `<span class="bgx-dot" style="width:${s / 2}px;height:${s / 2}px"></span>`,
          ...fall(rnd(0, W()), s, rnd(8, 16) * 1000, rnd(20, 50), rnd(-200, 200)) }; });
        every(10, 18, () => { const s = rnd(170, 300), x = rnd(-60, W() - s * .6);
          pass(flake(s, .55), [{ transform: `translate(${x}px,${-s}px) rotate(0)` }, { transform: `translate(${x + rnd(-60, 60)}px,${H() + s * .2}px) rotate(${rnd(60, 140)}deg)` }], rnd(7, 10) * 1000, 'fx', 'filter:blur(1.5px)'); }, [3, 6]);
      } },

    { id: 'candy', e: '🍬', n: 'Candy Land', cost: 1200, hdr: HDR.candy, tc: '#DB2777', base: '#FFB3DE', sky: 'linear-gradient(#FF9AD5,#FFB8E2 45%,#D6A8FF)',
      thumb: gumdrop(24, '#E8304A', '#B91C3B'), build() {
        box(`<div style="position:absolute;left:3%;bottom:0">${lolly(60, '#FF4FA0', '#fff')}</div><div style="position:absolute;right:4%;bottom:0">${lolly(74, '#7C3AED', '#FFE03B')}</div>
          <div style="position:absolute;left:30%;bottom:0">${lolly(44, '#10B981', '#fff')}</div>`, 'bg', 'inset:0;width:100%;height:100%');
        const GD = [['#E8304A', '#B91C3B'], ['#22C55E', '#15803D'], ['#FACC15', '#CA8A04'], ['#A855F7', '#7E22CE'], ['#FB923C', '#C2410C'], ['#38BDF8', '#0369A1']];
        const candies = [() => { const g = pick(GD), s = rnd(32, 50); return [gumdrop(s, ...g), s]; }, () => { const s = rnd(52, 74); return [wrapped(s, pick(['#E8304A', '#3B82F6', '#22C55E', '#FACC15', '#A855F7'])), s]; },
          () => { const s = rnd(34, 48); return [mint(s), s]; }, () => { const s = rnd(30, 42); return [bean(s, pick(['#E8304A', '#FACC15', '#22C55E', '#FB923C', '#A855F7', '#111'])), s]; },
          () => { const s = rnd(24, 34); return [lolly(s, pick(['#FF4FA0', '#38BDF8', '#FACC15']), '#fff'), s * 2]; }];
        stream(18, () => { const [html, s] = pick(candies)(); return { html, ...fall(rnd(0, W()), s, rnd(8, 14) * 1000, rnd(20, 50), rnd(-420, 420)) }; });
      } },

    { id: 'jungle', e: '🌴', n: 'Jungle', cost: 1600, dark: true, hdr: HDR.jungle, tc: '#14532D', base: '#14532D', sky: 'linear-gradient(#1B7A43,#14532D 50%,#0B3D23)',
      thumb: parrot(32), build() {
        box(Array.from({ length: 7 }, (_, i) => `<div class="bgx-swing" style="position:absolute;top:-10px;left:${i * 15 + 2}%;animation-delay:-${i * .8}s">${vine(140 + (i % 3) * 70)}</div>`).join('') +
          `<div style="position:absolute;left:-14px;bottom:0">${bigLeaf(170)}</div><div style="position:absolute;right:-14px;bottom:0">${bigLeaf(190, true)}</div>
          <div style="position:absolute;left:12%;bottom:-10px">${bigLeaf(120)}</div><div style="position:absolute;right:14%;bottom:-10px">${bigLeaf(130, true)}</div>`, 'bg', 'inset:0;width:100%;height:100%');
        stream(14, () => { const x = rnd(0, W()), y = rnd(80, H() - 80);
          return { html: '<span class="bgx-fly"></span>', dur: rnd(5, 9) * 1000, ease: 'ease-in-out',
            frames: [{ transform: `translate(${x}px,${y}px)`, opacity: 0 }, { transform: `translate(${x + rnd(-50, 50)}px,${y + rnd(-50, 50)}px)`, opacity: 1, offset: .4 },
              { transform: `translate(${x + rnd(-90, 90)}px,${y + rnd(-90, 90)}px)`, opacity: 0 }] }; });
        every(14, 24, () => { const w = rnd(70, 100); pass(parrot(w), across(rnd(100, H() * .55), w, Math.random() < .5, rnd(-80, 80)), rnd(7, 10) * 1000); }, [2, 6]);
        every(16, 26, () => { const w = rnd(30, 40); pass(petSVG('butterfly', w), across(rnd(150, H() - 150), w, Math.random() < .5, rnd(-100, 100)), rnd(10, 14) * 1000); }, [8, 12]);
      } },

    { id: 'space', e: '🪐', n: 'Outer Space', cost: 2000, dark: true, hdr: HDR.space, tc: '#1E1B4B', base: '#0B0730', sky: 'radial-gradient(ellipse at 70% 20%,#3B1D7A 0%,#140A3D 45%,#05021A 100%)',
      thumb: planet(34, '#F59E0B', '#B45309', '#FDE68A'), build() {
        box(twinkles(70, 100, '#fff'), 'bg', 'inset:0;width:100%;height:100%');
        box(`<div class="bgx-float" style="position:absolute;right:6%;top:18%">${planet(130, '#F59E0B', '#B45309', '#FDE68A')}</div>
          <div class="bgx-float" style="position:absolute;left:5%;top:58%;animation-delay:-4s">${planet(70, '#EF4444', '#991B1B')}</div>
          <div class="bgx-float" style="position:absolute;left:58%;top:76%;animation-delay:-7s">${planet(50, '#38BDF8', '#0369A1')}</div>`, 'bg', 'inset:0;width:100%;height:100%');
        every(3, 7, () => { const x = rnd(W() * .2, W() * 1.1), y = rnd(60, H() * .55), len = rnd(120, 220);
          pass(`<span class="bgx-shoot" style="width:${len}px"></span>`, [{ transform: `translate(${x}px,${y}px) rotate(150deg)`, opacity: 0 }, { opacity: 1, offset: .15 },
            { transform: `translate(${x - 420}px,${y + 240}px) rotate(150deg)`, opacity: 0 }], 1300); }, [1, 3]);
        every(18, 30, () => { const w = rnd(100, 150); pass(rocket(w), across(rnd(100, H() - 160), w, Math.random() < .5, rnd(-160, 160)), rnd(7, 10) * 1000); }, [4, 8]);
        every(26, 40, () => { const w = rnd(90, 130); pass(ufo(w), across(rnd(90, H() * .5), w, Math.random() < .5, rnd(-40, 40)), rnd(14, 20) * 1000); }, [12, 18]);
        every(30, 50, () => { const w = rnd(60, 80), ltr = Math.random() < .5, y = rnd(140, H() - 200), x0 = ltr ? -w : W() + w, x1 = ltr ? W() + w : -w;
          pass(astro(w), [{ transform: `translate(${x0}px,${y}px) rotate(0)` }, { transform: `translate(${x1}px,${y + rnd(-80, 80)}px) rotate(${ltr ? 300 : -300}deg)` }], rnd(22, 30) * 1000); }, [16, 24]);
      } },

    { id: 'rainbow', e: '🌈', n: 'Rainbow', cost: 2500, hdr: HDR.rainbow, tc: '#8B5CF6', base: '#FFD6E8', sky: 'linear-gradient(120deg,#FF9A9E,#FECF8A,#FFF59D,#A8F0C6,#9AD7FF,#C7A6FF,#FF9A9E)',
      thumb: rainbow(34), build() {
        bgEl.classList.add('bgx-shift');
        stream(9, () => { const w = rnd(34, 56), x = rnd(0, W() - w); return { html: balloon(w, pick(['#EF4444', '#F59E0B', '#22C55E', '#3B82F6', '#A855F7', '#EC4899']), '#ffffff55'),
          dur: rnd(14, 22) * 1000, frames: [{ transform: `translate(${x}px,${H() + 30}px)` }, { transform: `translate(${x + rnd(-50, 50)}px,${H() * .5}px)` }, { transform: `translate(${x + rnd(-70, 70)}px,${-w * 2}px)` }] }; });
        stream(14, () => { const x = rnd(0, W()), y = rnd(80, H() - 60), s = rnd(12, 26);
          return { html: star4(s, '#fff'), dur: rnd(2.5, 4.5) * 1000, frames: [{ transform: `translate(${x}px,${y}px) scale(0)`, opacity: 0 }, { transform: `translate(${x}px,${y}px) scale(1) rotate(90deg)`, opacity: 1, offset: .5 }, { transform: `translate(${x}px,${y}px) scale(0) rotate(180deg)`, opacity: 0 }] }; });
        every(20, 32, () => { const w = Math.min(W() * .9, 480); pass(rainbow(w), [{ opacity: 0 }, { opacity: .9, offset: .25 }, { opacity: .9, offset: .7 }, { opacity: 0 }], 8000, 'bg', `left:${(W() - w) / 2}px;top:${H() * .3}px`); }, [3, 6]);
      } },

    { id: 'gold', e: '👑', n: 'Royal Gold', cost: 3500, dark: true, hdr: HDR.gold, tc: '#4C1D95', base: '#2A0F4A', sky: 'radial-gradient(ellipse at 50% 0%,#5B2A8C 0%,#2A0F4A 50%,#14062A 100%)',
      thumb: coin(26), build() {
        box(`<img src="decor/crown.webp" alt="" class="bgx-float" style="position:absolute;right:8%;top:16%;height:64px"><img src="decor/gem.webp" alt="" class="bgx-float" style="position:absolute;left:7%;top:60%;height:46px;animation-delay:-3s">
          <img src="decor/trophy.webp" alt="" style="position:absolute;right:10%;bottom:20px;height:62px">`, 'bg', 'inset:0;width:100%;height:100%');
        stream(14, () => { const s = rnd(22, 36); return { html: `<div class="bgx-spin">${coin(s)}</div>`, ...fall(rnd(0, W()), s, rnd(7, 12) * 1000, rnd(10, 30), 0) }; });
        stream(18, () => { const x = rnd(0, W()), y = rnd(80, H() - 40), s = rnd(10, 22);
          return { html: star4(s), dur: rnd(2, 4) * 1000, frames: [{ transform: `translate(${x}px,${y}px) scale(0)`, opacity: 0 }, { transform: `translate(${x}px,${y}px) scale(1) rotate(45deg)`, opacity: 1, offset: .5 }, { transform: `translate(${x}px,${y}px) scale(0) rotate(90deg)`, opacity: 0 }] }; });
      } },
  ];

  /* ======================= styles ======================= */
  const css = document.createElement('style');
  css.textContent = `
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
  @keyframes bgxShift{from{background-position:0% 50%}to{background-position:100% 50%}}`;
  document.head.appendChild(css);

  /* ======================= public ======================= */
  function stop() {
    timers.forEach(clearTimeout); timers = [];
    anims.forEach(a => { try { a.cancel(); } catch (e) {} }); anims = [];
    if (fxEl) fxEl.innerHTML = '';
    if (bgEl) { bgEl.innerHTML = ''; bgEl.classList.remove('bgx-shift'); }
  }
  function apply(id, force) {
    fxEl = document.getElementById('fx'); bgEl = document.getElementById('bg');
    if (!fxEl || !bgEl || (id === current && !force)) return;
    stop(); current = id;
    const b = BG.find(x => x.id === id) || BG[0];
    bgEl.style.background = b.sky;
    b.build();
  }
  // Rebuild after the phone turns or the window changes size, so paths fit the new screen.
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => current && apply(current, true), 400); });
  window.RRBG = { list: BG.map(({ build, ...rest }) => rest), apply };
})();

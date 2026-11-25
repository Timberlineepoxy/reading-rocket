/* Reading Rocket costumes: hats, glasses, neckwear and capes drawn in SVG and put on the rig animals.
   Where each piece goes is worked out from the animal's own drawing (top of the head, the eye, the chin,
   the top of the back), so one hat fits a bunny and a giraffe. Pieces go inside the head group, so they
   nod and bob with the animal. Everything is solid, full color. */
(() => {
  const NS = 'http://www.w3.org/2000/svg';
  const A = {};               // anchors per animal id
  // Animals whose drawing has no marked eye or head get their spots by hand: eye [x, y, r], top of head y, chin y, neck [x, y], back [x, y]
  const MANUAL = {
    greatwhite: { eye: [150, 38, 2.6], top: 28, chin: 52, neck: [128, 54], back: [100, 30], w: 34 },
    orca:       { eye: [152, 40, 2.6], top: 30, chin: 56, neck: [128, 58], back: [100, 30], w: 36 },
    spermwhale: { eye: [176, 52, 2.6], top: 22, chin: 66, neck: [150, 70], back: [110, 22], w: 46 },
    butterfly:  { eye: [35, 19.5, 1.3], top: 16, chin: 23, neck: [35, 23.5], back: [35, 30], w: 9 },
  };
  const OVR = {};             // small nudges after looking at every animal: { hat: [dx, dy, scale], face: [...], neck: [...], back: [...] }

  let box;
  function measureBox() {
    if (box && box.isConnected) return box;
    box = document.createElement('div');
    box.style.cssText = 'position:fixed;left:-2000px;top:0;width:400px;height:400px;opacity:0;pointer-events:none';
    document.body.appendChild(box);
    return box;
  }
  function anchors(id) {
    if (A[id]) return A[id];
    const R = window.RIG && RIG[id]; if (!R) return null;
    const b = measureBox();
    b.innerHTML = window.rigSVG(id, 200);
    const svg = b.firstElementChild;
    svg.removeAttribute('data-rig');            // keep the animation engine away from the measuring copy
    const head = svg.querySelector('[data-p=head]'), body = svg.querySelector('[data-p=body]') || svg;
    const host = head || body;
    const moving = (e, top) => { for (let n = e; n && n !== top; n = n.parentNode) if (n.matches('[data-spring],[data-flap],[data-beat],[data-p=lid],[data-p=pupil],[data-p=tail],[data-p=head]')) return true; return false; };
    const shapes = top => [...top.querySelectorAll('path,ellipse,circle,rect,polygon')].filter(e => {
      if (moving(e, top)) return false;
      const f = e.getAttribute('fill'); if (f === 'none') return false;
      return parseFloat(e.getAttribute('opacity') || '1') > .5;
    });
    const pt = svg.createSVGPoint();
    const tester = list => {
      const ms = list.map(e => { try { return [e, e.getCTM().inverse().multiply(host.getCTM())]; } catch (x) { return null; } }).filter(Boolean);
      return (x, y) => { for (const [e, m] of ms) { pt.x = x; pt.y = y; const q = pt.matrixTransform(m); try { if (e.isPointInFill(q)) return true; } catch (x) {} } return false; };
    };
    const man = MANUAL[id];
    let a;
    if (man) {
      a = { ex: man.eye[0], ey: man.eye[1], er: man.eye[2], top: man.top, chin: man.chin, nx: man.neck[0], ny: man.neck[1], bx: man.back[0], by: man.back[1], w: man.w, u: man.chin - man.top, host: head ? 'head' : 'body' };
    } else {
      const lid = host.querySelector('[data-p=lid]') || svg.querySelector('[data-p=lid]');
      const lids = [...host.querySelectorAll('[data-p=lid]')];
      const ex = lids.length ? lids.reduce((s, l) => s + +l.getAttribute('cx'), 0) / lids.length : +lid.getAttribute('cx');
      const ey = +lid.getAttribute('cy'), er = +lid.getAttribute('rx') / 1.2;
      const inHead = tester(shapes(host));
      let top = ey, x0 = ex - er * .6;
      while (top > ey - 160 && inHead(x0, top - .5)) top -= .5;
      let chin = ey;
      while (chin < ey + 160 && inHead(ex, chin + .5)) chin += .5;
      const yw = top + (ey - top) * .6;
      let lx = x0, rx = x0;
      while (lx > x0 - 200 && inHead(lx - .5, yw)) lx -= .5;
      while (rx < x0 + 200 && inHead(rx + .5, yw)) rx += .5;
      const u = Math.max(chin - top, er * 5);
      // neck: behind and below the eye, where the head ends
      const nx = ex - Math.max(er * 1.6, u * .35);
      let ny = ey;
      while (ny < ey + 160 && inHead(nx, ny + .5)) ny += .5;
      // back: top of the body at the middle of the animal
      const bodyShapes = shapes(body);
      const inBody = tester(bodyShapes);
      const bx = R.center ? R.center[0] : R.w / 2;
      let by = 0;
      while (by < R.h && !inBody(bx, by)) by += .5;
      a = { ex, ey, er, top, chin, nx, ny, bx, by, w: Math.max(rx - lx, u * .6), u, host: head ? 'head' : 'body' };
    }
    b.innerHTML = '';
    return A[id] = a;
  }

  /* ---------- the pieces ----------
     Hats: base centre at (0,0), about 100 wide, built upward (negative y). The animal faces right.
     Face: centred on the eye, lens radius 10.  Neck: centred on the neck point, about 100 = head size.
     Back: drawn in the animal's own units, given the anchors. */
  const L = 'stroke="#2A1E14" stroke-width="2.4" stroke-linejoin="round"';
  const L1 = 'stroke="#2A1E14" stroke-width="1.6" stroke-linejoin="round"';
  const star = (x, y, r, c, rot = 0) => { let d = ''; for (let i = 0; i < 10; i++) { const a = (i * 36 + rot - 90) * Math.PI / 180, rr = i % 2 ? r * .45 : r; d += `${i ? 'L' : 'M'}${(x + rr * Math.cos(a)).toFixed(1)} ${(y + rr * Math.sin(a)).toFixed(1)}`; } return `<path d="${d}Z" fill="${c}" ${L1}/>`; };
  const heart = (x, y, s, c) => `<path transform="translate(${x} ${y}) scale(${s})" d="M0 6 C-10 -2 -10 -10 -4 -10 C-1 -10 0 -7 0 -6 C0 -7 1 -10 4 -10 C10 -10 10 -2 0 6Z" fill="${c}" ${L1}/>`;
  const flower = (x, y, r, c, mid = '#FFD23F') => { let s = ''; for (let i = 0; i < 5; i++) { const a = i * 72 * Math.PI / 180; s += `<circle cx="${(x + r * .7 * Math.cos(a)).toFixed(1)}" cy="${(y + r * .7 * Math.sin(a)).toFixed(1)}" r="${(r * .55).toFixed(1)}" fill="${c}" ${L1}/>`; } return s + `<circle cx="${x}" cy="${y}" r="${(r * .4).toFixed(1)}" fill="${mid}" ${L1}/>`; };
  const shamrock = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M0 0 L2 12" stroke="#166534" stroke-width="2.4"/>${[0, 120, 240].map(a => `<circle cx="${(7 * Math.cos((a - 90) * Math.PI / 180)).toFixed(1)}" cy="${(7 * Math.sin((a - 90) * Math.PI / 180)).toFixed(1)}" r="6" fill="#22C55E" ${L1}/>`).join('')}</g>`;
  const shine = (d, o = .35) => `<path d="${d}" fill="#fff" opacity="${o}"/>`;

  const H = {
    cone: (c1, c2, pom = '#fff', stripes = true) => `<path d="M-40 0 L-4 -112 C-2 -116 2 -116 4 -112 L40 0 Z" fill="${c1}" ${L}/>
      ${stripes ? `<path d="M-30 -32 L30 -32 L24 -50 L-24 -50Z M-17 -72 L17 -72 L11 -88 L-11 -88Z" fill="${c2}"/>` : ''}
      <path d="M-40 0 L-4 -112 C-2 -116 2 -116 4 -112 L40 0 Z" fill="none" ${L}/>
      ${shine('M-26 -10 L-6 -96 L-12 -40Z', .25)}<circle cx="0" cy="-116" r="11" fill="${pom}" ${L}/>`,
    top: (c, band, deco = '') => `<ellipse cx="0" cy="-4" rx="58" ry="11" fill="${c}" ${L}/>
      <path d="M-36 -6 L-38 -92 C-20 -100 20 -100 38 -92 L36 -6 C20 0 -20 0 -36 -6Z" fill="${c}" ${L}/>
      <path d="M-36 -10 L-37 -32 C-20 -26 20 -26 37 -32 L36 -10 C20 -4 -20 -4 -36 -10Z" fill="${band}" ${L1}/>
      <ellipse cx="0" cy="-93" rx="38" ry="8" fill="${c}" ${L}/>${shine('M-30 -38 L-31 -86 L-22 -88 L-21 -36Z', .2)}${deco}`,
    brim: (crown, brim, band, wide = 72, dent = true) => `<path d="M-${wide} -4 C-${wide - 10} 8 ${wide - 10} 8 ${wide} -4 C${wide - 16} -18 -${wide - 16} -18 -${wide} -4Z" fill="${brim}" ${L}/>
      <path d="M-38 -8 C-40 -50 -30 -74 ${dent ? '-10 -70 C-4 -62 4 -62 10 -70' : '0 -76'} C30 -74 40 -50 38 -8 C20 -2 -20 -2 -38 -8Z" fill="${crown}" ${L}/>
      <path d="M-38 -10 L-39 -24 C-20 -18 20 -18 39 -24 L38 -10 C20 -4 -20 -4 -38 -10Z" fill="${band}" ${L1}/>${shine('M-28 -28 C-30 -48 -24 -60 -14 -64 C-20 -50 -22 -40 -20 -28Z', .22)}`,
    beanie: (c, cuff, pom, stripe) => `<path d="M-46 -6 C-48 -70 48 -70 46 -6Z" fill="${c}" ${L}/>
      ${stripe ? `<path d="M-44 -30 C-20 -38 20 -38 44 -30 L42 -42 C20 -50 -20 -50 -42 -42Z" fill="${stripe}"/>` : ''}
      <path d="M-50 -4 C-50 -20 50 -20 50 -4 L50 8 C20 2 -20 2 -50 8Z" fill="${cuff}" ${L}/>
      ${pom ? `<circle cx="0" cy="-62" r="13" fill="${pom}" ${L}/>` : ''}${shine('M-30 -20 C-32 -40 -20 -54 -8 -56 C-18 -44 -22 -32 -22 -20Z', .2)}`,
    cap: (c, bill, logo = '') => `<path d="M-44 0 C-46 -58 44 -58 44 0Z" fill="${c}" ${L}/>
      <path d="M38 -6 C62 -10 84 -4 92 6 C72 8 52 6 38 4Z" fill="${bill}" ${L}/><circle cx="0" cy="-50" r="5" fill="${bill}" ${L1}/>${logo}${shine('M-28 -12 C-30 -34 -18 -44 -6 -46 C-14 -36 -18 -26 -18 -12Z', .22)}`,
    crown: (c = '#FFC93C', gem = '#E11D48', gem2 = '#3B82F6') => `<path d="M-42 0 L-46 -56 L-24 -30 L0 -66 L24 -30 L46 -56 L42 0 C20 6 -20 6 -42 0Z" fill="${c}" ${L}/>
      <path d="M-42 -2 L-43 -14 C-20 -8 20 -8 43 -14 L42 -2 C20 4 -20 4 -42 -2Z" fill="#E0A21A" ${L1}/>
      <circle cx="-46" cy="-58" r="5" fill="${c}" ${L1}/><circle cx="0" cy="-68" r="6" fill="${c}" ${L1}/><circle cx="46" cy="-58" r="5" fill="${c}" ${L1}/>
      <circle cx="0" cy="-26" r="7" fill="${gem}" ${L1}/><circle cx="-24" cy="-18" r="5" fill="${gem2}" ${L1}/><circle cx="24" cy="-18" r="5" fill="${gem2}" ${L1}/>${shine('M-34 -10 L-37 -40 L-30 -32 L-28 -10Z', .4)}`,
    band: (c, topper = '') => `<path d="M-48 10 C-46 -26 46 -26 48 10 L42 12 C40 -16 -40 -16 -42 12Z" fill="${c}" ${L}/>${topper}`,
    witch: (c, band) => `<path d="M-70 -2 C-50 10 50 10 70 -2 C50 -14 -50 -14 -70 -2Z" fill="${c}" ${L}/>
      <path d="M-34 -6 C-30 -50 -10 -90 -30 -126 C10 -110 24 -60 34 -6 C14 -2 -14 -2 -34 -6Z" fill="${c}" ${L}/>
      <path d="M-34 -8 L-33 -22 C-14 -18 14 -18 31 -22 L34 -8 C14 -4 -14 -4 -34 -8Z" fill="${band}" ${L1}/><rect x="-8" y="-24" width="16" height="16" rx="2" fill="none" stroke="#FFC93C" stroke-width="3.5"/>`,
    santa: (c = '#DC2626', fur = '#fff') => `<path d="M-44 -6 C-40 -70 10 -96 50 -70 C66 -60 74 -40 70 -24 C60 -46 40 -60 20 -56 C36 -36 40 -20 42 -6Z" fill="${c}" ${L}/>
      <path d="M-50 -2 C-50 -20 48 -20 48 -2 L48 10 C20 4 -20 4 -50 10Z" fill="${fur}" ${L}/><circle cx="70" cy="-22" r="13" fill="${fur}" ${L}/>${shine('M-30 -18 C-24 -52 0 -72 24 -76 C0 -60 -14 -40 -20 -18Z', .22)}`,
    elf: (c = '#16A34A', cuff = '#DC2626') => `<path d="M-40 -6 C-30 -60 20 -100 76 -96 C50 -80 30 -50 40 -6Z" fill="${c}" ${L}/>
      <path d="M-46 -2 L-42 -18 L-30 -8 L-18 -20 L-6 -8 L6 -20 L18 -8 L30 -20 L40 -6 L46 -16 L46 6 C20 0 -20 0 -46 6Z" fill="${cuff}" ${L}/><circle cx="78" cy="-96" r="9" fill="#FFC93C" ${L}/>`,
    grad: () => `<path d="M-38 -2 C-40 -30 40 -30 38 -2 C20 4 -20 4 -38 -2Z" fill="#1F2937" ${L}/>
      <path d="M-66 -34 L0 -56 L66 -34 L0 -12Z" fill="#111827" ${L}/><circle cx="0" cy="-34" r="5" fill="#FFC93C" ${L1}/>
      <path d="M0 -34 C24 -30 44 -24 52 -10 L54 14" stroke="#FFC93C" stroke-width="4" fill="none" stroke-linecap="round"/><rect x="47" y="10" width="14" height="18" rx="3" fill="#FFC93C" ${L1}/>`,
    propeller: () => `${'' }<path d="M-46 -6 C-48 -70 48 -70 46 -6Z" fill="#EF4444" ${L}/><path d="M-46 -6 C-46 -40 -16 -60 0 -60 L0 -6Z" fill="#3B82F6"/><path d="M0 -60 C16 -60 46 -40 46 -6 L24 -6 C24 -30 12 -50 0 -60Z" fill="#FFD23F"/>
      <path d="M-46 -6 C-48 -70 48 -70 46 -6Z" fill="none" ${L}/><path d="M-50 -4 C-20 -12 20 -12 50 -4 L50 6 C20 0 -20 0 -50 6Z" fill="#22C55E" ${L}/>
      <path d="M0 -60 L0 -76" stroke="#2A1E14" stroke-width="4"/><g class="cos-spin" style="transform-origin:0px -78px"><path d="M0 -78 C-20 -90 -44 -86 -44 -78 C-44 -70 -20 -66 0 -78 C20 -90 44 -86 44 -78 C44 -70 20 -66 0 -78Z" fill="#A855F7" ${L1}/></g><circle cx="0" cy="-78" r="5" fill="#FFD23F" ${L1}/>`,
    explorer: () => `<path d="M-66 -2 C-50 12 50 12 66 -2 C50 -16 -50 -16 -66 -2Z" fill="#C9B27C" ${L}/><path d="M-40 -6 C-42 -64 42 -64 40 -6 C20 0 -20 0 -40 -6Z" fill="#E2CF98" ${L}/>
      <path d="M-40 -8 L-41 -20 C-20 -15 20 -15 41 -20 L40 -8 C20 -3 -20 -3 -40 -8Z" fill="#6B4F2A" ${L1}/><path d="M0 -58 L0 -64" stroke="#6B4F2A" stroke-width="5" stroke-linecap="round"/>${shine('M-28 -18 C-30 -40 -20 -52 -8 -56 C-16 -44 -20 -32 -20 -18Z', .25)}`,
    captain: () => `<path d="M30 -6 C54 -8 74 -2 78 8 C60 8 42 6 30 4Z" fill="#111827" ${L}/><path d="M-42 -2 C-44 -30 40 -32 40 -4 C20 2 -20 2 -42 -2Z" fill="#1F2937" ${L}/>
      <path d="M-50 -30 C-50 -58 50 -62 52 -32 C30 -24 -30 -22 -50 -30Z" fill="#fff" ${L}/><path d="M-6 -22 L6 -22 M0 -30 L0 -14 M-7 -16 C-4 -11 4 -11 7 -16" stroke="#FFC93C" stroke-width="3" fill="none" stroke-linecap="round"/>`,
    pirate: () => `<path d="M-72 -6 C-50 -14 -40 -60 0 -62 C40 -60 50 -14 72 -6 C40 -18 30 6 0 4 C-30 6 -40 -18 -72 -6Z" fill="#1F2937" ${L}/>
      <path d="M-60 -10 C-30 -14 30 -14 60 -10" stroke="#FFC93C" stroke-width="3.5" fill="none"/><circle cx="0" cy="-34" r="10" fill="#fff" ${L1}/><circle cx="-3.5" cy="-35" r="2.4" fill="#1F2937"/><circle cx="3.5" cy="-35" r="2.4" fill="#1F2937"/>
      <path d="M-14 -16 L14 -26 M-14 -26 L14 -16" stroke="#fff" stroke-width="3.5" stroke-linecap="round"/>`,
    ranger: (c = '#4D7C0F', band = '#7C2D12') => H.brim(c, c, band, 70, true) + `<path d="M-6 -66 L0 -46 L6 -66" stroke="#2A1E14" stroke-width="2" fill="none"/>`,
    nightcap: (c = '#3B5BDB', c2 = '#FFD23F') => `<path d="M-46 -4 C-44 -60 30 -80 66 -46 C76 -36 78 -20 72 -10 C64 -30 46 -40 30 -40 C40 -26 44 -14 44 -4Z" fill="${c}" ${L}/>${star(-14, -36, 7, c2)}${star(18, -54, 6, c2, 20)}
      <path d="M-50 -2 C-20 -10 20 -10 48 -2 L48 8 C20 2 -20 2 -50 8Z" fill="#fff" ${L}/><circle cx="72" cy="-8" r="11" fill="#fff" ${L}/>`,
    pumpkin: () => `<path d="M-50 -6 C-56 -60 -20 -72 0 -64 C20 -72 56 -60 50 -6 C30 2 -30 2 -50 -6Z" fill="#F97316" ${L}/><path d="M-20 -66 C-28 -46 -28 -20 -22 -2 M20 -66 C28 -46 28 -20 22 -2 M0 -64 L0 -2" stroke="#C2410C" stroke-width="2.4" fill="none"/>
      <path d="M-4 -64 C-6 -76 -2 -84 6 -86 L8 -80 C2 -78 2 -72 4 -64Z" fill="#4D7C0F" ${L1}/><path d="M4 -78 C14 -86 26 -84 28 -76 C20 -76 12 -76 4 -74Z" fill="#22C55E" ${L1}/>`,
    turkey: () => `${[-60, -30, 0, 30, 60].map((a, i) => `<ellipse cx="0" cy="-56" rx="11" ry="34" transform="rotate(${a} 0 -14)" fill="${['#DC2626', '#F97316', '#FFC93C', '#F97316', '#DC2626'][i]}" ${L1}/>`).join('')}
      <path d="M-34 -4 C-36 -48 34 -48 34 -4 C16 2 -16 2 -34 -4Z" fill="#92400E" ${L}/><circle cx="20" cy="-50" r="13" fill="#A16207" ${L}/><circle cx="24" cy="-53" r="2.6" fill="#1F2937"/>
      <path d="M31 -50 L42 -46 L31 -43Z" fill="#FFC93C" ${L1}/><path d="M30 -42 C34 -36 32 -30 28 -30 C26 -34 27 -38 30 -42Z" fill="#DC2626" ${L1}/>`,
    pilgrim: () => `<ellipse cx="0" cy="-4" rx="60" ry="11" fill="#1F2937" ${L}/><path d="M-32 -6 L-26 -82 C-10 -88 10 -88 26 -82 L32 -6 C16 0 -16 0 -32 -6Z" fill="#1F2937" ${L}/>
      <path d="M-32 -10 L-31 -28 C-14 -23 14 -23 31 -28 L32 -10 C14 -5 -14 -5 -32 -10Z" fill="#78350F" ${L1}/><rect x="-10" y="-28" width="20" height="18" rx="2" fill="none" stroke="#FFC93C" stroke-width="4"/>`,
    egg: () => `<path d="M-44 -4 C-46 -76 46 -76 44 -4 L34 -14 L24 -2 L12 -14 L0 -2 L-12 -14 L-24 -2 L-34 -14Z" fill="#A5F3FC" ${L}/><path d="M-40 -34 C-20 -26 20 -26 40 -34 L38 -42 C20 -36 -20 -36 -38 -42Z" fill="#F472B6"/>
      <circle cx="-16" cy="-52" r="5" fill="#FFD23F"/><circle cx="14" cy="-56" r="5" fill="#A855F7"/>`,
    sunhat: (c = '#F4D58D', ribbon = '#EC4899') => H.brim(c, c, ribbon, 84, false) + flower(28, -16, 9, '#fff', '#FFD23F'),
    rainhat: () => `<path d="M-68 4 C-50 -8 50 -8 72 6 C50 18 -50 18 -68 4Z" fill="#FACC15" ${L}/><path d="M-38 -2 C-40 -56 40 -60 40 -2 C20 4 -20 4 -38 -2Z" fill="#FDE047" ${L}/>${shine('M-26 -10 C-28 -34 -18 -48 -6 -50 C-14 -40 -18 -26 -18 -10Z', .3)}`,
    acorn: () => `<path d="M-48 -2 C-50 -50 50 -50 48 -2 C24 6 -24 6 -48 -2Z" fill="#92400E" ${L}/><path d="M-36 -14 L36 -14 M-40 -26 L40 -26 M-28 -38 L28 -38 M-30 -4 L-14 -40 M0 -2 L0 -44 M30 -4 L14 -40" stroke="#6B3410" stroke-width="2"/>
      <path d="M-3 -42 C-4 -56 4 -62 10 -60" stroke="#6B3410" stroke-width="6" fill="none" stroke-linecap="round"/>`,
    earmuffs: (c = '#EC4899', band = '#6366F1') => `<path d="M-44 14 C-48 -46 48 -46 44 14" stroke="#2A1E14" stroke-width="10" fill="none" stroke-linecap="round"/><path d="M-44 14 C-48 -46 48 -46 44 14" stroke="${band}" stroke-width="6" fill="none" stroke-linecap="round"/>
      <circle cx="-44" cy="16" r="17" fill="${c}" ${L}/><circle cx="44" cy="16" r="17" fill="${c}" ${L}/>${shine('M-52 8 C-50 2 -44 0 -40 2 C-46 4 -48 8 -48 12Z', .4)}`,
    party: (c1 = '#A855F7', c2 = '#FFD23F') => H.cone(c1, c2, '#22D3EE'),
  };
  // headband toppers
  H.hearts = () => H.band('#EC4899', heart(-24, -26, 1.5, '#E11D48') + heart(4, -34, 1.9, '#F43F5E') + heart(30, -24, 1.4, '#FB7185'));
  H.bunnyears = () => `<path d="M-26 -10 C-44 -60 -36 -100 -20 -104 C-6 -96 -8 -56 -12 -14Z" fill="#fff" ${L}/><path d="M-22 -18 C-32 -56 -28 -86 -21 -92 C-14 -84 -14 -54 -16 -20Z" fill="#F9A8D4"/>
      <path d="M8 -14 C2 -64 16 -100 32 -100 C44 -88 30 -52 20 -10Z" fill="#fff" ${L}/><path d="M12 -20 C10 -58 18 -86 28 -90 C34 -80 26 -52 18 -22Z" fill="#F9A8D4"/>` + H.band('#A855F7', flower(-2, -22, 10, '#FDE047', '#F97316'));
  H.shamrocks = () => H.band('#16A34A', shamrock(-24, -30, 1.1) + shamrock(4, -40, 1.4) + shamrock(30, -28, 1.05));
  H.flowers = () => H.band('#65A30D', flower(-34, -10, 10, '#F472B6') + flower(-12, -22, 11, '#FDE047', '#F97316') + flower(12, -24, 11, '#A78BFA') + flower(34, -12, 10, '#FB7185'));
  H.fireworks = () => H.band('#1D4ED8', [[-24, -34, '#EF4444'], [4, -46, '#fff'], [30, -32, '#3B82F6']].map(([x, y, c]) => `<path d="M${x} ${y + 22} L${x} ${y}" stroke="#2A1E14" stroke-width="2"/>${[0, 45, 90, 135, 180, 225, 270, 315].map(a => `<path d="M${x} ${y} l${(10 * Math.cos(a * Math.PI / 180)).toFixed(1)} ${(10 * Math.sin(a * Math.PI / 180)).toFixed(1)}" stroke="${c}" stroke-width="3.4" stroke-linecap="round"/>`).join('')}<circle cx="${x}" cy="${y}" r="3.5" fill="#FFD23F"/>`).join(''));
  H.antlers = () => `<path d="M-18 -10 C-24 -40 -40 -50 -50 -70 M-30 -40 L-48 -40 M-40 -58 L-30 -76 M18 -10 C24 -40 40 -50 50 -70 M30 -40 L48 -40 M40 -58 L30 -76" stroke="#2A1E14" stroke-width="10" fill="none" stroke-linecap="round"/>
      <path d="M-18 -10 C-24 -40 -40 -50 -50 -70 M-30 -40 L-48 -40 M-40 -58 L-30 -76 M18 -10 C24 -40 40 -50 50 -70 M30 -40 L48 -40 M40 -58 L30 -76" stroke="#A16207" stroke-width="6" fill="none" stroke-linecap="round"/>` + H.band('#DC2626', '<circle cx="0" cy="-18" r="7" fill="#FFD23F" stroke="#2A1E14" stroke-width="1.6"/>');
  H.usa = () => H.top('#fff', '#1D4ED8', `<path d="M-37 -40 L37 -40 M-38 -56 L38 -56 M-38 -72 L38 -72 M-38 -86 L38 -86" stroke="#DC2626" stroke-width="7"/>${star(-18, -21, 6, '#fff')}${star(0, -21, 6, '#fff')}${star(18, -21, 6, '#fff')}`);
  H.leprechaun = () => H.top('#16A34A', '#1F2937', `<rect x="-11" y="-30" width="22" height="20" rx="2" fill="none" stroke="#FFC93C" stroke-width="4"/>${shamrock(26, -60, 1.1)}`);
  H.year = (y, c = '#111827', band = '#FFC93C') => H.top(c, band, `<text x="0" y="-48" font-family="Fredoka,Nunito,sans-serif" font-weight="700" font-size="27" text-anchor="middle" fill="#FFD23F" stroke="#7A5200" stroke-width="1.2" paint-order="stroke">${y}</text>${star(-24, -80, 6, '#FFD23F')}${star(24, -80, 6, '#FFD23F', 20)}${star(-22, -20, 5, '#F472B6')}${star(0, -20, 5, '#fff')}${star(22, -20, 5, '#22D3EE')}`);

  const F = {
    glasses: (frame = '#7C2D12') => `<circle r="11" fill="#E0F2FE" opacity=".35"/><circle r="11" fill="none" stroke="${frame}" stroke-width="3.2"/><path d="M-11 -2 L-34 -6" stroke="${frame}" stroke-width="3" stroke-linecap="round"/><path d="M11 -2 L18 -3" stroke="${frame}" stroke-width="3" stroke-linecap="round"/>`,
    shades: (lens = '#111827', frame = '#111827') => `<path d="M-12 -8 L12 -8 C13 4 8 10 0 10 C-8 10 -13 4 -12 -8Z" fill="${lens}" stroke="${frame}" stroke-width="2.6" stroke-linejoin="round"/><path d="M-7 -5 L-2 -5 L-6 3Z" fill="#fff" opacity=".5"/><path d="M-12 -7 L-34 -8" stroke="${frame}" stroke-width="3" stroke-linecap="round"/><path d="M12 -7 L19 -7" stroke="${frame}" stroke-width="3" stroke-linecap="round"/>`,
    stars: () => star(0, 0, 15, '#EC4899').replace('fill="#EC4899"', 'fill="#EC4899"') + `<circle r="6.5" fill="#FDF2F8"/><path d="M-12 -4 L-34 -8" stroke="#EC4899" stroke-width="3" stroke-linecap="round"/>`,
    hearts: () => heart(0, 2, 1.55, '#E11D48') + `<path d="M-13 -4 L-34 -8" stroke="#E11D48" stroke-width="3" stroke-linecap="round"/>`,
    patch: () => `<path d="M-48 -14 C-20 -20 10 -16 30 -10" stroke="#111827" stroke-width="2.6" fill="none"/><ellipse rx="12" ry="11" fill="#111827"/><ellipse cx="-3" cy="-4" rx="3" ry="2" fill="#fff" opacity=".2"/>`,
    monocle: () => `<circle r="11" fill="#E0F2FE" opacity=".3"/><circle r="11" fill="none" stroke="#2A1E14" stroke-width="5.6"/><circle r="11" fill="none" stroke="#FFC93C" stroke-width="3.4"/><path d="M-6 9 C-10 20 -16 28 -24 32" stroke="#E0A21A" stroke-width="1.8" fill="none" stroke-dasharray="2 2"/>`,
    mask: (c = '#DC2626') => `<path d="M-40 -12 C-20 -16 10 -14 24 -10 C26 0 24 8 18 10 C4 12 -20 10 -40 8Z" fill="${c}" stroke="#2A1E14" stroke-width="2"/><ellipse rx="9" ry="8" fill="#fff"/><path d="M-40 -6 L-52 -14 M-40 2 L-54 4" stroke="${c}" stroke-width="4" stroke-linecap="round"/>`,
    goggles: () => `<path d="M-50 -4 L-12 -4" stroke="#7C2D12" stroke-width="7"/><circle r="13" fill="#7DD3FC" stroke="#78350F" stroke-width="5"/><path d="M-6 -6 L0 -8 L-4 0Z" fill="#fff" opacity=".7"/>`,
  };
  const N = {
    bowtie: (c = '#DC2626', dot = '') => `<path d="M0 0 L-26 -16 C-30 -6 -30 6 -26 16Z" fill="${c}" ${L}/><path d="M0 0 L26 -16 C30 -6 30 6 26 16Z" fill="${c}" ${L}/>${dot}<rect x="-7" y="-8" width="14" height="16" rx="4" fill="${c}" ${L}/>${shine('M-22 -9 L-8 -2 L-22 2Z', .3)}`,
    scarf: (c = '#2563EB', c2 = '#fff') => `<g transform="scale(1.1)"><path d="M-30 -10 C-10 -2 20 -2 40 -12 L44 4 C20 16 -10 16 -32 6Z" fill="${c}" ${L}/><path d="M-12 4 C-16 20 -20 36 -26 50 L-8 54 C-4 38 0 22 2 6Z" fill="${c}" ${L}/>
      <path d="M-15 18 L1 20 M-19 32 L-3 35" stroke="${c2}" stroke-width="5"/><path d="M-26 50 L-29 60 M-20 52 L-22 62 M-14 53 L-15 63" stroke="${c}" stroke-width="3" stroke-linecap="round"/><path d="M0 -4 L4 10 M20 -6 L24 8" stroke="${c2}" stroke-width="5"/></g>`,
    medal: () => `<g transform="scale(1.35)"><path d="M-14 -10 L0 20 L14 -10" stroke="#2563EB" stroke-width="9" fill="none" stroke-linejoin="round"/><path d="M-14 -10 L0 20" stroke="#DC2626" stroke-width="4" fill="none"/><circle cx="0" cy="30" r="15" fill="#FFC93C" ${L}/>${star(0, 30, 9, '#F59E0B')}</g>`,
    bandana: (c = '#DC2626') => `<path d="M-34 -8 C-10 0 20 0 38 -10 L4 34Z" fill="${c}" ${L}/><circle cx="-6" cy="6" r="2.6" fill="#fff"/><circle cx="8" cy="4" r="2.6" fill="#fff"/><circle cx="2" cy="16" r="2.6" fill="#fff"/><circle cx="18" cy="-2" r="2.2" fill="#fff"/>`,
    lei: () => '<g transform="scale(1.3)">' + [...Array(9)].map((_, i) => { const t = -0.2 + i / 8 * 1.4, x = -30 + i * 8, y = 2 + Math.sin(t * Math.PI / 1.2) * 14; return flower(x, y, 7, ['#F472B6', '#FDE047', '#FB923C', '#A78BFA'][i % 4]); }).join('') + '</g>',
    bell: () => `<path d="M-32 -6 C-10 4 20 4 40 -8 L40 0 C20 12 -10 12 -32 2Z" fill="#DC2626" ${L1}/><circle cx="4" cy="14" r="10" fill="#FFC93C" ${L}/><path d="M-2 14 L10 14" stroke="#92400E" stroke-width="2.4"/><circle cx="4" cy="19" r="2" fill="#92400E"/>`,
    leafscarf: () => N.scarf('#C2410C', '#FBBF24') + `<g transform="scale(1.1)"><path d="M24 0 C30 -8 40 -8 44 0 C40 8 30 8 24 0Z" fill="#DC2626" ${L1}/><path d="M-26 46 C-30 40 -26 32 -18 34 C-18 42 -20 46 -26 46Z" fill="#F59E0B" ${L1}/></g>`,
  };
  // capes and backpacks are drawn from the neck to the middle of the back
  const B = {
    cape: (c = '#DC2626', fold = '#991B1B', emblem = '#FFD23F') => a => {
      // a hero cape fluttering out behind, clasped at the neck
      const { nx, ny, bx, by, u } = a, k = u / 50, f = n => n.toFixed(1);
      const x1 = nx + 2 * k, y1 = ny - 6 * k, top = Math.min(y1, by) - 9 * k, xt = x1 - Math.max(56 * k, (x1 - bx) * 1.25), yb = by + 9 * k;
      const d = `M${f(x1)} ${f(y1)} C${f(x1 - 16 * k)} ${f(top - 2 * k)} ${f(xt + 22 * k)} ${f(top - 4 * k)} ${f(xt)} ${f(top)}
        Q${f(xt + 6 * k)} ${f(top + 6 * k)} ${f(xt - 2 * k)} ${f(top + 11 * k)} Q${f(xt + 6 * k)} ${f(top + 15 * k)} ${f(xt + 1 * k)} ${f(yb)}
        C${f(xt + 20 * k)} ${f(yb + 3 * k)} ${f(x1 - 20 * k)} ${f(y1 + 16 * k)} ${f(x1 - 3 * k)} ${f(y1 + 8 * k)} Z`;
      return `<path d="${d}" fill="${c}" stroke="#2A1E14" stroke-width="${f(1.3 * k)}" stroke-linejoin="round"/>
        <path d="M${f(x1 - 10 * k)} ${f(y1 + 2 * k)} C${f(x1 - 24 * k)} ${f(top + 6 * k)} ${f(xt + 18 * k)} ${f(top + 6 * k)} ${f(xt + 6 * k)} ${f(top + 8 * k)}
          M${f(x1 - 14 * k)} ${f(y1 + 9 * k)} C${f(x1 - 28 * k)} ${f(yb - 2 * k)} ${f(xt + 18 * k)} ${f(yb - 2 * k)} ${f(xt + 6 * k)} ${f(yb - 4 * k)}" stroke="${fold}" stroke-width="${f(1.5 * k)}" fill="none" stroke-linecap="round" opacity=".75"/>
        ${emblem ? star(xt + 24 * k, (top + yb) / 2, 6 * k, emblem).replace('stroke-width="1.6"', `stroke-width="${f(.9 * k)}"`) : ''}
        <circle cx="${f(x1)}" cy="${f(y1 + 1.5 * k)}" r="${f(3 * k)}" fill="#FFD23F" stroke="#2A1E14" stroke-width="${f(k)}"/>`;
    },
    backpack: (c = '#2563EB', flap = '#1E40AF') => a => {
      const { bx, by, u } = a, k = u / 34, x = bx - 2 * k, y = by + 9 * k;
      return `<g transform="translate(${x} ${y}) scale(${k})"><rect x="-14" y="-22" width="28" height="28" rx="7" fill="${c}" stroke="#2A1E14" stroke-width="1.6"/>
        <path d="M-14 -12 C-14 -24 14 -24 14 -12 L14 -6 L-14 -6Z" fill="${flap}" stroke="#2A1E14" stroke-width="1.6"/><rect x="-4" y="-9" width="8" height="6" rx="1.5" fill="#FFD23F" stroke="#2A1E14" stroke-width="1"/>
        <rect x="-9" y="-2" width="18" height="6" rx="1" fill="#fff" stroke="#2A1E14" stroke-width="1"/><path d="M-6 1 L6 1" stroke="#DC2626" stroke-width="1.4"/>
        <path d="M-12 6 C-14 14 -10 20 -6 22 M12 6 C14 14 10 20 6 22" stroke="#2A1E14" stroke-width="3" fill="none" stroke-linecap="round"/></g>`;
    },
  };

  window.RRCOS = { anchors, H, F, N, B, A, OVR, MANUAL };

  /* ---------- putting a costume on ----------
     A costume is { parts: { hat: svgText, face: svgText, neck: svgText, back: fn(anchors) } }. */
  function partSVG(id, a, slot, art, tilt = 0) {
    const o = (OVR[id] && OVR[id][slot]) || [0, 0, 1];
    if (slot === 'hat') {
      const s = Math.min(a.w * 1.05, a.u * 1.25) / 100 * o[2], hx = a.ex - a.er * .6 + o[0], hy = a.top + a.u * .1 + o[1];
      return `<g class="cos" transform="translate(${hx.toFixed(2)} ${hy.toFixed(2)}) rotate(${-6 + tilt}) scale(${s.toFixed(4)})">${art}</g>`;
    }
    if (slot === 'face') {
      const s = Math.max(a.er * 1.7, a.u * .13) / 10 * o[2];
      return `<g class="cos" transform="translate(${(a.ex + o[0]).toFixed(2)} ${(a.ey + o[1]).toFixed(2)}) scale(${s.toFixed(4)})">${art}</g>`;
    }
    if (slot === 'neck') {
      const s = a.u * 1.15 / 100 * o[2];
      return `<g class="cos" transform="translate(${(a.nx + o[0]).toFixed(2)} ${(a.ny + o[1]).toFixed(2)}) scale(${s.toFixed(4)})">${art}</g>`;
    }
    if (slot === 'back') return `<g class="cos" transform="translate(${o[0]} ${o[1]})">${art(a)}</g>`;
    return '';
  }
  function dress(svg) {
    const id = svg.getAttribute('data-rig') || svg.dataset.dress, list = (svg.dataset.cos || '').split(',').filter(Boolean);
    svg.querySelectorAll('.cos').forEach(e => e.remove());
    if (!list.length || !window.RRCOS.find) return;
    const a = anchors(id); if (!a) return;
    const head = svg.querySelector('[data-p=head]'), body = svg.querySelector('[data-p=body]') || svg;
    const host = head || body;
    const order = ['back', 'neck', 'hat', 'face'];
    const parts = {};
    for (const cid of list) { const c = window.RRCOS.find(cid); if (c) Object.assign(parts, c.parts); }
    for (const slot of order) {
      const art = parts[slot]; if (!art) continue;
      const g = partSVG(id, a, slot, art);
      if (slot === 'back') {
        // behind the head, on top of the body
        const tmp = document.createElementNS(NS, 'g'); tmp.innerHTML = g;
        const node = tmp.firstElementChild;
        if (head && head.parentNode === body) body.insertBefore(node, head); else body.appendChild(node);
      } else host.insertAdjacentHTML('beforeend', g);
    }
  }
  window.RRCOS.dress = dress;
  const scan = root => { if (root.matches?.('svg[data-cos]')) dress(root); root.querySelectorAll?.('svg[data-cos]').forEach(dress); };
  new MutationObserver(ms => { for (const m of ms) m.addedNodes.forEach(n => n.nodeType === 1 && scan(n)); })
    .observe(document.documentElement, { childList: true, subtree: true });
})();

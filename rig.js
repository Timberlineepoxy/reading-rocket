/* Reading Rocket "rig" animals: drawn in code, moved by a small animation engine.
   Each foot follows a real stepping pattern (planted on the ground, then lifted and swung forward),
   the knee bends wherever the leg needs it (two-bone IK), and ears, tails and wattles lag behind on
   springs. Standing still they breathe, blink and look around.
   A drawing is plain SVG with marked parts; it comes to life once it is on the page. */
(() => {
  const NS = 'http://www.w3.org/2000/svg';
  const RIG = {};
  let uid = 0;

  /* ---------- helpers for drawings ---------- */
  const grad = (id, stops, vertical = true, y1 = 0, y2 = 1) => `<linearGradient id="${id}" ${vertical ? `x1="0" y1="${y1}" x2="0" y2="${y2}"` : 'x1="0" y1="0" x2="1" y2="0"'}>${stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')}</linearGradient>`;
  const ugrad = (id, y1, y2, a, b) => `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="0" y1="${y1}" x2="0" y2="${y2}"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`;
  const eye = (x, y, r, lid) => `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * 1.1}" fill="#20160F"/><circle cx="${x + r * .38}" cy="${y - r * .42}" r="${r * .38}" fill="#fff"/>
    <ellipse data-p="lid" cx="${x}" cy="${y}" rx="${r * 1.2}" ry="${r * 1.3}" fill="${lid}" style="transform-origin:${x}px ${y - r * 1.3}px;transform:scaleY(0)"/>`;

  /* ---------- the engine ---------- */
  const live = new Set();
  let raf = 0, last = 0;
  function tick(t) {
    const dt = Math.min(.05, (t - last) / 1000 || 0); last = t;
    for (const r of live) { if (!r.svg.isConnected) { live.delete(r); continue; } try { r.step(dt, t / 1000); } catch (e) { live.delete(r); } }
    raf = live.size ? requestAnimationFrame(tick) : 0;
  }
  const ease = s => s * s * (3 - 2 * s);
  // Two-bone IK: where the knee goes so a leg of lengths a and b reaches from hip to foot.
  function knee(hx, hy, fx, fy, a, b, back) {
    const dx = fx - hx, dy = fy - hy, d = Math.min(a + b - .01, Math.max(Math.abs(a - b) + .01, Math.hypot(dx, dy)));
    const th = Math.atan2(dy, dx), A = Math.acos((a * a + d * d - b * b) / (2 * a * d)), g = back ? th + A : th - A;
    return [hx + a * Math.cos(g), hy + a * Math.sin(g)];
  }
  const el = (tag, attrs) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };
  function spring(s, target, dt, k = 120, damp = 10) { s.v += ((target - s.a) * k - s.v * damp) * dt; s.a += s.v * dt; return s.a; }

  function hydrate(svg) {
    if (svg.__rig) return;
    const spec = RIG[svg.dataset.rig]; if (!spec) return;
    const q = s => svg.querySelector(s);
    const r = { svg, spec, p: Math.random(), W: 0, t0: Math.random() * 10, blinkAt: 1 + Math.random() * 3, look: { a: 0, v: 0, target: 0, next: 2 },
      body: q('[data-p=body]'), head: q('[data-p=head]'), tail: q('[data-p=tail]'), lids: [...svg.querySelectorAll('[data-p=lid]')], pupils: [...svg.querySelectorAll('[data-p=pupil]')],
      flaps: [...svg.querySelectorAll('[data-flap]')].map(e => ({ e, o: e.dataset.o.split(' ').map(Number), amp: +e.dataset.flap, k: +(e.dataset.k || 1), ph: +(e.dataset.ph || 0), w: e.hasAttribute('data-w') })),
      beats: [...svg.querySelectorAll('[data-beat]')].map(e => ({ e, o: e.dataset.o.split(' ').map(Number), lo: +e.dataset.beat, k: +(e.dataset.k || 1), ph: +(e.dataset.ph || 0) })),
      springs: [...svg.querySelectorAll('[data-spring]')].map(e => ({ e, o: e.dataset.o.split(' ').map(Number), amp: +e.dataset.spring, s: { a: 0, v: 0 } })), legs: [] };
    for (const L of spec.legs) {
      const host = q(`[data-l=${L.far ? 'far' : 'near'}]`), g = el('g', {});
      const sw = (w, c) => ({ stroke: c, 'stroke-width': w, 'stroke-linecap': 'round', fill: 'none' });
      const ow = spec.outline || 3, o1 = el('path', sw(L.w[0] + ow, L.line)), o2 = el('path', sw(L.w[1] + ow, L.line));
      const f1 = el('path', sw(L.w[0], L.fill)), f2 = el('path', sw(L.w[1], L.fill));
      const mus = L.muscle ? el('ellipse', { rx: L.muscle[0], ry: L.muscle[1], fill: L.fill, stroke: L.line, 'stroke-width': 1.5 }) : null;
      const foot = el('g', {}); foot.innerHTML = L.foot;
      if (mus) g.append(o1, o2, mus, f1, f2, foot); else g.append(o1, o2, f1, f2, foot);
      host.appendChild(g);
      r.legs.push({ L, o1, o2, f1, f2, mus, foot });
    }
    r.step = (dt, t) => stepRig(r, dt, t);
    svg.__rig = r; live.add(r);
    try { stepRig(r, 0, performance.now() / 1000); } catch (e) {}
    if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); }
  }

  function stepRig(r, dt, t) {
    const S = r.spec, walking = !!r.svg.closest('.walking');
    r.W += ((walking ? 1 : 0) - r.W) * Math.min(1, dt * 6);
    const W = r.W;
    r.p = (r.p + dt / S.T) % 1;
    const p = r.p, tt = t + r.t0;
    // body: dips twice a step cycle while walking, breathes when standing
    const bob = W * S.bob * Math.cos(4 * Math.PI * p) + (1 - W) * .7 * Math.sin(tt * 2.3);
    const pitch = W * (S.pitch || 0) * Math.sin(2 * Math.PI * p);
    // hoppers leave the ground together: the whole animal rises while the feet are swinging
    const st0 = S.stance || .62, hopY = S.hop && p >= st0 ? W * S.hop * Math.sin(Math.PI * (p - st0) / (1 - st0)) : 0;
    // cartoon bodies squash a little as they land each step and stretch as they rise
    const sq = S.squash ? W * S.squash * Math.cos(4 * Math.PI * p) + (1 - W) * S.squash * .35 * Math.sin(tt * 2.3) : 0, cx = S.center[0], gy = S.ground;
    if (r.body) r.body.setAttribute('transform', `translate(0 ${(bob - hopY).toFixed(2)}) rotate(${pitch.toFixed(2)} ${cx} ${S.center[1]})` +
      (sq ? ` translate(${cx} ${gy}) scale(${(1 + sq).toFixed(3)} ${(1 - sq).toFixed(3)}) translate(${-cx} ${-gy})` : ''));
    // head: nods in step, or looks around now and then while standing
    if (r.head) {
      const lk = r.look; lk.next -= dt; if (lk.next < 0) { lk.target = Math.random() < .5 ? 0 : (Math.random() - .5) * 14; lk.next = 1.5 + Math.random() * 3; }
      const look = spring(lk, (1 - W) * lk.target, dt, 30, 8);
      const [ox, oy] = S.head || S.center;
      if (S.pump) { const f = (2 * p) % 1, x = W * (-4 + 10 * ease(Math.min(1, f / .35)) - 6 * Math.max(0, (f - .35) / .65)); r.head.setAttribute('transform', `translate(${x.toFixed(2)} 0) rotate(${look.toFixed(2)} ${ox} ${oy})`); }
      else r.head.setAttribute('transform', `rotate(${(W * S.nod * Math.sin(4 * Math.PI * p + .6) + look).toFixed(2)} ${ox} ${oy})`);
    }
    const lx = Math.max(-1, Math.min(1, r.look.a / 7)) * -1.6 + W * 1.4;
    for (const pu of r.pupils) pu.setAttribute('transform', `translate(${lx.toFixed(2)} ${(r.look.a / 14).toFixed(2)})`);
    // blinking
    r.blinkAt -= dt;
    const shut = r.blinkAt < 0 ? 1 : 0;
    if (r.blinkAt < -.13) r.blinkAt = 2 + Math.random() * 4;
    for (const l of r.lids) l.style.transform = `scaleY(${shut})`;
    // springy parts lag behind the movement
    for (const sp of r.springs) {
      const drive = sp.e === r.tail ? (W ? Math.sin(2 * Math.PI * p * 2) : Math.sin(tt * (S.wag || 7))) : Math.sin(4 * Math.PI * p - 1) * W + Math.sin(tt * 1.7) * .3;
      const a = spring(sp.s, drive * sp.amp, dt, 90, 9);
      sp.e.setAttribute('transform', `rotate(${a.toFixed(2)} ${sp.o[0]} ${sp.o[1]})`);
    }
    for (const b of r.beats) {
      const s = (1 + b.lo) / 2 + (1 - b.lo) / 2 * Math.sin(2 * Math.PI * (p * b.k + b.ph)), [ox, oy] = b.o;
      b.e.setAttribute('transform', `translate(${ox} ${oy}) scale(1 ${s.toFixed(3)}) translate(${-ox} ${-oy})`);
    }
    for (const f of r.flaps) {
      const a = f.amp * Math.sin(2 * Math.PI * (p * f.k + f.ph)) * (f.w ? W : 1);
      f.e.setAttribute('transform', `rotate(${a.toFixed(2)} ${f.o[0]} ${f.o[1]})`);
    }
    // legs: each foot is planted for most of the cycle, then lifts and swings forward
    for (const g of r.legs) {
      const L = g.L, hx = L.hip[0], hy = L.hip[1] + bob - hopY, x0 = hx + (L.reach || 0);
      const qq = (p + L.phase) % 1, st = S.stance || .62;
      let fx, fy, rot = 0;
      if (qq < st) { const s = qq / st; fx = x0 + W * S.stride * (.5 - s); fy = S.ground; }
      else { const s = (qq - st) / (1 - st), e = ease(s); fx = x0 + W * S.stride * (-.5 + e); fy = S.ground - W * S.lift * Math.sin(Math.PI * s); rot = W * (L.curl || 30) * Math.sin(Math.PI * s); }
      fy -= (L.footH || 0) + hopY;
      const [jx, jy] = knee(hx, hy, fx, fy, L.len[0], L.len[1], L.back !== false);
      const d1 = `M${hx.toFixed(1)} ${hy.toFixed(1)}L${jx.toFixed(1)} ${jy.toFixed(1)}`, d2 = `M${jx.toFixed(1)} ${jy.toFixed(1)}L${fx.toFixed(1)} ${fy.toFixed(1)}`;
      g.o1.setAttribute('d', d1); g.f1.setAttribute('d', d1); g.o2.setAttribute('d', d2); g.f2.setAttribute('d', d2);
      if (g.mus) { const ang = Math.atan2(jy - hy, jx - hx) * 180 / Math.PI - 90; g.mus.setAttribute('transform', `translate(${hx.toFixed(1)} ${(hy + L.muscle[2]).toFixed(1)}) rotate(${ang.toFixed(1)})`); }
      g.foot.setAttribute('transform', `translate(${fx.toFixed(1)} ${fy.toFixed(1)}) rotate(${rot.toFixed(1)})`);
    }
  }

  // Bring drawings to life as soon as they land on the page (the app adds them as HTML text).
  const scan = root => { if (root.matches?.('svg[data-rig]')) hydrate(root); root.querySelectorAll?.('svg[data-rig]').forEach(hydrate); };
  new MutationObserver(ms => { for (const m of ms) m.addedNodes.forEach(n => n.nodeType === 1 && scan(n)); })
    .observe(document.documentElement, { childList: true, subtree: true });
  addEventListener('DOMContentLoaded', () => scan(document.body));

  function rigSVG(id, height) {
    const s = RIG[id]; if (!s) return '';
    const n = ++uid, w = Math.round(height * s.w / s.h);
    return `<svg class="rigsvg" data-rig="${id}" width="${w}" height="${height}" viewBox="0 0 ${s.w} ${s.h}" style="overflow:visible" aria-hidden="true">${s.draw('r' + n)}</svg>`;
  }

  /* =================== the animals =================== */
  const paw = (c, line, len = 9) => `<path d="M-4 -3 C-3 -6 ${len - 2} -6 ${len} -2 C${len + 2} 0 ${len + 1} 3 ${len - 2} 3 L-4 3 C-6 3 -6 -1 -4 -3Z" fill="${c}" stroke="${line}" stroke-width="1.5"/><path d="M${len - 5} 0 v3 M${len - 8} 0 v3" stroke="${line}" stroke-width="1" opacity=".55"/>`;

  RIG.dog = { w: 200, h: 140, T: .62, ground: 131, stride: 30, lift: 10, bob: 1.6, nod: 2.2, pitch: .8, center: [100, 80], head: [150, 46], wag: 9,
    legs: [
      { far: true, hip: [80, 80], len: [26, 26], w: [11, 8], reach: -2, phase: .5, muscle: [11, 15, 4], fill: '#B9803F', line: '#7A4A1A', foot: paw('#B9803F', '#7A4A1A') },
      { far: true, hip: [124, 80], len: [25, 25], w: [10, 8], reach: 2, phase: .75, fill: '#B9803F', line: '#7A4A1A', foot: paw('#B9803F', '#7A4A1A') },
      { hip: [70, 80], len: [26, 26], w: [12, 9], reach: -2, phase: 0, muscle: [14, 18, 4], fill: 'url(#DB)', line: '#7A4A1A', foot: paw('#F2CC8F', '#7A4A1A') },
      { hip: [134, 80], len: [25, 25], w: [11, 9], reach: 2, phase: .25, fill: 'url(#DB)', line: '#7A4A1A', foot: paw('#F2CC8F', '#7A4A1A') }],
    draw: n => { const line = '#7A4A1A';
      return `<defs>${ugrad('DB', 60, 132, '#E9BB78', '#C08A44').replace('id="DB"', 'id="DB"')}${grad(n + 'b', [[0, '#F2C98A'], [.55, '#DCA55E'], [1, '#BC843E']])}
        <radialGradient id="${n}h" cx=".45" cy=".35" r=".75"><stop offset="0" stop-color="#F6D49C"/><stop offset="1" stop-color="#D09552"/></radialGradient>${grad(n + 'e', [[0, '#B9803F'], [1, '#8E5A24']])}</defs>
        <ellipse cx="102" cy="132" rx="62" ry="5" fill="#000" opacity=".13"/>
        <g data-l="far"></g>
        <g data-p="body">
          <g data-p="tail" data-spring="12" data-o="57 62"><path d="M58 62 C46 56 35 46 29 32 C27 26 31 23 36 27 C40 34 44 40 50 46 C46 40 46 36 49 35 C53 44 57 50 64 56Z" fill="url(#${n}b)" stroke="${line}" stroke-width="1.6" stroke-linejoin="round"/></g>
          <path d="M56 62 C60 48 84 44 108 46 C126 47 138 48 146 56 C154 64 152 82 140 90 C126 98 100 96 82 96 C66 96 54 90 52 78 C51 72 53 66 56 62Z" fill="url(#${n}b)" stroke="${line}" stroke-width="1.6"/>
          <ellipse cx="74" cy="64" rx="14" ry="10" fill="#FFE2B0" opacity=".35"/>
          <path d="M139 62 C150 70 151 85 141 94 C145 84 145 72 139 62Z" fill="#FBE4BE"/>
          <path d="M126 60 C130 46 140 36 150 30 L167 40 C160 48 153 60 147 72Z" fill="url(#${n}b)" stroke="${line}" stroke-width="1.6" stroke-linejoin="round"/>
          <g data-p="head">
            <path d="M144 30 C146 18 160 12 172 16 C180 19 184 26 184 32 L195 37 C199 39 199 46 195 48 L182 52 C174 56 160 56 152 50 C146 46 143 38 144 30Z" fill="url(#${n}h)" stroke="${line}" stroke-width="1.6" stroke-linejoin="round"/>
            <path d="M176 36 L195 39 C198 41 198 46 194 48 L180 51 C175 50 173 44 176 36Z" fill="#F7DDB0"/>
            <ellipse cx="195" cy="39.5" rx="4.2" ry="3.3" fill="#2A1D14"/><ellipse cx="194" cy="38.4" rx="1.4" ry=".9" fill="#fff" opacity=".7"/>
            <path d="M181 49 C185 51.5 190 50.5 193 48" stroke="#5A3A20" stroke-width="1.4" fill="none" stroke-linecap="round"/>
            <path d="M166 24 C169 22 174 22 176 24" stroke="#8E5A24" stroke-width="1.6" fill="none" stroke-linecap="round"/>
            ${eye(171, 29, 3.3, '#E9BC7C')}
            <g data-spring="7" data-o="157 20"><path d="M156 19 C147 21 143 34 145 46 C147 53 154 53 158 46 C162 38 162 28 160 19Z" fill="url(#${n}e)" stroke="${line}" stroke-width="1.6" stroke-linejoin="round"/></g>
          </g>
        </g>
        <g data-l="near"></g>`; } };

  const toes = c => `<path d="M0 0 L12 1.5 M0 0 L9 4 M0 0 L-6 1.5" stroke="${c}" stroke-width="2.6" stroke-linecap="round"/>`;
  RIG.turkey = { w: 160, h: 150, T: .78, ground: 140, stride: 22, lift: 12, bob: 1.8, stance: .55, pitch: 1.2, center: [80, 80], head: [104, 70], pump: true, wag: 2,
    legs: [
      { far: true, hip: [76, 104], len: [17, 18], w: [4.6, 3.6], back: false, phase: .5, curl: -40, fill: '#B08470', line: '#7A5444', foot: toes('#B08470') },
      { hip: [86, 104], len: [17, 18], w: [5, 4], back: false, phase: 0, curl: -40, fill: '#C99C86', line: '#7A5444', foot: toes('#C99C86') }],
    draw: n => { const line = '#3A2210';
      const feathers = Array.from({ length: 11 }, (_, i) => `<path d="M0 0 C-10 -16 -11 -48 0 -64 C11 -48 10 -16 0 0Z" fill="url(#${n}f)" stroke="${line}" stroke-width="1.2" transform="translate(64 82) rotate(${(-78 + i * 15.6).toFixed(1)})"/>`).join('');
      return `<defs>${grad(n + 'f', [[0, '#2E1A0E'], [.07, '#F3DFB2'], [.15, '#2E1A0E'], [.21, '#A0602A'], [.6, '#7A4220'], [1, '#5A3016']])}
        <radialGradient id="${n}b" cx=".55" cy=".32" r=".85"><stop offset="0" stop-color="#A57446"/><stop offset=".55" stop-color="#6A4020"/><stop offset="1" stop-color="#3E2410"/></radialGradient>
        <radialGradient id="${n}h" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#D6E6F5"/><stop offset="1" stop-color="#8FB0D2"/></radialGradient>
        ${grad(n + 'w', [[0, '#F0524A'], [1, '#B71C1C']])}${grad(n + 'n', [[0, '#C8DDF0'], [.35, '#E9A6A0'], [1, '#D2554A']])}</defs>
        <ellipse cx="82" cy="141" rx="36" ry="4.5" fill="#000" opacity=".13"/>
        <g data-l="far"></g>
        <g data-p="body">
          <g data-spring="3" data-o="64 84">${feathers}</g>
          <path d="M44 86 C40 64 58 50 80 50 C102 50 114 64 114 82 C114 100 100 112 80 112 C60 112 46 102 44 86Z" fill="url(#${n}b)" stroke="${line}" stroke-width="1.6"/>
          ${[0, 1, 2].map(r => `<path d="M${58 + r * 3} ${64 + r * 11} ${Array.from({ length: 5 }, () => 'q4 5 8 0').join(' ')}" stroke="#C49060" stroke-width="1.2" fill="none" opacity=".5"/>`).join('')}
          <path d="M58 80 C66 68 92 66 102 78 C104 84 102 90 96 94 C86 100 70 99 62 93 C58 89 57 85 58 80Z" fill="#4E2C14" stroke="${line}" stroke-width="1.4"/>
          <path d="M66 84 C76 82 88 82 98 84 M68 89 C78 87 88 87 96 89" stroke="#E8D6B4" stroke-width="1.6" fill="none" stroke-linecap="round" opacity=".75"/>
          <path d="M108 74 C107 82 106 88 105 95 M110 75 C109 83 108 89 108 95" stroke="#1E120A" stroke-width="1.5" stroke-linecap="round"/>
          <g data-p="head">
            <path d="M98 74 C100 62 104 52 110 44 C113 40 116 36 118 34 L126 39 C122 44 120 50 118 56 C116 63 114 70 112 77Z" fill="url(#${n}n)" stroke="#6E6A86" stroke-width="1.2"/>
            <circle cx="113" cy="54" r="2.6" fill="#D93A3A"/><circle cx="110" cy="62" r="2.8" fill="#D93A3A"/><circle cx="116" cy="47" r="2.2" fill="#D93A3A"/>
            <ellipse cx="123" cy="31" rx="10" ry="8.5" fill="url(#${n}h)" stroke="#5A6F86" stroke-width="1.2"/>
            <path d="M131 28 C135 28 139 30 141 32 C138 34 134 35 131 35Z" fill="#E8C27A" stroke="#9A7A3A" stroke-width="1"/>
            <g data-spring="9" data-o="129 25"><path d="M129 24 C133 27 135 35 132 43" stroke="url(#${n}w)" stroke-width="3.6" fill="none" stroke-linecap="round"/></g>
            <g data-spring="10" data-o="122 37"><path d="M120 37 C115 46 117 57 124 55 C128 50 127 42 125 37Z" fill="url(#${n}w)"/></g>
            ${eye(125, 28, 2.3, '#B5CDE6')}
          </g>
        </g>
        <g data-l="near"></g>`; } };

  /* ---------- more animals in the same style ---------- */
  const hoof = c => `<path d="M-4.5 -5 L4.5 -5 L6 2 L-6 2Z" fill="${c}" stroke="#1E1610" stroke-width="1.2" stroke-linejoin="round"/>`;
  const tinyPaw = (c, line) => `<ellipse cx="2" cy="-1.5" rx="5" ry="3" fill="${c}" stroke="${line}" stroke-width="1.2"/>`;

  RIG.reindeer = { w: 200, h: 180, T: .72, ground: 173, stride: 32, lift: 12, bob: 1.6, nod: 2, pitch: .7, center: [100, 92], head: [158, 54], wag: 6,
    legs: [
      { far: true, hip: [74, 100], len: [33, 34], w: [9, 6], reach: -2, phase: .5, muscle: [11, 15, 5], fill: '#7E5A40', line: '#3E2A1C', foot: hoof('#3A2A20') },
      { far: true, hip: [128, 100], len: [33, 34], w: [8.5, 6], reach: 2, phase: .75, fill: '#7E5A40', line: '#3E2A1C', foot: hoof('#3A2A20') },
      { hip: [62, 102], len: [33, 34], w: [10, 6.5], reach: -2, phase: 0, muscle: [13, 18, 5], fill: 'url(#RDL)', line: '#3E2A1C', foot: hoof('#2E241C') },
      { hip: [138, 102], len: [33, 34], w: [9, 6.5], reach: 2, phase: .25, fill: 'url(#RDL)', line: '#3E2A1C', foot: hoof('#2E241C') }],
    draw: n => { const line = '#3E2A1C';
      return `<defs>${ugrad('RDL', 96, 172, '#A27C5C', '#6E4E36')}${grad(n + 'b', [[0, '#BE9A78'], [.6, '#9C7556'], [1, '#76543A']])}
        <radialGradient id="${n}h" cx=".45" cy=".35" r=".8"><stop offset="0" stop-color="#C9A684"/><stop offset="1" stop-color="#8E6A4C"/></radialGradient></defs>
        <ellipse cx="102" cy="174" rx="66" ry="5" fill="#000" opacity=".13"/>
        <g data-l="far"></g>
        <g data-p="body">
          <g data-p="tail" data-spring="10" data-o="49 86"><path d="M50 84 C43 79 38 82 40 89 C43 92 47 91 51 89Z" fill="#F1E8DA" stroke="${line}" stroke-width="1.4"/></g>
          <path d="M50 86 C54 70 80 66 106 68 C128 69 142 70 150 80 C158 90 154 106 140 112 C122 118 96 116 76 116 C60 116 48 108 46 98 C45 92 47 89 50 86Z" fill="url(#${n}b)" stroke="${line}" stroke-width="1.6"/>
          <path d="M66 110 C86 116 116 116 138 108" stroke="#E7D9C4" stroke-width="5" fill="none" stroke-linecap="round" opacity=".7"/>
          <path d="M134 82 C138 66 146 52 156 44 L170 54 C164 62 158 74 154 90Z" fill="url(#${n}b)" stroke="${line}" stroke-width="1.6" stroke-linejoin="round"/>
          <path d="M137 86 C139 76 143 66 150 58 C153 70 151 82 147 94 C143 94 139 91 137 86Z" fill="#EFE6D8" stroke="${line}" stroke-width="1.2"/>
          <g data-p="head">
            <path d="M160 38 C156 26 150 18 142 10 M150 18 L146 8 M154 27 L144 25 M142 10 L134 8" stroke="#A88A64" stroke-width="3.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
            <g data-spring="8" data-o="156 44"><path d="M156 42 C148 36 141 38 145 44 C148 47 153 48 157 46Z" fill="#8E6A4C" stroke="${line}" stroke-width="1.3"/></g>
            <path d="M152 46 C154 36 166 32 176 36 C184 40 192 48 194 54 C195 58 192 61 188 61 L172 62 C162 62 154 56 152 46Z" fill="url(#${n}h)" stroke="${line}" stroke-width="1.6" stroke-linejoin="round"/>
            <path d="M180 50 C188 50 194 54 194 57 C192 61 186 62 180 60Z" fill="#E4D2BC"/>
            <ellipse cx="192" cy="55" rx="3.2" ry="2.5" fill="#2B1D14"/>
            ${eye(168, 45, 2.6, '#B4906E')}
            <path d="M166 35 C168 24 174 14 182 6 M172 18 L168 8 M176 12 L187 12 M168 27 L179 22" stroke="#D9BE94" stroke-width="3.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
          </g>
        </g>
        <g data-l="near"></g>`; } };

  RIG.lamb = { w: 170, h: 130, T: .6, ground: 124, stride: 22, lift: 9, bob: 1.6, nod: 2.5, pitch: .6, center: [90, 80], head: [128, 66], wag: 10,
    legs: [
      { far: true, hip: [72, 96], len: [14, 15], w: [7, 6], reach: -1, phase: .5, fill: '#D8C9B8', line: '#6E5E4E', foot: hoof('#4A3A30') },
      { far: true, hip: [112, 96], len: [14, 15], w: [7, 6], reach: 1, phase: .75, fill: '#D8C9B8', line: '#6E5E4E', foot: hoof('#4A3A30') },
      { hip: [64, 98], len: [14, 15], w: [7.5, 6.5], reach: -1, phase: 0, fill: '#F2E6DA', line: '#6E5E4E', foot: hoof('#3A2A20') },
      { hip: [120, 98], len: [14, 15], w: [7.5, 6.5], reach: 1, phase: .25, fill: '#F2E6DA', line: '#6E5E4E', foot: hoof('#3A2A20') }],
    draw: n => { const line = '#6E5E4E';
      const puffs = [[56, 76, 15], [70, 64, 16], [88, 60, 17], [106, 64, 16], [120, 74, 14], [116, 90, 14], [98, 96, 16], [78, 96, 16], [60, 90, 13], [90, 78, 18]];
      const wool = puffs.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r + 1.6}" fill="${line}"/>`).join('') + puffs.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#${n}w)"/>`).join('');
      return `<defs><radialGradient id="${n}w" cx=".4" cy=".3" r=".8"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#E4DCCD"/></radialGradient></defs>
        <ellipse cx="92" cy="125" rx="46" ry="4.5" fill="#000" opacity=".13"/>
        <g data-l="far"></g>
        <g data-p="body">
          <g data-p="tail" data-spring="18" data-o="46 76"><circle cx="43" cy="76" r="8.6" fill="${line}"/><circle cx="43" cy="76" r="7" fill="url(#${n}w)"/></g>
          ${wool}
          <g data-p="head">
            <g data-spring="10" data-o="125 60"><path d="M125 58 L109 61 C108 66 115 69 125 65Z" fill="#F2E6DA" stroke="${line}" stroke-width="1.4"/><path d="M122 61 L113 62.5 C113 65 117 66 122 64Z" fill="#F4B6BE"/></g>
            <path d="M120 60 C122 48 134 44 144 50 C152 55 154 66 150 72 C146 78 134 78 126 72 C121 68 119 64 120 60Z" fill="#F4E9DE" stroke="${line}" stroke-width="1.6"/>
            <circle cx="128" cy="48" r="7.6" fill="${line}"/><circle cx="137" cy="46" r="7" fill="${line}"/><circle cx="128" cy="48" r="6" fill="url(#${n}w)"/><circle cx="137" cy="46" r="5.6" fill="url(#${n}w)"/>
            <ellipse cx="150" cy="66" rx="2.4" ry="1.8" fill="#E79AA6"/><path d="M146 71 C148 73 151 72 152 70" stroke="#8E6A5A" stroke-width="1.2" fill="none" stroke-linecap="round"/>
            ${eye(139, 58, 2.6, '#EADCCD')}
          </g>
        </g>
        <g data-l="near"></g>`; } };

  RIG.hedgehog = { w: 124, h: 80, T: .32, ground: 74, stride: 10, lift: 4, bob: .9, nod: 2, center: [56, 56], head: [86, 54], wag: 6,
    legs: [
      { far: true, hip: [36, 60], len: [6, 7], w: [6, 5], phase: .5, curl: 20, fill: '#B9967A', line: '#5E4632', foot: tinyPaw('#D8B9A0', '#5E4632') },
      { far: true, hip: [72, 60], len: [6, 7], w: [6, 5], phase: .75, curl: 20, fill: '#B9967A', line: '#5E4632', foot: tinyPaw('#D8B9A0', '#5E4632') },
      { hip: [44, 62], len: [6, 7], w: [6.5, 5.5], phase: 0, curl: 20, fill: '#D3B394', line: '#5E4632', foot: tinyPaw('#F0C9BC', '#5E4632') },
      { hip: [80, 62], len: [6, 7], w: [6.5, 5.5], phase: .25, curl: 20, fill: '#D3B394', line: '#5E4632', foot: tinyPaw('#F0C9BC', '#5E4632') }],
    draw: n => { const line = '#3E2C20';
      const spines = []; for (let row = 0; row < 3; row++) for (let i = 0; i < 15; i++) {
        const a = Math.PI * (1.04 - i / 14 * .9), rx = 34 - row * 6, ry = 27 - row * 6, cx = 54, cy = 58, x = cx + Math.cos(a) * rx, y = cy - Math.sin(a) * ry,
          len = 13 - row * 2, ox = Math.cos(a) * len, oy = -Math.sin(a) * len, nx = -Math.sin(a) * 3.2, ny = -Math.cos(a) * 3.2;
        spines.push(`<path d="M${(x + nx).toFixed(1)} ${(y + ny).toFixed(1)} L${(x + ox).toFixed(1)} ${(y + oy).toFixed(1)} L${(x - nx).toFixed(1)} ${(y - ny).toFixed(1)}Z" fill="${(i + row) % 2 ? '#6E5240' : '#5A402F'}" stroke="${line}" stroke-width=".7"/>
          <path d="M${(x + ox * .62).toFixed(1)} ${(y + oy * .62).toFixed(1)} L${(x + ox).toFixed(1)} ${(y + oy).toFixed(1)}" stroke="#EADBC4" stroke-width="1.4" stroke-linecap="round"/>`); }
      return `<ellipse cx="58" cy="75" rx="36" ry="3.6" fill="#000" opacity=".13"/>
        <g data-l="far"></g>
        <g data-p="body">
          ${spines.join('')}
          <path d="M20 60 C20 40 36 30 56 30 C74 30 88 40 90 58 C80 64 40 66 20 60Z" fill="#7A5A44"/>
          <path d="M22 60 C38 67 70 67 90 60 C86 66 70 68 56 68 C40 68 28 66 22 60Z" fill="#E6CBA6" stroke="${line}" stroke-width="1.2"/>
          <g data-p="head">
            <path d="M78 44 C88 39 100 46 110 54 C112 56 111 59 108 59 L88 62 C81 60 76 52 78 44Z" fill="#E6CBA6" stroke="${line}" stroke-width="1.5" stroke-linejoin="round"/>
            <circle cx="86" cy="44" r="3.6" fill="#D9B48E" stroke="${line}" stroke-width="1.2"/>
            <circle cx="110" cy="55.4" r="2.6" fill="#1D130C"/>
            ${eye(95, 49, 2.1, '#E6CBA6')}
          </g>
        </g>
        <g data-l="near"></g>`; } };

  RIG.guineapig = { w: 134, h: 84, T: .34, ground: 78, stride: 11, lift: 4, bob: 1, nod: 2, center: [62, 52], head: [96, 50], wag: 6,
    legs: [
      { far: true, hip: [34, 64], len: [7, 7], w: [7, 6], phase: .5, curl: 20, fill: '#E6C9C0', line: '#7A5A4E', foot: tinyPaw('#E7A9B2', '#7A5A4E') },
      { far: true, hip: [84, 64], len: [7, 7], w: [7, 6], phase: .75, curl: 20, fill: '#E6C9C0', line: '#7A5A4E', foot: tinyPaw('#E7A9B2', '#7A5A4E') },
      { hip: [42, 66], len: [7, 7], w: [7.5, 6.5], phase: 0, curl: 20, fill: '#F6E2DA', line: '#7A5A4E', foot: tinyPaw('#F2B3BC', '#7A5A4E') },
      { hip: [92, 66], len: [7, 7], w: [7.5, 6.5], phase: .25, curl: 20, fill: '#F6E2DA', line: '#7A5A4E', foot: tinyPaw('#F2B3BC', '#7A5A4E') }],
    draw: n => { const line = '#5C3B24';
      return `<defs><radialGradient id="${n}b" cx=".45" cy=".3" r=".8"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#E9DFD2"/></radialGradient>
        ${grad(n + 'o', [[0, '#F0AE5C'], [1, '#C97A2E']])}</defs>
        <ellipse cx="64" cy="79" rx="42" ry="4" fill="#000" opacity=".13"/>
        <g data-l="far"></g>
        <g data-p="body">
          <path d="M16 54 C14 36 34 26 60 26 C86 26 104 36 106 52 C108 66 90 72 62 72 C36 72 18 68 16 54Z" fill="url(#${n}b)" stroke="${line}" stroke-width="1.6"/>
          <path d="M18 46 C20 32 34 26 50 27 C48 40 40 56 24 64 C19 60 17 53 18 46Z" fill="url(#${n}o)"/>
          <path d="M54 27 C66 26 74 29 79 33 C77 42 69 48 58 50 C54 42 53 33 54 27Z" fill="#5C3B24"/>
          <path d="M28 34 C36 30 44 29 52 30" stroke="#FFF" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".6"/>
          <g data-p="head">
            <ellipse cx="104" cy="48" rx="19" ry="17" fill="url(#${n}b)" stroke="${line}" stroke-width="1.6"/>
            <path d="M95 36 C106 31 119 37 120 46 C113 47 104 44 95 36Z" fill="#5C3B24"/>
            <g data-spring="6" data-o="96 36"><path d="M96 35 C90 28 96 23 101 30 C100 33 98 35 96 35Z" fill="#E7A9B2" stroke="${line}" stroke-width="1.2"/></g>
            <ellipse cx="121" cy="52" rx="2.4" ry="1.9" fill="#E38C9A"/><path d="M116 57 C118 59 121 59 123 56" stroke="#8E6A5A" stroke-width="1.2" fill="none" stroke-linecap="round"/>
            <path d="M118 54 l9 -2 M118 56 l9 1" stroke="#7A6A5A" stroke-width=".6"/>
            ${eye(108, 43, 2.7, '#F0E8DE')}
          </g>
        </g>
        <g data-l="near"></g>`; } };

  RIG.seal = { w: 150, h: 82, T: .95, ground: 76, stride: 0, lift: 0, bob: 2.2, nod: 3, pitch: 3, center: [70, 56], head: [104, 48], wag: 3, legs: [],
    draw: n => { const line = '#3E4A58';
      return `<defs>${grad(n + 'b', [[0, '#B4C1CE'], [.6, '#8E9BA8'], [1, '#6C7987']])}</defs>
        <ellipse cx="68" cy="77" rx="52" ry="4.5" fill="#000" opacity=".13"/>
        <g data-l="far"></g>
        <g data-p="body">
          <g data-p="tail" data-spring="10" data-o="26 60"><path d="M27 58 L4 50 C6 56 8 60 12 62 C8 64 6 68 4 75 L27 65Z" fill="#6C7987" stroke="${line}" stroke-width="1.4" stroke-linejoin="round"/></g>
          <path d="M20 62 C22 46 46 34 76 34 C96 34 108 42 112 52 C114 62 104 72 84 72 L30 72 C24 72 20 67 20 62Z" fill="url(#${n}b)" stroke="${line}" stroke-width="1.6"/>
          <path d="M34 68 C52 72 78 72 96 66" stroke="#D3DCE5" stroke-width="5" fill="none" stroke-linecap="round" opacity=".8"/>
          <g fill="#6C7987" opacity=".7"><ellipse cx="44" cy="46" rx="2.4" ry="1.8"/><ellipse cx="57" cy="41" rx="2" ry="1.5"/><ellipse cx="51" cy="52" rx="1.7" ry="1.3"/><ellipse cx="68" cy="44" rx="2" ry="1.5"/></g>
          <g data-flap="24" data-w="" data-o="84 60"><path d="M84 58 C79 66 83 74 95 74 C93 67 91 62 89 58Z" fill="#6C7987" stroke="${line}" stroke-width="1.4" stroke-linejoin="round"/></g>
          <g data-p="head">
            <ellipse cx="116" cy="40" rx="17" ry="15" fill="url(#${n}b)" stroke="${line}" stroke-width="1.6"/>
            <ellipse cx="129" cy="46" rx="8.5" ry="6" fill="#D3DCE5"/>
            <ellipse cx="134" cy="42" rx="2.8" ry="2.1" fill="#1E242C"/>
            <path d="M128 48 l12 -1.5 M128 50 l12 2 M127 46 l11 -4" stroke="#4A5462" stroke-width=".7"/>
            <ellipse cx="118" cy="35" rx="4.4" ry="4.8" fill="#1A1F26"/><circle cx="119.6" cy="33.2" r="1.6" fill="#fff"/>
            <ellipse data-p="lid" cx="118" cy="35" rx="5" ry="5.4" fill="#9AA7B4" style="transform-origin:118px 29.6px;transform:scaleY(0)"/>
          </g>
        </g>
        <g data-l="near"></g>`; } };

  // Swimmers glide through the air like fish in water, their tails sweeping.
  RIG.dolphin = { w: 160, h: 72, swim: true, T: .9, ground: 70, stride: 0, lift: 0, bob: 1.2, pitch: 2.5, center: [90, 40], legs: [],
    draw: n => { const line = '#2F4F6F';
      return `<defs>${grad(n + 'b', [[0, '#8DB4D6'], [.55, '#6F9CC4'], [1, '#5A86AE']])}</defs>
        <g data-p="body">
          <g data-flap="16" data-o="34 40"><path d="M36 38 L8 22 C10 30 12 35 16 39 C12 43 10 48 8 56 L36 44Z" fill="#4F7DA6" stroke="${line}" stroke-width="1.4" stroke-linejoin="round"/></g>
          <path d="M28 40 C42 26 70 20 100 22 C118 23 130 28 136 34 L152 36 C155 38 153 40 149 41 L134 42 C126 50 104 54 80 52 C56 50 40 46 28 40Z" fill="url(#${n}b)" stroke="${line}" stroke-width="1.6"/>
          <path d="M42 44 C62 50 92 52 122 46 C110 52 92 54 78 53 C62 52 50 49 42 44Z" fill="#E1ECF6"/>
          <path d="M74 23 C80 14 88 8 96 6 C92 12 90 18 92 24Z" fill="#4F7DA6" stroke="${line}" stroke-width="1.4" stroke-linejoin="round"/>
          <g data-flap="8" data-o="92 46" data-ph=".25"><path d="M92 46 C90 54 84 60 78 62 C84 56 86 50 86 46Z" fill="#4F7DA6" stroke="${line}" stroke-width="1.3"/></g>
          <path d="M136 41 C140 42 144 42 149 41" stroke="${line}" stroke-width="1.2" fill="none"/>
          ${eye(126, 32, 2, '#7AA4CA')}
        </g>`; } };

  RIG.greatwhite = { w: 190, h: 90, swim: true, T: 1, ground: 88, stride: 0, lift: 0, bob: 1.4, pitch: 2, center: [100, 46], legs: [],
    draw: n => { const line = '#33414E';
      return `<defs>${grad(n + 'b', [[0, '#8A9AA8'], [.5, '#6E7F8E'], [1, '#5A6B79']])}</defs>
        <g data-p="body">
          <g data-flap="14" data-o="38 44"><path d="M40 42 L6 8 C16 22 22 32 28 42 L28 48 C22 56 16 64 8 74 L40 50Z" fill="#566573" stroke="${line}" stroke-width="1.4" stroke-linejoin="round"/></g>
          <path d="M30 46 C48 28 98 20 142 26 C160 29 172 36 176 44 C170 52 156 58 134 60 C98 64 58 60 30 46Z" fill="url(#${n}b)" stroke="${line}" stroke-width="1.6"/>
          <path d="M54 54 C86 64 132 64 170 48 C152 58 130 62 106 62 C82 62 66 59 54 54Z" fill="#F1F4F7"/>
          <path d="M86 26 C94 12 102 6 112 6 C108 14 108 20 114 25Z" fill="#566573" stroke="${line}" stroke-width="1.4" stroke-linejoin="round"/>
          <g data-flap="7" data-o="108 54" data-ph=".25"><path d="M106 54 C102 66 94 74 84 78 C96 76 110 68 118 56Z" fill="#566573" stroke="${line}" stroke-width="1.4" stroke-linejoin="round"/></g>
          <path d="M130 38 C128 44 128 50 130 54 M135 37 C133 43 133 49 135 53 M140 37 C138 43 138 48 140 52" stroke="#4A5966" stroke-width="1.6" fill="none"/>
          <path d="M152 50 C158 52 166 50 172 46" stroke="#2C3A46" stroke-width="1.6" fill="none"/>
          <path d="M154 50.5 l1.5 2 l1.5 -2 l1.5 2 l1.5 -2 l1.5 2 l1.5 -2 l1.5 2 l1.5 -2 l1.5 2 l1.5 -2" stroke="#fff" stroke-width=".9" fill="none"/>
          <circle cx="156" cy="37" r="2.4" fill="#111"/><circle cx="156.8" cy="36.2" r=".8" fill="#fff"/>
        </g>`; } };

  RIG.orca = { w: 190, h: 92, swim: true, T: 1.05, ground: 90, stride: 0, lift: 0, bob: 1.4, pitch: 2, center: [100, 48], legs: [],
    draw: n => { const line = '#0E1014';
      return `<defs>${grad(n + 'b', [[0, '#3A3F4A'], [.5, '#1E222A'], [1, '#14171C']])}</defs>
        <g data-p="body">
          <g data-flap="14" data-o="32 48"><path d="M34 46 L6 30 C8 38 12 44 18 48 C12 52 8 58 6 66 L34 52Z" fill="#1C1F26" stroke="${line}" stroke-width="1.4" stroke-linejoin="round"/></g>
          <path d="M26 50 C42 32 82 24 122 26 C148 28 164 36 170 48 C168 58 152 64 128 65 C90 68 52 64 26 50Z" fill="url(#${n}b)" stroke="${line}" stroke-width="1.6"/>
          <path d="M72 60 C98 68 138 66 162 54 C152 62 134 66 114 66 C98 66 84 64 72 60Z" fill="#F7F7F5"/>
          <path d="M140 54 C150 56 160 54 167 50 C162 58 150 62 138 60Z" fill="#F7F7F5"/>
          <path d="M58 52 C68 46 82 48 88 58 C76 60 64 58 58 52Z" fill="#F7F7F5"/>
          <path d="M86 28 C94 26 106 26 112 28 C106 32 94 32 86 28Z" fill="#9AA3AE" opacity=".8"/>
          <path d="M90 28 C94 16 96 8 98 2 C102 8 106 18 109 27Z" fill="#1C1F26" stroke="${line}" stroke-width="1.4" stroke-linejoin="round"/>
          <ellipse cx="142" cy="38" rx="7.5" ry="3.4" fill="#F7F7F5" transform="rotate(-10 142 38)"/>
          <g data-flap="7" data-o="120 58" data-ph=".25"><path d="M118 58 C116 68 108 74 100 76 C110 72 118 66 124 60Z" fill="#1C1F26" stroke="${line}" stroke-width="1.4"/></g>
          <circle cx="150" cy="42" r="1.6" fill="#000"/><circle cx="150.6" cy="41.4" r=".6" fill="#fff"/>
          <path d="M150 52 C156 53 162 52 168 49" stroke="#3A3F4A" stroke-width="1.2" fill="none"/>
        </g>`; } };

  RIG.spermwhale = { w: 220, h: 96, swim: true, T: 1.3, ground: 94, stride: 0, lift: 0, bob: 1.6, pitch: 1.6, center: [110, 48], legs: [],
    draw: n => { const line = '#2E3742';
      return `<defs>${grad(n + 'b', [[0, '#7A8798'], [.55, '#5E6B7D'], [1, '#4A5566']])}</defs>
        <g data-p="body">
          <g data-flap="12" data-o="30 46"><path d="M32 44 L4 20 C6 30 10 38 16 45 C10 52 6 60 4 70 L32 50Z" fill="#47525F" stroke="${line}" stroke-width="1.4" stroke-linejoin="round"/></g>
          <path d="M22 48 C36 38 60 32 90 30 L110 26 C132 22 176 20 200 28 C210 32 210 58 200 62 C178 68 146 68 114 66 C82 66 48 62 22 48Z" fill="url(#${n}b)" stroke="${line}" stroke-width="1.6"/>
          <path d="M124 64 C146 66 174 66 192 62 L190 66 C172 70 146 70 126 68Z" fill="#9AA6B6" stroke="${line}" stroke-width="1.2"/>
          <path d="M126 63 C146 64 174 64 194 60" stroke="#2E3742" stroke-width="1.2" fill="none"/>
          <path d="M50 46 C60 42 72 42 82 44 M56 52 C66 48 80 48 90 50 M66 58 C76 54 90 54 100 56 M150 34 C160 32 172 32 184 34" stroke="#47525F" stroke-width="1.4" fill="none" opacity=".7" stroke-linecap="round"/>
          <path d="M70 34 C74 30 80 29 84 31 C80 33 76 34 70 34Z" fill="#47525F"/>
          <g data-flap="7" data-o="144 62" data-ph=".25"><path d="M142 62 C138 70 132 74 126 76 C134 74 142 70 148 64Z" fill="#47525F" stroke="${line}" stroke-width="1.3"/></g>
          <circle cx="158" cy="56" r="2" fill="#111"/><circle cx="158.7" cy="55.3" r=".7" fill="#fff"/>
        </g>`; } };

  /* ---------- birds ---------- */
  const webFootR = (c, line) => `<path d="M-3 -1.5 L12 0 L9.5 3 L-3 3Z" fill="${c}" stroke="${line}" stroke-width="1" stroke-linejoin="round"/><path d="M-1 1 L10 1" stroke="${line}" stroke-width=".6" opacity=".6"/>`;

  // One feather: a long rounded blade from its base (bx,by) pointing at angle deg.
  const f1 = v => v.toFixed(1);
  const feather = (bx, by, deg, len, w, fill, line, shaft) => {
    const a = deg * Math.PI / 180, dx = Math.cos(a), dy = Math.sin(a), nx = -dy * w, ny = dx * w, ex = bx + dx * len, ey = by + dy * len;
    return `<path d="M${f1(bx + nx)} ${f1(by + ny)} C${f1(bx + nx * 1.25 + dx * len * .5)} ${f1(by + ny * 1.25 + dy * len * .5)} ${f1(ex + nx * .9 - dx * w)} ${f1(ey + ny * .9 - dy * w)} ${f1(ex)} ${f1(ey)} C${f1(ex - nx * .7 - dx * w * .6)} ${f1(ey - ny * .7 - dy * w * .6)} ${f1(bx - nx * 1.1 + dx * len * .5)} ${f1(by - ny * 1.1 + dy * len * .5)} ${f1(bx - nx)} ${f1(by - ny)}Z" fill="${fill}" stroke="${line}" stroke-width=".8" stroke-linejoin="round"/>` +
      (shaft ? `<path d="M${f1(bx)} ${f1(by)} L${f1(bx + dx * len * .82)} ${f1(by + dy * len * .82)}" stroke="${shaft}" stroke-width=".6" opacity=".75"/>` : '');
  };
  /* A feathered wing seen from the side, raised above the back from the shoulder (x,y), span s.
     It beats by swinging up over the back and down under the belly (data-beat), and the hand
     (the long flight feathers) folds back on the way up and spreads on the way down. */
  function wing(o) {
    const { x, y, s, cov, sec, pri, line, shaft = 'rgba(255,255,255,.45)', pl = 1, fan = 1, np = 7, ns = 6, k = 2, ph = 0, lo = -.7, extra = '', sweep = -14 } = o;
    const Wx = x + .08 * s, Wy = y - .4 * s, Tx = x + .02 * s, Ty = y - .62 * s;
    let secs = '', pris = '';
    for (let i = ns - 1; i >= 0; i--) { const t = (i + .5) / ns; secs += feather(x + (Wx - x) * t, y + (Wy - y) * t, 172 + t * 14, s * (.6 - t * .1), s * .09, sec, line, shaft); }
    for (let i = 0; i < np; i++) { const t = i / (np - 1); pris += feather(Wx + (Tx - Wx) * t, Wy + (Ty - Wy) * t, 200 + t * 48 * fan, s * (.42 + .14 * t) * pl, s * .07, pri, line, shaft); }
    const P = (dx, dy) => `${f1(x + dx * s)} ${f1(y + dy * s)}`;
    const coverts = `<path d="M${P(.06, .03)} C${P(.18, -.12)} ${P(.18, -.32)} ${P(.1, -.42)} C${P(.07, -.52)} ${P(.04, -.6)} ${P(-.02, -.62)} C${P(-.14, -.52)} ${P(-.3, -.36)} ${P(-.36, -.2)} C${P(-.38, -.1)} ${P(-.3, 0)} ${P(-.2, .04)}Z" fill="${cov}" stroke="${line}" stroke-width="1.1" stroke-linejoin="round"/>
      <path d="M${P(-.26, -.08)} q${f1(s * .08)} ${f1(-s * .02)} ${f1(s * .12)} ${f1(-s * .12)} M${P(-.2, -.26)} q${f1(s * .07)} ${f1(-s * .02)} ${f1(s * .1)} ${f1(-s * .12)} M${P(-.1, -.42)} q${f1(s * .05)} ${f1(-s * .02)} ${f1(s * .08)} ${f1(-s * .1)}" stroke="${line}" stroke-width=".7" fill="none" opacity=".45"/>`;
    return `<g data-beat="${lo}" data-k="${k}" data-ph="${ph}" data-o="${x} ${y}"><g transform="rotate(${sweep} ${x} ${y})">
      <g data-flap="-16" data-k="${k}" data-ph="${ph + .25}" data-o="${f1(Wx)} ${f1(Wy)}">${pris}</g>${secs}${coverts}${extra}</g></g>`;
  }
  const flecks = (pts, c) => pts.map(([x, y]) => `<path d="M${x} ${y} q2 -1.6 4 0" stroke="${c}" stroke-width="1.2" fill="none" stroke-linecap="round"/>`).join('');

  RIG.bird = { w: 100, h: 66, fly: true, T: .55, ground: 64, bob: 1.2, pitch: 1.5, center: [48, 38], head: [64, 34], nod: 2, legs: [],
    draw: n => { const line = '#1F3A72';
      return `<defs>${grad(n + 'b', [[0, '#6E9EE8'], [.55, '#3B6FD6'], [1, '#2A55A8']])}${grad(n + 'o', [[0, '#F2A066'], [1, '#C8662A']])}${grad(n + 'c', [[0, '#8AB6F2'], [1, '#3B6FD6']])}</defs>
        <g data-p="body">
          ${wing({ x: 46, y: 31, s: 34, cov: '#2F5EB8', sec: '#24478E', pri: '#1E3C7A', line, ph: .03 })}
          <g data-p="tail" data-spring="6" data-o="30 38"><path d="M31 35 L6 30 L9 37 L5 44 L31 42Z" fill="#2A55A8" stroke="${line}" stroke-width="1.2" stroke-linejoin="round"/><path d="M9 37 L28 38" stroke="${line}" stroke-width=".8"/></g>
          <ellipse cx="48" cy="39" rx="22" ry="12.5" fill="url(#${n}b)" stroke="${line}" stroke-width="1.4"/>
          <path d="M58 30 C68 34 72 42 66 48 C58 52 46 52 36 48 C46 46 54 40 58 30Z" fill="url(#${n}o)"/>
          <path d="M39 49 C46 52 56 52 62 49" stroke="#F4F1EA" stroke-width="3" fill="none" stroke-linecap="round"/>
          <path d="M50 50.5 l-1.5 5 M54 50.5 l0 5" stroke="#3A3A44" stroke-width="1.4" stroke-linecap="round"/>
          ${wing({ x: 50, y: 32, s: 37, cov: `url(#${n}c)`, sec: '#3366C8', pri: '#2A55A8', line, shaft: '#A8C8F5' })}
          <g data-p="head">
            <circle cx="68" cy="30" r="10.5" fill="url(#${n}b)" stroke="${line}" stroke-width="1.4"/>
            <path d="M62 37 C66 41 72 41 76.5 35.5 C74 32 68 33 62 37Z" fill="url(#${n}o)"/>
            <path d="M77.5 27 L87 29.5 L77.5 32Z" fill="#2B2B30"/>
            ${eye(71, 27, 2, '#4F82DA')}
          </g>
        </g>`; } };

  RIG.parrot = { w: 124, h: 72, fly: true, T: .7, ground: 70, bob: 1.4, pitch: 1.5, center: [58, 40], head: [76, 34], nod: 2, legs: [],
    draw: n => { const line = '#7A1212';
      return `<defs>${grad(n + 'b', [[0, '#F2554A'], [.6, '#D8281E'], [1, '#A8160F']])}
          <linearGradient id="${n}c" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3DBE4A"/><stop offset=".35" stop-color="#FFD23F"/><stop offset=".7" stop-color="#E8302E"/></linearGradient></defs>
        <g data-p="body">
          ${wing({ x: 57, y: 31, s: 40, cov: '#B01E18', sec: '#1A44A0', pri: '#163A8A', line, ph: .03 })}
          <g data-p="tail" data-spring="5" data-o="36 40"><path d="M38 40 L4 56 C2 58 4 61 8 59 L40 46Z" fill="#1E5BD6" stroke="#123A8A" stroke-width="1.2"/><path d="M38 36 L2 47 C0 49 2 53 6 51 L38 43Z" fill="url(#${n}b)" stroke="${line}" stroke-width="1.2"/>
            <path d="M8 49 L34 41" stroke="#F2554A" stroke-width="1" opacity=".7"/></g>
          <ellipse cx="58" cy="40" rx="24" ry="12.5" fill="url(#${n}b)" stroke="${line}" stroke-width="1.4"/>
          <path d="M42 46 C50 50 62 50 72 45" stroke="#F87A6E" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".6"/>
          <path d="M62 52 l-2 5 M67 52 l0 5" stroke="#5A5A5A" stroke-width="1.6" stroke-linecap="round"/>
          ${wing({ x: 60, y: 32, s: 43, cov: `url(#${n}c)`, sec: '#2A66D8', pri: '#1E4FB8', line: '#5A1010', shaft: '#9CC0F5' })}
          <g data-p="head">
            <circle cx="82" cy="30" r="11.5" fill="url(#${n}b)" stroke="${line}" stroke-width="1.4"/>
            <path d="M76 26 C80 22 86 22 89.5 25 C89 31 84 34 77 32Z" fill="#F7F2EC"/>
            <path d="M78.5 29.5 l7 -.5 M79 31.5 l6 0" stroke="#C8201A" stroke-width=".6"/>
            <path d="M90 24 C100 23 105 31 100 40 C98 35 94 33 90 33Z" fill="#EDE4D2" stroke="#8A7A66" stroke-width="1"/>
            <path d="M91 33 C95 34 97 37 96 40 C93 39 91 36 90 34Z" fill="#2B2B2B"/>
            ${eye(84, 27, 2, '#F7F2EC')}
          </g>
        </g>`; } };

  const owlDraw = (n, c) => `<defs>${grad(n + 'b', [[0, c.b0], [1, c.b1]])}${grad(n + 'c', [[0, c.c0], [1, c.c1]])}</defs>
        <g data-p="body">
          ${wing({ x: 59, y: 41, s: 44, cov: c.fc, sec: c.fs, pri: c.fp, line: c.line, ph: .03, pl: .9, fan: .8 })}
          <path d="M32 52 L12 48 L16 58 L32 60Z" fill="${c.tail}" stroke="${c.line}" stroke-width="1.3" stroke-linejoin="round"/>
          <ellipse cx="56" cy="54" rx="27" ry="18" fill="url(#${n}b)" stroke="${c.line}" stroke-width="1.4"/>
          ${c.belly}
          ${flecks([[44, 50], [54, 46], [62, 54], [48, 60], [38, 56], [58, 62]], c.fleck)}
          <path d="M60 71 l-2 6 M64 71 l0 6 M68 71 l2 6" stroke="#4A3F30" stroke-width="1.6" stroke-linecap="round"/>
          ${wing({ x: 62, y: 42, s: 47, cov: `url(#${n}c)`, sec: c.s, pri: c.p, line: c.line, shaft: c.shaft, pl: .9, fan: .8,
            extra: flecks([[60, 30], [64, 22], [56, 36], [58, 26]], c.fleck) })}
          <g data-p="head">${c.head}</g>
        </g>`;

  RIG.owl = { w: 120, h: 92, fly: true, T: .9, ground: 90, bob: 1.6, pitch: 1.5, center: [60, 50], head: [78, 44], nod: 2, legs: [],
    draw: n => owlDraw(n, { line: '#4A3420', b0: '#B08C66', b1: '#7A5A3C', c0: '#B8946C', c1: '#8A6A48', fc: '#5E4530', fs: '#55402C', fp: '#4A3826', s: '#8A6A48', p: '#6E5236',
      shaft: '#E7D3B0', fleck: '#E7D3B0', tail: '#6A4F34', belly: `<path d="M44 66 C54 72 70 70 78 60" stroke="#E7D3B0" stroke-width="6" fill="none" stroke-linecap="round" opacity=".7"/>`,
      head: `<path d="M68 28 L63 12 L75 23Z M84 23 L88 8 L92 25Z" fill="#6A4F34" stroke="#4A3420" stroke-width="1.2" stroke-linejoin="round"/>
            <circle cx="80" cy="38" r="16" fill="url(#${n}b)" stroke="#4A3420" stroke-width="1.4"/>
            <circle cx="84" cy="37" r="10" fill="#D9A066" stroke="#7A5A3C" stroke-width="1.2"/>
            <circle cx="86" cy="35" r="4.6" fill="#F5A818" stroke="#A86E08" stroke-width=".8"/><circle cx="86.5" cy="35" r="2.4" fill="#111"/><circle cx="87.4" cy="34" r=".8" fill="#fff"/>
            <ellipse data-p="lid" cx="86" cy="35" rx="5.2" ry="5.2" fill="#C88E56" style="transform-origin:86px 29.8px;transform:scaleY(0)"/>
            <path d="M92 40 L97 43 L91.5 45Z" fill="#3A2C20"/>
            <path d="M79 31 C83 29 88 29 92 31" stroke="#5E4530" stroke-width="1.4" fill="none" stroke-linecap="round"/>
            ${flecks([[70, 30], [74, 44]], '#E7D3B0')}` }) };

  RIG.snowyowl = { w: 120, h: 92, fly: true, T: .9, ground: 90, bob: 1.6, pitch: 1.5, center: [60, 50], head: [78, 44], nod: 2, legs: [],
    draw: n => owlDraw(n, { line: '#6E7885', b0: '#FFFFFF', b1: '#DDE2E8', c0: '#FFFFFF', c1: '#E6EAEF', fc: '#D2D8DF', fs: '#D8DEE5', fp: '#CDD3DB', s: '#F2F4F7', p: '#E6EAEF',
      shaft: '#B8C0CA', fleck: '#3A3F48', tail: '#E6EAEF', belly: '',
      head: `<circle cx="80" cy="38" r="16" fill="url(#${n}b)" stroke="#6E7885" stroke-width="1.4"/>
            <circle cx="84" cy="37" r="9.5" fill="#FFFFFF"/>
            <circle cx="86" cy="35" r="4.6" fill="#F5C518" stroke="#B8920E" stroke-width=".8"/><circle cx="86.5" cy="35" r="2.3" fill="#111"/><circle cx="87.4" cy="34" r=".8" fill="#fff"/>
            <ellipse data-p="lid" cx="86" cy="35" rx="5.2" ry="5.2" fill="#F2F4F7" style="transform-origin:86px 29.8px;transform:scaleY(0)"/>
            <path d="M92 40 L97 43 L91.5 45Z" fill="#3A3F48"/>
            ${flecks([[72, 28], [78, 24]], '#3A3F48')}` }) };

  RIG.eagle = { w: 160, h: 86, fly: true, T: 1.1, ground: 84, bob: 1.8, pitch: 1.2, center: [70, 46], head: [102, 44], nod: 1.5, legs: [],
    draw: n => { const line = '#24160A';
      return `<defs>${grad(n + 'b', [[0, '#7A5232'], [.6, '#55361E'], [1, '#3A2414']])}${grad(n + 'c', [[0, '#8A6040'], [1, '#55361E']])}${grad(n + 'h', [[0, '#FFFFFF'], [1, '#DEDDD4']])}</defs>
        <g data-p="body">
          ${wing({ x: 67, y: 39, s: 54, cov: '#3A2414', sec: '#2E1D10', pri: '#22150A', line, k: 1, lo: -.6, ph: .03, pl: 1.15, fan: .9, np: 6 })}
          <g data-p="tail" data-spring="4" data-o="34 47"><path d="M35 43 L6 36 C3 41 3 49 6 54 L35 51Z" fill="url(#${n}h)" stroke="#7A7A70" stroke-width="1.2"/><path d="M8 41 L30 45 M8 49 L30 49" stroke="#A8A8A0" stroke-width=".8"/></g>
          <path d="M30 46 C36 34 56 32 78 36 C94 39 102 44 102 50 C98 56 82 58 62 56 C46 55 34 52 30 46Z" fill="url(#${n}b)" stroke="${line}" stroke-width="1.5"/>
          <path d="M62 56 l-3 7 l4 -1 l1 4 l2 -6 M74 56 l-1 7 l4 -1 l2 3 l1 -6" stroke="#E8AE14" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
          ${wing({ x: 71, y: 40, s: 58, cov: `url(#${n}c)`, sec: '#3E2A16', pri: '#2A1A0E', line, shaft: '#8A6444', k: 1, lo: -.6, pl: 1.15, fan: .9, np: 6 })}
          <g data-p="head">
            <path d="M94 44 C96 34 106 28 116 29 C125 30 130 36 128 42 C124 48 110 52 98 52Z" fill="url(#${n}h)" stroke="#6E6E66" stroke-width="1.3"/>
            <path d="M124 33 C132 32 138 36 137 43 C134 42 130 41 126 40Z" fill="#F2B81B" stroke="#A67A08" stroke-width="1"/>
            <path d="M136.5 42 C136 45 133.5 46 131.5 45" stroke="#A67A08" stroke-width="1.6" fill="none" stroke-linecap="round"/>
            <path d="M126 40 C129 41 132 41 135 41" stroke="#A67A08" stroke-width=".9" fill="none"/>
            <circle cx="118" cy="34" r="2.9" fill="#E8C23A"/>${eye(118, 34, 1.6, '#F4F4EE')}
            <path d="M112.5 31 C116 29 120 29 123.5 32" stroke="#4A4A44" stroke-width="1.7" fill="none" stroke-linecap="round"/>
          </g>
        </g>`; } };

  RIG.phoenix = { w: 170, h: 104, fly: true, T: .85, ground: 100, bob: 1.6, pitch: 1.5, center: [80, 52], head: [112, 46], nod: 2, legs: [],
    draw: n => { const line = '#7A1A0A';
      const plume = (d, amp, o) => `<g data-spring="${amp}" data-o="${o}"><path d="${d}" fill="url(#${n}t)" stroke="${line}" stroke-width="1.1" stroke-linejoin="round"/></g>`;
      return `<defs>${grad(n + 'b', [[0, '#FF6A3A'], [.6, '#E8402A'], [1, '#B02A18']])}${grad(n + 'w', [[0, '#FFE15A'], [.3, '#FFB02E'], [.6, '#FF7A1F'], [1, '#E8402A']])}${grad(n + 'c', [[0, '#FF8A3A'], [1, '#E8402A']])}
          <linearGradient id="${n}t" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#E8402A"/><stop offset=".55" stop-color="#FF8A1F"/><stop offset="1" stop-color="#FFE15A"/></linearGradient>
          <radialGradient id="${n}g" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#FFB04A" stop-opacity=".45"/><stop offset="1" stop-color="#FF6A2A" stop-opacity="0"/></radialGradient></defs>
        <ellipse cx="86" cy="50" rx="78" ry="44" fill="url(#${n}g)"/>
        <g data-p="body">
          ${wing({ x: 76, y: 43, s: 50, cov: '#B02A18', sec: '#C8501A', pri: '#D8781A', line, ph: .03, pl: 1.1 })}
          ${plume('M48 54 C30 54 16 64 6 80 C2 86 8 90 13 84 C22 72 34 64 48 60Z', 10, '46 56')}
          ${plume('M46 52 C28 46 14 50 2 60 C-2 64 2 68 7 65 C18 58 30 56 46 57Z', 7, '46 54')}
          ${plume('M50 58 C38 64 30 76 28 94 C28 100 34 100 35 94 C37 80 42 70 52 62Z', 13, '50 60')}
          <circle cx="11" cy="84" r="3" fill="#FFF3B0" stroke="${line}" stroke-width=".8"/><circle cx="31" cy="96" r="2.6" fill="#FFF3B0" stroke="${line}" stroke-width=".8"/>
          <path d="M40 54 C46 42 66 40 86 44 C102 47 110 52 110 58 C106 64 90 66 70 64 C54 63 42 60 40 54Z" fill="url(#${n}b)" stroke="${line}" stroke-width="1.5"/>
          <path d="M54 62 C68 66 88 66 104 60" stroke="#FFD23F" stroke-width="3.6" fill="none" stroke-linecap="round" opacity=".85"/>
          <path d="M74 64 l-2 6 M80 64 l0 6" stroke="#8A2A10" stroke-width="1.8" stroke-linecap="round"/>
          ${wing({ x: 80, y: 44, s: 54, cov: `url(#${n}c)`, sec: '#FF8A1F', pri: '#FFC23A', line, shaft: '#FFF3B0', pl: 1.1 })}
          <g data-p="head">
            <g data-spring="9" data-o="116 34"><path d="M114 36 L104 18 L116 28 L112 10 L122 28 L130 14 L127 34Z" fill="url(#${n}w)" stroke="${line}" stroke-width="1.1" stroke-linejoin="round"/></g>
            <path d="M104 48 C106 38 116 34 124 36 C132 38 136 44 134 50 C128 54 116 56 106 54Z" fill="url(#${n}b)" stroke="${line}" stroke-width="1.4"/>
            <path d="M132 40 C140 40 145 44 143 50 C140 49 136 48 133 47Z" fill="#FFD23F" stroke="#B07A08" stroke-width="1"/>
            <path d="M142.5 49 C142 51.5 140 52.5 138 52" stroke="#B07A08" stroke-width="1.4" fill="none" stroke-linecap="round"/>
            <circle cx="123" cy="42" r="3" fill="#FFD23F"/>${eye(123, 42, 1.8, '#E8402A')}
          </g>
        </g>`; } };

  RIG.chicken = { w: 130, h: 130, T: .5, ground: 122, stride: 16, lift: 10, bob: 1.6, stance: .55, pitch: 1.5, center: [64, 74], head: [90, 58], pump: true, wag: 2,
    legs: [
      { far: true, hip: [60, 96], len: [14, 14], w: [4.4, 3.4], back: false, phase: .5, curl: -40, fill: '#D99012', line: '#8A5A08', foot: toes('#D99012') },
      { hip: [70, 96], len: [14, 14], w: [4.8, 3.8], back: false, phase: 0, curl: -40, fill: '#F2A71B', line: '#8A5A08', foot: toes('#F2A71B') }],
    draw: n => { const line = '#5A2A0E';
      return `<defs><radialGradient id="${n}b" cx=".55" cy=".35" r=".85"><stop offset="0" stop-color="#E8955A"/><stop offset=".55" stop-color="#C0602A"/><stop offset="1" stop-color="#7A3410"/></radialGradient>
          ${grad(n + 'n', [[0, '#F0B060'], [1, '#C8702E']])}<radialGradient id="${n}h" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#E89A5A"/><stop offset="1" stop-color="#B85A22"/></radialGradient>${grad(n + 'r', [[0, '#F0524A'], [1, '#B71C1C']])}</defs>
        <ellipse cx="66" cy="123" rx="30" ry="4" fill="#000" opacity=".13"/>
        <g data-l="far"></g>
        <g data-p="body">
          <g data-p="tail" data-spring="5" data-o="38 64">
            <path d="M36 64 C22 56 16 42 18 30 C26 36 32 46 40 58Z" fill="#3A2412" stroke="${line}" stroke-width="1.2"/>
            <path d="M38 66 C28 56 24 40 28 26 C34 34 38 44 42 56Z" fill="#24382A" stroke="#14201A" stroke-width="1.2"/>
            <path d="M42 62 C36 50 36 38 42 28 C46 38 48 50 48 58Z" fill="#2E4A34" stroke="#14201A" stroke-width="1.2"/>
          </g>
          <path d="M32 72 C30 56 44 48 62 50 C80 52 96 58 98 74 C100 90 84 100 64 100 C46 100 34 90 32 72Z" fill="url(#${n}b)" stroke="${line}" stroke-width="1.6"/>
          <path d="M46 70 C54 60 74 62 82 72 C80 82 68 86 54 84 C48 80 45 75 46 70Z" fill="#9E4A1C" stroke="${line}" stroke-width="1.3"/>
          <path d="M52 74 C60 72 70 73 78 76 M54 79 C62 78 70 79 76 81" stroke="#D88A50" stroke-width="1.3" fill="none" stroke-linecap="round" opacity=".7"/>
          <path d="M80 72 C82 62 84 52 88 46 L100 50 C98 58 96 66 94 76Z" fill="url(#${n}n)" stroke="${line}" stroke-width="1.3" stroke-linejoin="round"/>
          <path d="M84 60 l4 6 M88 56 l4 7 M86 66 l4 6" stroke="#9E4A1C" stroke-width="1" opacity=".55"/>
          <g data-p="head">
            <g data-spring="8" data-o="94 35"><path d="M87 36 C86 29 90 27 92 31 C93 25 98 25 98 30 C100 26 105 28 103 35Z" fill="url(#${n}r)" stroke="#8A1414" stroke-width="1"/></g>
            <circle cx="96" cy="44" r="10" fill="url(#${n}h)" stroke="${line}" stroke-width="1.4"/>
            <path d="M104.5 41 L113 44.5 L104.5 48Z" fill="#F4B51B" stroke="#A67A08" stroke-width=".9" stroke-linejoin="round"/>
            <g data-spring="11" data-o="103 49"><path d="M103 48.5 C105 56 101 59 98.5 54.5 C98.5 51 100.5 49 103 48.5Z" fill="url(#${n}r)" stroke="#8A1414" stroke-width=".9"/></g>
            <ellipse cx="94" cy="48" rx="2.2" ry="1.8" fill="#F4EDE0"/>
            ${eye(99.5, 41, 1.9, '#D07A3A')}
          </g>
        </g>
        <g data-l="near"></g>`; } };

  RIG.duck = { w: 120, h: 96, T: .46, ground: 90, stride: 12, lift: 7, bob: 1.2, stance: .55, pitch: 5, center: [56, 70], head: [76, 46], nod: 3, wag: 3,
    legs: [
      { far: true, hip: [50, 72], len: [9.5, 10], w: [4, 3.2], back: false, phase: .5, curl: -30, fill: '#D9741A', line: '#8A4A0E', foot: webFootR('#D9741A', '#8A4A0E') },
      { hip: [60, 72], len: [9.5, 10], w: [4.4, 3.6], back: false, phase: 0, curl: -30, fill: '#F08A24', line: '#8A4A0E', foot: webFootR('#F08A24', '#8A4A0E') }],
    draw: n => { const line = '#3E3630';
      return `<defs>${grad(n + 'b', [[0, '#C8C0B4'], [1, '#8C8276']])}${grad(n + 'g', [[0, '#3AA05A'], [1, '#14502A']])}${grad(n + 'c', [[0, '#9A5034'], [1, '#6A3420']])}</defs>
        <ellipse cx="58" cy="91" rx="30" ry="3.6" fill="#000" opacity=".13"/>
        <g data-l="far"></g>
        <g data-p="body">
          <g data-p="tail" data-spring="6" data-o="22 60"><path d="M22 57 L7 51 L11 59 L6 65 L22 65Z" fill="#E4E0D8" stroke="${line}" stroke-width="1.2" stroke-linejoin="round"/>
            <path d="M25 54 C19 48 21 41 27 43" stroke="#1D1D1D" stroke-width="2.4" fill="none" stroke-linecap="round"/></g>
          <path d="M18 62 C16 50 32 44 52 46 C70 48 84 54 84 64 C82 76 64 80 46 78 C30 77 20 72 18 62Z" fill="url(#${n}b)" stroke="${line}" stroke-width="1.5"/>
          <path d="M64 50 C78 52 86 60 84 68 C80 75 72 75 68 70 C66 64 63 56 64 50Z" fill="url(#${n}c)" stroke="${line}" stroke-width="1.2"/>
          <path d="M30 57 C40 49 62 51 70 59 C64 67 48 69 34 65Z" fill="#9C9284" stroke="${line}" stroke-width="1.2"/>
          <path d="M30 57 L20 55 L31 64Z" fill="#3E3A36"/>
          <path d="M46 61.5 L58 60 L59 64 L47 65.5Z" fill="#2E5BD6" stroke="#F4F4F0" stroke-width=".9"/>
          <path d="M66 52 C66 42 70 34 74 30 L84 32 C82 40 80 46 78 54Z" fill="url(#${n}g)" stroke="#0E3A1E" stroke-width="1.2" stroke-linejoin="round"/>
          <path d="M66.5 48.5 C71 50.5 76 50.5 79.5 48.5" stroke="#FFFFFF" stroke-width="2.4" fill="none" stroke-linecap="round"/>
          <g data-p="head">
            <ellipse cx="80" cy="28" rx="10.5" ry="9" fill="url(#${n}g)" stroke="#0E3A1E" stroke-width="1.3"/>
            <path d="M88 25.5 C94 25.5 100 27.5 102 30.5 C100 34 94 34 88 32Z" fill="#E8C23A" stroke="#9A7A10" stroke-width="1"/>
            <ellipse cx="100.5" cy="30.5" rx="1.4" ry="1.6" fill="#3A3420"/>
            ${eye(83, 25, 1.8, '#1F6B3A')}
          </g>
        </g>
        <g data-l="near"></g>`; } };

  RIG.penguin = { w: 90, h: 116, T: .5, ground: 110, stride: 8, lift: 4, bob: 1.2, stance: .6, pitch: 7, center: [46, 104], head: [50, 40], nod: 2, wag: 3,
    legs: [
      { far: true, hip: [38, 100], len: [4.6, 5], w: [6, 5], phase: .5, curl: 10, fill: '#3A3F48', line: '#1A1E24', foot: `<ellipse cx="4" cy="-1" rx="7" ry="2.6" fill="#C8641A" stroke="#7A3A08" stroke-width="1"/>` },
      { hip: [52, 100], len: [4.6, 5], w: [6.5, 5.5], phase: 0, curl: 10, fill: '#3A3F48', line: '#1A1E24', foot: `<ellipse cx="4" cy="-1" rx="7" ry="2.6" fill="#E8822A" stroke="#7A3A08" stroke-width="1"/>` }],
    draw: n => { const line = '#10141C';
      return `<defs>${grad(n + 'b', [[0, '#3A4252'], [1, '#161A24']], false)}${grad(n + 'f', [[0, '#FFFFFF'], [1, '#DCE0E6']])}</defs>
        <ellipse cx="46" cy="111" rx="24" ry="3.6" fill="#000" opacity=".13"/>
        <g data-l="far"></g>
        <g data-p="body">
          <g data-flap="14" data-w="" data-o="38 52" data-ph=".5"><path d="M38 50 C30 64 28 78 32 88 C38 78 42 66 44 54Z" fill="#1A1E28" stroke="${line}" stroke-width="1.2"/></g>
          <path d="M30 100 L18 108 L34 105Z" fill="#1A1E28" stroke="${line}" stroke-width="1.2" stroke-linejoin="round"/>
          <path d="M28 102 C16 84 16 52 32 34 C40 26 56 26 62 36 C70 52 72 82 64 102 C54 108 38 108 28 102Z" fill="url(#${n}b)" stroke="${line}" stroke-width="1.5"/>
          <path d="M42 104 C60 100 68 78 66 56 C64 46 60 42 56 42 C52 60 50 86 42 104Z" fill="url(#${n}f)"/>
          <path d="M55.5 42 C62 44 66 50 66.5 58 C62 53 58 49 55 47Z" fill="#F6D36A" opacity=".85"/>
          <g data-flap="16" data-w="" data-o="46 54"><path d="M46 52 C38 66 36 80 40 92 C46 82 50 70 52 58Z" fill="#232836" stroke="${line}" stroke-width="1.3"/>
            <path d="M47 58 C42 68 40 78 41 88" stroke="#5A6272" stroke-width="1" fill="none" opacity=".7"/></g>
          <g data-p="head">
            <ellipse cx="50" cy="32" rx="15" ry="13" fill="url(#${n}b)" stroke="${line}" stroke-width="1.4"/>
            <path d="M50 41 C56 38 62 40 64.5 46 C60 46.5 55 44.5 50 41Z" fill="#F2A33A"/>
            <path d="M62 29 C68 29 74 31 78 34.5 C72 36 66 36 62 35Z" fill="#20242E" stroke="${line}" stroke-width="1"/>
            <path d="M63 34 C68 35 72 35 76 34.8" stroke="#E8742A" stroke-width="1.6" fill="none" stroke-linecap="round"/>
            <circle cx="57" cy="28.5" r="2.9" fill="#4A5262"/>${eye(57, 28.5, 1.9, '#2A3040')}
          </g>
        </g>
        <g data-l="near"></g>`; } };

  RIG.flamingo = { w: 120, h: 160, T: .85, ground: 154, stride: 28, lift: 14, bob: 1.6, stance: .6, pitch: 1, center: [56, 74], head: [76, 66], nod: 1.5, wag: 2,
    legs: [
      { far: true, hip: [54, 84], len: [35, 37], w: [4, 3.4], back: false, phase: .5, curl: -30, fill: '#D8668A', line: '#8E2E50', foot: `<path d="M-3 -1 L11 0 L8 2.4 L-3 2.4Z" fill="#D8668A" stroke="#8E2E50" stroke-width="1" stroke-linejoin="round"/>` },
      { hip: [62, 84], len: [35, 37], w: [4.4, 3.6], back: false, phase: 0, curl: -30, fill: '#F27B9E', line: '#8E2E50', foot: `<path d="M-3 -1 L11 0 L8 2.4 L-3 2.4Z" fill="#F27B9E" stroke="#8E2E50" stroke-width="1" stroke-linejoin="round"/>` }],
    draw: n => { const line = '#A8406A';
      return `<defs><radialGradient id="${n}b" cx=".55" cy=".3" r=".85"><stop offset="0" stop-color="#FFC6D6"/><stop offset=".55" stop-color="#FF8FB1"/><stop offset="1" stop-color="#E0608A"/></radialGradient></defs>
        <ellipse cx="60" cy="155" rx="28" ry="4" fill="#000" opacity=".13"/>
        <g data-l="far"></g>
        <g data-p="body">
          <g data-p="tail" data-spring="5" data-o="26 74"><path d="M26 70 L10 64 L16 72 L8 77 L26 79Z" fill="#E85A88" stroke="${line}" stroke-width="1.2" stroke-linejoin="round"/></g>
          <path d="M22 74 C20 60 38 52 58 54 C76 56 88 64 86 76 C82 88 64 92 46 90 C32 88 24 84 22 74Z" fill="url(#${n}b)" stroke="${line}" stroke-width="1.5"/>
          <path d="M30 66 C42 58 60 60 68 70 C60 80 44 82 32 76Z" fill="#F2648F" stroke="${line}" stroke-width="1.2"/>
          <path d="M33 76 C27 78 20 78 15 76 C21 72 27 70 32 70Z" fill="#2B2B2B"/>
          <path d="M38 68 C46 64 56 65 62 70" stroke="#FFB8CC" stroke-width="1.3" fill="none" stroke-linecap="round" opacity=".8"/>
          <g data-p="head">
            <path d="M76 64 C90 54 88 40 80 32 C72 24 74 12 84 10 C92 9 96 14 96 18" stroke="${line}" stroke-width="9.6" fill="none" stroke-linecap="round"/>
            <path d="M76 64 C90 54 88 40 80 32 C72 24 74 12 84 10 C92 9 96 14 96 18" stroke="#FF9DBA" stroke-width="7" fill="none" stroke-linecap="round"/>
            <ellipse cx="92" cy="16" rx="7.5" ry="6.5" fill="#FF9DBA" stroke="${line}" stroke-width="1.3"/>
            <path d="M96 12 C104 12 110 18 110 26 C107 23 102 21 97 21Z" fill="#FBE9EE" stroke="${line}" stroke-width="1"/>
            <path d="M106.5 19.5 C109 21.5 110 24 110 26 C107 24 105 22 104.5 19.8Z" fill="#222"/>
            ${eye(92.5, 14, 1.6, '#FF9DBA')}
          </g>
        </g>
        <g data-l="near"></g>`; } };

  RIG.roadrunner = { w: 140, h: 104, T: .3, ground: 98, stride: 34, lift: 14, bob: 1.4, stance: .5, pitch: 1.2, center: [70, 56], head: [100, 40], nod: 3, wag: 3,
    legs: [
      { far: true, hip: [64, 64], len: [17, 18], w: [4, 3.2], back: false, phase: .5, curl: -45, fill: '#46525E', line: '#28303A', foot: toes('#46525E') },
      { hip: [72, 64], len: [17, 18], w: [4.4, 3.6], back: false, phase: 0, curl: -45, fill: '#5B6B7A', line: '#28303A', foot: toes('#5B6B7A') }],
    draw: n => { const line = '#3A2816';
      return `<defs>${grad(n + 'b', [[0, '#9E7E56'], [1, '#634528']])}</defs>
        <ellipse cx="72" cy="99" rx="34" ry="4" fill="#000" opacity=".13"/>
        <g data-l="far"></g>
        <g data-p="body">
          <g data-p="tail" data-spring="8" data-o="44 52">
            <path d="M46 56 L4 34 C2 32 4 28 8 30 L50 50Z" fill="#7A5A3A" stroke="${line}" stroke-width="1.2"/>
            <path d="M46 50 L6 22 C4 20 6 16 10 18 L50 44Z" fill="#4A3422" stroke="${line}" stroke-width="1.2"/>
            <path d="M8 20.5 l4 -.5 M6 32.5 l4 -.5" stroke="#fff" stroke-width="2" stroke-linecap="round"/></g>
          <path d="M40 56 C42 42 60 38 78 40 C90 41 96 48 96 54 C94 64 76 70 58 68 C46 67 39 62 40 56Z" fill="url(#${n}b)" stroke="${line}" stroke-width="1.5"/>
          <path d="M52 66 C66 68 82 62 92 56 C88 64 74 70 58 68Z" fill="#E2D1AE"/>
          <path d="M56 46 C66 40 80 42 86 50 C78 56 66 56 56 52Z" fill="#4A3422" stroke="${line}" stroke-width="1.1"/>
          <path d="M60 48 l5 1.5 M68 46 l5 1.5 M64 52 l5 1 M74 50 l5 1.5 M46 52 l6 2 M48 58 l6 2 M84 58 l5 1" stroke="#E2D1AE" stroke-width="1.5" stroke-linecap="round"/>
          <path d="M86 46 C90 38 94 34 98 32 L106 38 C102 40 98 46 94 52Z" fill="url(#${n}b)" stroke="${line}" stroke-width="1.2" stroke-linejoin="round"/>
          <path d="M90 44 l3 2 M94 40 l3 2" stroke="#E2D1AE" stroke-width="1.2" stroke-linecap="round"/>
          <g data-p="head">
            <g data-spring="10" data-o="99 30"><path d="M96 31 L92 15 L98 24 L100 10 L104 24 L109 16 L107 31Z" fill="#3A2816" stroke="${line}" stroke-width="1" stroke-linejoin="round"/>
              <path d="M98 24 l.6 -6 M103 24 l1.6 -4" stroke="#C8A878" stroke-width=".8"/></g>
            <ellipse cx="104" cy="34" rx="9" ry="7.5" fill="url(#${n}b)" stroke="${line}" stroke-width="1.3"/>
            <path d="M111 31 L132 34 L111 38Z" fill="#3A3A3A" stroke="#1E1E1E" stroke-width=".9" stroke-linejoin="round"/>
            <path d="M100 30 C104 28.8 108 30.5 109.5 33" stroke="#3AA0FF" stroke-width="1.8" fill="none" stroke-linecap="round"/>
            <path d="M103 37.5 C105 39.5 108 39.5 110 37.5" stroke="#FF7A1A" stroke-width="1.8" fill="none" stroke-linecap="round"/>
            ${eye(105, 32.5, 1.8, '#8A6A44')}
          </g>
        </g>
        <g data-l="near"></g>`; } };

  /* ---------- farm, pets and garden animals ---------- */
  const smallPaw = (c, line) => `<ellipse cx="1.6" cy="-1" rx="3.4" ry="1.9" fill="${c}" stroke="${line}" stroke-width="1"/>`;
  const woolPuffs = (n, puffs, line) => puffs.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r + 1.6}" fill="${line}"/>`).join('') + puffs.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#${n}w)"/>`).join('');

  { const line = '#5A4430';
  RIG.bunny = { w: 130, h: 92, T: .55, ground: 86, stride: 18, lift: 4, hop: 12, stance: .5, bob: .6, nod: 2, pitch: 4, center: [60, 62], head: [88, 50], wag: 5,
    legs: [
      { far: true, hip: [46, 66], len: [10, 11], w: [8, 6], reach: -2, phase: 0, curl: 20, muscle: [12, 11, 0], fill: '#8C7258', line, foot: paw('#8C7258', line, 13) },
      { far: true, hip: [80, 68], len: [8.5, 9], w: [6, 5], reach: 2, phase: .1, curl: 30, fill: '#8C7258', line, foot: tinyPaw('#B8A088', line) },
      { hip: [40, 66], len: [10, 11], w: [9, 7], reach: -2, phase: .02, curl: 20, muscle: [14, 13, 0], fill: '#A68A6D', line, foot: paw('#C8B096', line, 13) },
      { hip: [86, 68], len: [8.5, 9], w: [6.5, 5.5], reach: 2, phase: .12, curl: 30, fill: '#A68A6D', line, foot: tinyPaw('#D8C4AC', line) }],
    draw: n => `<defs><radialGradient id="${n}b" cx=".45" cy=".3" r=".8"><stop offset="0" stop-color="#C8AC8C"/><stop offset=".6" stop-color="#A68A6D"/><stop offset="1" stop-color="#7E6448"/></radialGradient></defs>
        <ellipse cx="62" cy="87" rx="32" ry="4" fill="#000" opacity=".13"/>
        <g data-l="far"></g>
        <g data-p="body">
          <g data-p="tail" data-spring="14" data-o="28 58"><circle cx="26" cy="56" r="8.2" fill="${line}"/><circle cx="26" cy="56" r="6.8" fill="#FBF7F0"/></g>
          <path d="M26 62 C24 44 40 34 60 36 C78 38 90 46 90 58 C90 72 76 78 58 78 C40 78 28 74 26 62Z" fill="url(#${n}b)" stroke="${line}" stroke-width="1.6"/>
          <path d="M40 74 C54 80 74 80 86 72 C80 78 66 80 54 79 C46 78 42 76 40 74Z" fill="#E8DCCB"/>
          <g data-p="head">
            <g data-spring="8" data-o="88 38"><path d="M86 38 C80 26 78 12 82 6 C86 4 90 12 92 24 C93 30 92 36 90 40Z" fill="#8C7258" stroke="${line}" stroke-width="1.4"/></g>
            <ellipse cx="96" cy="50" rx="15" ry="12.5" fill="url(#${n}b)" stroke="${line}" stroke-width="1.5"/>
            <ellipse cx="102" cy="56" rx="8" ry="5" fill="#E8DCCB" opacity=".75"/>
            <g data-spring="10" data-o="95 40"><path d="M92 40 C88 26 88 10 94 4 C99 2 102 12 102 26 C102 32 100 38 97 42Z" fill="url(#${n}b)" stroke="${line}" stroke-width="1.4"/>
              <path d="M94.5 36 C92.5 26 92.5 14 95.5 8 C98 10 99 20 98 32Z" fill="#E8B4B0"/></g>
            <path d="M110.5 47 l-3 -1.6 h5Z" fill="#D88A90"/>
            <path d="M109 48.5 C108.5 51.5 106 52.5 104 51" stroke="${line}" stroke-width="1" fill="none" stroke-linecap="round"/>
            <path d="M104 53 l12 -2 M104 54.5 l12 1.5" stroke="#6A5440" stroke-width=".6"/>
            ${eye(101, 45, 2.8, '#B09070')}
          </g>
        </g>
        <g data-l="near"></g>` }; }

  { const line = '#6A3A14';
  RIG.cat = { w: 150, h: 104, T: .56, ground: 98, stride: 22, lift: 8, bob: 1.2, nod: 1.6, pitch: .6, center: [78, 62], head: [116, 52], wag: 3,
    legs: [
      { far: true, hip: [56, 68], len: [15, 16], w: [9, 7], reach: -2, phase: .5, muscle: [9, 12, 3], fill: '#C47A34', line, foot: paw('#C47A34', line, 8) },
      { far: true, hip: [104, 68], len: [15, 16], w: [8.5, 7], reach: 2, phase: .75, fill: '#C47A34', line, foot: paw('#C47A34', line, 8) },
      { hip: [50, 68], len: [15, 16], w: [10, 7.5], reach: -2, phase: 0, muscle: [11, 13, 3], fill: 'url(#CTL)', line, foot: paw('#F2C890', line, 8) },
      { hip: [110, 68], len: [15, 16], w: [9, 7.5], reach: 2, phase: .25, fill: 'url(#CTL)', line, foot: paw('#F2C890', line, 8) }],
    draw: n => `<defs>${ugrad('CTL', 64, 98, '#E8A458', '#C47A34')}${grad(n + 'b', [[0, '#F2B468'], [.55, '#E39A4A'], [1, '#B86E2C']])}
          <radialGradient id="${n}h" cx=".45" cy=".35" r=".8"><stop offset="0" stop-color="#F6C27E"/><stop offset="1" stop-color="#D88A3E"/></radialGradient></defs>
        <ellipse cx="80" cy="99" rx="46" ry="4.5" fill="#000" opacity=".13"/>
        <g data-l="far"></g>
        <g data-p="body">
          <g data-p="tail" data-spring="12" data-o="44 56"><path d="M46 58 C32 56 22 46 20 32 C19 22 24 16 30 16 C34 17 33 21 30 24 C27 32 30 44 46 52Z" fill="url(#${n}b)" stroke="${line}" stroke-width="1.5" stroke-linejoin="round"/>
            <path d="M23 30 l6 1 M22 38 l7 0 M26 46 l7 -2" stroke="#A85E22" stroke-width="2" stroke-linecap="round"/></g>
          <path d="M42 60 C44 46 66 42 88 44 C106 45 116 48 120 56 C124 66 118 76 104 78 C88 80 66 80 52 78 C42 76 40 68 42 60Z" fill="url(#${n}b)" stroke="${line}" stroke-width="1.6"/>
          <path d="M56 76 C72 80 94 80 108 76" stroke="#F8DDB4" stroke-width="4" fill="none" stroke-linecap="round" opacity=".8"/>
          <path d="M60 46 C62 52 62 56 60 60 M72 44 C74 50 74 56 72 61 M84 44 C86 50 86 56 84 62 M96 45 C98 51 98 56 96 62" stroke="#B0642A" stroke-width="2.6" fill="none" stroke-linecap="round" opacity=".7"/>
          <g data-p="head">
            <path d="M110 38 L112 18 L123 31Z" fill="#C47A34" stroke="${line}" stroke-width="1.3" stroke-linejoin="round"/>
            <path d="M108 44 C108 32 120 26 132 28 C144 30 150 38 150 46 C150 56 140 62 128 62 C116 62 108 54 108 44Z" fill="url(#${n}h)" stroke="${line}" stroke-width="1.5"/>
            <g data-spring="6" data-o="132 31"><path d="M124 32 L132 13 L140 32Z" fill="url(#${n}h)" stroke="${line}" stroke-width="1.3" stroke-linejoin="round"/><path d="M128 30 L132 20 L136 30Z" fill="#F2A8A0"/></g>
            <path d="M136 48 C140 46 148 46 150 50 C150 56 144 60 138 58 C134 56 134 50 136 48Z" fill="#FBE8CC"/>
            <path d="M146.5 46 l3.6 0 l-1.8 2.4Z" fill="#E07A80"/>
            <path d="M148.3 48.6 C148 51 146 52 144 51" stroke="${line}" stroke-width="1" fill="none" stroke-linecap="round"/>
            <path d="M120 31 l2 5 M126 29.5 l1 6 M132 29.5 l0 5" stroke="#B0642A" stroke-width="1.8" stroke-linecap="round"/>
            <ellipse cx="136" cy="41" rx="3.6" ry="3.9" fill="#9CC43A" stroke="#3A4A10" stroke-width=".8"/><ellipse cx="136.6" cy="41" rx="1" ry="3.2" fill="#111"/><circle cx="137.6" cy="39.4" r=".9" fill="#fff"/>
            <ellipse data-p="lid" cx="136" cy="41" rx="4.4" ry="4.6" fill="#E39A4A" style="transform-origin:136px 36.4px;transform:scaleY(0)"/>
            <path d="M140 52 l14 -3 M140 54 l14 1 M140 56 l13 4" stroke="#FFF" stroke-width=".7" opacity=".9"/>
          </g>
        </g>
        <g data-l="near"></g>` }; }

  { const line = '#5A4E44';
  RIG.mouse = { w: 110, h: 60, T: .3, ground: 56, stride: 10, lift: 3, bob: .8, nod: 2, center: [50, 38], head: [72, 36], wag: 4,
    legs: [
      { far: true, hip: [36, 49], len: [3.5, 4], w: [3.6, 3], phase: .5, curl: 20, fill: '#9A8C80', line, foot: smallPaw('#E0A8AE', line) },
      { far: true, hip: [64, 49], len: [3.5, 4], w: [3.6, 3], phase: .75, curl: 20, fill: '#9A8C80', line, foot: smallPaw('#E0A8AE', line) },
      { hip: [42, 50], len: [3.5, 4], w: [4, 3.2], phase: 0, curl: 20, fill: '#B8AA9C', line, foot: smallPaw('#F0B8BE', line) },
      { hip: [70, 50], len: [3.5, 4], w: [4, 3.2], phase: .25, curl: 20, fill: '#B8AA9C', line, foot: smallPaw('#F0B8BE', line) }],
    draw: n => `<defs>${grad(n + 'b', [[0, '#CABFB3'], [1, '#8E8276']])}</defs>
        <ellipse cx="52" cy="57" rx="28" ry="3" fill="#000" opacity=".13"/>
        <g data-l="far"></g>
        <g data-p="body">
          <g data-p="tail" data-spring="10" data-o="20 42"><path d="M20 42 C8 44 2 36 6 26 C8 22 4 18 0 20" stroke="#D8949E" stroke-width="2.2" fill="none" stroke-linecap="round"/></g>
          <path d="M18 42 C16 28 32 20 50 22 C66 24 76 32 78 40 C78 50 66 52 48 52 C30 52 20 50 18 42Z" fill="url(#${n}b)" stroke="${line}" stroke-width="1.4"/>
          <path d="M28 50 C40 53 58 53 70 49" stroke="#EDE4DA" stroke-width="3" fill="none" stroke-linecap="round" opacity=".8"/>
          <g data-p="head">
            <circle cx="70" cy="22" r="7" fill="#8E8276" stroke="${line}" stroke-width="1.2"/>
            <path d="M66 32 C68 24 80 24 90 32 C95 36 98 39 96 42 C92 44 82 46 74 46 C68 44 64 38 66 32Z" fill="url(#${n}b)" stroke="${line}" stroke-width="1.4"/>
            <g data-spring="6" data-o="76 28"><circle cx="78" cy="20" r="8.5" fill="url(#${n}b)" stroke="${line}" stroke-width="1.2"/><circle cx="78.5" cy="20.5" r="5.6" fill="#F0B8BE"/></g>
            <circle cx="96.5" cy="40.5" r="2" fill="#E07A88"/>
            <path d="M92 42 l12 -3 M92 43.5 l12 1 M91 45 l11 4" stroke="#6A5E54" stroke-width=".6"/>
            ${eye(84, 34, 2.3, '#B8AA9C')}
          </g>
        </g>
        <g data-l="near"></g>` }; }

  { const line = '#7A4E24';
  RIG.hamster = { w: 100, h: 66, T: .28, ground: 62, stride: 8, lift: 3, bob: .9, nod: 2, center: [48, 40], head: [72, 38], wag: 4,
    legs: [
      { far: true, hip: [32, 55], len: [3.5, 4], w: [4.4, 3.6], phase: .5, curl: 20, fill: '#E0B890', line, foot: smallPaw('#E8B4B2', line) },
      { far: true, hip: [62, 55], len: [3.5, 4], w: [4.4, 3.6], phase: .75, curl: 20, fill: '#E0B890', line, foot: smallPaw('#E8B4B2', line) },
      { hip: [38, 56], len: [3.5, 4], w: [4.8, 4], phase: 0, curl: 20, fill: '#F0D4B4', line, foot: smallPaw('#F2C2C0', line) },
      { hip: [68, 56], len: [3.5, 4], w: [4.8, 4], phase: .25, curl: 20, fill: '#F0D4B4', line, foot: smallPaw('#F2C2C0', line) }],
    draw: n => `<defs><radialGradient id="${n}b" cx=".45" cy=".3" r=".8"><stop offset="0" stop-color="#F8C27A"/><stop offset=".6" stop-color="#E09A48"/><stop offset="1" stop-color="#B8742E"/></radialGradient></defs>
        <ellipse cx="50" cy="63" rx="32" ry="3" fill="#000" opacity=".13"/>
        <g data-l="far"></g>
        <g data-p="body">
          <path d="M14 42 C12 24 32 16 52 18 C72 20 86 30 86 44 C86 54 70 58 48 58 C28 58 16 52 14 42Z" fill="url(#${n}b)" stroke="${line}" stroke-width="1.5"/>
          <path d="M26 50 C38 58 62 58 80 50 C74 58 60 59 48 59 C36 59 28 56 26 50Z" fill="#FFF4E6"/>
          <g data-p="head">
            <circle cx="62" cy="20" r="5" fill="#C8823A" stroke="${line}" stroke-width="1.1"/>
            <g data-spring="5" data-o="70 22"><circle cx="70" cy="19" r="6.5" fill="#E09A48" stroke="${line}" stroke-width="1.2"/><circle cx="70.3" cy="19.4" r="4" fill="#F2B8B4"/></g>
            <ellipse cx="76" cy="44" rx="10" ry="8" fill="#FFF4E6" opacity=".95"/>
            <path d="M80 30 C84 30 87.5 34 88 38" stroke="#FFF4E6" stroke-width="3" fill="none" stroke-linecap="round"/>
            <ellipse cx="87.5" cy="38.5" rx="1.9" ry="1.5" fill="#E07A88"/>
            <path d="M84 41 l11 -2 M84 42.5 l11 1.5" stroke="#8A6A4A" stroke-width=".55"/>
            ${eye(78, 32, 2.6, '#E09A48')}
          </g>
        </g>
        <g data-l="near"></g>` }; }

  { const line = '#9A5A64';
  RIG.pig = { w: 150, h: 100, T: .6, ground: 94, stride: 18, lift: 7, bob: 1.4, nod: 2, pitch: .6, center: [74, 58], head: [110, 54], wag: 8,
    legs: [
      { far: true, hip: [54, 70], len: [11, 12], w: [10, 8], reach: -1, phase: .5, fill: '#D8909A', line, foot: hoof('#8A5A5E') },
      { far: true, hip: [100, 70], len: [11, 12], w: [10, 8], reach: 1, phase: .75, fill: '#D8909A', line, foot: hoof('#8A5A5E') },
      { hip: [48, 72], len: [11, 12], w: [11, 8.5], reach: -1, phase: 0, fill: 'url(#PGL)', line, foot: hoof('#7A4A4E') },
      { hip: [106, 72], len: [11, 12], w: [11, 8.5], reach: 1, phase: .25, fill: 'url(#PGL)', line, foot: hoof('#7A4A4E') }],
    draw: n => `<defs>${ugrad('PGL', 66, 94, '#F8BCC4', '#E39AA6')}${grad(n + 'b', [[0, '#FFD2D8'], [.55, '#F6AEB8'], [1, '#D88A96']])}</defs>
        <ellipse cx="78" cy="95" rx="44" ry="4.5" fill="#000" opacity=".13"/>
        <g data-l="far"></g>
        <g data-p="body">
          <g data-p="tail" data-spring="14" data-o="32 52"><path d="M32 52 c-6 -1 -9 -7 -5 -10 c4 -3 7 2 4 4 c-2 1 -4 -1 -3 -2" stroke="${line}" stroke-width="1.8" fill="none" stroke-linecap="round"/></g>
          <path d="M30 58 C30 42 52 34 78 36 C100 37 116 44 118 58 C120 74 104 82 78 82 C54 82 30 76 30 58Z" fill="url(#${n}b)" stroke="${line}" stroke-width="1.6"/>
          <ellipse cx="66" cy="45" rx="22" ry="5.5" fill="#FFE6EA" opacity=".55"/>
          <g data-p="head">
            <path d="M112 40 L107 27 L121 35Z" fill="#D88A96" stroke="${line}" stroke-width="1.2" stroke-linejoin="round"/>
            <path d="M104 46 C108 36 122 34 132 40 C138 44 140 52 138 60 C134 66 120 68 112 64 C104 60 102 52 104 46Z" fill="url(#${n}b)" stroke="${line}" stroke-width="1.5"/>
            <ellipse cx="139" cy="54" rx="5" ry="7.5" fill="#F49AA8" stroke="${line}" stroke-width="1.3"/>
            <ellipse cx="139.5" cy="51" rx="1.2" ry="1.8" fill="${line}"/><ellipse cx="139.5" cy="57" rx="1.2" ry="1.8" fill="${line}"/>
            <path d="M133 62 C130.5 64 127.5 64 125.5 62" stroke="${line}" stroke-width="1.1" fill="none" stroke-linecap="round"/>
            <g data-spring="8" data-o="122 38"><path d="M118 40 L124 24 L134 40 C130 44 122 44 118 40Z" fill="url(#${n}b)" stroke="${line}" stroke-width="1.3" stroke-linejoin="round"/></g>
            ${eye(127, 47, 2.3, '#F6AEB8')}
          </g>
        </g>
        <g data-l="near"></g>` }; }

  { const line = '#24501C';
    const ff = c => `<path d="M-3 -1 L11 -4 L9 -.5 L13 1 L8 3 L-3 2Z" fill="${c}" stroke="${line}" stroke-width="1" stroke-linejoin="round"/>`;
  RIG.frog = { w: 104, h: 72, T: .6, ground: 66, stride: 16, lift: 3, hop: 14, stance: .5, bob: .5, nod: 1, pitch: 5, center: [50, 50], head: [70, 44], wag: 3,
    legs: [
      { far: true, hip: [36, 52], len: [10, 11], w: [9, 6], back: false, phase: 0, curl: 15, muscle: [10, 8, 0], fill: '#3E7E2E', line, foot: ff('#3E7E2E') },
      { far: true, hip: [66, 56], len: [5, 5.5], w: [5, 4], phase: .1, curl: 20, fill: '#3E7E2E', line, foot: ff('#3E7E2E') },
      { hip: [30, 54], len: [11, 12], w: [10, 7], back: false, phase: .02, curl: 15, muscle: [12, 9, 0], fill: '#5AAE3A', line, foot: ff('#6ABE4A') },
      { hip: [72, 58], len: [5, 5.5], w: [5.5, 4.5], phase: .12, curl: 20, fill: '#5AAE3A', line, foot: ff('#6ABE4A') }],
    draw: n => `<defs><radialGradient id="${n}b" cx=".5" cy=".3" r=".8"><stop offset="0" stop-color="#A2DA62"/><stop offset=".6" stop-color="#5AAE3A"/><stop offset="1" stop-color="#3A7E28"/></radialGradient></defs>
        <ellipse cx="52" cy="67" rx="32" ry="3.5" fill="#000" opacity=".13"/>
        <g data-l="far"></g>
        <g data-p="body">
          <path d="M18 54 C16 40 30 30 50 30 C66 30 80 36 86 46 C88 54 80 60 64 60 C46 60 22 62 18 54Z" fill="url(#${n}b)" stroke="${line}" stroke-width="1.5"/>
          <path d="M30 58 C46 62 70 61 84 52 C82 58 72 62 60 62 C46 62 34 61 30 58Z" fill="#EEF0C0"/>
          <g fill="#2E6E22" opacity=".55"><ellipse cx="34" cy="42" rx="4" ry="3"/><ellipse cx="46" cy="36" rx="3" ry="2.4"/><ellipse cx="52" cy="46" rx="3.6" ry="2.6"/><ellipse cx="28" cy="52" rx="2.6" ry="2"/></g>
          <g data-p="head">
            <circle cx="71" cy="32" r="8.5" fill="url(#${n}b)" stroke="${line}" stroke-width="1.4"/>
            <circle cx="72" cy="31" r="5.8" fill="#F2D23A" stroke="#7A6A10" stroke-width=".8"/><ellipse cx="72.6" cy="31" rx="3.8" ry="2.5" fill="#111"/><circle cx="74" cy="29.6" r="1.1" fill="#fff"/>
            <ellipse data-p="lid" cx="72" cy="31" rx="6.4" ry="6.4" fill="#5AAE3A" style="transform-origin:72px 24.6px;transform:scaleY(0)"/>
            <path d="M86.5 46 C80 48.5 72 48.5 63 46" stroke="${line}" stroke-width="1.3" fill="none" stroke-linecap="round"/>
            <circle cx="85" cy="40" r=".9" fill="${line}"/>
          </g>
        </g>
        <g data-l="near"></g>` }; }

  { const line = '#3A4A22';
  RIG.turtle = { w: 120, h: 70, T: 1.3, ground: 64, stride: 8, lift: 3, bob: .6, nod: 3, center: [56, 44], head: [92, 48], wag: 3,
    legs: [
      { far: true, hip: [40, 52], len: [5, 6], w: [10, 8], phase: .5, curl: 15, fill: '#6E8A4A', line, foot: tinyPaw('#6E8A4A', line) },
      { far: true, hip: [78, 52], len: [5, 6], w: [10, 8], phase: .75, curl: 15, fill: '#6E8A4A', line, foot: tinyPaw('#6E8A4A', line) },
      { hip: [34, 54], len: [5, 6], w: [11, 9], phase: 0, curl: 15, fill: '#8AA85A', line, foot: tinyPaw('#9AB86A', line) },
      { hip: [84, 54], len: [5, 6], w: [11, 9], phase: .25, curl: 15, fill: '#8AA85A', line, foot: tinyPaw('#9AB86A', line) }],
    draw: n => `<defs><radialGradient id="${n}s" cx=".45" cy=".25" r=".85"><stop offset="0" stop-color="#B8985A"/><stop offset=".6" stop-color="#7E6230"/><stop offset="1" stop-color="#5A4220"/></radialGradient>${grad(n + 'k', [[0, '#A2C070'], [1, '#7A9848']])}</defs>
        <ellipse cx="58" cy="65" rx="42" ry="3.5" fill="#000" opacity=".13"/>
        <g data-l="far"></g>
        <g data-p="body">
          <path d="M20 50 L7 55 L20 57Z" fill="url(#${n}k)" stroke="${line}" stroke-width="1.1" stroke-linejoin="round"/>
          <g data-p="head">
            <path d="M84 48 C92 40 102 36 110 38 C117 40 119 47 114 51 C108 55 98 55 86 54Z" fill="url(#${n}k)" stroke="${line}" stroke-width="1.4"/>
            <path d="M118 47.5 C114 49.5 110 49.5 106 49" stroke="${line}" stroke-width="1" fill="none" stroke-linecap="round"/>
            <g fill="#5E7A3A" opacity=".6"><circle cx="98" cy="42" r="1.6"/><circle cx="94" cy="47" r="1.3"/><circle cx="102" cy="48" r="1.2"/></g>
            ${eye(109, 43, 2, '#8AA85A')}
          </g>
          <path d="M18 52 C18 28 38 14 58 14 C80 14 98 28 98 52Z" fill="url(#${n}s)" stroke="${line}" stroke-width="1.6"/>
          <path d="M46 22 L70 22 L77 36 L68 48 L48 48 L39 36Z" fill="#A8884A" opacity=".55" stroke="#4A3A1A" stroke-width="1.2" stroke-linejoin="round"/>
          <path d="M39 36 L22 40 M46 22 L36 17 M70 22 L80 17 M77 36 L94 40 M48 48 L44 52 M68 48 L72 52 M58 14 L58 22" stroke="#4A3A1A" stroke-width="1.2" stroke-linecap="round"/>
          <path d="M50 26 C56 24 62 24 66 26" stroke="#E6D29A" stroke-width="1.6" fill="none" stroke-linecap="round" opacity=".6"/>
          <path d="M14 50 L102 50 C102 55 98 57 92 57 L22 57 C16 57 14 54 14 50Z" fill="#C8A860" stroke="${line}" stroke-width="1.4"/>
          <path d="M28 50 v7 M42 50 v7 M56 50 v7 M70 50 v7 M84 50 v7" stroke="#6A5228" stroke-width="1" opacity=".55"/>
        </g>
        <g data-l="near"></g>` }; }

  { const line = '#3A2414';
  RIG.horse = { w: 210, h: 146, T: .7, ground: 140, stride: 34, lift: 12, bob: 1.6, nod: 2.4, pitch: .7, center: [100, 78], head: [158, 40], wag: 4,
    legs: [
      { far: true, hip: [76, 84], len: [28, 29], w: [12, 7], reach: -2, phase: .5, muscle: [12, 17, 5], fill: '#7A4A28', line, foot: hoof('#2A201A') },
      { far: true, hip: [132, 84], len: [28, 29], w: [11, 7], reach: 2, phase: .75, fill: '#7A4A28', line, foot: hoof('#2A201A') },
      { hip: [68, 86], len: [28, 29], w: [13, 7.5], reach: -2, phase: 0, muscle: [14, 19, 5], fill: 'url(#HSL)', line, foot: hoof('#1E1610') },
      { hip: [140, 86], len: [28, 29], w: [12, 7.5], reach: 2, phase: .25, fill: 'url(#HSL)', line, foot: hoof('#1E1610') }],
    draw: n => `<defs>${ugrad('HSL', 80, 140, '#A8683A', '#6A3E20')}${grad(n + 'b', [[0, '#C88A54'], [.55, '#A8683A'], [1, '#7A4A28']])}
          <radialGradient id="${n}h" cx=".4" cy=".35" r=".85"><stop offset="0" stop-color="#C88A54"/><stop offset="1" stop-color="#8A5430"/></radialGradient></defs>
        <ellipse cx="104" cy="141" rx="64" ry="5" fill="#000" opacity=".13"/>
        <g data-l="far"></g>
        <g data-p="body">
          <g data-p="tail" data-spring="10" data-o="60 76"><path d="M62 72 C50 74 44 88 44 104 C44 116 48 124 52 128 C50 116 52 104 56 96 C56 108 58 116 62 120 C62 104 62 90 68 80Z" fill="#2A1E16" stroke="#120C08" stroke-width="1.2" stroke-linejoin="round"/></g>
          <path d="M60 80 C62 62 86 58 112 60 C134 61 146 64 150 76 C154 90 144 100 128 102 C108 104 86 104 72 102 C60 100 56 90 60 80Z" fill="url(#${n}b)" stroke="${line}" stroke-width="1.6"/>
          <ellipse cx="84" cy="70" rx="16" ry="7" fill="#E8B080" opacity=".3"/>
          <path d="M136 70 C138 52 146 36 156 28 L174 38 C166 48 160 64 156 88Z" fill="url(#${n}b)" stroke="${line}" stroke-width="1.6" stroke-linejoin="round"/>
          <g data-spring="4" data-o="150 30"><path d="M152 26 C144 36 138 52 136 72 C131 60 133 44 141 32 C145 26 150 22 156 22Z" fill="#2A1E16" stroke="#120C08" stroke-width="1.1"/></g>
          <g data-p="head">
            <g data-spring="8" data-o="162 22"><path d="M158 24 L161 9 L167 22Z" fill="url(#${n}h)" stroke="${line}" stroke-width="1.3" stroke-linejoin="round"/></g>
            <path d="M152 28 C154 18 166 14 174 18 L196 42 C201 48 198 56 190 56 C184 56 178 52 172 48 C164 44 154 38 152 28Z" fill="url(#${n}h)" stroke="${line}" stroke-width="1.6" stroke-linejoin="round"/>
            <path d="M174 22 L192 44" stroke="#F4EEE4" stroke-width="3.4" stroke-linecap="round" opacity=".9"/>
            <ellipse cx="194" cy="49" rx="1.6" ry="2.2" fill="${line}"/>
            <path d="M190 55 C186 55 183 54 181 52" stroke="${line}" stroke-width="1.1" fill="none" stroke-linecap="round"/>
            <path d="M157 22 C163 19 168 21 171 26 C165 26 160 26 157 22Z" fill="#2A1E16"/>
            ${eye(168, 30, 2.6, '#9A5A30')}
          </g>
        </g>
        <g data-l="near"></g>` }; }

  { const line = '#2A2420';
  RIG.cow = { w: 200, h: 140, T: .8, ground: 134, stride: 24, lift: 9, bob: 1.4, nod: 2, pitch: .5, center: [96, 74], head: [150, 62], wag: 4,
    legs: [
      { far: true, hip: [70, 88], len: [22, 23], w: [13, 9], reach: -1, phase: .5, muscle: [12, 15, 4], fill: '#D2CEC6', line, foot: hoof('#2A2420') },
      { far: true, hip: [126, 88], len: [22, 23], w: [12, 9], reach: 1, phase: .75, fill: '#D2CEC6', line, foot: hoof('#2A2420') },
      { hip: [62, 90], len: [22, 23], w: [14, 10], reach: -1, phase: 0, muscle: [14, 17, 4], fill: '#F4F2EC', line, foot: hoof('#1E1A18') },
      { hip: [134, 90], len: [22, 23], w: [13, 10], reach: 1, phase: .25, fill: '#F4F2EC', line, foot: hoof('#1E1A18') }],
    draw: n => { const P = 'M50 72 C52 56 76 52 104 54 C128 55 142 58 148 70 C154 84 146 96 130 98 C110 100 86 100 70 98 C56 96 48 86 50 72Z';
      return `<defs>${grad(n + 'b', [[0, '#FFFFFF'], [1, '#DCD8D0']])}<clipPath id="${n}c"><path d="${P}"/></clipPath></defs>
        <ellipse cx="100" cy="135" rx="62" ry="5" fill="#000" opacity=".13"/>
        <g data-l="far"></g>
        <g data-p="body">
          <g data-p="tail" data-spring="8" data-o="52 66"><path d="M53 66 C45 72 43 90 45 106" stroke="${line}" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M41 104 C42 115 49 115 49 104 C47 100 43 100 41 104Z" fill="#1E1A18"/></g>
          <path d="${P}" fill="url(#${n}b)" stroke="${line}" stroke-width="1.6"/>
          <g clip-path="url(#${n}c)" fill="#1E1A18"><ellipse cx="72" cy="64" rx="16" ry="12"/><ellipse cx="106" cy="57" rx="14" ry="8"/><ellipse cx="98" cy="90" rx="17" ry="10"/><ellipse cx="134" cy="74" rx="10" ry="14"/><ellipse cx="56" cy="90" rx="9" ry="8"/></g>
          <path d="M84 97 C86 108 100 108 102 97Z" fill="#F4AEB8" stroke="${line}" stroke-width="1.2"/><path d="M88 105 v4 M93 106 v4 M98 105 v4" stroke="#D88A96" stroke-width="2" stroke-linecap="round"/>
          <path d="M134 66 C138 56 146 50 152 48 L162 64 C157 72 151 80 146 90Z" fill="url(#${n}b)" stroke="${line}" stroke-width="1.5" stroke-linejoin="round"/>
          <g data-p="head">
            <path d="M151 47 C147 39 149 33 155 31 M163 46 C165 38 171 34 176 34" stroke="#6A5A3A" stroke-width="4.6" fill="none" stroke-linecap="round"/>
            <path d="M151 47 C147 39 149 33 155 31 M163 46 C165 38 171 34 176 34" stroke="#F0E6CC" stroke-width="3" fill="none" stroke-linecap="round"/>
            <path d="M148 52 L135 49 L146 59Z" fill="#1E1A18"/>
            <path d="M146 50 C148 42 160 40 168 44 C176 48 182 60 184 70 C186 78 182 84 174 84 C166 84 158 78 154 70 C150 64 146 58 146 50Z" fill="url(#${n}b)" stroke="${line}" stroke-width="1.5"/>
            <path d="M148 48 C152 42 162 42 166 46 C167 52 165 58 160 62 C154 58 150 54 148 48Z" fill="#1E1A18"/>
            <path d="M168 70 C174 66 182 68 185 74 C186 80 182 85 175 85 C170 85 166 80 168 70Z" fill="#F4AEB8" stroke="${line}" stroke-width="1.3"/>
            <ellipse cx="177" cy="76" rx="1.5" ry="2" fill="#8A4A54"/><ellipse cx="183" cy="75" rx="1.3" ry="1.8" fill="#8A4A54"/>
            <g data-spring="8" data-o="166 50"><path d="M166 50 L181 46 C183 50 179 55 168 56Z" fill="url(#${n}b)" stroke="${line}" stroke-width="1.3" stroke-linejoin="round"/><path d="M169 51 L178 48.5 C178 51 175 53 170 53.5Z" fill="#F4AEB8"/></g>
            <circle cx="169" cy="57" r="3.2" fill="#3A3430"/>${eye(169, 57, 2.4, '#F4F2EC')}
          </g>
        </g>
        <g data-l="near"></g>`; } }; }

  { const line = '#7A6E62';
  RIG.sheep = { w: 160, h: 116, T: .66, ground: 110, stride: 20, lift: 8, bob: 1.4, nod: 2, pitch: .5, center: [78, 66], head: [118, 58], wag: 6,
    legs: [
      { far: true, hip: [62, 84], len: [12, 13], w: [7, 6], reach: -1, phase: .5, fill: '#221C18', line: '#120E0C', foot: hoof('#120E0C') },
      { far: true, hip: [100, 84], len: [12, 13], w: [7, 6], reach: 1, phase: .75, fill: '#221C18', line: '#120E0C', foot: hoof('#120E0C') },
      { hip: [54, 86], len: [12, 13], w: [7.5, 6.5], reach: -1, phase: 0, fill: '#3A3430', line: '#120E0C', foot: hoof('#120E0C') },
      { hip: [108, 86], len: [12, 13], w: [7.5, 6.5], reach: 1, phase: .25, fill: '#3A3430', line: '#120E0C', foot: hoof('#120E0C') }],
    draw: n => `<defs><radialGradient id="${n}w" cx=".4" cy=".3" r=".8"><stop offset="0" stop-color="#FFFDF6"/><stop offset="1" stop-color="#E2D9C8"/></radialGradient>
          <radialGradient id="${n}f" cx=".5" cy=".35" r=".8"><stop offset="0" stop-color="#4A423C"/><stop offset="1" stop-color="#221C18"/></radialGradient></defs>
        <ellipse cx="82" cy="111" rx="50" ry="4.5" fill="#000" opacity=".13"/>
        <g data-l="far"></g>
        <g data-p="body">
          <g data-p="tail" data-spring="14" data-o="34 66"><circle cx="31" cy="68" r="8.6" fill="${line}"/><circle cx="31" cy="68" r="7" fill="url(#${n}w)"/></g>
          ${woolPuffs(n, [[44, 64, 15], [58, 52, 16], [76, 48, 17], [94, 50, 17], [110, 58, 15], [112, 76, 14], [96, 84, 16], [76, 86, 17], [56, 84, 16], [42, 76, 13], [78, 66, 20]], line)}
          <g data-p="head">
            <path d="M118 50 L105 45 L114 56Z" fill="#221C18"/>
            <path d="M112 56 C112 44 124 40 134 46 C144 52 150 64 148 72 C146 80 136 82 128 78 C120 74 112 66 112 56Z" fill="url(#${n}f)" stroke="#120E0C" stroke-width="1.5"/>
            <circle cx="118" cy="46" r="8.6" fill="${line}"/><circle cx="127" cy="42" r="7.6" fill="${line}"/><circle cx="118" cy="46" r="7" fill="url(#${n}w)"/><circle cx="127" cy="42" r="6" fill="url(#${n}w)"/>
            <g data-spring="8" data-o="124 52"><path d="M124 51 L109 55 C109 60 116 61 126 57Z" fill="url(#${n}f)" stroke="#120E0C" stroke-width="1.3" stroke-linejoin="round"/></g>
            <path d="M146 70 C145 73 142 74 140 73 M147.5 66 l-.5 2" stroke="#8A8078" stroke-width="1" fill="none" stroke-linecap="round"/>
            <circle cx="134" cy="56" r="3" fill="#5A524C"/>${eye(134, 56, 2.1, '#2E2824')}
          </g>
        </g>
        <g data-l="near"></g>` }; }

  window.RIG = RIG;
  // Rig animals take over from the older drawings with the same name, everywhere the app draws a pet.
  if (window.PETART) for (const id in RIG) { const s = RIG[id]; PETART[id] = { w: s.w, h: s.h, fly: !!s.fly, swim: !!s.swim, rig: true }; }
  if (window.petSVG) { const older = window.petSVG; window.petSVG = (id, h) => RIG[id] ? rigSVG(id, h) : older(id, h); }
  window.rigSVG = rigSVG;
})();

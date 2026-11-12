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
      beats: [...svg.querySelectorAll('[data-beat]')].map(e => ({ e, o: e.dataset.o.split(' ').map(Number), lo: +e.dataset.beat, x: e.dataset.axis === 'x', k: +(e.dataset.k || 1), ph: +(e.dataset.ph || 0) })),
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
      b.e.setAttribute('transform', `translate(${ox} ${oy}) scale(${b.x ? s.toFixed(3) + ' 1' : '1 ' + s.toFixed(3)}) translate(${-ox} ${-oy})`);
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

  /* ---------- shared helpers for the four-legged animals ---------- */
  const rg = (id, a, b, c, cx = .45, cy = .3) => `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r=".85"><stop offset="0" stop-color="${a}"/><stop offset=".6" stop-color="${b}"/><stop offset="1" stop-color="${c}"/></radialGradient>`;
  const frame = (sh, defs, inner) => `<defs>${defs}</defs><ellipse cx="${sh[0]}" cy="${sh[1]}" rx="${sh[2]}" ry="${sh[3] || 4.5}" fill="#000" opacity=".13"/><g data-l="far"></g><g data-p="body">${inner}</g><g data-l="near"></g>`;
  const legs4 = o => { const { bx, fx, y, len, w, fill, far, line, foot, farFoot = foot, muscle, dx = 6, curl, back } = o;
    const mf = muscle && [muscle[0] * .85, muscle[1] * .85, muscle[2]];
    return [
      { far: true, hip: [bx + dx, y - 2], len, w: [w[0] * .9, w[1] * .9], reach: -2, phase: .5, muscle: mf, fill: far, line, foot: farFoot, curl, back },
      { far: true, hip: [fx + dx, y - 2], len, w: [w[0] * .85, w[1] * .9], reach: 2, phase: .75, fill: far, line, foot: farFoot, curl, back },
      { hip: [bx, y], len, w, reach: -2, phase: 0, muscle, fill, line, foot, curl, back },
      { hip: [fx, y], len, w: [w[0] * .92, w[1]], reach: 2, phase: .25, fill, line, foot, curl, back }]; };
  // an eye with a coloured iris (round or slit pupil) that blinks
  const ieye = (x, y, r, iris, lid, slit) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${iris}" stroke="#2A1A0A" stroke-width=".7"/>` +
    (slit ? `<ellipse cx="${x + .3}" cy="${y}" rx="${(r * .3).toFixed(2)}" ry="${(r * .85).toFixed(2)}" fill="#111"/>` : `<circle cx="${x + .3}" cy="${y}" r="${(r * .52).toFixed(2)}" fill="#111"/>`) +
    `<circle cx="${(x + r * .42).toFixed(2)}" cy="${(y - r * .4).toFixed(2)}" r="${(r * .3).toFixed(2)}" fill="#fff"/><ellipse data-p="lid" cx="${x}" cy="${y}" rx="${(r * 1.25).toFixed(2)}" ry="${(r * 1.3).toFixed(2)}" fill="${lid}" style="transform-origin:${x}px ${(y - r * 1.3).toFixed(2)}px;transform:scaleY(0)"/>`;
  const whisk = (x, y, c = '#fff') => `<path d="M${x} ${y} l13 -3 M${x} ${y + 2} l13 1 M${x} ${y + 4} l12 4" stroke="${c}" stroke-width=".7" opacity=".85"/>`;
  const clawPaw = (c, line, len = 9) => paw(c, line, len);

  /* ---------- big cats ---------- */
  { const line = '#4A2A0E';
    const P = 'M44 64 C46 48 70 44 96 46 C118 47 130 50 134 58 C138 70 132 80 116 82 C98 84 72 84 58 82 C46 80 42 72 44 64Z';
  RIG.tiger = { w: 170, h: 108, T: .66, ground: 104, stride: 26, lift: 9, bob: 1.4, nod: 1.6, pitch: .6, center: [88, 66], head: [128, 56], wag: 3,
    legs: legs4({ bx: 56, fx: 118, y: 72, len: [16, 17], w: [12, 9], fill: 'url(#TGL)', far: '#C8661E', line, foot: paw('#F6E2C4', line, 9), farFoot: paw('#D8B894', line, 9), muscle: [11, 15, 3] }),
    draw: n => frame([92, 105, 54], `${ugrad('TGL', 70, 104, '#F08A30', '#C8661E')}${rg(n + 'b', '#FFB060', '#EE8A30', '#C0601C')}${rg(n + 'h', '#FFB868', '#F08C34', '#C8661E')}<clipPath id="${n}c"><path d="${P}"/></clipPath>`,
      `<g data-p="tail" data-spring="10" data-o="46 62"><path d="M46 60 C32 60 22 66 16 78 C14 84 18 86 21 82 C26 72 34 66 48 66Z" fill="url(#${n}b)" stroke="${line}" stroke-width="1.4"/>
          <path d="M16 78 C14 84 18 86 21 82 L19 76Z" fill="#1E140C"/><path d="M28 64 l2 6 M36 61 l1 6" stroke="#1E140C" stroke-width="2.2" stroke-linecap="round"/></g>
        <path d="${P}" fill="url(#${n}b)" stroke="${line}" stroke-width="1.6"/>
        <g clip-path="url(#${n}c)" stroke="#1E140C" stroke-linecap="round" fill="none">${Array.from({ length: 9 }, (_, i) => { const x = 54 + i * 9; return `<path d="M${x} 44 C${x + 4} 52 ${x + 2} 58 ${x - 2} 64" stroke-width="${3 - (i % 2) * .8}"/>`; }).join('')}</g>
        <path d="M62 80 C80 84 104 84 122 78" stroke="#FFF2DE" stroke-width="5" fill="none" stroke-linecap="round" opacity=".85"/>
        <g data-p="head">
          <circle cx="129" cy="37" r="5.5" fill="#1E140C"/>
          <path d="M122 52 C122 38 134 32 146 34 C158 36 166 44 166 54 C166 64 156 70 144 70 C132 70 122 62 122 52Z" fill="url(#${n}h)" stroke="${line}" stroke-width="1.5"/>
          <g data-spring="5" data-o="139 36"><circle cx="139" cy="33" r="6.5" fill="url(#${n}h)" stroke="${line}" stroke-width="1.2"/><circle cx="139.5" cy="33.5" r="3.6" fill="#FFF2DE"/></g>
          <path d="M124 58 C126 66 134 70 142 70 C136 64 131 60 128 54Z" fill="#FFF2DE"/>
          <path d="M148 56 C152 52 162 52 166 56 C166 64 158 68 150 66 C146 64 146 60 148 56Z" fill="#FFF2DE"/>
          <path d="M161.5 51.5 l4.5 0 l-2.2 3.2Z" fill="#C8606A"/><path d="M163.8 54.7 C163 57 161 58 159 57" stroke="${line}" stroke-width="1" fill="none" stroke-linecap="round"/>
          <path d="M136 38 l2 6 M142 36 l1 6 M148 36 l0 5 M125 46 l6 2 M124 52 l6 0 M156 40 l-3 4" stroke="#1E140C" stroke-width="2" stroke-linecap="round"/>
          ${ieye(150, 46, 3, '#E8B030', '#F08C34')}${whisk(154, 59)}
        </g>`) }; }

  { const line = '#5A3A14';
    const mane = Array.from({ length: 22 }, (_, i) => { const a = i / 22 * Math.PI * 2, r = i % 2 ? 22 : 27; return `${(134 + Math.cos(a) * r).toFixed(1)} ${(52 + Math.sin(a) * r * .95).toFixed(1)}`; }).join(' L');
  RIG.lion = { w: 170, h: 108, T: .66, ground: 104, stride: 26, lift: 9, bob: 1.4, nod: 1.6, pitch: .6, center: [86, 66], head: [128, 56], wag: 3,
    legs: legs4({ bx: 54, fx: 112, y: 72, len: [16, 17], w: [12, 9], fill: 'url(#LNL)', far: '#B8843E', line, foot: paw('#E8C88A', line, 9), farFoot: paw('#C8A060', line, 9), muscle: [11, 15, 3] }),
    draw: n => frame([90, 105, 54], `${ugrad('LNL', 70, 104, '#E0B464', '#B8843E')}${rg(n + 'b', '#F0C878', '#D8A452', '#B07A34')}${rg(n + 'h', '#F2CC80', '#DCAA58', '#B88238')}${rg(n + 'm', '#B8642A', '#8A4418', '#5A2A0E', .5, .5)}`,
      `<g data-p="tail" data-spring="10" data-o="44 62"><path d="M46 62 C30 64 22 76 22 88" stroke="${line}" stroke-width="5.4" fill="none" stroke-linecap="round"/><path d="M46 62 C30 64 22 76 22 88" stroke="#D8A452" stroke-width="3.4" fill="none" stroke-linecap="round"/>
          <path d="M22 84 C16 88 16 96 22 98 C28 96 28 88 22 84Z" fill="#6A3414" stroke="${line}" stroke-width="1"/></g>
        <path d="M42 64 C44 48 68 44 94 46 C116 47 128 50 132 58 C136 70 130 80 114 82 C96 84 70 84 56 82 C44 80 40 72 42 64Z" fill="url(#${n}b)" stroke="${line}" stroke-width="1.6"/>
        <path d="M60 80 C78 84 102 84 118 78" stroke="#F6E2BC" stroke-width="4" fill="none" stroke-linecap="round" opacity=".7"/>
        <g data-p="head">
          <g data-spring="3" data-o="128 52"><path d="M${mane}Z" fill="url(#${n}m)" stroke="#3A1A08" stroke-width="1.2" stroke-linejoin="round"/></g>
          <path d="M126 50 C126 38 136 34 146 36 C156 38 162 46 162 54 C162 64 154 68 144 68 C134 68 126 60 126 50Z" fill="url(#${n}h)" stroke="${line}" stroke-width="1.4"/>
          <circle cx="137" cy="35" r="4.5" fill="url(#${n}h)" stroke="${line}" stroke-width="1.1"/>
          <path d="M146 56 C150 52 158 52 162 56 C162 63 156 66 150 65 C146 63 145 59 146 56Z" fill="#FAEBD0"/>
          <path d="M157.5 51.5 l4.5 0 l-2.2 3.2Z" fill="#6A3A2A"/><path d="M159.8 54.7 C159 57 157 58 155 57" stroke="${line}" stroke-width="1" fill="none" stroke-linecap="round"/>
          ${ieye(148, 46, 2.8, '#C88A20', '#DCAA58')}${whisk(152, 58)}
        </g>`) }; }

  { const line = '#5A3A10';
    const P = 'M48 58 C50 46 72 42 96 44 C116 45 126 48 130 54 C134 62 128 70 114 72 C96 74 72 74 60 72 C50 70 46 64 48 58Z';
    const spots = Array.from({ length: 30 }, (_, i) => `<circle cx="${50 + (i * 37) % 84}" cy="${44 + (i * 13) % 28}" r="${1.6 + (i % 3) * .5}"/>`).join('');
  RIG.cheetah = { w: 170, h: 100, T: .4, ground: 97, stride: 34, lift: 10, bob: 1.2, nod: 1.2, pitch: .8, center: [90, 60], head: [124, 50], wag: 3,
    legs: legs4({ bx: 60, fx: 114, y: 64, len: [17, 17], w: [9, 6], fill: 'url(#CHL)', far: '#C8963E', line, foot: paw('#F2DCA8', line, 8), farFoot: paw('#D8B478', line, 8), muscle: [8, 12, 3] }),
    draw: n => frame([92, 98, 52], `${ugrad('CHL', 62, 97, '#ECC070', '#C8963E')}${rg(n + 'b', '#F6D488', '#E4B460', '#BE8A3A')}<clipPath id="${n}c"><path d="${P}"/></clipPath>`,
      `<g data-p="tail" data-spring="9" data-o="50 56"><path d="M50 56 C36 58 26 66 22 80 C21 86 25 87 27 83 C30 72 38 64 52 62Z" fill="url(#${n}b)" stroke="${line}" stroke-width="1.3"/>
          <path d="M24 76 l5 2 M26 70 l5 2 M30 64 l5 2" stroke="#1E140C" stroke-width="2" stroke-linecap="round"/><path d="M22 80 C21 86 25 87 27 83Z" fill="#FFF6E4"/></g>
        <path d="${P}" fill="url(#${n}b)" stroke="${line}" stroke-width="1.5"/>
        <g clip-path="url(#${n}c)" fill="#2A1A0C">${spots}</g>
        <path d="M64 71 C80 74 100 74 116 69" stroke="#FFF6E4" stroke-width="3.6" fill="none" stroke-linecap="round" opacity=".85"/>
        <g data-p="head">
          <path d="M124 46 C124 36 134 32 144 34 C154 36 160 42 160 50 C160 58 152 62 142 62 C132 62 124 56 124 46Z" fill="url(#${n}b)" stroke="${line}" stroke-width="1.4"/>
          <g data-spring="5" data-o="134 36"><path d="M129 38 C129 30 136 28 139 34Z" fill="url(#${n}b)" stroke="${line}" stroke-width="1.1"/></g>
          <path d="M146 52 C150 49 157 49 160 52 C160 58 155 61 149 60 C146 58 145 55 146 52Z" fill="#FFF6E4"/>
          <path d="M156.5 48.5 l4 0 l-2 2.8Z" fill="#2A1A0C"/>
          <path d="M147 45 C148 50 148 56 150 61" stroke="#1E140C" stroke-width="1.8" fill="none" stroke-linecap="round"/>
          <g fill="#2A1A0C"><circle cx="134" cy="42" r="1.2"/><circle cx="130" cy="48" r="1.3"/><circle cx="138" cy="38" r="1"/></g>
          ${ieye(146, 42, 2.5, '#D8A030', '#E4B460')}
        </g>`) }; }

  /* ---------- dogs of the wild ---------- */
  { const line = '#5A2A0E';
  RIG.fox = { w: 156, h: 96, T: .5, ground: 92, stride: 22, lift: 8, bob: 1.2, nod: 1.8, pitch: .5, center: [80, 58], head: [114, 46], wag: 4,
    legs: legs4({ bx: 54, fx: 104, y: 62, len: [15, 15], w: [8, 6], fill: '#3A2418', far: '#24160E', line: '#1A0E08', foot: paw('#3A2418', '#1A0E08', 8), muscle: [10, 12, 2] }),
    draw: n => frame([82, 93, 46], `${rg(n + 'b', '#F09A50', '#DC6A2A', '#A8481A')}${rg(n + 'h', '#F4A458', '#E07030', '#B04C1C')}`,
      `<g data-p="tail" data-spring="9" data-o="46 58"><path d="M46 56 C30 52 12 58 4 72 C1 78 6 82 12 79 C24 76 36 70 48 64Z" fill="url(#${n}b)" stroke="${line}" stroke-width="1.4"/>
          <path d="M4 72 C1 78 6 82 12 79 C12 75 9 72 4 72Z" fill="#FFF6EC" stroke="${line}" stroke-width="1"/></g>
        <path d="M42 56 C44 44 64 40 86 42 C104 43 114 46 118 52 C122 62 116 70 102 72 C86 74 66 74 54 72 C44 70 40 64 42 56Z" fill="url(#${n}b)" stroke="${line}" stroke-width="1.5"/>
        <path d="M108 50 C114 56 116 64 110 70 C106 66 104 58 108 50Z" fill="#FFF6EC"/>
        <g data-p="head">
          <path d="M114 36 L113 16 L125 31Z" fill="#2A1A10" stroke="${line}" stroke-width="1.2" stroke-linejoin="round"/>
          <path d="M110 44 C112 34 122 30 132 32 L152 46 C155 48 154 51 151 52 L134 56 C124 58 114 54 110 44Z" fill="url(#${n}h)" stroke="${line}" stroke-width="1.5" stroke-linejoin="round"/>
          <path d="M132 48 L152 47 C154 50 152 52 150 52 L134 56 C128 55 128 50 132 48Z" fill="#FFF6EC"/>
          <g data-spring="6" data-o="128 32"><path d="M121 33 L127 12 L136 31Z" fill="url(#${n}h)" stroke="${line}" stroke-width="1.2" stroke-linejoin="round"/><path d="M125 30 L127.5 18 L132 30Z" fill="#2A1A10"/></g>
          <ellipse cx="152.5" cy="47.5" rx="2.6" ry="2.1" fill="#1A0E08"/>
          ${ieye(131, 40, 2.3, '#D89A20', '#E07030')}
        </g>`) }; }

  { const line = '#3A3A3C';
  RIG.wolf = { w: 166, h: 104, T: .58, ground: 100, stride: 26, lift: 9, bob: 1.3, nod: 1.8, pitch: .5, center: [86, 62], head: [124, 50], wag: 3,
    legs: legs4({ bx: 58, fx: 112, y: 68, len: [16, 16], w: [10, 7], fill: 'url(#WFL)', far: '#6E6C6A', line, foot: paw('#C8C4BE', line, 9), farFoot: paw('#9A968E', line, 9), muscle: [11, 14, 3] }),
    draw: n => frame([88, 101, 52], `${ugrad('WFL', 66, 100, '#B4B0AA', '#7E7A74')}${rg(n + 'b', '#C4C0BA', '#96928C', '#6A6660')}${rg(n + 'h', '#D0CCC6', '#A29E98', '#74706A')}`,
      `<g data-p="tail" data-spring="8" data-o="48 60"><path d="M48 58 C34 60 24 70 22 86 C22 92 28 92 30 86 C34 76 40 70 50 66Z" fill="url(#${n}b)" stroke="${line}" stroke-width="1.4"/><path d="M22 86 C22 92 28 92 30 86 L24 82Z" fill="#2A2A2C"/></g>
        <path d="M44 62 C46 48 68 42 92 44 C112 45 122 48 128 56 C132 66 126 76 110 78 C92 80 70 80 56 78 C46 76 42 70 44 62Z" fill="url(#${n}b)" stroke="${line}" stroke-width="1.6"/>
        <path d="M54 50 C70 42 96 42 116 48 C108 54 82 56 58 56Z" fill="#5A5856" opacity=".55"/>
        <path d="M60 76 C78 80 100 80 118 74" stroke="#EDEAE4" stroke-width="4" fill="none" stroke-linecap="round" opacity=".8"/>
        <path d="M116 50 C124 58 126 68 118 76 C114 70 112 60 116 50Z" fill="#EDEAE4"/>
        <g data-p="head">
          <path d="M120 40 L120 22 L131 36Z" fill="#6A6660" stroke="${line}" stroke-width="1.2" stroke-linejoin="round"/>
          <path d="M116 48 C118 38 128 34 138 36 L158 48 C162 50 161 55 157 56 L140 60 C128 62 118 58 116 48Z" fill="url(#${n}h)" stroke="${line}" stroke-width="1.5" stroke-linejoin="round"/>
          <path d="M138 52 L158 50 C161 53 159 56 156 56 L140 60 C134 59 134 54 138 52Z" fill="#F2F0EA"/>
          <g data-spring="6" data-o="133 36"><path d="M127 38 L132 18 L141 36Z" fill="url(#${n}h)" stroke="${line}" stroke-width="1.2" stroke-linejoin="round"/><path d="M131 35 L133 24 L137 35Z" fill="#E6E2DA"/></g>
          <ellipse cx="159" cy="50" rx="2.7" ry="2.2" fill="#1A1A1C"/>
          <path d="M131 41 C134 39 138 39 141 41" stroke="#5A5856" stroke-width="1.2" fill="none" stroke-linecap="round"/>
          ${ieye(136, 44, 2.3, '#D8B040', '#A29E98')}
        </g>`) }; }

  /* ---------- bears ---------- */
  const bearArt = (n, c) => `<path d="M36 ${c.hump ? '62 C36 44 54 34 70 34 C80 30 92 30 100 38 C112 40 122 46 126 56' : '60 C36 42 58 36 84 38 C106 39 120 44 126 54'} C130 66 124 76 110 78 C90 80 64 80 50 78 C40 76 36 70 36 ${c.hump ? 62 : 60}Z" fill="url(#${n}b)" stroke="${c.line}" stroke-width="1.6"/>
        <ellipse cx="${c.hump ? 76 : 70}" cy="46" rx="22" ry="6" fill="${c.hi}" opacity=".35"/>
        <path d="M33 56 C29 54 28 58 31 61Z" fill="${c.tail}" stroke="${c.line}" stroke-width="1"/>
        <g data-p="head">
          <circle cx="124" cy="40" r="5.5" fill="${c.ear}" stroke="${c.line}" stroke-width="1.2"/>
          <path d="M116 52 C118 40 130 36 140 40 L154 50 C158 52 158 58 154 59 L140 62 C128 64 116 60 116 52Z" fill="url(#${n}h)" stroke="${c.line}" stroke-width="1.5" stroke-linejoin="round"/>
          <path d="M140 52 L154 50 C158 52 158 58 154 59 L140 62 C136 60 136 55 140 52Z" fill="${c.muzzle}"/>
          <g data-spring="5" data-o="132 40"><circle cx="132" cy="38" r="6" fill="url(#${n}h)" stroke="${c.line}" stroke-width="1.2"/><circle cx="132.5" cy="38.5" r="3" fill="${c.earIn}"/></g>
          <ellipse cx="155.5" cy="52.5" rx="3" ry="2.4" fill="#141010"/>
          <path d="M152 59 C150 61 147 61 145 60" stroke="#141010" stroke-width="1" fill="none" stroke-linecap="round"/>
          ${eye(139, 46, 2.1, c.lid)}
        </g>`;
  { const line = '#7A766A';
  RIG.polarbear = { w: 160, h: 100, T: .82, ground: 96, stride: 22, lift: 8, bob: 1.6, nod: 1.6, pitch: .7, center: [80, 58], head: [118, 52], wag: 3,
    legs: legs4({ bx: 52, fx: 108, y: 66, len: [15, 15], w: [16, 12], fill: 'url(#PBL)', far: '#D8D2C2', line, foot: paw('#F6F2E8', line, 12), farFoot: paw('#DCD6C8', line, 12), muscle: [13, 15, 3] }),
    draw: n => frame([82, 97, 54], `${ugrad('PBL', 64, 96, '#FAF6EC', '#E0D8C6')}${rg(n + 'b', '#FFFDF6', '#F2ECDC', '#D6CEBA')}${rg(n + 'h', '#FFFDF6', '#F2ECDC', '#D8D0BC')}`,
      bearArt(n, { line, hi: '#FFFFFF', tail: '#F2ECDC', ear: '#E6DECC', earIn: '#C8C0AE', muzzle: '#F8F4EA', lid: '#F2ECDC' })) };
  }
  { const line = '#3A2414';
  RIG.grizzly = { w: 165, h: 104, T: .82, ground: 98, stride: 22, lift: 8, bob: 1.6, nod: 1.6, pitch: .7, center: [80, 58], head: [118, 52], wag: 3,
    legs: legs4({ bx: 52, fx: 108, y: 68, len: [15, 15], w: [16, 12], fill: 'url(#GZL)', far: '#5A3A22', line, foot: paw('#7A5232', line, 12), farFoot: paw('#5A3A22', line, 12), muscle: [13, 15, 3] }),
    draw: n => frame([82, 99, 54], `${ugrad('GZL', 66, 98, '#8A5E3A', '#5A3A22')}${rg(n + 'b', '#A87A50', '#7E5634', '#553820')}${rg(n + 'h', '#AE8256', '#845A38', '#5A3C22')}`,
      bearArt(n, { line, hump: true, hi: '#D8B088', tail: '#7E5634', ear: '#5A3A22', earIn: '#C8A07A', muzzle: '#B89068', lid: '#845A38' })) };
  }
  { const line = '#1E1E22';
  RIG.panda = { w: 160, h: 100, T: .9, ground: 96, stride: 20, lift: 7, bob: 1.6, nod: 1.8, pitch: .7, center: [80, 58], head: [118, 52], wag: 3,
    legs: legs4({ bx: 52, fx: 108, y: 66, len: [15, 15], w: [16, 12], fill: '#2A2A30', far: '#141418', line: '#0A0A0C', foot: paw('#2A2A30', '#0A0A0C', 12), muscle: [13, 15, 3] }),
    draw: n => { const P = 'M36 60 C36 42 58 36 84 38 C106 39 120 44 126 54 C130 66 124 76 110 78 C90 80 64 80 50 78 C40 76 36 70 36 60Z';
      return frame([82, 97, 54], `${rg(n + 'b', '#FFFFFF', '#F2F0EA', '#D4D0C8')}<clipPath id="${n}c"><path d="${P}"/></clipPath>`,
      `<path d="M33 56 C29 54 28 58 31 61Z" fill="#F2F0EA" stroke="${line}" stroke-width="1"/>
        <path d="${P}" fill="url(#${n}b)" stroke="${line}" stroke-width="1.6"/>
        <g clip-path="url(#${n}c)"><path d="M86 30 C100 34 110 44 112 60 C112 70 108 80 104 84 L90 84 C94 70 92 54 80 40Z" fill="#1E1E24"/><ellipse cx="48" cy="76" rx="16" ry="12" fill="#1E1E24"/></g>
        <g data-p="head">
          <circle cx="121" cy="36" r="7" fill="#1E1E24"/>
          <ellipse cx="134" cy="48" rx="20" ry="17" fill="url(#${n}b)" stroke="${line}" stroke-width="1.5"/>
          <g data-spring="5" data-o="138 33"><circle cx="139" cy="31" r="7" fill="#1E1E24"/></g>
          <ellipse cx="141" cy="45" rx="5" ry="7" fill="#1E1E24" transform="rotate(-30 141 45)"/>
          <path d="M146 54 C150 51 156 52 156 56 C155 60 150 62 146 60Z" fill="#FAFAF6" stroke="#8A8A86" stroke-width=".6"/>
          <ellipse cx="154" cy="53" rx="2.6" ry="2" fill="#141418"/>
          <path d="M152 59 C150 61 147 61 146 60" stroke="#141418" stroke-width="1" fill="none" stroke-linecap="round"/>
          <circle cx="142" cy="44" r="1.9" fill="#F4F4F0"/><circle cx="142.4" cy="44" r="1.1" fill="#111"/><circle cx="142.9" cy="43.4" r=".5" fill="#fff"/>
          <ellipse data-p="lid" cx="142" cy="44" rx="2.4" ry="2.4" fill="#1E1E24" style="transform-origin:142px 41.6px;transform:scaleY(0)"/>
        </g>`); } };
  }

  { const line = '#3A3A3E';
    const T = 'M32 52 C20 54 10 60 6 70 C4 76 8 78 12 74 C18 66 26 60 36 58Z';
  RIG.raccoon = { w: 132, h: 84, T: .42, ground: 79, stride: 14, lift: 6, bob: 1.1, nod: 2, pitch: .8, center: [62, 50], head: [92, 44], wag: 4,
    legs: legs4({ bx: 42, fx: 86, y: 58, len: [10, 11], w: [7, 6], fill: '#3A3836', far: '#24221E', line: '#141210', foot: paw('#4A4642', '#141210', 7), dx: 5 }),
    draw: n => frame([64, 80, 40, 3.6], `${rg(n + 'b', '#B8B4AC', '#8E8A84', '#62605A')}<clipPath id="${n}t"><path d="${T}"/></clipPath>`,
      `<g data-p="tail" data-spring="9" data-o="34 56"><path d="${T}" fill="#A8A49C" stroke="${line}" stroke-width="1.3"/>
          <g clip-path="url(#${n}t)" stroke="#2A2826" stroke-width="4"><path d="M26 50 L32 64 M18 54 L26 68 M10 60 L18 74 M2 66 L10 80"/></g></g>
        <path d="M30 54 C30 38 46 30 64 32 C82 34 94 40 96 52 C98 62 88 66 74 66 C58 66 40 66 34 62 C31 60 30 57 30 54Z" fill="url(#${n}b)" stroke="${line}" stroke-width="1.5"/>
        <path d="M44 38 C56 32 72 32 84 38" stroke="#5A5854" stroke-width="3" fill="none" stroke-linecap="round" opacity=".5"/>
        <g data-p="head">
          <circle cx="94" cy="31" r="4.5" fill="#8E8A84" stroke="${line}" stroke-width="1.1"/>
          <path d="M88 42 C90 32 100 28 108 30 L123 40 C126 42 126 45 123 46 L108 50 C98 52 88 50 88 42Z" fill="#B0ACA4" stroke="${line}" stroke-width="1.4" stroke-linejoin="round"/>
          <path d="M106 40 L123 40 C126 42 126 45 123 46 L108 50 C104 48 103 43 106 40Z" fill="#F4F2EE"/>
          <path d="M93 38 C99 33 108 33 115 38 C112 42 104 44 97 42Z" fill="#1E1E20"/>
          <path d="M96 33 C102 30 109 31 114 34" stroke="#F4F2EE" stroke-width="1.6" fill="none" stroke-linecap="round"/>
          <g data-spring="6" data-o="102 30"><circle cx="102" cy="27" r="5" fill="#8E8A84" stroke="${line}" stroke-width="1.1"/><circle cx="102.4" cy="27.4" r="3" fill="#F4F2EE"/></g>
          <ellipse cx="124" cy="42.5" rx="2.2" ry="1.8" fill="#141414"/>
          <circle cx="107" cy="38" r="2" fill="#3A2A1A"/><circle cx="107.6" cy="37.4" r=".7" fill="#fff"/>
          <ellipse data-p="lid" cx="107" cy="38" rx="2.5" ry="2.5" fill="#1E1E20" style="transform-origin:107px 35.5px;transform:scaleY(0)"/>
        </g>`) }; }

  /* ---------- horses, zebras, unicorns ---------- */
  const EQ = { P: 'M60 80 C62 62 86 58 112 60 C134 61 146 64 150 76 C154 90 144 100 128 102 C108 104 86 104 72 102 C60 100 56 90 60 80Z',
    N: 'M136 70 C138 52 146 36 156 28 L174 38 C166 48 160 64 156 88Z', H: 'M152 28 C154 18 166 14 174 18 L196 42 C201 48 198 56 190 56 C184 56 178 52 172 48 C164 44 154 38 152 28Z' };
  const equine = (n, c) => `
        <g data-p="tail" data-spring="10" data-o="60 76"><path d="M62 72 C50 74 44 88 44 104 C44 116 48 124 52 128 C50 116 52 104 56 96 C56 108 58 116 62 120 C62 104 62 90 68 80Z" fill="${c.tail}" stroke="${c.hair}" stroke-width="1.2" stroke-linejoin="round"/></g>
        <path d="${EQ.P}" fill="url(#${n}b)" stroke="${c.line}" stroke-width="1.6"/>${c.bodyX || ''}
        <path d="${EQ.N}" fill="url(#${n}b)" stroke="${c.line}" stroke-width="1.6" stroke-linejoin="round"/>${c.neckX || ''}
        <g data-spring="4" data-o="150 30"><path d="M152 26 C144 36 138 52 136 72 C131 60 133 44 141 32 C145 26 150 22 156 22Z" fill="${c.mane}" stroke="${c.hair}" stroke-width="1.1"/></g>
        <g data-p="head">
          <g data-spring="8" data-o="162 22"><path d="M158 24 L161 9 L167 22Z" fill="url(#${n}h)" stroke="${c.line}" stroke-width="1.3" stroke-linejoin="round"/></g>
          <path d="${EQ.H}" fill="url(#${n}h)" stroke="${c.line}" stroke-width="1.6" stroke-linejoin="round"/>${c.headX || ''}
          <ellipse cx="194" cy="49" rx="1.6" ry="2.2" fill="${c.line}"/>
          <path d="M190 55 C186 55 183 54 181 52" stroke="${c.line}" stroke-width="1.1" fill="none" stroke-linecap="round"/>
          <path d="M157 22 C163 19 168 21 171 26 C165 26 160 26 157 22Z" fill="${c.mane}"/>${c.horn || ''}
          ${eye(168, 30, 2.6, c.lid)}
        </g>`;
  const eqLegs = (fill, far, line, foot, farFoot) => [
    { far: true, hip: [76, 84], len: [28, 29], w: [12, 7], reach: -2, phase: .5, muscle: [12, 17, 5], fill: far, line, foot: farFoot },
    { far: true, hip: [132, 84], len: [28, 29], w: [11, 7], reach: 2, phase: .75, fill: far, line, foot: farFoot },
    { hip: [68, 86], len: [28, 29], w: [13, 7.5], reach: -2, phase: 0, muscle: [14, 19, 5], fill, line, foot },
    { hip: [140, 86], len: [28, 29], w: [12, 7.5], reach: 2, phase: .25, fill, line, foot }];
  const eqSpec = { w: 210, h: 146, T: .7, ground: 140, stride: 34, lift: 12, bob: 1.6, nod: 2.4, pitch: .7, center: [100, 78], head: [158, 40], wag: 4 };

  { const line = '#1A1A1A';
    const strokes = (arr, wdt) => arr.map(d => `<path d="${d}" stroke="#151515" stroke-width="${wdt}" fill="none" stroke-linecap="round"/>`).join('');
  RIG.zebra = { ...eqSpec, T: .66, legs: eqLegs('url(#rr-zleg)', 'url(#rr-zleg-far)', line, hoof('#1A1A1A'), hoof('#1A1A1A')),
    draw: n => frame([104, 141, 64, 5], `${grad(n + 'b', [[0, '#FFFFFF'], [1, '#E2E0DA']])}${rg(n + 'h', '#FFFFFF', '#F2F0EA', '#D8D6D0')}
        <clipPath id="${n}p"><path d="${EQ.P}"/></clipPath><clipPath id="${n}n"><path d="${EQ.N}"/></clipPath><clipPath id="${n}k"><path d="${EQ.H}"/></clipPath>`,
      equine(n, { line, hair: '#0A0A0A', tail: '#1E1E1E', mane: '#1E1E1E', lid: '#F2F0EA',
        bodyX: `<g clip-path="url(#${n}p)">${strokes(Array.from({ length: 12 }, (_, i) => { const x = 64 + i * 8; return `M${x} 54 C${x + 5} 70 ${x - 2} 88 ${x + 3} 106`; }), 3.6)}</g>`,
        neckX: `<g clip-path="url(#${n}n)">${strokes(Array.from({ length: 9 }, (_, i) => `M128 ${40 + i * 7} L182 ${22 + i * 7}`), 3.2)}</g>`,
        headX: `<g clip-path="url(#${n}k)">${strokes(['M160 16 L168 40', 'M166 14 L176 40', 'M174 18 L182 34', 'M156 30 L166 44'], 2.6)}<ellipse cx="194" cy="50" rx="9" ry="8" fill="#2A2A2A"/></g>` })) }; }

  { const line = '#8A7EA0';
  RIG.unicorn = { ...eqSpec, T: .7, legs: eqLegs('url(#UNL)', '#D8D2E6', line, hoof('#E8B4D0'), hoof('#D8A0C0')),
    draw: n => frame([104, 141, 64, 5], `${ugrad('UNL', 80, 140, '#FFFFFF', '#E6E0F0')}${grad(n + 'b', [[0, '#FFFFFF'], [1, '#E8E2F2']])}${rg(n + 'h', '#FFFFFF', '#F6F2FC', '#E0D8EC')}
        <linearGradient id="${n}r" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FF8AC8"/><stop offset=".25" stop-color="#FFC46A"/><stop offset=".5" stop-color="#8ADC8A"/><stop offset=".75" stop-color="#7AB8FF"/><stop offset="1" stop-color="#B48AFF"/></linearGradient>
        <linearGradient id="${n}g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFF4B0"/><stop offset="1" stop-color="#E8B030"/></linearGradient>`,
      equine(n, { line, hair: '#9A6AC8', tail: `url(#${n}r)`, mane: `url(#${n}r)`, lid: '#F6F2FC',
        horn: `<path d="M168 20 L178 -6 L174 22Z" fill="url(#${n}g)" stroke="#B8862A" stroke-width="1"/><path d="M169.5 16 L176 13 M171 10 L177 7 M172.5 4 L177.5 2" stroke="#B8862A" stroke-width=".9"/>`,
        headX: `<circle cx="180" cy="38" r="3" fill="#FFC8DE" opacity=".7"/>`,
        bodyX: `<g fill="#FFF" opacity=".9"><path d="M84 66 l1.2 3 l3 1.2 l-3 1.2 l-1.2 3 l-1.2 -3 l-3 -1.2 l3 -1.2Z"/><path d="M118 74 l1 2.4 l2.4 1 l-2.4 1 l-1 2.4 l-1 -2.4 l-2.4 -1 l2.4 -1Z" fill="#FFE27A"/></g>` })) }; }

  /* ---------- deer, goat, llama ---------- */
  { const line = '#4A2E18';
  RIG.deer = { w: 200, h: 180, T: .68, ground: 173, stride: 32, lift: 13, bob: 1.6, nod: 2, pitch: .7, center: [100, 92], head: [158, 54], wag: 9,
    legs: [
      { far: true, hip: [74, 100], len: [33, 34], w: [8, 5], reach: -2, phase: .5, muscle: [10, 15, 5], fill: '#8A5A34', line, foot: hoof('#2A1E14') },
      { far: true, hip: [128, 100], len: [33, 34], w: [7.5, 5], reach: 2, phase: .75, fill: '#8A5A34', line, foot: hoof('#2A1E14') },
      { hip: [62, 102], len: [33, 34], w: [9, 5.5], reach: -2, phase: 0, muscle: [12, 17, 5], fill: 'url(#DRL)', line, foot: hoof('#1E1610') },
      { hip: [138, 102], len: [33, 34], w: [8, 5.5], reach: 2, phase: .25, fill: 'url(#DRL)', line, foot: hoof('#1E1610') }],
    draw: n => frame([102, 174, 64, 5], `${ugrad('DRL', 96, 172, '#C08A58', '#8A5A34')}${grad(n + 'b', [[0, '#D09A64'], [.6, '#B47E4A'], [1, '#8A5A34']])}${rg(n + 'h', '#D8A470', '#B8824E', '#8E6038')}`,
      `<g data-p="tail" data-spring="14" data-o="50 84"><path d="M51 84 C44 76 40 70 44 66 C48 66 52 72 54 82Z" fill="#B47E4A" stroke="${line}" stroke-width="1.2"/><path d="M48 80 C45 74 44 70 46 68 C49 70 50 74 51 80Z" fill="#FFFFFF"/></g>
        <path d="M50 86 C54 70 80 66 106 68 C128 69 142 70 150 80 C158 90 154 106 140 112 C122 118 96 116 76 116 C60 116 48 108 46 98 C45 92 47 89 50 86Z" fill="url(#${n}b)" stroke="${line}" stroke-width="1.6"/>
        <path d="M66 110 C86 116 116 116 138 108" stroke="#F6EEE2" stroke-width="5" fill="none" stroke-linecap="round" opacity=".8"/>
        <g fill="#F6EEE2" opacity=".5"><circle cx="78" cy="78" r="1.6"/><circle cx="90" cy="74" r="1.4"/><circle cx="102" cy="77" r="1.5"/><circle cx="84" cy="86" r="1.3"/></g>
        <path d="M134 82 C138 66 146 52 156 44 L170 54 C164 62 158 74 154 90Z" fill="url(#${n}b)" stroke="${line}" stroke-width="1.6" stroke-linejoin="round"/>
        <path d="M150 60 C156 64 160 70 158 76 C154 72 150 66 150 60Z" fill="#FFFFFF" opacity=".9"/>
        <g data-p="head">
          <path d="M162 38 C158 24 150 16 140 12 M156 28 L148 26 M152 22 L152 12 M146 16 L138 18" stroke="#8E7A5E" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
          <g data-spring="8" data-o="156 44"><path d="M156 42 C146 34 138 36 142 44 C145 48 152 48 157 46Z" fill="url(#${n}h)" stroke="${line}" stroke-width="1.3"/><path d="M152 43 C146 39 143 40 145 43 C147 45 150 45 153 44Z" fill="#E8C8A8"/></g>
          <path d="M152 46 C154 36 166 32 176 36 C184 40 192 48 194 54 C195 58 192 61 188 61 L172 62 C162 62 154 56 152 46Z" fill="url(#${n}h)" stroke="${line}" stroke-width="1.6" stroke-linejoin="round"/>
          <path d="M182 56 C186 58 190 59 193 57" stroke="#FFFFFF" stroke-width="2.4" fill="none" stroke-linecap="round"/>
          <ellipse cx="192" cy="54" rx="3" ry="2.4" fill="#1E140C"/>
          <circle cx="168" cy="45" r="4" fill="#F6EEE2" opacity=".7"/>${eye(168, 45, 2.6, '#B8824E')}
          <path d="M166 35 C168 24 172 14 180 6 M171 22 L166 13 M175 14 L184 12 M168 28 L176 22" stroke="#B8A27E" stroke-width="3.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        </g>`) }; }

  { const line = '#6A5A48';
  RIG.goat = { w: 160, h: 120, T: .58, ground: 113, stride: 22, lift: 9, bob: 1.4, nod: 2.4, pitch: .6, center: [80, 62], head: [126, 38], wag: 12,
    legs: legs4({ bx: 54, fx: 106, y: 74, len: [19, 20], w: [8, 5.5], fill: '#E8E0D2', far: '#C8BEAE', line, foot: hoof('#4A3E32'), muscle: [9, 13, 3] }),
    draw: n => frame([82, 114, 46], `${rg(n + 'b', '#FFFDF8', '#EEE6D8', '#CFC4B2')}${rg(n + 'h', '#FFFDF8', '#F0E8DA', '#D2C8B6')}`,
      `<g data-p="tail" data-spring="16" data-o="42 56"><path d="M43 56 L35 44 C38 42 42 46 46 54Z" fill="#EEE6D8" stroke="${line}" stroke-width="1.2"/></g>
        <path d="M40 62 C42 48 62 44 86 46 C106 47 118 50 122 60 C126 72 118 80 104 82 C86 84 64 84 52 82 C42 80 38 72 40 62Z" fill="url(#${n}b)" stroke="${line}" stroke-width="1.5"/>
        <path d="M54 50 C70 46 92 46 110 50" stroke="#FFFFFF" stroke-width="3" fill="none" stroke-linecap="round" opacity=".6"/>
        <path d="M108 58 C112 46 118 36 126 30 L138 38 C132 46 128 56 126 70Z" fill="url(#${n}b)" stroke="${line}" stroke-width="1.4" stroke-linejoin="round"/>
        <g data-p="head">
          <path d="M131 26 C128 16 121 10 112 10" stroke="#5A4A38" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M131 26 C128 16 121 10 112 10" stroke="#A8957A" stroke-width="3.2" fill="none" stroke-linecap="round"/>
          <path d="M124 32 C126 24 136 20 144 24 L156 38 C159 42 157 46 152 46 C146 46 140 44 136 42 C130 40 124 38 124 32Z" fill="url(#${n}h)" stroke="${line}" stroke-width="1.4" stroke-linejoin="round"/>
          <g data-spring="7" data-o="131 32"><path d="M131 31 L117 34 C117 38 124 40 133 36Z" fill="url(#${n}h)" stroke="${line}" stroke-width="1.2" stroke-linejoin="round"/><path d="M128 33 L120 34.5 C121 36.5 125 37 129 35Z" fill="#F0C8C0"/></g>
          <g data-spring="10" data-o="146 45"><path d="M144 44 C144 52 141 58 138 60 C137 54 139 48 141 44Z" fill="#E2D8C6" stroke="${line}" stroke-width="1"/></g>
          <ellipse cx="155" cy="40" rx="1.4" ry="1.8" fill="#4A3E32"/>
          <path d="M156 44.5 C153 45.5 150 45.5 148 44.5" stroke="${line}" stroke-width="1" fill="none" stroke-linecap="round"/>
          <circle cx="139" cy="31" r="3" fill="#D8B060" stroke="#6A5020" stroke-width=".7"/><rect x="137" y="30.3" width="4" height="1.4" rx=".7" fill="#111"/><circle cx="140" cy="30" r=".7" fill="#fff"/>
          <ellipse data-p="lid" cx="139" cy="31" rx="3.6" ry="3.6" fill="#F0E8DA" style="transform-origin:139px 27.4px;transform:scaleY(0)"/>
        </g>`) }; }

  { const line = '#7A6448';
    const bumps = (x0, x1, y, c) => { let d = ''; for (let x = x0; x < x1; x += 7) d += `<path d="M${x} ${y} q3.5 -4 7 0" stroke="${c}" stroke-width="1.2" fill="none" opacity=".55"/>`; return d; };
  RIG.llama = { w: 150, h: 162, T: .74, ground: 154, stride: 24, lift: 10, bob: 1.4, nod: 1.6, pitch: .5, center: [72, 100], head: [108, 36], wag: 8,
    legs: legs4({ bx: 48, fx: 96, y: 108, len: [23, 24], w: [10, 6.5], fill: '#EADCC4', far: '#C8B898', line, foot: `<path d="M-4 -4 L6 -4 L8 2 L-5 2Z" fill="#5A4A38" stroke="#2A2018" stroke-width="1"/>`, muscle: [10, 13, 3] }),
    draw: n => frame([74, 155, 44], `${rg(n + 'b', '#FFF8EA', '#F0E2C8', '#D2BE9C')}${rg(n + 'h', '#FFF8EA', '#EEDFC4', '#D0BC98')}`,
      `<g data-p="tail" data-spring="12" data-o="34 96"><path d="M35 96 C28 92 26 84 30 82 C34 82 36 88 38 94Z" fill="#F0E2C8" stroke="${line}" stroke-width="1.2"/></g>
        <path d="M34 98 C36 82 54 76 76 78 C96 79 108 84 112 94 C114 106 106 114 92 116 C76 118 56 118 46 116 C36 114 32 106 34 98Z" fill="url(#${n}b)" stroke="${line}" stroke-width="1.5"/>
        ${bumps(40, 104, 96, line)}${bumps(44, 100, 106, line)}
        <path d="M50 80 C62 76 80 76 92 80 L94 92 C80 90 62 90 48 92Z" fill="#C8382E" stroke="#7A1E18" stroke-width="1.1"/>
        <path d="M49 85 L93 85 M48.5 89 L93.5 89" stroke="#F2C230" stroke-width="1.6"/><path d="M52 92 l0 4 M60 91.5 l0 4 M68 91 l0 4 M76 91 l0 4 M84 91.5 l0 4 M92 92 l0 4" stroke="#2E7AC8" stroke-width="2" stroke-linecap="round"/>
        <path d="M96 92 C98 70 100 50 102 36 L118 36 C118 54 116 76 112 100Z" fill="url(#${n}b)" stroke="${line}" stroke-width="1.5" stroke-linejoin="round"/>
        ${bumps(100, 114, 60, line)}${bumps(99, 114, 76, line)}
        <g data-p="head">
          <g data-spring="7" data-o="104 26"><path d="M103 26 C100 16 101 8 106 4 C109 10 109 18 107 26Z" fill="url(#${n}h)" stroke="${line}" stroke-width="1.2"/></g>
          <path d="M98 34 C98 24 108 20 116 22 C122 24 126 28 130 34 C132 38 130 42 126 42 L112 44 C104 44 98 40 98 34Z" fill="url(#${n}h)" stroke="${line}" stroke-width="1.4"/>
          <g data-spring="7" data-o="110 24"><path d="M109 24 C108 14 110 6 115 3 C117 9 116 17 113 24Z" fill="url(#${n}h)" stroke="${line}" stroke-width="1.2"/><path d="M111 21 C111 14 112 9 114 7 C115 12 114 17 112.5 21Z" fill="#D8B8A0"/></g>
          <ellipse cx="128" cy="35" rx="1.3" ry="1.7" fill="#3A2E22"/>
          <path d="M129 40 C127 41 124 41 122 40" stroke="${line}" stroke-width="1" fill="none" stroke-linecap="round"/>
          ${eye(114, 30, 2.5, '#EEDFC4')}
        </g>`) }; }

  /* ---------- big horned and tusked animals ---------- */
  { const line = '#5A2A10';
    const fringe = (x0, x1, y, c) => { let d = `M${x0} ${y}`; for (let x = x0; x < x1; x += 6) d += ` L${x + 3} ${y + 7 + (x % 4)} L${x + 6} ${y}`; return `<path d="${d}" fill="${c}" stroke="${line}" stroke-width="1" stroke-linejoin="round"/>`; };
  RIG.highland = { w: 200, h: 140, T: .85, ground: 130, stride: 22, lift: 8, bob: 1.4, nod: 2, pitch: .5, center: [96, 74], head: [150, 62], wag: 4,
    legs: legs4({ bx: 64, fx: 128, y: 92, len: [19, 20], w: [14, 10], fill: '#B4602A', far: '#8A4418', line, foot: hoof('#2A1A10'), muscle: [13, 15, 4] }),
    draw: n => frame([100, 131, 60], `${rg(n + 'b', '#E0884A', '#C46A2E', '#8E4418')}${rg(n + 'h', '#E8904E', '#C86E30', '#94481A')}`,
      `<g data-p="tail" data-spring="8" data-o="52 66"><path d="M53 66 C45 72 43 90 45 104" stroke="${line}" stroke-width="2.6" fill="none" stroke-linecap="round"/><path d="M40 100 C40 112 50 114 50 102 C48 98 42 98 40 100Z" fill="#8E4418"/></g>
        <path d="M50 72 C52 54 76 50 104 52 C128 53 142 56 148 68 C154 82 146 94 130 96 C110 98 86 98 70 96 C56 94 48 86 50 72Z" fill="url(#${n}b)" stroke="${line}" stroke-width="1.6"/>
        ${fringe(54, 144, 92, '#B4602A')}
        <path d="M62 60 q6 6 0 12 M78 56 q6 6 0 12 M94 56 q6 6 0 12 M110 58 q6 6 0 12 M126 62 q6 6 0 12" stroke="#F2A060" stroke-width="1.4" fill="none" opacity=".6"/>
        <path d="M134 64 C138 54 146 48 152 46 L162 62 C157 70 151 78 146 88Z" fill="url(#${n}b)" stroke="${line}" stroke-width="1.5" stroke-linejoin="round"/>
        <g data-p="head">
          <path d="M150 46 C136 44 126 36 124 22" stroke="#4A3A28" stroke-width="5.4" fill="none" stroke-linecap="round"/><path d="M150 46 C136 44 126 36 124 22" stroke="#F0E2C2" stroke-width="3.6" fill="none" stroke-linecap="round"/>
          <path d="M146 50 C148 42 160 40 168 44 C176 48 182 60 184 70 C186 78 182 84 174 84 C166 84 158 78 154 70 C150 64 146 58 146 50Z" fill="url(#${n}h)" stroke="${line}" stroke-width="1.5"/>
          <path d="M166 46 C178 40 186 32 188 20" stroke="#4A3A28" stroke-width="5.4" fill="none" stroke-linecap="round"/><path d="M166 46 C178 40 186 32 188 20" stroke="#F0E2C2" stroke-width="3.6" fill="none" stroke-linecap="round"/>
          <path d="M168 70 C174 66 182 68 185 74 C186 80 182 85 175 85 C170 85 166 80 168 70Z" fill="#5A3A2A" stroke="${line}" stroke-width="1.2"/>
          <ellipse cx="177" cy="76" rx="1.5" ry="2" fill="#1A0E08"/><ellipse cx="183" cy="75" rx="1.3" ry="1.8" fill="#1A0E08"/>
          ${eye(168, 58, 2.3, '#C86E30')}
          <g data-spring="5" data-o="160 46"><path d="M148 48 L152 62 L156 52 L159 64 L162 52 L166 62 L168 50 L172 58 L172 46 C164 42 154 42 148 48Z" fill="#D47A3A" stroke="${line}" stroke-width="1" stroke-linejoin="round"/></g>
          <g data-spring="8" data-o="150 54"><path d="M150 54 L136 52 C134 56 140 60 150 59Z" fill="url(#${n}h)" stroke="${line}" stroke-width="1.2"/></g>
        </g>`) }; }

  { const line = '#2A1A10';
  RIG.moose = { w: 210, h: 166, T: .82, ground: 158, stride: 34, lift: 12, bob: 1.6, nod: 2, pitch: .6, center: [104, 88], head: [162, 56], wag: 4,
    legs: legs4({ bx: 74, fx: 132, y: 96, len: [31, 32], w: [11, 7], fill: '#9A7A5A', far: '#6E5238', line, foot: hoof('#1E1610'), muscle: [13, 17, 4] }),
    draw: n => frame([106, 159, 64, 5], `${rg(n + 'b', '#7A5232', '#553620', '#3A2414')}${rg(n + 'h', '#80583A', '#5A3A22', '#3E2616')}${grad(n + 'a', [[0, '#F0E2C0'], [1, '#C8B088']])}`,
      `<path d="M60 86 C54 84 52 90 56 92Z" fill="#553620" stroke="${line}" stroke-width="1"/>
        <path d="M58 92 C58 72 80 62 104 62 C112 54 126 54 136 62 C148 66 154 76 154 88 C154 102 142 110 126 112 C106 114 84 114 72 112 C62 110 58 102 58 92Z" fill="url(#${n}b)" stroke="${line}" stroke-width="1.6"/>
        <path d="M108 60 C116 56 126 56 132 62" stroke="#9A7050" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".6"/>
        <path d="M140 74 C146 60 154 52 162 48 L176 58 C170 66 164 76 158 92Z" fill="url(#${n}b)" stroke="${line}" stroke-width="1.6" stroke-linejoin="round"/>
        <g data-p="head">
          <path d="M160 44 C152 36 140 34 132 26 L134 22 L139 26 L140 16 L145 24 L148 12 L151 22 L156 10 L158 22 L164 14 L164 28 C166 34 166 40 164 46Z" fill="#B8A07A" stroke="${line}" stroke-width="1.1" stroke-linejoin="round"/>
          <path d="M156 50 C158 42 168 40 176 44 L196 62 C201 68 200 76 192 78 C186 80 178 76 172 72 C164 66 156 60 156 50Z" fill="url(#${n}h)" stroke="${line}" stroke-width="1.6" stroke-linejoin="round"/>
          <g data-spring="9" data-o="168 70"><path d="M168 70 C170 80 166 90 163 95 C160 86 162 78 164 70Z" fill="#553620" stroke="${line}" stroke-width="1.1"/></g>
          <ellipse cx="194" cy="68" rx="2" ry="2.6" fill="#120A06"/>
          <path d="M192 77 C188 77 185 76 183 74" stroke="${line}" stroke-width="1.1" fill="none" stroke-linecap="round"/>
          <g data-spring="8" data-o="164 48"><path d="M164 48 L152 40 C150 44 154 50 164 52Z" fill="url(#${n}h)" stroke="${line}" stroke-width="1.2"/></g>
          ${eye(172, 52, 2.4, '#5A3A22')}
          <path d="M166 44 C172 36 180 28 186 18 L183 14 L180 20 L180 10 L175 18 L174 6 L170 16 L166 6 L165 18 L160 12 L162 30 C160 36 160 40 162 46Z" fill="url(#${n}a)" stroke="${line}" stroke-width="1.2" stroke-linejoin="round"/>
        </g>`) }; }

  { const line = '#6A3A14';
    const P = 'M38 108 C40 94 58 88 78 90 C98 90 112 94 116 104 C120 116 112 124 98 126 C80 128 60 128 50 126 C40 124 36 116 38 108Z';
    const N = 'M100 98 C108 72 118 46 126 26 L140 32 C134 54 124 80 116 108Z';
    const patches = (x0, y0, x1, y1) => { let s = ''; for (let y = y0, r = 0; y < y1; y += 11, r++) for (let x = x0 + (r % 2) * 6; x < x1; x += 12) s += `<rect x="${x}" y="${y}" width="${9 + (x * 7 + y) % 3}" height="${8 + (x + y * 3) % 3}" rx="3"/>`; return s; };
  RIG.giraffe = { w: 170, h: 214, T: .95, ground: 196, stride: 36, lift: 13, bob: 1.6, nod: 1.6, pitch: .6, center: [76, 108], head: [130, 30], wag: 5,
    legs: [
      { far: true, hip: [56, 114], len: [40, 41], w: [9, 6], reach: -2, phase: .5, muscle: [10, 16, 6], fill: '#D8B478', line, foot: hoof('#3A2A1A') },
      { far: true, hip: [100, 114], len: [40, 41], w: [9, 6], reach: 2, phase: .75, fill: '#D8B478', line, foot: hoof('#3A2A1A') },
      { hip: [48, 116], len: [40, 41], w: [10, 6.5], reach: -2, phase: 0, muscle: [12, 18, 6], fill: '#F2D49A', line, foot: hoof('#2A1E14') },
      { hip: [108, 116], len: [40, 41], w: [10, 6.5], reach: 2, phase: .25, fill: '#F2D49A', line, foot: hoof('#2A1E14') }],
    draw: n => frame([80, 197, 50], `${rg(n + 'b', '#FFF0C8', '#F4D69C', '#DCB676')}<clipPath id="${n}p"><path d="${P}"/></clipPath><clipPath id="${n}n"><path d="${N}"/></clipPath>`,
      `<g data-p="tail" data-spring="8" data-o="40 102"><path d="M40 102 C34 112 32 124 32 136" stroke="${line}" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M28 132 C28 144 36 144 36 132Z" fill="#3A2214"/></g>
        <path d="${P}" fill="url(#${n}b)" stroke="${line}" stroke-width="1.5"/>
        <g clip-path="url(#${n}p)" fill="#B0602A" stroke="#7A3A14" stroke-width=".6">${patches(36, 86, 118, 128)}</g>
        <path d="${N}" fill="url(#${n}b)" stroke="${line}" stroke-width="1.5" stroke-linejoin="round"/>
        <g clip-path="url(#${n}n)" fill="#B0602A" stroke="#7A3A14" stroke-width=".6">${patches(98, 24, 142, 110)}</g>
        <g data-spring="3" data-o="128 30"><path d="M126 26 C120 44 112 70 104 96 L100 96 C108 70 116 44 122 26Z" fill="#8A4A1E"/></g>
        <g data-p="head">
          <path d="M130 16 L128 5 M137 14 L137 3" stroke="#B88A50" stroke-width="3.2" stroke-linecap="round"/><circle cx="128" cy="4.5" r="2.4" fill="#3A2214"/><circle cx="137" cy="2.5" r="2.4" fill="#3A2214"/>
          <g data-spring="7" data-o="128 20"><path d="M128 20 L116 16 C115 20 120 23 128 24Z" fill="url(#${n}b)" stroke="${line}" stroke-width="1.1"/></g>
          <path d="M124 22 C126 14 136 10 144 12 L160 24 C164 28 162 34 156 34 L142 34 C132 34 124 30 124 22Z" fill="url(#${n}b)" stroke="${line}" stroke-width="1.4" stroke-linejoin="round"/>
          <path d="M152 24 C158 26 162 30 160 33" stroke="#D8B478" stroke-width="3" fill="none" opacity=".7"/>
          <ellipse cx="159" cy="27" rx="1.2" ry="1.6" fill="#3A2214"/>
          ${eye(140, 20, 2.4, '#F4D69C')}
        </g>`) }; }

  const elephantArt = (n, c) => `
        <g data-p="tail" data-spring="8" data-o="46 76"><path d="M46 76 C40 84 38 94 38 104" stroke="${c.line}" stroke-width="2.2" fill="none" stroke-linecap="round"/><path d="M35 102 C35 110 41 110 41 102Z" fill="${c.tuft}"/></g>
        <path d="${c.P}" fill="url(#${n}b)" stroke="${c.line}" stroke-width="1.7"/>${c.bodyX || ''}
        <g data-p="head">
          ${c.backHead || ''}
          <path d="${c.H}" fill="url(#${n}h)" stroke="${c.line}" stroke-width="1.6"/>
          <g data-spring="${c.trunkAmp || 7}" data-o="178 70"><path d="M174 66 C184 72 188 88 186 102 C185 110 190 116 195 113 C197 111 195 107 192 106 C193 94 194 80 189 66Z" fill="url(#${n}h)" stroke="${c.line}" stroke-width="1.5" stroke-linejoin="round"/>
            <path d="M184 80 l6 -1 M185 88 l6 -.5 M185 96 l6 0" stroke="${c.line}" stroke-width=".8" opacity=".5"/></g>
          ${c.tusk}
          ${eye(170, 54, 2.2, c.lid)}
          ${c.ear}
        </g>`;
  const eleLegs = (fill, far, line, nail) => { const foot = `<path d="M-11 -5 L11 -5 L12 2 L-12 2Z" fill="${fill.startsWith('url') ? far : fill}" stroke="${line}" stroke-width="1.3" stroke-linejoin="round"/><path d="M-6 2 a2.4 2 0 0 1 4.8 0 M2 2 a2.4 2 0 0 1 4.8 0" fill="${nail}"/>`;
    return legs4({ bx: 66, fx: 128, y: 94, len: [22, 22], w: [22, 19], fill, far, line, foot, curl: 6 }); };

  { const line = '#4A4A52';
  RIG.elephant = { w: 210, h: 156, T: .95, ground: 137, stride: 24, lift: 8, bob: 1.6, nod: 1.4, pitch: .5, center: [100, 80], head: [150, 60], wag: 3,
    legs: eleLegs('url(#ELL)', '#7E7E88', line, '#E8E2D6'),
    draw: n => frame([104, 138, 64, 5], `${ugrad('ELL', 92, 137, '#A8A8B2', '#82828C')}${rg(n + 'b', '#B8B8C2', '#9898A2', '#727280')}${rg(n + 'h', '#BCBCC6', '#9C9CA6', '#767682')}`,
      elephantArt(n, { line, tuft: '#3A3A42', lid: '#9C9CA6', P: 'M44 82 C44 56 70 44 102 44 C130 44 150 56 152 78 C154 96 142 108 122 110 C100 112 76 112 62 110 C48 106 44 96 44 82Z',
        H: 'M140 60 C140 42 154 32 168 34 C182 36 192 48 190 62 C189 70 184 76 178 80 C166 82 150 78 144 72 C141 68 140 64 140 60Z',
        bodyX: `<path d="M70 58 C86 52 110 52 130 58" stroke="#C8C8D2" stroke-width="3" fill="none" stroke-linecap="round" opacity=".5"/><path d="M60 100 q4 -6 0 -12 M72 104 q4 -6 0 -12" stroke="${line}" stroke-width=".8" fill="none" opacity=".4"/>`,
        tusk: `<path d="M178 78 C182 86 190 90 198 88 C190 85 184 82 182 77Z" fill="#FBF6EA" stroke="#A89E88" stroke-width="1"/>`,
        ear: `<g data-spring="9" data-o="152 46"><path d="M156 42 C144 34 128 38 126 56 C124 74 134 88 148 90 C158 90 162 80 160 68 C160 58 160 50 156 42Z" fill="url(#${n}b)" stroke="${line}" stroke-width="1.5"/>
          <path d="M152 48 C142 44 134 50 133 60 C132 72 138 82 146 84 C152 84 154 76 153 68Z" fill="#D8A8B0" opacity=".55"/></g>` })) }; }

  { const line = '#3A2210';
    const fringe = (x0, x1, y) => { let d = `M${x0} ${y - 6}`; for (let x = x0; x < x1; x += 6) d += ` L${x + 3} ${y + 6 + (x % 5)} L${x + 6} ${y - 2}`; return `<path d="${d}Z" fill="#7A4A26" stroke="${line}" stroke-width="1" stroke-linejoin="round"/>`; };
  RIG.mammoth = { w: 210, h: 160, T: 1, ground: 141, stride: 24, lift: 8, bob: 1.6, nod: 1.4, pitch: .5, center: [100, 84], head: [150, 62], wag: 3,
    legs: legs4({ bx: 66, fx: 128, y: 98, len: [22, 22], w: [22, 19], fill: '#7A4A26', far: '#5A341A', line, curl: 6,
      foot: `<path d="M-11 -5 L11 -5 L12 2 L-12 2Z" fill="#5A341A" stroke="${line}" stroke-width="1.3"/><path d="M-12 -5 L-9 -11 L-6 -5 L-3 -11 L0 -5 L3 -11 L6 -5 L9 -11 L12 -5Z" fill="#7A4A26" stroke="${line}" stroke-width=".9" stroke-linejoin="round"/>` }),
    draw: n => frame([104, 142, 66, 5], `${rg(n + 'b', '#A86E40', '#7E4E2A', '#56331A')}${rg(n + 'h', '#AE7444', '#84522C', '#5A361C')}`,
      elephantArt(n, { line, tuft: '#3A2210', lid: '#84522C', trunkAmp: 6,
        P: 'M44 86 C44 58 66 38 100 38 C112 30 128 30 136 40 C150 48 154 64 152 82 C152 100 142 112 122 114 C100 116 76 116 62 114 C48 110 44 100 44 86Z',
        H: 'M138 58 C136 38 148 22 164 24 C180 26 190 42 190 60 C189 70 184 76 178 80 C166 82 150 78 144 72 C140 68 138 62 138 58Z',
        bodyX: `${fringe(48, 150, 110)}<path d="M64 56 q5 8 0 16 M80 48 q5 8 0 16 M96 44 q5 8 0 16 M112 42 q5 8 0 16 M128 46 q5 8 0 16" stroke="#B88050" stroke-width="1.4" fill="none" opacity=".6"/>`,
        tusk: `<path d="M178 78 C186 96 206 100 210 82 C212 74 208 68 204 70 C206 80 200 90 190 84 C186 82 183 78 182 74Z" fill="#FBF3E2" stroke="#A89A80" stroke-width="1"/>`,
        ear: `<g data-spring="6" data-o="154 48"><path d="M156 44 C148 40 140 44 140 54 C140 62 146 66 154 64 C158 60 158 50 156 44Z" fill="url(#${n}b)" stroke="${line}" stroke-width="1.3"/></g>
          <path d="M150 26 L154 18 L158 26 L162 18 L166 26 L170 20 L172 28" stroke="#5A341A" stroke-width="1.6" fill="none" stroke-linejoin="round"/>` })) }; }

  { const line = '#3E3A36';
  RIG.rhino = { w: 196, h: 128, T: .85, ground: 120, stride: 22, lift: 8, bob: 1.6, nod: 1.6, pitch: .5, center: [90, 72], head: [138, 66], wag: 6,
    legs: legs4({ bx: 58, fx: 116, y: 86, len: [17, 18], w: [18, 14], fill: 'url(#RHL)', far: '#6E6A64', line, curl: 8,
      foot: `<path d="M-9 -5 L9 -5 L10 2 L-10 2Z" fill="#6E6A64" stroke="${line}" stroke-width="1.2"/><path d="M-5 2 a2 1.6 0 0 1 4 0 M2 2 a2 1.6 0 0 1 4 0" fill="#C8C0B0"/>` }),
    draw: n => frame([94, 121, 60, 5], `${ugrad('RHL', 82, 120, '#A8A49C', '#7E7A72')}${rg(n + 'b', '#BAB6AE', '#98948C', '#6E6A64')}${rg(n + 'h', '#BEBAB2', '#9C9890', '#72706A')}`,
      `<g data-p="tail" data-spring="10" data-o="40 68"><path d="M40 68 C34 74 32 82 33 90" stroke="${line}" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M31 88 C30 94 35 95 35 89Z" fill="#2A2622"/></g>
        <path d="M40 72 C40 54 62 44 90 44 C116 44 134 52 140 66 C144 80 136 96 120 98 C100 100 76 100 60 98 C46 96 40 86 40 72Z" fill="url(#${n}b)" stroke="${line}" stroke-width="1.7"/>
        <path d="M64 50 C60 62 60 80 64 96 M118 50 C114 62 114 80 118 96 M54 82 C70 86 100 86 130 82" stroke="${line}" stroke-width="1.1" fill="none" opacity=".45"/>
        <path d="M74 52 C90 48 108 48 124 54" stroke="#D2CEC6" stroke-width="3" fill="none" stroke-linecap="round" opacity=".5"/>
        <g data-p="head">
          <g data-spring="7" data-o="146 52"><path d="M146 52 L140 38 C146 38 150 44 151 50Z" fill="url(#${n}h)" stroke="${line}" stroke-width="1.2" stroke-linejoin="round"/></g>
          <path d="M132 60 C136 50 150 48 160 52 L182 68 C186 72 184 80 178 82 L158 84 C144 84 134 76 132 60Z" fill="url(#${n}h)" stroke="${line}" stroke-width="1.6" stroke-linejoin="round"/>
          <path d="M168 62 C172 50 178 38 182 28 C186 42 186 56 180 68Z" fill="#E2DACA" stroke="${line}" stroke-width="1.2" stroke-linejoin="round"/>
          <path d="M156 56 C158 50 161 45 164 42 C166 48 165 54 162 58Z" fill="#E2DACA" stroke="${line}" stroke-width="1.1" stroke-linejoin="round"/>
          <path d="M176 80 C172 81 168 80 166 78" stroke="${line}" stroke-width="1.1" fill="none" stroke-linecap="round"/>
          <ellipse cx="180" cy="72" rx="1.4" ry="2" fill="#1E1C1A"/>
          ${eye(152, 64, 2, '#9C9890')}
        </g>`) }; }

  { const line = '#4A3A48';
  RIG.hippo = { w: 196, h: 118, T: 1, ground: 104, stride: 16, lift: 6, bob: 1.8, nod: 1.6, pitch: .6, center: [90, 64], head: [138, 58], wag: 8,
    legs: legs4({ bx: 58, fx: 114, y: 82, len: [10, 11], w: [18, 15], fill: 'url(#HPL)', far: '#6E5E70', line, curl: 6,
      foot: `<path d="M-9 -5 L9 -5 L10 2 L-10 2Z" fill="#6E5E70" stroke="${line}" stroke-width="1.2"/>` }),
    draw: n => frame([94, 105, 60, 5], `${ugrad('HPL', 78, 104, '#A08EA4', '#7A687E')}${rg(n + 'b', '#B4A2B8', '#8E7C94', '#665470')}${rg(n + 'h', '#BAA8BE', '#94829A', '#6A5874')}`,
      `<g data-p="tail" data-spring="14" data-o="36 62"><path d="M36 60 L28 66 L32 70 L37 66Z" fill="#8E7C94" stroke="${line}" stroke-width="1.1"/></g>
        <path d="M34 66 C34 46 58 38 90 38 C120 38 140 46 146 62 C150 76 140 88 122 90 C100 92 74 92 56 90 C42 88 34 78 34 66Z" fill="url(#${n}b)" stroke="${line}" stroke-width="1.7"/>
        <path d="M52 86 C74 92 106 92 132 86" stroke="#E8B0B8" stroke-width="4" fill="none" stroke-linecap="round" opacity=".6"/>
        <path d="M62 48 C80 42 104 42 124 48" stroke="#D2C4D6" stroke-width="3" fill="none" stroke-linecap="round" opacity=".5"/>
        <g data-p="head">
          <path d="M134 50 C138 40 152 38 162 42 C172 44 184 50 186 62 C188 74 180 82 166 82 L146 82 C138 80 132 66 134 50Z" fill="url(#${n}h)" stroke="${line}" stroke-width="1.6"/>
          <path d="M150 72 C160 76 174 76 186 70" stroke="${line}" stroke-width="1.2" fill="none" stroke-linecap="round"/>
          <path d="M156 74 l1.5 4 l1.5 -4 M170 74 l1.5 4 l1.5 -4" fill="#FFFFFF" stroke="#BAB0A0" stroke-width=".6"/>
          <ellipse cx="174" cy="50" rx="6" ry="4" fill="url(#${n}h)" stroke="${line}" stroke-width="1"/><ellipse cx="175" cy="49" rx="1.5" ry="1.1" fill="#2A1E2A"/>
          <circle cx="150" cy="44" r="5.5" fill="url(#${n}h)" stroke="${line}" stroke-width="1.2"/>
          <g data-spring="8" data-o="144 42"><ellipse cx="143" cy="38" rx="3.4" ry="4.6" fill="#8E7C94" stroke="${line}" stroke-width="1.1"/><ellipse cx="143" cy="38.5" rx="1.6" ry="2.6" fill="#E8B0B8"/></g>
          ${eye(151, 43, 1.9, '#94829A')}
          <circle cx="166" cy="62" r="1" fill="${line}" opacity=".5"/><circle cx="170" cy="60" r="1" fill="${line}" opacity=".5"/><circle cx="174" cy="63" r="1" fill="${line}" opacity=".5"/>
        </g>`) }; }

  /* ---------- dinosaurs, reptiles and the dragon ---------- */
  const claws = (c, line) => `<path d="M-5 0 L-1 -3 L9 -3 L13 1 M3 -2 L10 2 M-5 0 L-7 2" stroke="${line}" stroke-width="4.4" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M-5 0 L-1 -3 L9 -3 L13 1 M3 -2 L10 2 M-5 0 L-7 2" stroke="${c}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
  const teeth = (x0, x1, y, dir = 1) => { let d = ''; for (let x = x0; x < x1; x += 3.4) d += `M${x.toFixed(1)} ${y} l1.7 ${2.6 * dir} l1.7 ${-2.6 * dir} `; return `<path d="${d}" fill="#FFFDF2" stroke="#9A9078" stroke-width=".5"/>`; };

  { const line = '#26321A';
  RIG.trex = { w: 192, h: 132, T: .8, ground: 126, stride: 30, lift: 12, bob: 2, stance: .6, pitch: 2, nod: 2, center: [96, 64], head: [134, 50], wag: 2,
    legs: [
      { far: true, hip: [88, 74], len: [25, 27], w: [14, 8], back: false, phase: .5, curl: -30, muscle: [15, 19, 7], fill: '#56703A', line, foot: claws('#56703A', line) },
      { hip: [96, 76], len: [25, 27], w: [16, 9], back: false, phase: 0, curl: -30, muscle: [17, 21, 7], fill: '#6E8A48', line, foot: claws('#7E9A56', line) }],
    draw: n => frame([96, 127, 46], `${rg(n + 'b', '#94B464', '#6E8C46', '#4A6430')}${rg(n + 'h', '#9ABA6A', '#728E4A', '#4C6632')}`,
      `<g data-p="tail" data-spring="4" data-o="62 62"><path d="M62 50 C42 48 20 52 2 60 C20 62 42 66 64 74Z" fill="url(#${n}b)" stroke="${line}" stroke-width="1.5" stroke-linejoin="round"/>
          <path d="M14 58 l4 -3 l2 3 M28 54 l4 -3 l2 3 M42 52 l4 -3 l2 3" stroke="#3E5428" stroke-width="1.2" fill="none"/></g>
        <path d="M56 60 C60 46 84 40 108 42 C126 44 138 52 140 62 C140 74 128 82 110 84 C90 86 70 80 60 72 C56 68 55 64 56 60Z" fill="url(#${n}b)" stroke="${line}" stroke-width="1.6"/>
        <path d="M70 78 C86 84 108 84 126 76" stroke="#D8DCA0" stroke-width="5" fill="none" stroke-linecap="round" opacity=".55"/>
        <g fill="#4A6430" opacity=".55"><circle cx="76" cy="52" r="2.4"/><circle cx="90" cy="47" r="2"/><circle cx="104" cy="46" r="2.2"/><circle cx="118" cy="49" r="2"/><circle cx="84" cy="58" r="1.6"/></g>
        <g data-spring="14" data-o="130 66"><path d="M130 66 C136 70 140 74 138 79" stroke="${line}" stroke-width="5.6" fill="none" stroke-linecap="round"/><path d="M130 66 C136 70 140 74 138 79" stroke="#6E8A48" stroke-width="3.6" fill="none" stroke-linecap="round"/><path d="M138 79 l3 1 M138 79 l1 3" stroke="#F2EED8" stroke-width="1.2" stroke-linecap="round"/></g>
        <g data-p="head">
          <path d="M126 46 C126 32 140 24 156 26 C170 28 182 32 186 40 C188 48 184 56 176 58 L150 60 C138 60 128 56 126 46Z" fill="url(#${n}h)" stroke="${line}" stroke-width="1.6"/>
          <path d="M148 52 C160 52 172 50 185 46" stroke="${line}" stroke-width="1.4" fill="none" stroke-linecap="round"/>${teeth(152, 182, 51.5)}
          <ellipse cx="180" cy="36" rx="1.6" ry="1.2" fill="${line}"/>
          <path d="M150 30 C154 28 160 28 164 31" stroke="#3E5428" stroke-width="2.2" fill="none" stroke-linecap="round"/>
          ${ieye(157, 35, 2.4, '#F0B020', '#728E4A', true)}
        </g>`) }; }

  { const line = '#4A3014';
  RIG.raptor = { w: 160, h: 106, T: .44, ground: 100, stride: 30, lift: 12, bob: 1.6, stance: .55, pitch: 1.5, nod: 2.5, center: [78, 52], head: [112, 42], wag: 3,
    legs: [
      { far: true, hip: [68, 58], len: [19, 21], w: [9, 5], back: false, phase: .5, curl: -35, muscle: [9, 13, 5], fill: '#A8803E', line, foot: claws('#A8803E', line) + `<path d="M2 -3 C0 -9 4 -12 8 -11" stroke="#F2EED8" stroke-width="1.6" fill="none" stroke-linecap="round"/>` },
      { hip: [74, 60], len: [19, 21], w: [10, 5.5], back: false, phase: 0, curl: -35, muscle: [11, 15, 5], fill: '#C8A060', line, foot: claws('#D0AA6A', line) + `<path d="M2 -3 C0 -9 4 -12 8 -11" stroke="#F2EED8" stroke-width="1.6" fill="none" stroke-linecap="round"/>` }],
    draw: n => frame([78, 101, 40, 4], `${rg(n + 'b', '#E2BE7E', '#C8A060', '#94723A')}${rg(n + 'h', '#E6C484', '#CCA466', '#98763C')}`,
      `<g data-p="tail" data-spring="5" data-o="48 54"><path d="M48 48 C30 44 14 44 2 46 C14 52 30 56 50 60Z" fill="url(#${n}b)" stroke="${line}" stroke-width="1.4" stroke-linejoin="round"/>
          <path d="M14 46 l2 5 M24 46 l2 6 M34 47 l2 6" stroke="#6A4A1E" stroke-width="2" stroke-linecap="round"/></g>
        <path d="M44 52 C50 42 70 38 88 40 C102 42 110 48 110 56 C108 64 96 68 82 68 C66 68 52 62 44 52Z" fill="url(#${n}b)" stroke="${line}" stroke-width="1.5"/>
        <path d="M60 42 l3 8 M72 40 l3 9 M84 40 l2 9 M96 43 l1 8" stroke="#6A4A1E" stroke-width="2.4" stroke-linecap="round"/>
        <path d="M58 64 C72 68 90 68 104 62" stroke="#F2E6C8" stroke-width="3.4" fill="none" stroke-linecap="round" opacity=".7"/>
        <path d="M100 46 C106 40 112 34 118 30 L126 36 C120 40 114 48 108 56Z" fill="url(#${n}b)" stroke="${line}" stroke-width="1.4" stroke-linejoin="round"/>
        <g data-spring="12" data-o="104 56"><path d="M104 56 C110 60 114 64 116 68" stroke="${line}" stroke-width="4.6" fill="none" stroke-linecap="round"/><path d="M104 56 C110 60 114 64 116 68" stroke="#C8A060" stroke-width="2.8" fill="none" stroke-linecap="round"/>
          <path d="M104 58 C100 62 102 66 106 66" stroke="#7A5A2A" stroke-width="2" fill="none" stroke-linecap="round"/></g>
        <g data-p="head">
          <path d="M114 30 C116 22 126 20 134 22 L152 30 C155 32 154 36 150 37 L132 40 C122 40 114 36 114 30Z" fill="url(#${n}h)" stroke="${line}" stroke-width="1.4" stroke-linejoin="round"/>
          <path d="M130 35 L153 33" stroke="${line}" stroke-width="1.1"/>${teeth(132, 150, 34.6)}
          <path d="M124 24 C128 22 132 22 135 24" stroke="#6A4A1E" stroke-width="1.8" fill="none" stroke-linecap="round"/>
          <ellipse cx="148" cy="28.5" rx="1.1" ry=".8" fill="${line}"/>
          ${ieye(129, 28, 2.2, '#E8C020', '#CCA466', true)}
        </g>`) }; }

  { const line = '#22402E';
  RIG.sauropod = { w: 210, h: 158, T: 1.3, ground: 140, stride: 20, lift: 7, bob: 1.6, nod: 1.6, pitch: .5, center: [100, 88], head: [146, 80], wag: 3,
    legs: legs4({ bx: 78, fx: 124, y: 100, len: [20, 21], w: [16, 13], fill: '#5E9A78', far: '#477A5E', line, curl: 8,
      foot: `<path d="M-8 -5 L8 -5 L9 2 L-9 2Z" fill="#477A5E" stroke="${line}" stroke-width="1.2"/>` }),
    draw: n => frame([104, 141, 58], `${rg(n + 'b', '#8CC8A2', '#62A07E', '#3E7458')}${rg(n + 'h', '#94CEA8', '#68A684', '#42785C')}`,
      `<g data-p="tail" data-spring="4" data-o="62 92"><path d="M62 82 C40 84 18 94 2 108 C22 100 42 98 64 102Z" fill="url(#${n}b)" stroke="${line}" stroke-width="1.5" stroke-linejoin="round"/></g>
        <path d="M56 92 C58 70 80 60 104 60 C128 60 146 72 148 92 C148 108 134 116 108 116 C82 116 58 110 56 92Z" fill="url(#${n}b)" stroke="${line}" stroke-width="1.6"/>
        <path d="M70 110 C88 116 116 116 138 108" stroke="#DCEED2" stroke-width="5" fill="none" stroke-linecap="round" opacity=".6"/>
        <g fill="#3E7458" opacity=".5"><circle cx="82" cy="72" r="3"/><circle cx="98" cy="68" r="2.6"/><circle cx="114" cy="70" r="2.8"/><circle cx="90" cy="82" r="2.2"/><circle cx="126" cy="78" r="2.4"/></g>
        <g data-p="head">
          <path d="M134 74 C144 56 156 38 168 22 L180 28 C170 44 158 62 146 90Z" fill="url(#${n}b)" stroke="${line}" stroke-width="1.5" stroke-linejoin="round"/>
          <path d="M142 72 C150 58 160 44 170 30" stroke="#DCEED2" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".55"/>
          <path d="M168 22 C170 14 180 12 188 14 C196 16 200 20 198 24 C196 28 188 30 180 30 C174 30 168 28 168 22Z" fill="url(#${n}h)" stroke="${line}" stroke-width="1.4"/>
          <path d="M186 26 C190 27 194 26 197 24" stroke="${line}" stroke-width="1" fill="none" stroke-linecap="round"/>
          <circle cx="194" cy="18" r=".9" fill="${line}"/>
          ${eye(182, 19, 2, '#68A684')}
        </g>`) }; }

  { const line = '#3A3418';
  RIG.triceratops = { w: 196, h: 126, T: 1, ground: 116, stride: 22, lift: 8, bob: 1.6, nod: 1.6, pitch: .5, center: [88, 72], head: [134, 68], wag: 3,
    legs: legs4({ bx: 62, fx: 114, y: 84, len: [16, 17], w: [18, 14], fill: '#8A9A52', far: '#6A7A3C', line, curl: 8,
      foot: `<path d="M-9 -5 L9 -5 L10 2 L-10 2Z" fill="#6A7A3C" stroke="${line}" stroke-width="1.2"/><path d="M-6 2 a2 1.6 0 0 1 4 0 M1 2 a2 1.6 0 0 1 4 0" fill="#E8E0C8"/>` }),
    draw: n => frame([92, 117, 58], `${rg(n + 'b', '#B0C070', '#8A9A52', '#62702E')}${rg(n + 'h', '#B6C676', '#90A058', '#667432')}${rg(n + 'f', '#F0B060', '#D88A3A', '#A85E20', .4, .4)}`,
      `<g data-p="tail" data-spring="5" data-o="44 76"><path d="M44 70 C28 72 16 78 6 88 C18 86 30 84 46 84Z" fill="url(#${n}b)" stroke="${line}" stroke-width="1.4" stroke-linejoin="round"/></g>
        <path d="M38 76 C40 56 62 46 90 46 C116 46 132 54 138 70 C142 84 132 94 114 96 C92 98 70 98 54 96 C42 92 38 86 38 76Z" fill="url(#${n}b)" stroke="${line}" stroke-width="1.6"/>
        <path d="M54 52 C70 46 96 44 118 50" stroke="#D2DE98" stroke-width="3" fill="none" stroke-linecap="round" opacity=".5"/>
        <g fill="#62702E" opacity=".45"><ellipse cx="70" cy="62" rx="5" ry="3"/><ellipse cx="90" cy="58" rx="5" ry="3"/><ellipse cx="108" cy="62" rx="5" ry="3"/></g>
        <g data-p="head">
          <path d="M126 72 C112 54 120 30 142 26 C158 24 166 38 162 54Z" fill="url(#${n}f)" stroke="${line}" stroke-width="1.5"/>
          <g fill="#F6E2B8" stroke="${line}" stroke-width=".8">${[[122, 52], [124, 40], [130, 31], [140, 26], [151, 26], [160, 32]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.6"/>`).join('')}</g>
          <path d="M136 62 C142 54 156 52 166 58 L184 70 C188 74 186 80 180 82 L160 84 C148 84 138 76 136 62Z" fill="url(#${n}h)" stroke="${line}" stroke-width="1.5" stroke-linejoin="round"/>
          <path d="M180 76 L190 76 C188 80 184 82 180 82Z" fill="#5A4A2A"/>
          <path d="M156 56 C162 44 172 34 184 28 C178 40 170 50 162 60Z" fill="#F4EAD0" stroke="${line}" stroke-width="1.1" stroke-linejoin="round"/>
          <path d="M150 56 C154 46 160 40 168 36 C164 44 160 50 156 58Z" fill="#E2D6B8" stroke="${line}" stroke-width="1" stroke-linejoin="round"/>
          <path d="M176 66 C178 62 180 58 183 55 C184 60 183 64 181 68Z" fill="#F4EAD0" stroke="${line}" stroke-width="1" stroke-linejoin="round"/>
          ${ieye(162, 64, 2.2, '#E8A020', '#90A058')}
        </g>`) }; }

  { const line = '#22301A';
    const bumps = (x0, x1, y) => { let s = ''; for (let x = x0; x < x1; x += 7) s += `<path d="M${x} ${y} l3 -4 l3 4Z"/>`; return s; };
  RIG.crocodile = { w: 200, h: 56, T: .5, ground: 51, stride: 14, lift: 4, bob: .6, nod: 1, pitch: .4, center: [94, 34], head: [144, 32], wag: 3,
    legs: legs4({ bx: 66, fx: 116, y: 40, len: [6, 6.5], w: [8, 6.5], fill: '#5E7A3A', far: '#465E2A', line, dx: 5, curl: 15, back: false,
      foot: `<path d="M-3 0 L10 -2 M-3 0 L11 1.5 M-3 0 L8 4" stroke="${line}" stroke-width="2.4" stroke-linecap="round"/>` }),
    draw: n => frame([96, 52, 64, 3.5], `${rg(n + 'b', '#7E9A52', '#5E7A3A', '#3E5426')}${rg(n + 'h', '#849E56', '#627E3C', '#405828')}`,
      `<g data-p="tail" data-spring="6" data-o="44 34"><path d="M46 26 C30 28 14 30 0 34 C12 38 28 40 48 42Z" fill="url(#${n}b)" stroke="${line}" stroke-width="1.3" stroke-linejoin="round"/>
          <g fill="#3E5426">${bumps(8, 44, 31)}</g></g>
        <path d="M40 30 C56 22 90 20 120 22 C136 23 146 26 150 30 C146 40 132 44 116 44 C90 46 60 44 40 40Z" fill="url(#${n}b)" stroke="${line}" stroke-width="1.5"/>
        <g fill="#3E5426">${bumps(46, 140, 23)}</g>
        <path d="M54 40 C80 45 112 45 140 39" stroke="#E2E6B0" stroke-width="3" fill="none" stroke-linecap="round" opacity=".6"/>
        <g data-p="head">
          <path d="M140 24 C148 20 158 20 166 22 L196 28 C199 30 199 34 196 35 L166 38 C156 40 146 40 140 36Z" fill="url(#${n}h)" stroke="${line}" stroke-width="1.4" stroke-linejoin="round"/>
          <path d="M158 33 L197 32" stroke="${line}" stroke-width="1"/>${teeth(160, 194, 32.6)}${teeth(162, 194, 33.4, -1)}
          <circle cx="194" cy="27.5" r="1" fill="${line}"/>
          <circle cx="154" cy="21" r="4" fill="url(#${n}h)" stroke="${line}" stroke-width="1"/>
          ${ieye(154, 21, 2.1, '#D8C030', '#627E3C', true)}
        </g>`) }; }

  { const line = '#6A4A24';
  RIG.lizard = { w: 150, h: 46, T: .26, ground: 40, stride: 12, lift: 4, bob: .4, nod: 2, pitch: .6, center: [70, 28], head: [96, 28], wag: 3,
    legs: legs4({ bx: 52, fx: 84, y: 31, len: [4.5, 5], w: [4, 3.2], fill: '#D8B070', far: '#B08A50', line, dx: 4, curl: 20, back: false,
      foot: `<path d="M-2 0 L6 -2 M-2 0 L7 1 M-2 0 L5 3" stroke="${line}" stroke-width="1.4" stroke-linecap="round"/>` }),
    draw: n => frame([72, 40.5, 42, 2.4], `${rg(n + 'b', '#F0D294', '#D8B070', '#A8803E')}`,
      `<g data-p="tail" data-spring="10" data-o="44 30"><path d="M44 27 C30 27 14 29 0 33 C14 34 30 34 46 34Z" fill="url(#${n}b)" stroke="${line}" stroke-width="1.1" stroke-linejoin="round"/>
          <path d="M12 30 l0 3 M22 29 l0 4 M32 28 l0 5" stroke="#8A5E2A" stroke-width="1.6" stroke-linecap="round"/></g>
        <path d="M40 28 C50 22 70 20 88 22 C96 23 100 26 100 30 C96 34 86 36 72 36 C58 36 46 34 40 30Z" fill="url(#${n}b)" stroke="${line}" stroke-width="1.2"/>
        <path d="M52 23 l1 5 M62 21.5 l1 6 M72 21.5 l1 6 M82 22 l1 5" stroke="#8A5E2A" stroke-width="2" stroke-linecap="round"/>
        <g fill="#FFF2D0" opacity=".7"><circle cx="57" cy="27" r=".9"/><circle cx="67" cy="26" r=".9"/><circle cx="77" cy="26.5" r=".9"/></g>
        <g data-p="head">
          <path d="M96 24 C102 20 110 20 116 22 L126 27 C128 29 127 31 124 32 L112 34 C104 34 98 30 96 24Z" fill="url(#${n}b)" stroke="${line}" stroke-width="1.2" stroke-linejoin="round"/>
          <path d="M104 33 C110 34 116 33 122 31" stroke="#5A8AC8" stroke-width="1.6" fill="none" stroke-linecap="round" opacity=".8"/>
          ${ieye(111, 25.5, 1.6, '#C8902A', '#D8B070')}
        </g>`) }; }

  /* the dragon: leathery bat wings that beat like the birds' wings */
  function batWing(o) {
    const { x, y, s, mem, bone, line, k = 1, ph = 0, lo = -.65, sweep = -8 } = o;
    const Wx = x + .12 * s, Wy = y - .45 * s;
    const tips = [[296, .66], [252, .9], [214, .92], [180, .8]].map(([a, l]) => [Wx + Math.cos(a * Math.PI / 180) * l * s, Wy + Math.sin(a * Math.PI / 180) * l * s]);
    let d = `M${f1(x + .06 * s)} ${f1(y)} L${f1(Wx)} ${f1(Wy)} L${f1(tips[0][0])} ${f1(tips[0][1])}`;
    for (let i = 1; i < tips.length; i++) { const [px, py] = tips[i - 1], [qx, qy] = tips[i], mx = (px + qx) / 2, my = (py + qy) / 2; d += ` Q${f1(mx + (Wx - mx) * .24)} ${f1(my + (Wy - my) * .24)} ${f1(qx)} ${f1(qy)}`; }
    const [lx, ly] = tips[tips.length - 1]; d += ` Q${f1((lx + x) / 2 - .02 * s)} ${f1((ly + y) / 2 - .02 * s)} ${f1(x - .55 * s)} ${f1(y + .02 * s)}Z`;
    const bones = tips.map(([tx, ty]) => `M${f1(Wx)} ${f1(Wy)} L${f1(tx)} ${f1(ty)}`).join(' ');
    return `<g data-beat="${lo}" data-k="${k}" data-ph="${ph}" data-o="${x} ${y}"><g transform="rotate(${sweep} ${x} ${y})">
      <path d="${d}" fill="${mem}" stroke="${line}" stroke-width="1.2" stroke-linejoin="round"/>
      <path d="M${f1(x + .04 * s)} ${f1(y)} L${f1(Wx)} ${f1(Wy)} ${bones}" stroke="${bone}" stroke-width="${f1(s * .045)}" fill="none" stroke-linecap="round"/>
      <path d="M${f1(Wx)} ${f1(Wy)} l${f1(s * .05)} ${f1(-s * .05)}" stroke="#F2E6C8" stroke-width="1.6" stroke-linecap="round"/></g></g>`;
  }
  { const line = '#5A1410';
  RIG.dragon = { w: 176, h: 112, fly: true, T: 1, ground: 110, bob: 2, pitch: 1.5, center: [86, 62], head: [134, 42], nod: 2, legs: [],
    draw: n => `<defs>${rg(n + 'b', '#F0604A', '#C8382E', '#8A1E18')}${rg(n + 'h', '#F2684E', '#CC3C30', '#8E2018')}
        <linearGradient id="${n}m" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FF8A5A"/><stop offset="1" stop-color="#C83A2A"/></linearGradient></defs>
        <g data-p="body">
          ${batWing({ x: 88, y: 50, s: 54, mem: '#8A2A20', bone: '#5A1410', line, ph: .03 })}
          <g data-p="tail" data-spring="10" data-o="54 60"><path d="M56 54 C38 52 22 60 10 72 C8 74 6 76 4 76 C10 66 24 56 40 52 C46 50 52 50 58 50Z" fill="url(#${n}b)" stroke="${line}" stroke-width="1.3"/>
            <path d="M8 72 L-4 66 L0 80 L12 78Z" fill="#8A1E18" stroke="${line}" stroke-width="1.1" stroke-linejoin="round"/></g>
          <path d="M50 60 C56 48 76 44 98 46 C114 48 122 54 122 62 C120 70 106 74 88 72 C70 72 56 68 50 60Z" fill="url(#${n}b)" stroke="${line}" stroke-width="1.5"/>
          <path d="M62 68 C76 72 98 72 116 66" stroke="#F6C060" stroke-width="5" fill="none" stroke-linecap="round" opacity=".9"/>
          <path d="M66 70 l0 -4 M76 71.5 l0 -4 M86 72 l0 -4 M96 71.5 l0 -4 M106 70 l0 -4" stroke="#C8862A" stroke-width=".9"/>
          <path d="M60 50 l4 -6 l3 5 l4 -6 l3 5 l4 -6 l3 5 l4 -6 l3 5 l4 -6 l3 5 l4 -6 l3 5" stroke="#F6C060" stroke-width="1.6" fill="#F6C060" stroke-linejoin="round"/>
          <path d="M80 72 l-3 7 l4 -1 M100 72 l-1 7 l4 -1" stroke="${line}" stroke-width="3.6" fill="none" stroke-linecap="round"/><path d="M80 72 l-3 7 M100 72 l-1 7" stroke="#C8382E" stroke-width="2" fill="none" stroke-linecap="round"/>
          <path d="M112 52 C118 44 124 38 132 34 L140 40 C134 46 128 54 122 62Z" fill="url(#${n}b)" stroke="${line}" stroke-width="1.4" stroke-linejoin="round"/>
          ${batWing({ x: 92, y: 50, s: 60, mem: `url(#${n}m)`, bone: '#7A1E16', line })}
          <g data-p="head">
            <path d="M136 28 L124 14 L141 25Z M142 26 L136 10 L147 24Z" fill="#F6C060" stroke="#8A5A10" stroke-width="1" stroke-linejoin="round"/>
            <path d="M130 34 C132 26 142 22 152 24 L168 32 C171 34 170 38 166 39 L150 42 C140 42 130 40 130 34Z" fill="url(#${n}h)" stroke="${line}" stroke-width="1.4" stroke-linejoin="round"/>
            <path d="M150 38 L169 36" stroke="${line}" stroke-width="1"/>${teeth(152, 166, 37.6)}
            <ellipse cx="164" cy="31" rx="1.2" ry=".9" fill="#2A0A06"/>
            <path d="M140 28 C144 26 148 26 151 28" stroke="#8A1E18" stroke-width="2" fill="none" stroke-linecap="round"/>
            ${ieye(146, 31, 2.4, '#FFD23F', '#CC3C30', true)}
          </g>
        </g>` }; }

  /* ---------- small hoppers, climbers and swimmers ---------- */
  { const line = '#5A3418';
  RIG.chipmunk = { w: 110, h: 72, T: .4, ground: 66, stride: 12, lift: 3, hop: 8, stance: .5, bob: .5, nod: 2, pitch: 4, center: [52, 44], head: [72, 38], wag: 6,
    legs: [
      { far: true, hip: [36, 48], len: [7, 8], w: [6, 5], phase: 0, curl: 20, muscle: [8, 7, 0], fill: '#A0643A', line, foot: paw('#C8946A', line, 8) },
      { far: true, hip: [64, 50], len: [7, 7.5], w: [4.5, 4], phase: .1, curl: 30, fill: '#A0643A', line, foot: tinyPaw('#C8946A', line) },
      { hip: [32, 49], len: [7, 8], w: [6.5, 5.5], phase: .02, curl: 20, muscle: [9, 8, 0], fill: '#C07A46', line, foot: paw('#E0B088', line, 8) },
      { hip: [68, 51], len: [7, 7.5], w: [5, 4.4], phase: .12, curl: 30, fill: '#C07A46', line, foot: tinyPaw('#E0B088', line) }],
    draw: n => frame([52, 67, 28, 3], `${rg(n + 'b', '#E0A060', '#C07A40', '#8A5228')}`,
      `<g data-p="tail" data-spring="14" data-o="24 44"><path d="M26 44 C14 42 8 30 12 16 C14 10 20 10 20 16 C18 26 22 34 30 38Z" fill="#8A5228" stroke="${line}" stroke-width="1.3"/><path d="M15 18 C14 26 17 34 24 39" stroke="#3A2010" stroke-width="2" fill="none" opacity=".6"/></g>
        <path d="M20 46 C18 32 32 24 50 24 C66 24 78 32 80 44 C80 54 68 58 50 58 C32 58 22 54 20 46Z" fill="url(#${n}b)" stroke="${line}" stroke-width="1.4"/>
        <path d="M26 34 C38 28 54 27 68 31" stroke="#2A1608" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M27 38 C40 32 56 31 70 35" stroke="#F8EEDC" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M28 42 C40 37 56 36 72 40" stroke="#2A1608" stroke-width="2.2" fill="none" stroke-linecap="round"/>
        <path d="M34 55 C46 59 62 58 74 52" stroke="#F8EEDC" stroke-width="3" fill="none" stroke-linecap="round"/>
        <g data-p="head">
          <circle cx="70" cy="24" r="4" fill="#8A5228" stroke="${line}" stroke-width="1"/>
          <path d="M66 36 C66 26 76 22 84 24 C90 26 96 32 98 38 C99 42 96 44 92 44 L80 46 C72 46 66 42 66 36Z" fill="url(#${n}b)" stroke="${line}" stroke-width="1.3"/>
          <path d="M70 32 C78 30 88 31 96 36" stroke="#2A1608" stroke-width="1.6" fill="none" stroke-linecap="round"/><path d="M71 36 C78 34 86 35 92 40" stroke="#F8EEDC" stroke-width="1.6" fill="none" stroke-linecap="round"/>
          <ellipse cx="80" cy="42" rx="7" ry="4" fill="#F8EEDC" opacity=".85"/>
          <circle cx="97" cy="38.5" r="1.6" fill="#2A1608"/>${whisk(94, 40, '#5A3418')}
          ${eye(84, 31, 2.1, '#C07A40')}
        </g>`) }; }

  { const line = '#4A3A30';
  RIG.squirrel = { w: 130, h: 96, T: .42, ground: 90, stride: 16, lift: 4, hop: 12, stance: .5, bob: .5, nod: 2, pitch: 4, center: [62, 66], head: [86, 54], wag: 5,
    legs: [
      { far: true, hip: [48, 70], len: [9, 10], w: [7, 5.5], phase: 0, curl: 20, muscle: [10, 9, 0], fill: '#8A7060', line, foot: paw('#A88E7C', line, 10) },
      { far: true, hip: [78, 72], len: [8, 9], w: [5, 4.4], phase: .1, curl: 30, fill: '#8A7060', line, foot: tinyPaw('#A88E7C', line) },
      { hip: [44, 71], len: [9, 10], w: [7.5, 6], phase: .02, curl: 20, muscle: [12, 10, 0], fill: '#A8907C', line, foot: paw('#C8B4A2', line, 10) },
      { hip: [82, 73], len: [8, 9], w: [5.5, 4.8], phase: .12, curl: 30, fill: '#A8907C', line, foot: tinyPaw('#C8B4A2', line) }],
    draw: n => frame([64, 91, 32, 3.5], `${rg(n + 'b', '#C8AE9A', '#A08470', '#76604E')}${rg(n + 't', '#C8AE9A', '#9A7C66', '#6E5644', .5, .5)}`,
      `<g data-p="tail" data-spring="10" data-o="36 66"><path d="M40 68 C20 66 8 52 10 32 C12 16 26 6 38 12 C46 16 44 26 36 26 C30 26 28 32 30 40 C32 50 40 58 48 62Z" fill="url(#${n}t)" stroke="${line}" stroke-width="1.4"/>
          <path d="M16 34 C16 22 24 14 34 16 M20 46 C18 36 22 26 30 22" stroke="#E6D6C8" stroke-width="1.6" fill="none" stroke-linecap="round" opacity=".6"/></g>
        <path d="M34 66 C32 50 44 40 62 40 C78 40 90 48 92 60 C92 72 80 78 62 78 C46 78 36 74 34 66Z" fill="url(#${n}b)" stroke="${line}" stroke-width="1.4"/>
        <path d="M70 76 C80 74 88 68 90 60 C86 66 78 72 70 76Z" fill="#F4ECE2"/>
        <g data-p="head">
          <path d="M82 40 L80 28 L90 36Z" fill="#8A7060" stroke="${line}" stroke-width="1.1" stroke-linejoin="round"/>
          <path d="M80 50 C80 40 90 36 100 38 C108 40 114 46 116 52 C117 56 114 58 110 58 L96 60 C86 60 80 56 80 50Z" fill="url(#${n}b)" stroke="${line}" stroke-width="1.3"/>
          <g data-spring="7" data-o="92 38"><path d="M88 38 L91 24 L97 37Z" fill="url(#${n}b)" stroke="${line}" stroke-width="1.1" stroke-linejoin="round"/><path d="M91 26 l-2 -4 M91 26 l2 -4" stroke="${line}" stroke-width="1"/></g>
          <ellipse cx="100" cy="55" rx="7" ry="3.6" fill="#F4ECE2" opacity=".85"/>
          <circle cx="115" cy="52" r="1.6" fill="#2A1E16"/>${whisk(112, 54, '#4A3A30')}
          <circle cx="101" cy="46" r="3.2" fill="#F4ECE2"/>${eye(101, 46, 2.3, '#A08470')}
        </g>`) }; }

  { const line = '#5A3418';
  RIG.kangaroo = { w: 140, h: 130, T: .62, ground: 124, stride: 26, lift: 6, hop: 20, stance: .45, bob: .6, nod: 2, pitch: 6, center: [64, 80], head: [90, 40], wag: 3,
    legs: [
      { far: true, hip: [62, 90], len: [15, 17], w: [11, 7], phase: 0, curl: 25, muscle: [14, 16, 2], fill: '#A06A3E', line, foot: paw('#A06A3E', line, 22) },
      { hip: [56, 92], len: [15, 17], w: [12, 8], phase: .03, curl: 25, muscle: [16, 18, 2], fill: '#C08452', line, foot: paw('#D8A070', line, 22) }],
    draw: n => frame([66, 125, 36, 4], `${rg(n + 'b', '#E0A870', '#C08452', '#8A5A30')}`,
      `<g data-p="tail" data-spring="6" data-o="40 98"><path d="M44 92 C30 98 16 108 4 120 C10 122 16 120 22 116 C30 110 40 104 50 102Z" fill="url(#${n}b)" stroke="${line}" stroke-width="1.4"/></g>
        <path d="M40 92 C34 74 42 56 60 50 C74 46 86 54 88 68 C90 82 84 98 70 104 C56 108 44 104 40 92Z" fill="url(#${n}b)" stroke="${line}" stroke-width="1.5"/>
        <path d="M76 58 C84 66 86 82 80 96 C76 86 74 72 76 58Z" fill="#F2DCC0"/>
        <g data-spring="14" data-o="82 64"><path d="M82 64 C88 68 92 72 92 78" stroke="${line}" stroke-width="5.4" fill="none" stroke-linecap="round"/><path d="M82 64 C88 68 92 72 92 78" stroke="#C08452" stroke-width="3.6" fill="none" stroke-linecap="round"/></g>
        <path d="M74 52 C78 44 82 40 86 38 L94 46 C90 50 86 56 84 62Z" fill="url(#${n}b)" stroke="${line}" stroke-width="1.3" stroke-linejoin="round"/>
        <g data-p="head">
          <g data-spring="8" data-o="86 30"><path d="M84 32 C80 22 80 12 84 8 C88 12 90 22 89 31Z" fill="url(#${n}b)" stroke="${line}" stroke-width="1.2"/><path d="M85 28 C83 21 83 15 85 12 C87 16 87 22 87 28Z" fill="#F2C8B0"/></g>
          <path d="M82 38 C84 30 94 26 102 28 L116 38 C119 40 118 44 115 45 L100 48 C90 48 82 44 82 38Z" fill="url(#${n}b)" stroke="${line}" stroke-width="1.4" stroke-linejoin="round"/>
          <g data-spring="8" data-o="94 30"><path d="M92 31 C90 20 92 12 97 9 C99 15 99 23 96 31Z" fill="url(#${n}b)" stroke="${line}" stroke-width="1.2"/><path d="M93.5 28 C93 21 94 15 96.5 12 C97.5 17 97 23 95.5 28Z" fill="#F2C8B0"/></g>
          <ellipse cx="116" cy="40" rx="2.2" ry="1.8" fill="#2A1608"/>
          <path d="M114 45 C112 46.5 109 46.5 107 45.5" stroke="${line}" stroke-width="1" fill="none" stroke-linecap="round"/>
          ${eye(100, 35, 2.4, '#C08452')}
        </g>`) }; }

  { const line = '#3A2414';
  RIG.otter = { w: 150, h: 64, T: .36, ground: 59, stride: 12, lift: 4, bob: 1.2, nod: 2, pitch: 1.4, center: [72, 38], head: [108, 34], wag: 4,
    legs: legs4({ bx: 50, fx: 96, y: 49, len: [4, 5], w: [7, 5.5], fill: '#5A3A22', far: '#422A18', line, dx: 5, curl: 20, foot: paw('#5A3A22', line, 9) }),
    draw: n => frame([74, 60, 44, 3], `${rg(n + 'b', '#9A6A44', '#74482A', '#4E2E18')}`,
      `<g data-p="tail" data-spring="10" data-o="34 40"><path d="M36 34 C22 36 10 42 2 50 C14 50 26 48 38 46Z" fill="url(#${n}b)" stroke="${line}" stroke-width="1.3" stroke-linejoin="round"/></g>
        <path d="M30 40 C30 28 48 22 72 22 C94 22 108 28 112 38 C114 48 102 52 80 52 C56 52 36 50 30 40Z" fill="url(#${n}b)" stroke="${line}" stroke-width="1.5"/>
        <path d="M50 26 C66 22 86 22 100 28" stroke="#C8986A" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".55"/>
        <g data-p="head">
          <path d="M100 32 C102 22 114 18 124 22 C132 25 138 30 140 36 C141 40 138 43 134 43 L116 46 C106 46 100 40 100 32Z" fill="url(#${n}b)" stroke="${line}" stroke-width="1.4"/>
          <path d="M118 36 C124 34 132 34 138 38 C136 43 128 46 120 45 C116 43 116 39 118 36Z" fill="#E6CCAE"/>
          <circle cx="110" cy="23" r="3.4" fill="#74482A" stroke="${line}" stroke-width="1"/>
          <ellipse cx="139" cy="35" rx="2.6" ry="2" fill="#1A0E08"/>${whisk(134, 39, '#F4E6D4')}
          ${eye(122, 29, 2.3, '#74482A')}
        </g>`) }; }

  { const line = '#3A2414';
  RIG.monkey = { w: 140, h: 104, T: .46, ground: 98, stride: 20, lift: 8, bob: 1.4, nod: 2.2, pitch: .8, center: [66, 60], head: [96, 50], wag: 3,
    legs: legs4({ bx: 46, fx: 88, y: 66, len: [16, 17], w: [8, 6], fill: '#7A4E2C', far: '#5A3820', line, dx: 5,
      foot: `<path d="M-3 -3 C0 -5 9 -5 11 -2 C12 0 11 2 9 2 L-3 2 C-5 2 -5 -1 -3 -3Z" fill="#E2B890" stroke="${line}" stroke-width="1.2"/>` }),
    draw: n => frame([68, 99, 40, 4], `${rg(n + 'b', '#A87246', '#80502C', '#583418')}`,
      `<g data-p="tail" data-spring="12" data-o="36 56"><path d="M38 56 C24 52 16 40 18 26 C20 16 30 12 36 18 C40 22 36 28 32 26" stroke="${line}" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M38 56 C24 52 16 40 18 26 C20 16 30 12 36 18 C40 22 36 28 32 26" stroke="#80502C" stroke-width="3.2" fill="none" stroke-linecap="round"/></g>
        <path d="M34 60 C34 46 50 40 68 40 C84 40 96 46 98 58 C100 70 88 76 70 76 C52 76 36 72 34 60Z" fill="url(#${n}b)" stroke="${line}" stroke-width="1.5"/>
        <path d="M60 72 C74 76 88 72 94 64" stroke="#C89A6A" stroke-width="3.4" fill="none" stroke-linecap="round" opacity=".6"/>
        <g data-p="head">
          <circle cx="98" cy="42" r="6" fill="#D8A880" stroke="${line}" stroke-width="1.2"/>
          <circle cx="110" cy="40" r="15" fill="url(#${n}b)" stroke="${line}" stroke-width="1.5"/>
          <path d="M104 36 C104 28 112 26 118 30 C124 28 128 34 126 40 C130 44 128 52 120 54 C112 56 104 52 104 46 C102 42 102 38 104 36Z" fill="#E8C4A0" stroke="#A87A54" stroke-width=".8"/>
          <ellipse cx="124" cy="45" rx="2" ry="1.4" fill="#5A3418"/>
          <path d="M122 50 C119 52 115 52 112 50" stroke="${line}" stroke-width="1.1" fill="none" stroke-linecap="round"/>
          ${eye(113, 37, 2.2, '#E8C4A0')}${eye(121, 36, 2, '#E8C4A0')}
        </g>`) }; }

  { const line = '#4A4A4E';
  RIG.koala = { w: 130, h: 96, T: .7, ground: 90, stride: 14, lift: 6, bob: 1.4, nod: 2, pitch: .8, center: [60, 56], head: [88, 46], wag: 3,
    legs: legs4({ bx: 42, fx: 80, y: 64, len: [12, 13], w: [12, 10], fill: '#9A9A9E', far: '#78787C', line, dx: 5, foot: paw('#8A8A8E', line, 9) }),
    draw: n => frame([62, 91, 38, 4], `${rg(n + 'b', '#C4C4C8', '#A0A0A6', '#76767C')}`,
      `<path d="M26 58 C24 42 40 34 58 34 C76 34 88 42 90 56 C90 70 78 76 58 76 C40 76 28 70 26 58Z" fill="url(#${n}b)" stroke="${line}" stroke-width="1.5"/>
        <path d="M40 72 C52 76 70 76 82 70" stroke="#F0EEEA" stroke-width="4" fill="none" stroke-linecap="round" opacity=".7"/>
        <g data-p="head">
          <g data-spring="5" data-o="86 30"><circle cx="82" cy="26" r="12" fill="url(#${n}b)" stroke="${line}" stroke-width="1.3"/><circle cx="83" cy="27" r="7.5" fill="#F4F2EE"/></g>
          <circle cx="100" cy="42" r="17" fill="url(#${n}b)" stroke="${line}" stroke-width="1.5"/>
          <path d="M108 38 C114 36 118 40 118 46 C118 54 114 58 110 58 C105 58 103 52 104 46 C104 42 105 39 108 38Z" fill="#2A2A2E" stroke="#141416" stroke-width="1"/>
          <ellipse cx="110" cy="42" rx="2" ry="3" fill="#6A6A70" opacity=".6"/>
          ${eye(101, 37, 2.1, '#A0A0A6')}
        </g>`) }; }

  { const line = '#141416';
  RIG.gorilla = { w: 170, h: 126, T: .9, ground: 118, stride: 22, lift: 8, bob: 1.8, nod: 1.6, pitch: 1.2, center: [80, 66], head: [118, 46], wag: 3,
    legs: [
      { far: true, hip: [56, 80], len: [17, 19], w: [16, 12], reach: -2, phase: .5, muscle: [14, 14, 3], fill: '#2A2A30', line, foot: paw('#3A3A40', line, 13) },
      { far: true, hip: [112, 58], len: [28, 31], w: [16, 12], reach: 4, phase: .75, muscle: [12, 16, 6], fill: '#2A2A30', line, curl: 10, foot: `<ellipse cx="2" cy="-2" rx="7" ry="4" fill="#3A3A40" stroke="${line}" stroke-width="1.2"/>` },
      { hip: [50, 82], len: [17, 19], w: [18, 13], reach: -2, phase: 0, muscle: [16, 16, 3], fill: '#3E3E46', line, foot: paw('#4A4A52', line, 13) },
      { hip: [120, 60], len: [28, 31], w: [18, 13], reach: 4, phase: .25, muscle: [14, 18, 6], fill: '#3E3E46', line, curl: 10, foot: `<ellipse cx="2" cy="-2" rx="8" ry="4.4" fill="#4A4A52" stroke="${line}" stroke-width="1.2"/>` }],
    draw: n => frame([88, 119, 56], `${rg(n + 'b', '#5A5A64', '#3A3A42', '#202026')}`,
      `<path d="M36 76 C34 60 48 48 70 42 C90 36 114 38 126 50 C134 60 130 74 118 80 C100 88 70 92 52 90 C42 88 36 84 36 76Z" fill="url(#${n}b)" stroke="${line}" stroke-width="1.6"/>
        <path d="M52 58 C66 50 84 48 100 50" stroke="#9A9AA6" stroke-width="5" fill="none" stroke-linecap="round" opacity=".5"/>
        <g data-p="head">
          <path d="M112 44 C112 30 124 22 138 24 C150 26 158 36 158 48 C158 60 148 66 136 66 C122 66 112 58 112 44Z" fill="url(#${n}b)" stroke="${line}" stroke-width="1.5"/>
          <path d="M120 26 C126 20 136 18 142 22 C138 24 130 26 124 30Z" fill="#2A2A30"/>
          <path d="M136 40 C142 36 152 38 156 44 C158 52 154 60 146 62 C138 62 134 56 134 50 C134 46 134 42 136 40Z" fill="#4A4A54" stroke="${line}" stroke-width="1"/>
          <path d="M134 36 C140 33 148 33 154 36" stroke="#141416" stroke-width="2.6" fill="none" stroke-linecap="round"/>
          <ellipse cx="151" cy="49" rx="1.4" ry="1.2" fill="#141416"/><ellipse cx="155" cy="48.5" rx="1.2" ry="1.1" fill="#141416"/>
          <path d="M152 57 C148 58.5 144 58.5 141 57" stroke="#141416" stroke-width="1.2" fill="none" stroke-linecap="round"/>
          <circle cx="127" cy="42" r="3.4" fill="#2A2A30"/>
          <circle cx="143" cy="40" r="2.2" fill="#5A3A1E"/><circle cx="143.3" cy="40" r="1.2" fill="#111"/><circle cx="144" cy="39.3" r=".6" fill="#fff"/>
          <ellipse data-p="lid" cx="143" cy="40" rx="2.7" ry="2.7" fill="#4A4A54" style="transform-origin:143px 37.3px;transform:scaleY(0)"/>
        </g>`) }; }

  /* a monarch butterfly seen from above, wings fluttering */
  { const line = '#1A1210';
    const half = n => `<path d="M35 28 C28 10 10 4 4 12 C0 22 12 30 35 31Z" fill="url(#${n}u)" stroke="${line}" stroke-width="2.2" stroke-linejoin="round"/>
      <path d="M35 32 C24 34 12 42 15 51 C20 58 30 48 35 37Z" fill="url(#${n}u)" stroke="${line}" stroke-width="2.2" stroke-linejoin="round"/>
      <path d="M34 29 L14 13 M34 30 L9 22 M34 30 L22 13 M34 34 L19 48 M34 34 L26 50" stroke="${line}" stroke-width="1.1"/>
      <g fill="#fff"><circle cx="8" cy="13" r="1.1"/><circle cx="5.5" cy="18" r="1.1"/><circle cx="12" cy="9" r="1"/><circle cx="17" cy="51" r=".9"/><circle cx="14" cy="47" r=".9"/></g>`;
  RIG.butterfly = { w: 70, h: 60, fly: true, T: .32, ground: 58, bob: 2.2, pitch: 3, center: [35, 31], legs: [],
    draw: n => `<defs>${rg(n + 'u', '#FFB040', '#F28C28', '#C8601A', .7, .4)}</defs>
        <g data-p="body">
          <g data-beat=".15" data-axis="x" data-o="35 30">${half(n)}</g>
          <g data-beat=".15" data-axis="x" data-o="35 30"><g transform="translate(70 0) scale(-1 1)">${half(n)}</g></g>
          <ellipse cx="35" cy="32" rx="2.4" ry="12" fill="#2A1E18"/><circle cx="35" cy="19" r="2.6" fill="#2A1E18"/>
          <path d="M34 18 C32 11 30 8 27 6 M36 18 C38 11 40 8 43 6" stroke="${line}" stroke-width="1.1" fill="none"/><circle cx="27" cy="6" r="1" fill="${line}"/><circle cx="43" cy="6" r="1" fill="${line}"/>
        </g>` }; }

  window.RIG = RIG;
  // Rig animals take over from the older drawings with the same name, everywhere the app draws a pet.
  if (window.PETART) for (const id in RIG) { const s = RIG[id]; PETART[id] = { w: s.w, h: s.h, fly: !!s.fly, swim: !!s.swim, rig: true }; }
  if (window.petSVG) { const older = window.petSVG; window.petSVG = (id, h) => RIG[id] ? rigSVG(id, h) : older(id, h); }
  window.rigSVG = rigSVG;
})();

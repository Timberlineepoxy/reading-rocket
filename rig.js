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
    // cartoon bodies squash a little as they land each step and stretch as they rise
    const sq = S.squash ? W * S.squash * Math.cos(4 * Math.PI * p) + (1 - W) * S.squash * .35 * Math.sin(tt * 2.3) : 0, cx = S.center[0], gy = S.ground;
    if (r.body) r.body.setAttribute('transform', `translate(0 ${bob.toFixed(2)}) rotate(${pitch.toFixed(2)} ${cx} ${S.center[1]})` +
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
    for (const f of r.flaps) {
      const a = f.amp * Math.sin(2 * Math.PI * (p * f.k + f.ph)) * (f.w ? W : 1);
      f.e.setAttribute('transform', `rotate(${a.toFixed(2)} ${f.o[0]} ${f.o[1]})`);
    }
    // legs: each foot is planted for most of the cycle, then lifts and swings forward
    for (const g of r.legs) {
      const L = g.L, hx = L.hip[0], hy = L.hip[1] + bob, x0 = hx + (L.reach || 0);
      const qq = (p + L.phase) % 1, st = S.stance || .62;
      let fx, fy, rot = 0;
      if (qq < st) { const s = qq / st; fx = x0 + W * S.stride * (.5 - s); fy = S.ground; }
      else { const s = (qq - st) / (1 - st), e = ease(s); fx = x0 + W * S.stride * (-.5 + e); fy = S.ground - W * S.lift * Math.sin(Math.PI * s); rot = W * (L.curl || 30) * Math.sin(Math.PI * s); }
      fy -= L.footH || 0;
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

  RIG.snowyowl = { w: 120, h: 92, fly: true, T: .9, ground: 90, stride: 0, lift: 0, bob: 1.6, pitch: 1.5, center: [60, 50], head: [78, 44], nod: 2, legs: [],
    draw: n => { const line = '#6E7885';
      const flecks = pts => pts.map(([x, y]) => `<path d="M${x} ${y} q2 -1.6 4 0" stroke="#3A3F48" stroke-width="1.3" fill="none" stroke-linecap="round"/>`).join('');
      return `<defs>${grad(n + 'b', [[0, '#FFFFFF'], [1, '#DDE2E8']])}</defs>
        <g data-p="body">
          <g data-flap="34" data-k="2" data-o="58 40" data-ph=".06"><path d="M58 40 C48 18 62 4 84 6 C98 8 106 14 110 20 C98 20 88 24 82 30 C74 38 66 44 60 48Z" fill="#E3E7EC" stroke="${line}" stroke-width="1.3"/></g>
          <path d="M32 52 L12 48 L16 58 L32 60Z" fill="url(#${n}b)" stroke="${line}" stroke-width="1.3" stroke-linejoin="round"/>
          <ellipse cx="56" cy="54" rx="27" ry="18" fill="url(#${n}b)" stroke="${line}" stroke-width="1.4"/>
          ${flecks([[44, 50], [54, 46], [62, 54], [48, 60], [38, 56], [58, 62]])}
          <path d="M60 70 l-2 6 M64 70 l0 6 M68 70 l2 6" stroke="#4A4F58" stroke-width="1.6" stroke-linecap="round"/>
          <g data-flap="36" data-k="2" data-o="60 40"><path d="M60 40 C50 14 66 0 90 3 C104 5 112 12 116 18 C102 18 92 22 86 28 C78 36 68 44 62 48Z" fill="url(#${n}b)" stroke="${line}" stroke-width="1.3"/>
            ${flecks([[74, 14], [84, 12], [96, 12], [78, 22], [90, 20]])}</g>
          <g data-p="head">
            <circle cx="80" cy="38" r="16" fill="url(#${n}b)" stroke="${line}" stroke-width="1.4"/>
            <circle cx="84" cy="37" r="9.5" fill="#FFFFFF"/>
            <circle cx="86" cy="35" r="4.6" fill="#F5C518" stroke="#B8920E" stroke-width=".8"/><circle cx="86.5" cy="35" r="2.3" fill="#111"/><circle cx="87.4" cy="34" r=".8" fill="#fff"/>
            <ellipse data-p="lid" cx="86" cy="35" rx="5.2" ry="5.2" fill="#F2F4F7" style="transform-origin:86px 29.8px;transform:scaleY(0)"/>
            <path d="M92 40 L97 43 L91.5 45Z" fill="#3A3F48"/>
            ${flecks([[72, 28], [78, 24]])}
          </g>
        </g>`; } };

  window.RIG = RIG;
  // Rig animals take over from the older drawings with the same name, everywhere the app draws a pet.
  if (window.PETART) for (const id in RIG) { const s = RIG[id]; PETART[id] = { w: s.w, h: s.h, fly: !!s.fly, swim: !!s.swim, rig: true }; }
  if (window.petSVG) { const older = window.petSVG; window.petSVG = (id, h) => RIG[id] ? rigSVG(id, h) : older(id, h); }
  window.rigSVG = rigSVG;
})();

/* Reading Rocket animals: drawn in code so their legs, tails, heads and wings really move.
   Every drawing faces right. Parts that move carry a class (leg, shin, tail, head, wing...)
   and pivot at their joint; the CSS in index.html animates them while the pet has .walking. */
(() => {
  // A leg is a thigh and a shin hinged at the hip and knee. phase 0 or .5 = which legs move together.
  function leg({ x, y, up, low, wu, wl, col, foot, phase = 0, a = 24, k = 34, T = .6, thigh = 0 }) {
    const d = `animation-delay:${(-phase * T).toFixed(3)}s`;
    return `<g class="leg" style="transform-origin:${x}px ${y}px;--a:${a}deg;${d}">
      <rect x="${x - wu / 2}" y="${y - wu / 2}" width="${wu}" height="${up + wu / 2}" rx="${wu / 2}" fill="${col}"/>
      ${thigh ? `<ellipse cx="${x + 2}" cy="${y + up * .3}" rx="${thigh}" ry="${up * .62}" fill="${col}"/>` : ''}
      <g class="shin" style="transform-origin:${x}px ${y + up}px;--k:${k}deg;${d}">
        <rect x="${x - wl / 2}" y="${y + up - wl / 2}" width="${wl}" height="${low + wl / 2}" rx="${wl / 2}" fill="${col}"/>
        ${foot ? foot(x, y + up + low) : ''}
      </g></g>`;
  }
  const paw = c => (x, y) => `<ellipse cx="${x + 2}" cy="${y}" rx="5.5" ry="3" fill="${c}"/>`;
  const hoof = c => (x, y) => `<rect x="${x - 4.5}" y="${y - 2}" width="9" height="5" rx="1.5" fill="${c}"/>`;
  const bigFoot = c => (x, y) => `<ellipse cx="${x + 1}" cy="${y}" rx="10.5" ry="3.5" fill="${c}"/><path d="M${x - 4} ${y + 1} h2 M${x + 1} ${y + 1.5} h2 M${x + 6} ${y + 1} h2" stroke="#e9e4da" stroke-width="2" stroke-linecap="round"/>`;
  const claw = c => (x, y) => `<path d="M${x - 6} ${y - 4} L${x + 6} ${y - 4} L${x + 16} ${y} Q${x + 19} ${y + 3} ${x + 15} ${y + 4} L${x - 7} ${y + 4} Q${x - 9} ${y} ${x - 6} ${y - 4}Z" fill="${c}"/><path d="M${x + 15} ${y + 4} l3 0 M${x + 9} ${y + 4} l3 0" stroke="#e8e2c8" stroke-width="1.6" stroke-linecap="round"/>`;
  const webFoot = c => (x, y) => `<path d="M${x - 3} ${y - 2} L${x + 8} ${y - 1} L${x + 9} ${y + 2} L${x - 4} ${y + 2}Z" fill="${c}"/>`;
  const eye = (x, y, r = 1.8, col = '#15100c') => `<circle cx="${x}" cy="${y}" r="${r}" fill="${col}"/><circle cx="${x + r * .35}" cy="${y - r * .35}" r="${r * .33}" fill="#fff"/>`;

  const A = {};

  /* ---------------- four-legged walkers ---------------- */
  A.dog = { w: 150, h: 100, T: .62, draw(T) {
    const c = '#C68642', dk = '#9C6530', lt = '#ECCB98';
    const L = (x, ph, col) => leg({ x, y: 58, up: 19, low: 18, wu: 9, wl: 7, col, foot: paw(col === c ? '#7d4f24' : '#5f3b1a'), phase: ph, T });
    return `${L(52, .5, dk)}${L(98, 0, dk)}
      <g class="tail" style="transform-origin:42px 46px"><path d="M42 46 C32 40 27 30 25 20" stroke="${c}" stroke-width="6.5" stroke-linecap="round" fill="none"/><path d="M27 26 C26 22 25 20 25 20" stroke="${lt}" stroke-width="6" stroke-linecap="round"/></g>
      <g class="torso">
        <path d="M40 50 C40 38 60 36 78 38 C94 40 102 38 106 45 C111 53 105 64 93 66 L52 66 C41 66 38 59 40 50Z" fill="${c}"/>
        <ellipse cx="50" cy="55" rx="11" ry="12" fill="${c}"/><ellipse cx="96" cy="54" rx="9" ry="11" fill="${c}"/>
        <path d="M60 64 C72 67 86 67 96 62" stroke="${lt}" stroke-width="4" stroke-linecap="round" fill="none" opacity=".8"/>
        <path d="M96 48 C100 36 106 28 114 25 L122 33 C115 39 111 48 106 57Z" fill="${c}"/>
        <path d="M100 50 C104 42 108 36 112 34" stroke="${lt}" stroke-width="5" stroke-linecap="round" fill="none" opacity=".7"/>
        <g class="head" style="transform-origin:112px 32px">
          <circle cx="116" cy="26" r="10.5" fill="${c}"/>
          <path d="M117 21 C126 21 134 24 136 29 C137 34 129 36 119 35Z" fill="${c}"/>
          <path d="M120 32 C126 34 132 34 135 32" stroke="${lt}" stroke-width="3" stroke-linecap="round" fill="none"/>
          <ellipse cx="135" cy="27.5" rx="3" ry="2.5" fill="#2B1D14"/>${eye(117, 22)}
          <path d="M108 17 C103 22 103 32 107 37 C112 33 113 23 111 17Z" fill="${dk}"/>
        </g></g>
      ${L(48, 0, c)}${L(94, .5, c)}`;
  }};

  A.cat = { w: 140, h: 96, T: .56, draw(T) {
    const c = '#7F8794', dk = '#5E6570', st = '#4A505B', lt = '#D9DCE1';
    const L = (x, ph, col) => leg({ x, y: 58, up: 16, low: 18, wu: 8, wl: 6, col, foot: paw(col === c ? '#656c78' : '#4a505b'), phase: ph, a: 22, T });
    return `${L(54, .5, dk)}${L(96, 0, dk)}
      <g class="tail" style="transform-origin:42px 48px"><path d="M42 48 C30 47 22 39 24 27 C25 21 30 19 32 23" stroke="${c}" stroke-width="5" stroke-linecap="round" fill="none"/>
        <path d="M24 34 l4 1 M25 28 l4 -1" stroke="${st}" stroke-width="2.4" stroke-linecap="round"/></g>
      <g class="torso">
        <path d="M42 50 C42 40 60 39 78 40 C94 41 100 40 103 46 C107 54 102 63 92 64 L54 64 C44 64 41 58 42 50Z" fill="${c}"/>
        <ellipse cx="52" cy="54" rx="10" ry="10" fill="${c}"/>
        <path d="M60 41 C62 46 61 50 58 53 M70 40 C72 46 71 51 68 54 M80 41 C82 46 81 51 78 54 M50 46 C52 50 51 53 49 55" stroke="${st}" stroke-width="2.6" stroke-linecap="round" fill="none"/>
        <path d="M62 62 C72 65 84 65 92 61" stroke="${lt}" stroke-width="3.5" stroke-linecap="round" fill="none" opacity=".8"/>
        <path d="M96 48 C99 40 103 36 108 35 L114 41 C109 44 106 50 104 56Z" fill="${c}"/>
        <g class="head" style="transform-origin:108px 36px">
          <circle cx="112" cy="32" r="10" fill="${c}"/>
          <path d="M104 26 L105 13 L113 23Z" fill="${c}"/><path d="M106 23 L106.5 17 L110 22Z" fill="#E7A3A8"/>
          <path d="M113 23 L120 13 L121 27Z" fill="${c}"/>
          <path d="M117 33 C122 32 125 34 124 37 C121 39 117 39 115 37Z" fill="${lt}"/>
          <path d="M122 33.5 l2.4 -.6 l-.8 2Z" fill="#D9787F"/>
          <path d="M108 26 l3 1.5 M108 29 l3 .5" stroke="${st}" stroke-width="1.6" stroke-linecap="round"/>
          <ellipse cx="116.5" cy="29" rx="2.1" ry="1.7" fill="#8DC63F"/><ellipse cx="116.8" cy="29" rx=".7" ry="1.5" fill="#111"/>
          <path d="M124 36 l7 -1 M124 37.5 l7 1" stroke="#eef0f2" stroke-width=".8"/>
        </g></g>
      ${L(50, 0, c)}${L(92, .5, c)}`;
  }};

  A.tiger = { w: 165, h: 104, T: .66, draw(T) {
    const c = '#E8862A', dk = '#C46A18', bk = '#24170f', wt = '#FBF1E4';
    const L = (x, ph, col) => leg({ x, y: 60, up: 19, low: 20, wu: 11, wl: 8.5, col, foot: paw(col === c ? '#b9661c' : '#94500f'), phase: ph, a: 22, T });
    return `${L(56, .5, dk)}${L(108, 0, dk)}
      <g class="tail" style="transform-origin:42px 48px"><path d="M42 48 C28 50 18 58 14 70 C12 76 14 80 19 80" stroke="${c}" stroke-width="6" stroke-linecap="round" fill="none"/>
        <path d="M42 48 C28 50 18 58 14 70 C12 76 14 80 19 80" stroke="${bk}" stroke-width="6.2" stroke-dasharray="3 7" fill="none"/></g>
      <g class="torso">
        <path d="M40 52 C40 40 62 38 84 39 C104 40 114 38 118 46 C123 55 117 66 104 67 L54 67 C43 67 39 60 40 52Z" fill="${c}"/>
        <ellipse cx="52" cy="56" rx="12" ry="12" fill="${c}"/><ellipse cx="108" cy="55" rx="10" ry="12" fill="${c}"/>
        <path d="M60 64 C74 68 92 68 106 63" stroke="${wt}" stroke-width="5" stroke-linecap="round" fill="none"/>
        <path d="M56 41 C58 47 56 53 52 56 M66 39 C69 46 67 53 63 58 M77 39 C80 46 78 53 74 58 M88 39 C91 46 89 52 86 56 M99 40 C101 45 100 50 97 53 M48 48 C49 52 48 56 46 58"
          stroke="${bk}" stroke-width="3.2" stroke-linecap="round" fill="none"/>
        <path d="M108 50 C112 42 118 38 124 37 L130 45 C124 48 120 54 117 60Z" fill="${c}"/>
        <g class="head" style="transform-origin:124px 40px">
          <circle cx="130" cy="38" r="12" fill="${c}"/>
          <circle cx="122" cy="27.5" r="4.6" fill="${c}"/><circle cx="122" cy="27.5" r="2.2" fill="${bk}"/>
          <path d="M131 40 C139 38 146 41 147 46 C146 51 138 53 131 51Z" fill="${wt}"/>
          <path d="M120 44 C123 50 129 52 133 51" stroke="${wt}" stroke-width="4" stroke-linecap="round" fill="none"/>
          <path d="M143.5 41 l3.5 .5 l-1.6 3Z" fill="#5a2a2a"/>
          <path d="M126 29 l2 4 M131 28 l0 4 M122 37 l4 1 M122 41 l4 0" stroke="${bk}" stroke-width="2" stroke-linecap="round"/>
          <ellipse cx="134" cy="34" rx="2.2" ry="1.9" fill="#E8B80E"/><circle cx="134.3" cy="34" r="1.05" fill="#111"/>
        </g></g>
      ${L(52, 0, c)}${L(104, .5, c)}`;
  }};

  A.horse = { w: 160, h: 110, T: .7, draw(T) {
    const c = '#8A5532', dk = '#68401F', m = '#2E1D14', hf = '#2b2b2b';
    const L = (x, ph, col) => leg({ x, y: 55, up: 26, low: 23, wu: 10, wl: 6.5, col, foot: hoof(hf), phase: ph, a: 22, k: 40, T });
    return `${L(58, .5, dk)}${L(108, 0, dk)}
      <g class="tail" style="transform-origin:44px 42px"><path d="M44 42 C33 46 29 62 31 80 C36 70 40 56 47 49Z" fill="${m}"/></g>
      <g class="torso">
        <path d="M42 48 C42 34 64 32 82 34 C100 36 110 34 115 42 C121 52 115 64 101 66 L57 66 C45 66 42 58 42 48Z" fill="${c}"/>
        <ellipse cx="55" cy="51" rx="14" ry="15" fill="${c}"/><ellipse cx="107" cy="51" rx="11" ry="14" fill="${c}"/>
        <path d="M104 47 C106 31 114 17 124 11 L134 19 C128 27 120 41 117 57Z" fill="${c}"/>
        <path d="M105 43 C107 29 115 15 124 9 L121 6 C111 12 102 27 100 41Z" fill="${m}"/>
        <g class="head" style="transform-origin:126px 14px">
          <path d="M121 8 C130 3 141 10 149 22 C153 29 149 33 142 31 C136 29 129 24 123 20Z" fill="${c}"/>
          <path d="M140 29 C144 31 149 31 150 27" stroke="#5a3a24" stroke-width="2" fill="none" stroke-linecap="round"/>
          <circle cx="146.5" cy="25" r="1.2" fill="#1d130c"/>${eye(130, 12, 1.9)}
          <path d="M123 8 L125 -2 L130 7Z" fill="${c}"/><path d="M121 9 L120 0 L125 7Z" fill="${dk}"/>
          <path d="M121 8 C118 4 120 0 124 0" stroke="${m}" stroke-width="3" fill="none" stroke-linecap="round"/>
        </g></g>
      ${L(54, 0, c)}${L(104, .5, c)}`;
  }};

  A.zebra = { w: 160, h: 110, T: .66, draw(T) {
    const w = '#F7F6F0', bk = '#1c1c1c';
    const L = (x, ph, far) => leg({ x, y: 55, up: 26, low: 23, wu: 10, wl: 6.5, col: far ? 'url(#rr-zleg-far)' : 'url(#rr-zleg)', foot: hoof(bk), phase: ph, a: 22, k: 40, T });
    return `${L(58, .5, 1)}${L(108, 0, 1)}
      <g class="tail" style="transform-origin:44px 42px"><path d="M44 42 C36 48 33 58 33 68" stroke="${w}" stroke-width="3" fill="none"/><path d="M33 66 C30 72 31 78 34 82 C36 76 37 70 35 66Z" fill="${bk}"/></g>
      <g class="torso">
        <path d="M42 48 C42 34 64 32 82 34 C100 36 110 34 115 42 C121 52 115 64 101 66 L57 66 C45 66 42 58 42 48Z" fill="url(#rr-zbody)"/>
        <ellipse cx="55" cy="51" rx="14" ry="15" fill="url(#rr-zbody)"/><ellipse cx="107" cy="51" rx="11" ry="14" fill="url(#rr-zbody)"/>
        <path d="M44 52 C40 48 40 42 44 40" stroke="${bk}" stroke-width="3" fill="none"/>
        <path d="M104 47 C106 31 114 17 124 11 L134 19 C128 27 120 41 117 57Z" fill="url(#rr-zneck)"/>
        <path d="M105 43 C107 29 115 15 124 9" stroke="${bk}" stroke-width="6" stroke-dasharray="3 3" fill="none"/>
        <g class="head" style="transform-origin:126px 14px">
          <path d="M121 8 C130 3 141 10 149 22 C153 29 149 33 142 31 C136 29 129 24 123 20Z" fill="${w}"/>
          <path d="M127 10 l4 5 M132 11 l4 5 M137 14 l3 5" stroke="${bk}" stroke-width="2" stroke-linecap="round"/>
          <path d="M141 20 C146 20 151 24 150 29 C147 32 142 31 139 28Z" fill="${bk}"/>${eye(130, 13, 1.9)}
          <path d="M123 8 L125 -2 L130 7Z" fill="${w}" stroke="${bk}" stroke-width="1"/>
        </g></g>
      ${L(54, 0, 0)}${L(104, .5, 0)}`;
  }};

  A.deer = { w: 150, h: 120, T: .68, draw(T) {
    const c = '#B97A47', dk = '#8F5A2F', lt = '#F1E2CC', ant = '#6B4A2B';
    const L = (x, ph, col) => leg({ x, y: 62, up: 26, low: 26, wu: 8, wl: 5, col, foot: hoof('#2e241c'), phase: ph, a: 22, k: 40, T });
    return `${L(58, .5, dk)}${L(104, 0, dk)}
      <g class="tail" style="transform-origin:46px 50px"><path d="M46 50 C40 47 37 50 39 55 C42 56 45 54 46 52Z" fill="${lt}"/></g>
      <g class="torso">
        <path d="M44 54 C44 42 62 40 80 41 C96 42 106 40 110 48 C115 57 110 68 98 69 L56 69 C46 69 43 62 44 54Z" fill="${c}"/>
        <ellipse cx="56" cy="57" rx="12" ry="12" fill="${c}"/><ellipse cx="104" cy="56" rx="9" ry="11" fill="${c}"/>
        <path d="M60 67 C72 70 88 70 100 66" stroke="${lt}" stroke-width="3.5" stroke-linecap="round" fill="none"/>
        <path d="M100 52 C102 38 108 28 116 22 L124 30 C118 36 114 46 112 60Z" fill="${c}"/>
        <path d="M108 40 C110 34 113 30 116 28" stroke="${lt}" stroke-width="3" stroke-linecap="round" fill="none" opacity=".8"/>
        <g class="head" style="transform-origin:118px 25px">
          <path d="M114 18 C120 14 130 18 136 26 C139 30 136 34 130 33 C124 32 118 28 115 25Z" fill="${c}"/>
          <circle cx="136" cy="28" r="1.8" fill="#1d130c"/>${eye(122, 21, 1.9)}
          <path d="M113 19 C106 12 101 14 104 19 C107 21 111 22 113 21Z" fill="${dk}"/>
          <path d="M118 16 C116 8 118 2 122 -5 M119 9 L113 4 M120 5 L127 1 M115 16 C111 10 107 6 103 4 M110 9 L109 2"
            stroke="${ant}" stroke-width="2.6" stroke-linecap="round" fill="none"/>
        </g></g>
      ${L(54, 0, c)}${L(100, .5, c)}`;
  }};

  A.cow = { w: 160, h: 110, T: .78, draw(T) {
    const w = '#F5F3EE', bk = '#262322', pk = '#E9A9A4', far = '#D9D5CC';
    const L = (x, ph, col) => leg({ x, y: 60, up: 22, low: 23, wu: 11, wl: 8, col, foot: hoof('#3a3533'), phase: ph, a: 18, k: 30, T });
    return `${L(58, .5, far)}${L(108, 0, far)}
      <g class="tail" style="transform-origin:42px 44px"><path d="M42 44 C36 52 35 64 36 76" stroke="${w}" stroke-width="2.6" fill="none"/><path d="M36 74 C33 80 35 84 38 86 C40 82 40 78 37 74Z" fill="${bk}"/></g>
      <g class="torso">
        <path d="M40 46 C40 32 62 30 84 32 C104 34 114 32 118 42 C122 54 118 66 104 68 L54 68 C42 68 40 58 40 46Z" fill="${w}"/>
        <path d="M58 33 C66 32 74 36 72 44 C70 50 60 50 56 44 C53 40 54 35 58 33Z M86 40 C94 38 102 42 100 50 C98 56 88 58 84 52 C81 47 82 42 86 40Z M44 50 C48 48 52 52 50 58 C47 60 43 58 42 54Z" fill="${bk}"/>
        <path d="M70 66 C72 72 80 72 82 66Z" fill="${pk}"/>
        <path d="M112 44 C116 36 120 32 124 30 L132 40 C126 44 122 52 120 58Z" fill="${w}"/>
        <g class="head" style="transform-origin:124px 34px">
          <path d="M116 32 C120 24 134 24 140 32 C146 40 146 50 141 55 C135 58 127 56 121 50Z" fill="${w}"/>
          <path d="M122 28 C128 26 134 28 134 34 C132 38 124 38 120 34Z" fill="${bk}"/>
          <path d="M133 47 C139 45 146 49 145 54 C142 59 134 58 132 54Z" fill="${pk}"/>
          <circle cx="139" cy="51" r="1.1" fill="#9c5f5a"/><circle cx="143" cy="52" r="1.1" fill="#9c5f5a"/>${eye(132, 36, 1.9)}
          <path d="M120 28 C116 22 118 18 122 20" stroke="#E7DCC0" stroke-width="3" stroke-linecap="round" fill="none"/>
          <path d="M118 31 L108 30 C108 34 112 36 118 35Z" fill="${w}" stroke="${bk}" stroke-width=".8"/>
        </g></g>
      ${L(54, 0, w)}${L(104, .5, w)}`;
  }};

  A.sheep = { w: 140, h: 100, T: .66, draw(T) {
    const wool = '#F4F1EA', sh = '#DCD5C7', face = '#3B3330';
    const L = (x, ph, col) => leg({ x, y: 62, up: 15, low: 17, wu: 6, wl: 5, col, foot: hoof('#221c1a'), phase: ph, a: 20, T });
    const puffs = (dy, col) => [[48, 50, 14], [62, 42, 15], [78, 40, 15], [94, 44, 14], [102, 54, 12], [86, 60, 15], [64, 60, 15], [48, 58, 12]]
      .map(([x, y, r]) => `<circle cx="${x}" cy="${y + dy}" r="${r}" fill="${col}"/>`).join('');
    return `${L(56, .5, '#2a2422')}${L(94, 0, '#2a2422')}
      <g class="tail" style="transform-origin:38px 50px"><circle cx="36" cy="50" r="6" fill="${wool}"/></g>
      <g class="torso">${puffs(3, sh)}${puffs(0, wool)}
        <g class="head" style="transform-origin:104px 40px">
          <path d="M100 38 C102 28 112 26 118 32 C124 38 124 48 118 52 C112 54 104 50 101 44Z" fill="${face}"/>
          <path d="M100 37 L91 40 L100 43Z" fill="${face}"/>
          <circle cx="104" cy="31" r="6" fill="${wool}"/><circle cx="110" cy="28" r="5.5" fill="${wool}"/>
          ${eye(113, 37, 1.6, '#e8e1d0')}<circle cx="113" cy="37" r=".8" fill="#111"/>
        </g></g>
      ${L(52, 0, face)}${L(90, .5, face)}`;
  }};

  A.llama = { w: 130, h: 140, T: .74, draw(T) {
    const c = '#EADBC0', dk = '#CDBB98', lt = '#F7EFE0';
    const L = (x, ph, col) => leg({ x, y: 82, up: 26, low: 26, wu: 8, wl: 6, col, foot: hoof('#4d3f33'), phase: ph, a: 20, k: 36, T });
    return `${L(50, .5, dk)}${L(90, 0, dk)}
      <g class="tail" style="transform-origin:36px 72px"><path d="M36 70 C28 70 26 78 31 82 C35 80 37 76 36 70Z" fill="${c}"/></g>
      <g class="torso">
        <path d="M34 76 C34 62 50 58 68 59 C84 60 96 58 100 66 C104 76 98 88 86 88 L46 88 C36 88 33 82 34 76Z" fill="${c}"/>
        <ellipse cx="46" cy="80" rx="11" ry="10" fill="${c}"/><ellipse cx="90" cy="78" rx="9" ry="10" fill="${c}"/>
        <path d="M52 60 h30 v14 h-30Z" fill="#D9473B"/><path d="M52 64 h30 M52 70 h30" stroke="#1F9E9A" stroke-width="2.4"/>
        <path d="M88 68 C88 50 90 32 94 20 L106 22 C104 34 102 52 100 70Z" fill="${c}"/>
        <path d="M91 60 C91 46 93 34 96 24" stroke="${lt}" stroke-width="3" stroke-linecap="round" fill="none"/>
        <g class="head" style="transform-origin:100px 20px">
          <path d="M92 18 C94 8 106 6 112 12 C118 18 120 24 116 26 C110 28 100 26 94 24Z" fill="${c}"/>
          <path d="M96 10 C93 2 95 -6 99 -8 C101 -2 100 4 100 10Z" fill="${c}"/><path d="M101 10 C100 2 103 -5 107 -6 C108 0 106 6 104 11Z" fill="${dk}"/>
          ${eye(105, 15, 1.9)}<path d="M115 22 l2 1" stroke="#5a4a3a" stroke-width="1.6" stroke-linecap="round"/>
          <circle cx="96" cy="12" r="4" fill="${lt}"/>
        </g></g>
      ${L(46, 0, c)}${L(86, .5, c)}`;
  }};

  A.elephant = { w: 170, h: 130, T: .95, draw(T) {
    const c = '#8E959E', dk = '#70767E', lt = '#A9AFB7';
    const L = (x, ph, col) => leg({ x, y: 86, up: 18, low: 20, wu: 18, wl: 17, col, foot: bigFoot(col), phase: ph, a: 14, k: 16, T });
    return `${L(54, .5, dk)}${L(108, 0, dk)}
      <g class="tail" style="transform-origin:32px 60px"><path d="M32 60 C26 66 24 76 25 86" stroke="${c}" stroke-width="3" fill="none"/><path d="M25 84 l-2 6 l4 0Z" fill="#3e4247"/></g>
      <g class="torso">
        <path d="M30 60 C30 34 56 26 88 28 C118 30 132 40 134 62 C136 82 120 90 100 90 L50 90 C36 90 30 78 30 60Z" fill="${c}"/>
        <path d="M44 84 C64 90 96 90 120 82" stroke="${lt}" stroke-width="4" stroke-linecap="round" fill="none" opacity=".6"/>
        <g class="head" style="transform-origin:130px 50px">
          <path d="M118 40 C120 24 140 20 152 30 C160 38 160 54 153 62 L151 92 C151 100 145 104 140 100 L142 66 C134 68 124 64 120 58Z" fill="${c}"/>
          <path d="M147 74 h6 M146 82 h6 M146 90 h6" stroke="${dk}" stroke-width="1.6" stroke-linecap="round"/>
          <path d="M141 64 C146 69 152 70 158 66" stroke="#F4EFE4" stroke-width="4" stroke-linecap="round" fill="none"/>
          ${eye(144, 40, 2)}
          <g class="ear" style="transform-origin:124px 40px"><path d="M126 32 C108 26 100 50 108 70 C118 76 128 66 130 52Z" fill="${dk}"/><path d="M124 38 C112 36 108 52 113 64" stroke="${c}" stroke-width="2" fill="none" opacity=".6"/></g>
        </g></g>
      ${L(50, 0, c)}${L(104, .5, c)}`;
  }};

  A.sauropod = { w: 200, h: 150, T: 1.3, draw(T) {
    const c = '#5E9E8E', dk = '#467A6D', lt = '#A9D3C4';
    const L = (x, ph, col) => leg({ x, y: 104, up: 20, low: 20, wu: 16, wl: 14, col, foot: bigFoot(col), phase: ph, a: 14, k: 14, T });
    return `${L(76, .5, dk)}${L(130, 0, dk)}
      <g class="torso">
        <g class="tail" style="transform-origin:60px 92px;animation-duration:2.2s"><path d="M60 84 C38 86 18 94 0 110 C20 106 40 102 62 102Z" fill="${c}"/></g>
        <path d="M50 90 C50 66 80 56 110 58 C138 60 150 72 150 92 C150 108 132 112 110 112 L76 112 C58 112 50 104 50 90Z" fill="${c}"/>
        <path d="M66 108 C86 114 116 114 140 104" stroke="${lt}" stroke-width="6" stroke-linecap="round" fill="none" opacity=".8"/>
        <path d="M80 64 a5 4 0 1 0 .1 0 M98 60 a6 4 0 1 0 .1 0 M116 62 a5 4 0 1 0 .1 0" fill="${dk}"/>
        <g class="head" style="transform-origin:140px 76px;animation-duration:2.6s">
          <path d="M130 72 C148 52 158 32 168 18 L181 24 C172 40 160 62 146 84Z" fill="${c}"/>
          <path d="M140 72 C152 56 160 40 168 28" stroke="${lt}" stroke-width="4" stroke-linecap="round" fill="none" opacity=".7"/>
          <path d="M166 14 C170 7 185 7 192 13 C195 19 189 24 179 24 C172 24 167 20 166 14Z" fill="${c}"/>
          ${eye(178, 13, 1.9)}<path d="M184 20 C188 21 191 19 192 17" stroke="${dk}" stroke-width="1.4" fill="none" stroke-linecap="round"/>
        </g></g>
      ${L(72, 0, c)}${L(126, .5, c)}`;
  }};

  /* ---------------- two-legged ---------------- */
  A.trex = { w: 175, h: 120, T: .8, draw(T) {
    const c = '#5E7D3A', dk = '#46602A', lt = '#B9C98A';
    const L = (x, ph, col) => leg({ x, y: 64, up: 24, low: 23, wu: 16, wl: 11, col, foot: claw(col), phase: ph, a: 24, k: 40, T, thigh: 13 });
    return `${L(78, .5, dk)}
      <g class="torso">
        <g class="tail" style="transform-origin:38px 60px;animation-duration:1.6s"><path d="M40 52 C24 50 10 50 0 56 C12 60 26 66 44 70Z" fill="${c}"/></g>
        <path d="M32 56 C42 40 72 34 98 40 C114 44 120 52 118 64 C114 77 94 81 76 79 C58 77 42 71 32 56Z" fill="${c}"/>
        <path d="M60 74 C76 80 96 78 110 68" stroke="${lt}" stroke-width="7" stroke-linecap="round" fill="none" opacity=".75"/>
        <path d="M50 44 L54 38 L58 43 L63 36 L67 41 L72 35 L76 40 L81 35 L85 40" stroke="${dk}" stroke-width="2.5" fill="none" stroke-linejoin="round"/>
        <path d="M112 60 L120 68 L124 66 M120 68 L118 72" stroke="${dk}" stroke-width="4" stroke-linecap="round" fill="none"/>
        <g class="head" style="transform-origin:112px 46px">
          <path d="M104 46 C107 28 128 22 150 26 C162 28 168 34 166 42 C162 48 150 50 136 50 L122 56 C112 57 104 53 104 46Z" fill="${c}"/>
          <path d="M126 50 L164 44" stroke="#2e3f1c" stroke-width="2" stroke-linecap="round"/>
          <path d="M136 47 L138 51 L140 47 M144 46 L146 50 L148 46 M152 45 L154 49 L156 45" stroke="#fff" stroke-width="1.6" fill="none" stroke-linejoin="round"/>
          <path d="M132 30 C136 27 142 27 145 30" stroke="${dk}" stroke-width="3" stroke-linecap="round" fill="none"/>
          <circle cx="139" cy="33" r="2.4" fill="#d9a400"/><circle cx="139" cy="33" r="1.2" fill="#111"/><circle cx="161" cy="31" r="1.2" fill="#2e3f1c"/>
        </g></g>
      ${L(72, 0, c)}`;
  }};

  A.turtle = { w: 110, h: 60, T: 1.3, draw(T) {
    const sk = '#8DB86B', skd = '#6F9A50', sh = '#4E8B3A', shl = '#7DB35F';
    const L = (x, ph, col) => leg({ x, y: 42, up: 6, low: 7, wu: 10, wl: 9, col, foot: null, phase: ph, a: 18, k: 10, T });
    return `${L(36, .5, skd)}${L(78, 0, skd)}
      <path d="M22 42 L12 44 L22 47Z" fill="${sk}"/>
      <g class="head" style="transform-origin:94px 40px">
        <path d="M90 36 C95 28 108 28 110 36 C110 42 102 45 93 43Z" fill="${sk}"/>${eye(102, 33, 1.7)}
        <path d="M104 40 C106 41 108 40 109 39" stroke="${skd}" stroke-width="1.2" fill="none"/>
      </g>
      <g class="torso">
        <path d="M20 42 C22 18 42 10 58 10 C76 10 94 20 96 42Z" fill="${sh}"/>
        <path d="M44 16 L58 14 L70 18 L66 30 L50 31Z M30 30 L44 20 M50 31 L46 42 M66 30 L72 42 M70 18 L86 30" stroke="${shl}" stroke-width="2.2" fill="none" stroke-linejoin="round"/>
        <rect x="18" y="39" width="80" height="6" rx="3" fill="#3E6E2E"/>
      </g>
      ${L(32, 0, sk)}${L(74, .5, sk)}`;
  }};

  /* ---------------- waddlers ---------------- */
  A.duck = { w: 90, h: 80, T: .5, draw(T) {
    const L = (x, ph) => leg({ x, y: 62, up: 6, low: 8, wu: 4, wl: 3.5, col: '#F08A24', foot: webFoot('#F08A24'), phase: ph, a: 22, k: 20, T });
    return `<g class="waddle" style="transform-origin:45px 76px">${L(42, .5)}
      <path d="M16 46 C9 41 10 34 17 36" stroke="#1d1d1d" stroke-width="3" fill="none" stroke-linecap="round"/>
      <g class="torso">
        <path d="M14 46 C14 34 30 30 48 34 C62 36 70 44 68 54 C64 64 46 66 30 62 C20 60 14 54 14 46Z" fill="#9C8D7E"/>
        <path d="M28 42 C38 36 54 38 60 46 C54 52 40 54 30 50Z" fill="#6E6257"/><path d="M44 46 L54 45 L54 48.5 L44 49.5Z" fill="#2E5BD6"/>
        <path d="M56 44 C64 46 68 52 66 58 C62 60 58 56 56 50Z" fill="#7A4A32"/>
        <path d="M58 44 C58 34 60 28 64 24 L72 26 C70 32 68 38 66 46Z" fill="#1F6B3A"/>
        <path d="M59 34 C63 36 67 36 70 34" stroke="#fff" stroke-width="2.2" fill="none"/>
        <g class="head" style="transform-origin:66px 24px">
          <circle cx="68" cy="20" r="8" fill="#1F6B3A"/><path d="M74 19 L86 21.5 C86 25 80 26 74 24.5Z" fill="#F2B53B"/>${eye(70, 17.5, 1.6)}
        </g></g>
      ${L(50, 0)}</g>`;
  }};

  A.penguin = { w: 70, h: 90, T: .46, draw(T) {
    const L = (x, ph) => leg({ x, y: 82, up: 1, low: 1, wu: 6, wl: 6, col: '#F08A24', foot: (fx, fy) => `<ellipse cx="${fx + 3}" cy="${fy + 2}" rx="6" ry="2.6" fill="#F08A24"/>`, phase: ph, a: 14, k: 0, T });
    return `<g class="waddle" style="transform-origin:34px 86px">${L(28, .5)}
      <g class="torso">
        <path d="M18 82 C11 62 13 30 34 13 C55 30 58 62 51 82Z" fill="#1E2433"/>
        <path d="M27 80 C23 62 24 40 36 29 C47 40 49 62 45 80Z" fill="#F7F7F2"/>
        <path d="M34 30 C38 34 44 34 46 30" stroke="#F6C445" stroke-width="3" fill="none" stroke-linecap="round"/>
        <path d="M41 21 L53 24.5 L41 27.5Z" fill="#F08A24"/>
        <circle cx="39" cy="20" r="2.6" fill="#fff"/><circle cx="39.6" cy="20" r="1.3" fill="#111"/>
        <g class="tail" style="transform-origin:20px 44px;animation-duration:.46s"><path d="M20 42 C11 52 10 64 14 70 C19 62 21 52 24 46Z" fill="#141826"/></g>
      </g>${L(38, 0)}</g>`;
  }};

  /* ---------------- hoppers ---------------- */
  // .hopbody jumps, .kick (back feet) pushes off, .reach (front paws) stretch forward.
  A.bunny = { w: 100, h: 70, T: .55, draw() {
    const c = '#A68A6D', dk = '#826A52', lt = '#EADFCF';
    return `<g class="hopbody">
      <g class="reach" style="transform-origin:62px 52px"><rect x="60" y="50" width="5.5" height="16" rx="2.7" fill="${dk}"/></g>
      <g class="kick" style="transform-origin:38px 56px"><path d="M28 60 C30 56 40 56 48 60 L50 66 L26 66 C24 64 26 61 28 60Z" fill="${dk}"/></g>
      <circle cx="25" cy="43" r="5.5" fill="#fff"/>
      <ellipse cx="48" cy="46" rx="22" ry="15" fill="${c}"/>
      <ellipse cx="36" cy="50" rx="14" ry="13" fill="${c}"/>
      <path d="M44 58 C52 61 62 60 66 54" stroke="${lt}" stroke-width="4" stroke-linecap="round" fill="none"/>
      <g class="head" style="transform-origin:68px 36px">
        <ellipse cx="66" cy="16" rx="3.6" ry="12" transform="rotate(-18 66 16)" fill="${dk}"/>
        <circle cx="72" cy="34" r="10" fill="${c}"/>
        <ellipse cx="71" cy="15" rx="4" ry="13" transform="rotate(-8 71 15)" fill="${c}"/><ellipse cx="71.4" cy="16" rx="1.8" ry="9" transform="rotate(-8 71 15)" fill="#E9B4B0"/>
        <path d="M78 37 C81 37 83 39 82 41" stroke="${lt}" stroke-width="3" fill="none" stroke-linecap="round"/>
        <circle cx="81.6" cy="34.2" r="1.6" fill="#D98A8C"/>${eye(75, 31, 1.8)}
      </g>
      <g class="reach" style="transform-origin:66px 52px"><rect x="64" y="50" width="5.5" height="16" rx="2.7" fill="${c}"/></g>
    </g>`;
  }};

  A.chipmunk = { w: 90, h: 60, T: .4, draw() {
    const c = '#B9784A', dk = '#8A5530', st = '#3C2416', wt = '#F3E3CC';
    return `<g class="hopbody">
      <g class="kick" style="transform-origin:32px 46px"><path d="M24 52 C26 48 34 48 40 52 L41 57 L22 57Z" fill="${dk}"/></g>
      <g class="tail" style="transform-origin:28px 40px"><path d="M28 40 C14 36 8 20 18 10 C24 5 30 11 25 18 C22 24 26 32 32 36Z" fill="${dk}"/></g>
      <ellipse cx="42" cy="40" rx="18" ry="12" fill="${c}"/><ellipse cx="32" cy="44" rx="10" ry="10" fill="${c}"/>
      <path d="M28 34 C38 29 50 29 58 34" stroke="${st}" stroke-width="3" fill="none"/><path d="M29 38 C39 33 50 33 58 37" stroke="${wt}" stroke-width="2.2" fill="none"/>
      <path d="M38 50 C46 52 54 50 58 46" stroke="${wt}" stroke-width="3.5" fill="none" stroke-linecap="round"/>
      <g class="head" style="transform-origin:58px 34px">
        <circle cx="61" cy="31" r="9" fill="${c}"/><circle cx="57" cy="23" r="3.2" fill="${dk}"/>
        <path d="M58 30 L68 28" stroke="${st}" stroke-width="2" stroke-linecap="round"/><path d="M60 33 L69 31" stroke="${wt}" stroke-width="1.8" stroke-linecap="round"/>
        <circle cx="69.6" cy="32" r="1.4" fill="#3a2418"/>${eye(64, 29, 1.6)}
      </g>
      <g class="reach" style="transform-origin:56px 46px"><rect x="54" y="44" width="4.5" height="12" rx="2.2" fill="${dk}"/></g>
    </g>`;
  }};

  A.kangaroo = { w: 120, h: 110, T: .62, draw() {
    const c = '#C98C5A', dk = '#A06C40', lt = '#EBCBA8';
    return `<g class="hopbody">
      <g class="tail" style="transform-origin:44px 80px;animation-duration:1.6s"><path d="M44 76 C32 86 18 96 4 104 L8 107 C24 100 38 92 52 84Z" fill="${c}"/></g>
      <g class="kick" style="transform-origin:54px 82px"><path d="M46 100 L82 102 L82 107 L44 107Z" fill="${dk}"/><rect x="48" y="80" width="10" height="24" rx="5" fill="${dk}"/></g>
      <path d="M40 70 C36 50 46 30 62 26 C74 24 80 34 78 48 C76 62 70 78 58 84 C48 86 42 80 40 70Z" fill="${c}"/>
      <path d="M64 40 C70 50 70 64 62 76" stroke="${lt}" stroke-width="7" stroke-linecap="round" fill="none"/>
      <ellipse cx="52" cy="80" rx="14" ry="13" fill="${c}"/>
      <g class="reach" style="transform-origin:72px 48px"><path d="M72 48 L82 58 L86 56" stroke="${dk}" stroke-width="4.5" stroke-linecap="round" fill="none"/></g>
      <g class="head" style="transform-origin:68px 26px">
        <path d="M62 22 C62 12 72 8 82 12 C90 15 96 20 94 24 C88 27 78 29 68 30Z" fill="${c}"/>
        <path d="M67 13 L64 0 L73 10Z" fill="${c}"/><path d="M71 12 L70 1 L77 10Z" fill="${dk}"/>
        <circle cx="93" cy="21.5" r="1.6" fill="#2b1c12"/>${eye(78, 17, 1.8)}
      </g>
    </g>`;
  }};

  /* ---------------- fliers ---------------- */
  A.bird = { w: 90, h: 60, fly: true, draw() {
    const c = '#3B6FD6', dk = '#284FA3', lt = '#EEF2FA';
    return `<g class="wing" style="transform-origin:42px 30px;animation-delay:-.19s;opacity:.75"><path d="M42 30 C34 12 46 2 62 4 C58 14 52 24 46 32Z" fill="${dk}"/></g>
      <path d="M8 32 L26 28 L26 38Z" fill="${dk}"/><path d="M8 32 L26 31 M10 35 L26 35" stroke="#fff" stroke-width="1.2"/>
      <ellipse cx="42" cy="34" rx="20" ry="11" fill="${c}"/>
      <path d="M30 40 C40 46 54 46 60 38" stroke="${lt}" stroke-width="6" stroke-linecap="round" fill="none"/>
      <circle cx="60" cy="27" r="9" fill="${c}"/><path d="M54 20 L58 12 L62 19Z" fill="${c}"/>
      <path d="M66 27 L76 29 L66 31Z" fill="#2b2b2b"/><path d="M58 33 C62 35 66 33 67 31" stroke="#1d1d2b" stroke-width="2" fill="none"/>${eye(62, 25, 1.7)}
      <g class="wing" style="transform-origin:44px 30px"><path d="M44 30 C34 10 48 0 66 2 C62 14 54 24 48 33Z" fill="${c}"/>
        <path d="M48 12 L58 8 M47 18 L57 15 M47 24 L54 22" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/></g>`;
  }};

  A.owl = { w: 90, h: 70, fly: true, draw() {
    const c = '#8B6B4A', dk = '#6A4F34', lt = '#E7D3B0';
    return `<g class="wing" style="transform-origin:40px 32px;animation-delay:-.2s;opacity:.8"><path d="M40 32 C30 12 44 0 62 2 C58 14 50 26 44 34Z" fill="${dk}"/></g>
      <path d="M24 38 L9 34 L11 43 L24 45Z" fill="${dk}"/>
      <ellipse cx="42" cy="38" rx="19" ry="15" fill="${c}"/>
      <path d="M32 46 C40 52 52 52 58 44" stroke="${lt}" stroke-width="5" stroke-linecap="round" fill="none" opacity=".8"/>
      <circle cx="58" cy="27" r="12" fill="${c}"/><path d="M51 16 L49 6 L57 14Z" fill="${dk}"/>
      <circle cx="62" cy="28" r="8.5" fill="${lt}"/>
      <circle cx="64" cy="26" r="3.6" fill="#F5C518"/><circle cx="64.4" cy="26" r="1.8" fill="#111"/>
      <path d="M69 29 L73.5 32 L68.5 33.5Z" fill="#4a3826"/>
      <g class="wing" style="transform-origin:42px 32px"><path d="M42 32 C32 10 48 -2 66 1 C62 14 52 26 46 35Z" fill="${c}"/>
        <path d="M48 12 L58 9 M47 18 L57 16 M46 24 L54 23" stroke="${lt}" stroke-width="1.6" stroke-linecap="round" opacity=".8"/></g>`;
  }};

  A.butterfly = { w: 70, h: 60, fly: true, draw() {
    const o = '#F28C28', bk = '#1E1A17';
    const wing = `<path d="M35 27 C28 9 10 5 5 15 C3 25 15 32 35 30Z" fill="${o}" stroke="${bk}" stroke-width="2.4"/>
      <path d="M35 31 C24 34 12 42 16 50 C22 56 30 46 35 36Z" fill="${o}" stroke="${bk}" stroke-width="2.4"/>
      <path d="M33 28 L14 14 M33 29 L10 24 M33 33 L20 46" stroke="${bk}" stroke-width="1.2"/>
      <circle cx="9" cy="16" r="1.2" fill="#fff"/><circle cx="7" cy="22" r="1.2" fill="#fff"/><circle cx="17" cy="50" r="1" fill="#fff"/>`;
    return `<g class="bwing" style="transform-origin:35px 30px">${wing}</g>
      <g class="bwing" style="transform-origin:35px 30px"><g transform="translate(70 0) scale(-1 1)">${wing}</g></g>
      <ellipse cx="35" cy="31" rx="2.6" ry="13" fill="${bk}"/>
      <path d="M34 19 C32 12 30 9 27 7 M36 19 C38 12 40 9 43 7" stroke="${bk}" stroke-width="1.2" fill="none"/>`;
  }};

  A.dragon = { w: 150, h: 100, fly: true, draw() {
    const c = '#C8382E', dk = '#92241D', bl = '#F3B05A', mem = '#E8574A';
    const wing = (o, col) => `<g class="wing" style="transform-origin:72px 44px;${o}"><path d="M72 44 C66 22 74 4 94 0 C90 10 98 12 106 8 C102 18 110 22 118 20 C108 32 92 40 78 46Z" fill="${col}"/>
      <path d="M74 42 L94 2 M76 42 L105 9 M78 44 L117 21" stroke="${dk}" stroke-width="1.8" fill="none"/></g>`;
    return `${wing('animation-delay:-.19s;opacity:.85', dk)}
      <g class="tail" style="transform-origin:46px 54px;animation-duration:1.4s"><path d="M48 50 C30 54 16 66 4 64 C16 60 26 52 44 46Z" fill="${c}"/><path d="M6 64 L0 58 L2 68 L10 66Z" fill="${dk}"/></g>
      <path d="M44 50 C48 38 70 34 92 38 C106 40 112 48 108 56 C102 64 82 66 64 64 C52 62 42 58 44 50Z" fill="${c}"/>
      <path d="M58 60 C72 64 92 62 104 56" stroke="${bl}" stroke-width="5" stroke-linecap="round" fill="none"/>
      <path d="M60 37 l3 -5 l3 4 l3 -5 l3 4 l3 -5 l3 4" stroke="${dk}" stroke-width="2" fill="none" stroke-linejoin="round"/>
      <path d="M70 62 l-2 8 l4 -1 M92 62 l0 8 l4 -1" stroke="${dk}" stroke-width="3" stroke-linecap="round" fill="none"/>
      <path d="M100 44 C106 34 112 28 118 26 L124 34 C118 38 114 44 110 52Z" fill="${c}"/>
      <g class="head" style="transform-origin:118px 30px">
        <path d="M114 24 C120 16 134 16 144 22 C150 26 150 32 144 34 C136 36 124 36 116 32Z" fill="${c}"/>
        <path d="M118 20 L112 8 L122 18 M124 18 L122 6 L128 17" fill="${bl}" stroke="${bl}" stroke-width="1.5" stroke-linejoin="round"/>
        <path d="M128 31 L148 29" stroke="${dk}" stroke-width="1.6" stroke-linecap="round"/>
        <circle cx="127" cy="24" r="2.2" fill="#FFD23F"/><circle cx="127.3" cy="24" r="1.1" fill="#111"/><circle cx="145" cy="25" r="1.1" fill="${dk}"/>
      </g>
      ${wing('', mem)}`;
  }};

  // Patterns shared by every drawing (zebra stripes), added to the page once.
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  defs.setAttribute('width', 0); defs.setAttribute('height', 0); defs.style.position = 'absolute';
  defs.innerHTML = `<defs>
    <pattern id="rr-zbody" patternUnits="userSpaceOnUse" width="9" height="40" patternTransform="rotate(12)"><rect width="9" height="40" fill="#F7F6F0"/><rect width="4" height="40" fill="#1c1c1c"/></pattern>
    <pattern id="rr-zneck" patternUnits="userSpaceOnUse" width="40" height="8" patternTransform="rotate(-30)"><rect width="40" height="8" fill="#F7F6F0"/><rect width="40" height="3.5" fill="#1c1c1c"/></pattern>
    <pattern id="rr-zleg" patternUnits="userSpaceOnUse" width="20" height="7"><rect width="20" height="7" fill="#F7F6F0"/><rect width="20" height="3" fill="#1c1c1c"/></pattern>
    <pattern id="rr-zleg-far" patternUnits="userSpaceOnUse" width="20" height="7"><rect width="20" height="7" fill="#D8D7D0"/><rect width="20" height="3" fill="#111"/></pattern>
  </defs>`;
  (document.body ? Promise.resolve() : new Promise(r => addEventListener('DOMContentLoaded', r))).then(() => document.body.prepend(defs));

  // The drawing as an <svg> of the given height (width follows the animal's shape).
  window.PETART = A;
  window.petSVG = (id, height) => {
    const a = A[id]; if (!a) return '';
    const T = a.T || .6, w = Math.round(height * a.w / a.h);
    return `<svg class="petsvg" width="${w}" height="${height}" viewBox="0 0 ${a.w} ${a.h}" style="--t:${T}s" aria-hidden="true">${a.draw(T)}</svg>`;
  };
})();

// Original sticker packs, drawn for this planner. Each is SVG markup in a 100×100 box.
const O = 'stroke="#3d3121" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"';
const star4 = (x, y, r, fill) => `<path d="M${x} ${y - r}Q${x + r * 0.18} ${y - r * 0.18} ${x + r} ${y}Q${x + r * 0.18} ${y + r * 0.18} ${x} ${y + r}Q${x - r * 0.18} ${y + r * 0.18} ${x - r} ${y}Q${x - r * 0.18} ${y - r * 0.18} ${x} ${y - r}Z" fill="${fill}" ${O}/>`;

export const PACKS = [
  {
    name: 'Celestial',
    items: {
      moon: `<path d="M62 12C38 16 24 40 30 64C36 86 62 96 82 84C62 84 46 68 46 48C46 32 52 20 62 12Z" fill="#f3d98a" ${O}/>${star4(76, 30, 9, '#fffaf1')}`,
      sun: `<circle cx="50" cy="50" r="20" fill="#f2c45a" ${O}/>${[0, 45, 90, 135, 180, 225, 270, 315].map((a) => { const r = (a * Math.PI) / 180; return `<path d="M${50 + 28 * Math.cos(r)} ${50 + 28 * Math.sin(r)}L${50 + 40 * Math.cos(r)} ${50 + 40 * Math.sin(r)}" ${O}/>`; }).join('')}`,
      sparkles: `${star4(40, 46, 26, '#f3d98a')}${star4(76, 22, 12, '#e8a9b6')}${star4(74, 76, 10, '#a7c4f2')}`,
      planet: `<circle cx="50" cy="50" r="24" fill="#c4b2d6" ${O}/><ellipse cx="50" cy="52" rx="44" ry="11" fill="none" ${O} transform="rotate(-18 50 52)"/><circle cx="42" cy="42" r="4" fill="#9d88b3"/><circle cx="58" cy="58" r="3" fill="#9d88b3"/>`,
      cloudmoon: `<path d="M58 14C44 18 38 34 44 48C50 60 66 62 76 54C64 52 56 42 56 30C56 24 56 18 58 14Z" fill="#f3d98a" ${O}/><path d="M22 82C12 82 10 66 22 64C22 52 40 50 44 60C50 54 62 58 60 68C70 68 72 82 62 82Z" fill="#fffaf1" ${O}/>`,
      shootingstar: `<path d="M14 80L58 40" stroke="#e8a9b6" stroke-width="7" stroke-linecap="round"/><path d="M22 88L60 54" stroke="#a7c4f2" stroke-width="5" stroke-linecap="round"/>${star4(68, 32, 20, '#f3d98a')}`,
    },
  },
  {
    name: 'Nature',
    items: {
      leaf: `<path d="M18 84C18 44 44 18 86 16C84 58 58 84 18 84Z" fill="#98a487" ${O}/><path d="M18 84L64 38M40 62L40 46M52 50L64 50" ${O} fill="none"/>`,
      mushroom: `<path d="M12 54C12 22 88 22 88 54Z" fill="#c95a55" ${O}/><path d="M38 54L36 86H64L62 54" fill="#f3e6cf" ${O}/><circle cx="34" cy="40" r="5" fill="#fffaf1"/><circle cx="58" cy="34" r="6" fill="#fffaf1"/><circle cx="72" cy="46" r="4" fill="#fffaf1"/>`,
      flower: `${[0, 72, 144, 216, 288].map((a) => `<ellipse cx="50" cy="28" rx="13" ry="20" fill="#e8a9b6" ${O} transform="rotate(${a} 50 50)"/>`).join('')}<circle cx="50" cy="50" r="11" fill="#f2c45a" ${O}/>`,
      tulip: `<path d="M50 56V92M50 76C40 70 30 72 26 80M50 82C60 74 70 76 74 82" ${O} fill="none"/><path d="M30 22L40 34L50 18L60 34L70 22V40C70 54 60 60 50 60C40 60 30 54 30 40Z" fill="#cf826d" ${O}/>`,
      sprout: `<path d="M24 88H76L70 66H30Z" fill="#cf826d" ${O}/><path d="M50 66V40" ${O} fill="none"/><path d="M50 46C38 46 28 38 28 26C40 26 50 32 50 46Z" fill="#98a487" ${O}/><path d="M50 40C60 40 70 32 72 20C60 20 50 28 50 40Z" fill="#b6c49f" ${O}/>`,
      cactus: `<path d="M40 88V30C40 18 60 18 60 30V88Z" fill="#8fae7f" ${O}/><path d="M40 60H30C24 60 22 54 22 48V40M60 50H70C76 50 78 44 78 38V32" fill="none" ${O}/><path d="M30 88H70L66 96H34Z" fill="#cf826d" ${O}/>`,
    },
  },
  {
    name: 'Cozy',
    items: {
      coffee: `<path d="M20 36H72V68C72 80 62 88 50 88H42C30 88 20 80 20 68Z" fill="#6f9fae" ${O}/><path d="M72 44H78C86 44 86 62 78 62H72" fill="none" ${O}/><path d="M36 26C32 20 40 16 36 10M52 26C48 20 56 16 52 10" ${O} fill="none" stroke="#b3a797"/>`,
      cat: `<path d="M20 86C14 62 18 44 26 34L24 10L44 26C48 24 52 24 56 26L76 10L74 34C82 44 86 62 80 86Z" fill="#cf826d" ${O}/><circle cx="40" cy="54" r="4" fill="#3d3121"/><circle cx="60" cy="54" r="4" fill="#3d3121"/><path d="M46 66L50 70L54 66M30 64H18M30 70H20M70 64H82M70 70H80" ${O} fill="none"/>`,
      candle: `<path d="M34 40H66V88H34Z" fill="#fffaf1" ${O}/><path d="M50 40V32" ${O}/><path d="M50 30C42 22 48 12 50 6C52 12 58 22 50 30Z" fill="#f2c45a" ${O}/><path d="M28 88H72" ${O}/>`,
      books: `<path d="M16 76H84V88H16Z" fill="#6e819c" ${O}/><path d="M22 62H76V76H22Z" fill="#e3c5b8" ${O}/><path d="M18 46H72V62H18Z" fill="#98a487" ${O}/><path d="M28 54H40M30 70H44" ${O}/>`,
      heart: `<path d="M50 86C20 66 10 48 14 32C18 18 36 14 50 30C64 14 82 18 86 32C90 48 80 66 50 86Z" fill="#e8a9b6" ${O}/><path d="M28 34C30 28 34 26 38 26" stroke="#fffaf1" stroke-width="4" stroke-linecap="round" fill="none"/>`,
      tea: `<path d="M18 46H70C70 68 60 82 44 82C28 82 18 68 18 46Z" fill="#c4b2d6" ${O}/><path d="M70 52H76C84 52 84 66 76 66H68" fill="none" ${O}/><path d="M44 46V22H54V32H44" ${O} fill="#fffaf1"/><path d="M12 86H76" ${O}/>`,
    },
  },
  {
    name: 'Planner bits',
    items: {
      check: `<circle cx="50" cy="50" r="38" fill="#98a487" ${O}/><path d="M32 52L45 64L70 36" stroke="#fffaf1" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
      done: `<circle cx="50" cy="50" r="40" fill="none" stroke="#c97d8a" stroke-width="4" stroke-dasharray="7 5"/><text x="50" y="60" text-anchor="middle" font-family="Patrick Hand, cursive" font-size="30" fill="#b5534a">done!</text>`,
      todo: `<path d="M6 30H94L86 50L94 70H6L14 50Z" fill="#d4b48b" ${O}/><text x="50" y="59" text-anchor="middle" font-family="Patrick Hand, cursive" font-size="24" fill="#3d3121">to do</text>`,
      important: `<path d="M10 28H78L92 50L78 72H10Z" fill="#c95a55" ${O}/><circle cx="78" cy="50" r="4" fill="#fffaf1"/><text x="42" y="58" text-anchor="middle" font-family="Patrick Hand, cursive" font-size="21" fill="#fffaf1">important</text>`,
      pin: `<path d="M50 60V92" ${O}/><circle cx="50" cy="38" r="24" fill="#c95a55" ${O}/><circle cx="42" cy="30" r="6" fill="#fffaf1" opacity=".7"/>`,
      clip: `<path d="M38 88V26C38 14 62 14 62 26V78C62 86 50 86 50 78V30" fill="none" stroke="#6e819c" stroke-width="6" stroke-linecap="round"/>`,
      arrow: `<path d="M12 70C30 40 56 30 80 36" fill="none" ${O} stroke-width="4"/><path d="M68 24L84 36L70 50" fill="none" ${O} stroke-width="4"/>`,
      tab: `<path d="M10 20H90V80H10Z" fill="#a7c0d4" ${O}/><path d="M10 34H90" ${O}/><path d="M22 50H66M22 62H54" ${O} stroke="#6e819c"/>`,
    },
  },
  {
    name: 'Weather',
    items: {
      cloud: `<path d="M24 72C10 72 8 50 24 48C24 30 50 28 56 42C64 34 82 40 80 54C92 56 92 72 80 72Z" fill="#fffaf1" ${O}/>`,
      rain: `<path d="M24 56C10 56 8 36 24 34C24 18 50 16 56 30C64 22 82 28 80 40C92 42 92 56 80 56Z" fill="#dfe8ee" ${O}/><path d="M34 66L30 78M52 66L48 78M70 66L66 78" ${O} stroke="#6f9fae"/>`,
      snow: `${[0, 60, 120].map((a) => `<path d="M50 12V88" ${O} stroke="#6f9fae" transform="rotate(${a} 50 50)"/>`).join('')}<circle cx="50" cy="50" r="8" fill="#dfe8ee" ${O}/>`,
      storm: `<path d="M24 52C10 52 8 32 24 30C24 14 50 12 56 26C64 18 82 24 80 36C92 38 92 52 80 52Z" fill="#b3b8c2" ${O}/><path d="M52 52L40 72H54L44 92" fill="none" ${O} stroke="#e8b440" stroke-width="5"/>`,
      rainbow: `<path d="M10 80A40 40 0 0 1 90 80" fill="none" stroke="#e8a9b6" stroke-width="9"/><path d="M20 80A30 30 0 0 1 80 80" fill="none" stroke="#f3d98a" stroke-width="9"/><path d="M30 80A20 20 0 0 1 70 80" fill="none" stroke="#a7c4f2" stroke-width="9"/>`,
    },
  },
];

export const BUILTIN = Object.fromEntries(PACKS.flatMap((p) => Object.entries(p.items).map(([k, svg]) => [k, svg])));

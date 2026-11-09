// Help + changelog, opened from the left menu.
const HELP = [
  ['Shelf & notebooks', [
    'Your notebooks live on the shelf. Tap a spine to pull it out, then Open (or tap the cover).',
    'Edit a notebook to change its name, small label, type (Planner = weeks, Notebook = pages), charm, cover color and label color.',
    'Decorate (in Edit notebook) lets you drag the name label and stick stickers on the front and the spine.',
    'Shelf color is at the top of the shelf. Your phone’s back gesture takes you back to the shelf.',
  ]],
  ['Planner pages', [
    'Month: a calendar with dots for each day’s to-dos (filled = open, hollow = done). Tap a date number to jump to that week. Draw and add stickers right on it. Open the pages button (four squares) → Paper & shape → “Calendar style & parts” to change the calendar’s look and colors or switch parts off to draw them yourself; tap the Month tab again to change the tab’s own color.',
    'Week: your to-dos by day. Tap a to-do to edit it; the ↻ button makes it repeat (each day gets its own checkbox, and deleting one day skips just that day). Tags (#like-this) show as pills — style them under Tags → Edit looks in the left menu.',
    'Week (adding):  Type in the bar at the bottom (phone) or under each day (PC). Tasks can be rolled to the next day.',
    'Notes: a free drawing page for the week. Add your own tabs with +; tap a tab again to rename, recolor or pin it (pinned tabs show on every week).',
    'The title opens a month picker to jump to any week. Arrows move a week at a time (a month at a time on the Month tab).',
  ]],
  ['Drawing', [
    'Pen types: ballpoint, fineliner, fountain and pencil (soft and grainy) — all respond to pressure. Stabilize smooths shaky lines.',
    'Writing assist (switch in the pen settings): shows a faint guideline under the line you’re writing and levels the line about a second after you stop. Undo puts it back.',
    'Zoomed in on phone? The buttons above the zoom % give you a one-tap eraser, → to slide right, and ↵ to jump to the next line.',
    'Hold at the end of a line to snap it into a straight line, circle, triangle, rectangle and more.',
    'Double-tap with a finger to switch between the eraser and your last pen. Pen double-tap is off by default (it can mistake dots for taps); turn it on in pen settings. Turn on “Pen button erases” in pen settings to erase by holding the S Pen button.',
    'The eraser can erase everything, only pen, or only highlighter. Whole stroke removes a line you touch, Partial cuts it apart, and Precise works like a real eraser — it takes away exactly what it covers, nothing more.',
    'Lasso something, keep a finger on it and put down a second finger: pinch to resize, twist to rotate.',
    'Save favorite pens and highlighters with “Save as fave”. Eyedropper picks a color off the page.',
    'Tap outside a menu (or drag its handle down) to close it — changes save as you go.',
  ]],
  ['Lasso', [
    'Circle things to select them, or tap a single sticker, tape, note or tracker to grab it.',
    'Drag to move; handles resize, stretch length/width and rotate. The bar lets you recolor, duplicate, delete, change layer, or save a drawing as a sticker.',
    'Filter what the lasso grabs: everything, pen, highlighter, or stickers & items.',
    'Use as header: lasso hand lettering or stickers and choose the month title, the year, or a weekday. It replaces the typed one on the calendar, month cover and week page. Remove them under Calendar style & parts.',
  ]],
  ['Stickers drawer', [
    'Stickers: packs plus your own saved stickers (sorted into categories you can rename and reorder). Import takes PNGs, whole sticker sheets (cut apart for you) or a .zip from a free pack.',
    'Trackers: water (tap drops; tap the total to switch ml/oz/cups), stars, habit grid, mood (tap a day, pick a face), time tracker, and the week progress bar. Lasso a tracker → Edit to change its settings.',
    'Photos, washi tape (pattern, colors, width — drag to lay it down), sticky notes with text, and shapes (outline, fill, thickness, favorites).',
  ]],
  ['Pages on a tab', [
    'Add more pages to any drawing tab: scroll to the bottom on phone and tap “+ Add page”; on PC use the arrows in the bottom-right corner.',
    'The pages button in the tool tray (four little squares) shows every page on the tab — tap to jump, arrows to reorder, trash to delete.',
  ]],
  ['Phone & PC', [
    'Phone: pinch to zoom (the % shows while zoomed), one finger to scroll, swipe between tabs. Your palm is ignored while the pen is near.',
    'PC: the left menu holds the index, search and tags; the right panel holds tool settings. Ctrl+Z / Ctrl+Y undo and redo.',
    'Everything syncs between your devices automatically.',
  ]],
];

const CHANGES = [
  ['Nov 9, 2026', [
    'To-dos can have a time: tap a to-do → the clock. Turn on 🔔 Reminders (left menu) on each device you want pings on.',
    'Todoist: paste your token in 🔔 Reminders, then “Send to Todoist” on any timed to-do (or send them all automatically). Checking off in either app checks off in both.',
    'Repeating to-dos: editing or deleting asks “just this one”, “this & later” or “all of them”.',
    'Unit tracker: one card per unit with a cursive property note; colors in a palette can be dragged into a new order.',
    'Week page: in ✎ Decorate, drag the green handle under any day to give it more room (double-tap to reset).',
    'Covers: 9 new charms, cover prints (linen, leather, gingham, stars, florals…), metal corners, an elastic band, ribbon colors and a stitched edge — Edit notebook.',
    'Decorate a cover: add washi tape and your own words alongside stickers, on the front or spine.',
    'Sticker search right in the sticker panel. Sticker library (Stickers → Library): folders, search, favorites ★, recent, rename, bigger/smaller thumbnails. Click to pick, Ctrl-click to add, Shift-click for a range, or drag a box; drag picked stickers onto a folder to move them all.',
    'Drag PNGs, sticker sheets or a .zip onto the sticker panel, the library, or a folder — or paste with Ctrl+V. Imports keep going if you close the panel; no limit on how many.',
    'Drag or paste an image onto the page to drop it right on the page.',
    'Pick your own colors: tap almost anything in the room while decorating (clocks, calendars, vases, mugs, crystals, garlands, tapestries…) to recolor it, and every color row now ends with a rainbow dot to choose any color you like.',
    'New witchy moon month calendar: the whole month in gold on midnight, with tonight’s moon on top and little moons marking the new and full moon days.',
    '6 live calendars that always show today: bow tear-off (coquette), moon phase with tonight’s real moon (witchy), wooden hanging board (plant), flip desk calendar (minimal), sunny arch (boho), and a full month calendar with today circled (tap it to recolor).',
    'Weather tag: the town name now shows for your real location, and you can add today’s date to it.',
    'Decorating is easier: when you pick something low in the room (or the bookshelf), its button bar moves to the top of the screen so it doesn’t cover what you’re arranging. On phones the bar is one slim row you can swipe sideways.',
    'Weather tag is fully editable in the Room tab: pick a style (any room’s, a plain card, or no tag), tag and text colors, font, the words (sweet, witchy, plant talk, cozy, just the weather, or your own), the little icon, °F/°C, and whether to show high/low and the town name.',
    'Decorate panel: the top buttons stay put while you scroll, and on PC “Switch side” moves the panel to the left or right (it remembers your pick).',
    '5 cute digital clocks (hh:mm, real time): heart (coquette), gothic glow (witchy), plant pot (plant), slim minimal, and a glowing wood block (boho).',
    'Behind or in front: tap a wall or floor item that touches the bookshelf and choose “Behind shelf” to tuck it behind (tap “In front of shelf” to bring it back).',
    'Scoot the bookshelf: while decorating, drag the bookshelf left or right (or tap it for ← Left / Right → / Reset spot). Decor on it or touching it moves along.',
    '10 new working clocks, two per room style: bow and twin-bell alarm (coquette), moon & stars and a gothic mantel clock with a swinging pendulum (witchy), leafy wreath and wood slice (plant), simple wall and desk cube (minimalist), sunburst and terracotta arch (boho).',
    'Rugs: 6 new (fringed, checker, striped, Persian, scalloped, moss) plus a knit pouf. Tap any rug, the round woven rug or the floor cushion while decorating to change its color.',
    'Window: pick its shape (rounded, arched, square, gothic, round porthole), curtain style (long drapes, tied back, café half, scalloped valance or none) and curtain color in the Room tab. The trim color now colors the window frame too.',
    'Decor sorting fix: the cats are back in Cats (some were showing up under Shelf things).',
    'Trailing plants (pothos, hanging plant, string of pearls) now grow out of the soil and spill over the pot rim instead of starting partway down the pot.',
    'PC: once you’ve picked a room style, the space around your journal uses your room’s wall color and wallpaper.',
    'Room tab: pick a preset, then change the bookshelf color, wall color and wallpaper, floor color and style, and trim. (Shelf color moved here from the top bar.)',
    'Fairy lights now drape across the top of the bookshelf in two strands on their own — “Unpin from shelf” to place them freely, “Fit to bookshelf” to snap them back. Pick light colors (or rainbow), plus 4 new light strings.',
    'Working clocks for the room: an analog wall clock and a digital shelf clock, both showing your real time (12-hour).',
    'Furniture in colors: desks, tables, chairs, stools, a dresser and more, each with color swatches and a themed dress-up (tablecloths, cushions, runners…). Candles come in colors too.',
    'Decorating is easier: decor is sorted by type with a search box, the panel can be tucked away (▾) or made bigger (⤢), plus Undo, Duplicate, and keyboard shortcuts on PC (Delete, Ctrl+D, arrow keys, Ctrl+Z). Shelf decor no longer snaps down, so you can stack things.',
    'Room: hanging and trailing plants redrawn, pot colors for potted plants (tap one while decorating), 30 new decor pieces across the five room styles, and the decorate panel floats (▾ tucks it away) so the room never shifts.',
    '12 new cats for the room: a tabby and a tortie, each plain plus coquette (bow), witchy (hat), plant (napping by a pot), minimalist (loaf) and boho (pouf) versions.',
    'The room is now one fixed scene that scales to your screen, so decor stays in the same spot on PC, phone and any browser zoom. Tap the weather window while decorating to move or resize it. Each theme has its own weather tag. ⇄ Arrange books lets you drag notebooks into a new order.',
    'Your shelf can be a little room: tap ✿ Decorate room on the shelf to pick a theme (coquette, witchy dark academia, plant mom, minimalist, boho), add plants and knick-knacks, and drag them onto shelves, the wall or the floor. The window shows your real weather.',
    'Pen panel: options are tucked into a Pen options section, and palettes can be reordered (Edit → Palette order).',
    'Phone: the Month tab has a Month page | Calendar switch, so the goals / don’t forget / notes page shows on mobile too.',
    'Save as sticker now asks for a name, a folder (type to see matching folders, or make a new one) and optional tags. Timed to-dos show task · time · tags.',
    'Lock things in place: select a sticker, photo, note or tracker with the lasso and tap 🔒. Locked things can’t be lassoed or moved by accident — tap one with the lasso and choose Unlock.',
    'Sticker tags: every sticker is tagged by color, art style, use and theme. Search matches tags too (try "pink watercolor" or "christmas label"), tap color dots or tag chips in the Library to filter, and add or remove tags on picked stickers.',
  ]],
  ['Nov 3, 2026', [
    'Decorate the week page: tap ✎ Decorate (top right of the week) to draw, highlight and add stickers right over your to-dos; ✓ Done to go back to checking things off.',
    'Tap any #tag to open its own page: to-dos by date (coming up and earlier) and typed notes grouped by week or by page.',
    'Reference cards: the name reads as a header, and you can write a little note on the card face. Card stickers are sorted into your own categories.',
    'Left menu sections fold up. Goals: tap the words to type, “+ add a goal” to add one, the heart to check it off.',
    'PC: drawing pages open as a two-page spread sized to fit the screen, with a cute “Add a page” on an empty right page.',
    'Eyedropper lives in the color pop-out now (next to Hex): tap a color on the page, or Cancel. Two fingers still pan and zoom while it’s on.',
    'Floating pill: colored icons, a fold arrow to hide the extra buttons, steadier writing assist, and easier pen double-tap.',
    'Floating pill: each button has its own soft color, the color dot opens a color wheel with recent colors and your palettes (switch, make new ones, add or remove colors), and it can shrink smaller.',
    'Zoom out a little past the page, and pan past its edges while zoomed in. Tall pages are a bit shorter.',
    'Page settings (paper, page shape, calendar style) moved into the pages button (four squares) → Paper & shape. The left menu is tidier, with sections and fewer tags shown at once.',
    'Drag to-dos by their ⋮⋮ grip to reorder or move them to another day. Subtasks: tap a to-do → ↳ (they start with the parent’s priority and can be dragged too).',
    'Handwritten to-dos with priority highlights (tap a to-do → !). Tall page shape that fits phones.',
    'Drawn headers: lasso your own lettering or stickers → “Use as header” to make it the month title, the year, or a weekday name on the calendar, month cover and week page.',
    'PC looks like an open journal everywhere: the month gets a cover page on the left, and the reference box and cards read as two pages.',
    'Calendar style moved into page settings, and you can switch off calendar parts (month name, dates, boxes, dots…) to draw them in yourself.',
    'Pointer tool on PC with hover previews on trackers.',
    'Reference box: a Reference tab with your reference notes as index cards behind colored dividers — Organize to reorder, file, rename and recolor.',
    'Text box tool (T, next to the pen), Weekly goals tracker, and tracker backgrounds (including transparent).',
    'Repeating to-dos: tap a to-do, then the repeat button — every day, weekdays, chosen weekdays, or monthly. A small ↻ marks them.',
    'Tags show as pills, and “Edit looks” in the left menu sets each tag’s background, border and text color.',
    'Writing assist (pen settings): a guideline while you write, and lines that drift uphill/downhill get leveled a moment after you stop.',
    'Zoomed-in writing dock on phone: one-tap eraser, → to slide right, ↵ for the next line.',
    'Import sticker packs: PNGs, whole sticker sheets (cut apart automatically) or a .zip.',
    'Eraser ring shows the eraser size while hovering. Month tab can have its own color.',
    'New Month tab: calendar with to-do dots, stickers and drawing, tap a date to open its week, and calendar styles/colors.',
    'New sticker packs (Microsoft Fluent Emoji): celestial, cozy, nature, animals, food, notes, fun, seasons and adventure.',
    'Page sorter in the tool tray: jump to, reorder and delete pages on a tab. Add extra pages to any drawing tab.',
    'Menus close when you tap outside them or drag the handle down.',
    'Water tracker: tap the total to switch units. Tracker taps are more forgiving.',
    'Decorate covers and spines with stickers, move the name label, pick a label color. Opening animation for notebooks.',
    'Palm landing while zoomed in no longer throws the page around.',
    'Charms hang like bookmark cords, sway with your phone (each one a little differently), new wooden D20 charm.',
    'Back gesture returns to the shelf. Pinned tabs show a pin. Edit notebook fits phone screens.',
  ]],
  ['Earlier', [
    'Reference pages (contacts, saved links, lists, freeform), trackers, tap-to-grab with the lasso and full handles on every item.',
    'Bookshelf with notebooks, covers, charms and shelf colors.',
    'Pen types with pressure, stabilize, shape snapping, favorites, eraser filters, palm rejection, pinch zoom.',
    'Weekly planner, notes, tabs, index, search, tags, stickers, washi, sticky notes, shapes and sync.',
  ]],
];

export default function Help({ onClose }) {
  return (
    <>
      <div className="sheet-bg" onClick={onClose} />
      <section className="sheet helpsheet" aria-label="Help and what's new">
        <div className="grab" />
        <div className="ptitle hand">How it works</div>
        {HELP.map(([h, list]) => (
          <details key={h} className="helpsec">
            <summary>{h}</summary>
            <ul>{list.map((t, i) => <li key={i}>{t}</li>)}</ul>
          </details>
        ))}
        <div className="ptitle hand" style={{ marginTop: 18 }}>What’s new</div>
        {CHANGES.map(([d, list]) => (
          <div key={d} className="helpsec log">
            <b>{d}</b>
            <ul>{list.map((t, i) => <li key={i}>{t}</li>)}</ul>
          </div>
        ))}
        <p className="hint" style={{ marginTop: 14 }}>Sticker art: Fluent Emoji by Microsoft (MIT license).</p>
        <button className="btn primary" style={{ width: '100%', marginTop: 12 }} onClick={onClose}>Done</button>
      </section>
    </>
  );
}

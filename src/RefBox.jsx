import { useState } from 'react';
import { stOf } from './StickerLibrary';
import Icon from './Icon';
import { Art } from './CoverDecor';
import { FLUENT, stickerUrl } from './stickerPacks';
import { ColorPicker } from './Tools';

// The reference box: your reference notes as index cards, filed behind colored dividers.
export const DIVIDER_COLORS = ['#e8a9b6', '#a7c4f2', '#98a487', '#f3d98a', '#c4b2d6', '#cf826d', '#7fb3b0', '#d4b48b'];
const PAPERS = [['lined', 'Lined'], ['grid', 'Grid'], ['dots', 'Dots'], ['plain', 'Plain'], ['gingham', 'Gingham']];
const PAPER_COLORS = ['#fffdf7', '#fde8ec', '#e8f0fa', '#e6f1e0', '#fdf5d8', '#efe6f6', '#e8d6bd'];
const TAPES = [['solid', 'Solid'], ['stripes', 'Stripes'], ['dots', 'Dots'], ['checks', 'Checks'], ['none', 'None']];
// Card face: paper pattern + color, tape pattern + color, one optional sticker.
function cardBg(c = {}) {
  const col = c.color || '#fffdf7', line = 'rgba(110,129,156,.28)';
  const pat = {
    lined: `repeating-linear-gradient(${col} 0 21px, ${line} 21px 22px)`,
    grid: `repeating-linear-gradient(0deg, transparent 0 15px, ${line} 15px 16px), repeating-linear-gradient(90deg, transparent 0 15px, ${line} 15px 16px)`,
    dots: `radial-gradient(${line} 1.3px, transparent 1.6px) 0 0/14px 14px`,
    gingham: `repeating-linear-gradient(0deg, rgba(232,169,182,.25) 0 8px, transparent 8px 16px), repeating-linear-gradient(90deg, rgba(232,169,182,.25) 0 8px, transparent 8px 16px)`,
    plain: 'none',
  }[c.paper || 'lined'];
  return { background: pat, backgroundColor: col };
}
function tapeBg(c = {}, g) {
  const t = c.tapeColor || g, k = c.tape || 'solid';
  if (k === 'stripes') return `repeating-linear-gradient(45deg, ${t} 0 5px, rgba(255,255,255,.55) 5px 9px)`;
  if (k === 'dots') return `radial-gradient(rgba(255,255,255,.75) 1.6px, transparent 2px) 0 0/8px 8px, ${t}`;
  if (k === 'checks') return `repeating-conic-gradient(${t} 0 25%, rgba(255,255,255,.55) 0 50%) 0 0/10px 10px`;
  return t;
}

// Small preview tile: images load lazily and always fill the tile.
function Thumb({ st }) {
  if (st.src === 'pack') return <img src={stickerUrl(st.key)} className="thumb" alt="" loading="lazy" decoding="async" />;
  if (st.src === 'image') return <img src={st.url} className="thumb" alt="" loading="lazy" decoding="async" />;
  return <Art st={st} />;
}

function CardSheet({ p, groups, stickers, onUpdate, onDelete, onMove, onClose, canMove }) {
  const card = p.content?.card || {};
  const [tab, setTab] = useState('paper');
  // Your own sticker categories first (in the order they were made), then the built-in packs.
  const myCats = [...new Set([...stickers].sort((a, b) => (a.position || 0) - (b.position || 0)).map((s) => s.category || 'My stickers'))];
  const [pack, setPack] = useState(myCats.length ? 'mine:' + myCats[0] : FLUENT[0].name);
  const setCard = (patch) => onUpdate(p.id, { content: { ...(p.content || {}), card: { ...card, ...patch } } });
  const names = groups.map((g) => g.name);
  const g = groups.find((x) => x.name === p.ref_group)?.color || '#d9cfc1';
  return (
    <>
      <div className="sheet-bg" onClick={onClose} />
      <section className="sheet cardsheet" aria-label="Card settings">
        <div className="grab" />
        <label className="field">Name<input defaultValue={p.name} onBlur={(e) => e.target.value.trim() && e.target.value !== p.name && onUpdate(p.id, { name: e.target.value.trim() })} /></label>
        <label className="field">Written on the card<textarea rows={3} defaultValue={card.blurb || ''} placeholder="a little note about what's inside…"
          onBlur={(e) => e.target.value !== (card.blurb || '') && setCard({ blurb: e.target.value.trim() })} /></label>
        <div className="prow" style={{ marginTop: 10, gap: 8 }}>
          <label className="field" style={{ margin: 0, flex: 1 }}>Divider
            <select value={p.ref_group && names.includes(p.ref_group) ? p.ref_group : ''} onChange={(e) => onUpdate(p.id, { ref_group: e.target.value || null })}>
              <option value="">Loose cards</option>
              {names.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <button className="mini" disabled={!canMove[0]} onClick={() => onMove(-1)}>◀ Earlier</button>
          <button className="mini" disabled={!canMove[1]} onClick={() => onMove(1)}>Later ▶</button>
        </div>
        <div className="seg" style={{ marginTop: 14 }}>
          {[['paper', 'Paper'], ['tape', 'Tape'], ['sticker', 'Sticker']].map(([id, l]) => <button key={id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>{l}</button>)}
        </div>
        {tab === 'paper' && <>
          <div className="chipsrow">{PAPERS.map(([id, l]) => <button key={id} className={'catchip' + ((card.paper || 'lined') === id ? ' on' : '')} onClick={() => setCard({ paper: id })}>{l}</button>)}</div>
          <div className="swatches">{PAPER_COLORS.map((c) => <button key={c} className={'sw' + ((card.color || '#fffdf7') === c ? ' on' : '')} style={{ background: c }} aria-label={'Paper ' + c} onClick={() => setCard({ color: c })} />)}</div>
        </>}
        {tab === 'tape' && <>
          <div className="chipsrow">{TAPES.map(([id, l]) => <button key={id} className={'catchip' + ((card.tape || 'solid') === id ? ' on' : '')} onClick={() => setCard({ tape: id })}>{l}</button>)}</div>
          <div className="swatches">
            <button className={'sw auto' + (!card.tapeColor ? ' on' : '')} style={{ background: g }} onClick={() => setCard({ tapeColor: null })}>Auto</button>
            {DIVIDER_COLORS.map((c) => <button key={c} className={'sw' + (card.tapeColor === c ? ' on' : '')} style={{ background: c }} aria-label={'Tape ' + c} onClick={() => setCard({ tapeColor: c })} />)}
          </div>
        </>}
        {tab === 'sticker' && <>
          <div className="chipsrow">
            {card.sticker && <button className="catchip" onClick={() => setCard({ sticker: null })}>✕ Remove</button>}
            {myCats.map((c) => <button key={'m-' + c} className={'catchip' + (pack === 'mine:' + c ? ' on' : '')} onClick={() => setPack('mine:' + c)}>{c}</button>)}
            {FLUENT.map((f) => <button key={f.name} className={'catchip' + (pack === f.name ? ' on' : '')} onClick={() => setPack(f.name)}>{f.name}</button>)}
          </div>
          <div className="stgrid cardstickers">
            {pack.startsWith('mine:')
              ? stickers.filter((s) => (s.category || 'My stickers') === pack.slice(5)).map((s) => { const st = stOf(s); return <button key={s.id} className="sttile" onClick={() => setCard({ sticker: st })}><Thumb st={st} /></button>; })
              : (FLUENT.find((f) => f.name === pack)?.items || []).map((k) => <button key={k} className="sttile" onClick={() => setCard({ sticker: { src: 'pack', key: k } })}><Thumb st={{ src: 'pack', key: k }} /></button>)}
          </div>
        </>}
        <div className="prow" style={{ marginTop: 16 }}>
          <button className="mini danger" onClick={() => { if (confirm(`Delete the "${p.name}" card?`)) { onDelete(p.id); onClose(); } }}><Icon n="trash" s={14} /> Delete card</button>
          <button className="btn primary" onClick={onClose}>Done</button>
        </div>
      </section>
    </>
  );
}
const KIND = { contacts: ['☎', 'contacts'], links: ['🔗︎', 'links'], list: ['☑', 'items'], freeform: ['✎', ''] };

function detail(p) {
  const k = KIND[p.ref_type || 'freeform'] || KIND.freeform;
  const n = p.content?.rows?.length;
  return n != null && k[1] ? `${n} ${n === 1 ? k[1].replace(/s$/, '') : k[1]}` : p.ref_type === 'list' ? 'list' : 'notes';
}

export default function RefBox({ pages, groups = [], onGroups, onOpen, onNew, onUpdate, onDelete, stickers = [], presets, onPresets }) {
  const [org, setOrg] = useState(false);
  const [colorFor, setColorFor] = useState(null);
  const [cardFor, setCardFor] = useState(null);
  const [editPresets, setEditPresets] = useState(false);
  const pal = presets && presets.length ? presets : DIVIDER_COLORS;
  const names = groups.map((g) => g.name);
  const sections = [...groups.map((g) => ({ ...g, cards: pages.filter((p) => p.ref_group === g.name) })),
    { name: null, color: '#d9cfc1', cards: pages.filter((p) => !p.ref_group || !names.includes(p.ref_group)) }];
  const byPos = (a, b) => (a.position || 0) - (b.position || 0);

  const moveCard = (list, i, d) => {
    const a = list[i], b = list[i + d]; if (!b) return;
    onUpdate(a.id, { position: b.position }); onUpdate(b.id, { position: a.position === b.position ? b.position + 1 : a.position });
  };
  const moveGroup = (i, d) => { const n = [...groups], j = i + d; if (j < 0 || j >= n.length) return; [n[i], n[j]] = [n[j], n[i]]; onGroups(n); };
  const addGroup = () => {
    const name = (prompt('Name the new divider (like "People", "Recipes", "Work")') || '').trim();
    if (!name || names.includes(name)) return;
    onGroups([...groups, { name, color: pal[groups.length % pal.length] }]);
  };
  const renameGroup = (g) => {
    const name = (prompt('Rename this divider', g.name) || '').trim();
    if (!name || name === g.name || names.includes(name)) return;
    pages.filter((p) => p.ref_group === g.name).forEach((p) => onUpdate(p.id, { ref_group: name }));
    onGroups(groups.map((x) => (x.name === g.name ? { ...x, name } : x)));
  };
  const removeGroup = (g) => {
    if (!confirm(`Remove the "${g.name}" divider? Its cards stay, they just become loose cards.`)) return;
    pages.filter((p) => p.ref_group === g.name).forEach((p) => onUpdate(p.id, { ref_group: null }));
    onGroups(groups.filter((x) => x.name !== g.name));
  };

  return (
    <div className="refbox">
      <div className="rbhead">
        <h2 className="hand">Reference box</h2>
        <div className="prow" style={{ gap: 6 }}>
          <button className={'mini' + (org ? ' on' : '')} onClick={() => { setOrg((v) => !v); setColorFor(null); }}>{org ? 'Done' : 'Dividers'}</button>
          <button className="btn primary" onClick={() => onNew(null)}>+ New card</button>
        </div>
      </div>
      {!pages.length && !groups.length && <p className="hint">Keep contacts, saved links, lists and notes here as index cards. Add dividers under Organize to file them.</p>}
      {sections.map((sec, gi) => {
        const cards = [...sec.cards].sort(byPos);
        if (!sec.name && !cards.length && (groups.length || !org)) return null;
        const g = groups[gi];
        return (
          <section key={sec.name || '_loose'} className="rbsec">
            <div className="rbdivider" style={{ '--g': sec.color }}>
              <span className="rbtab hand">{sec.name || 'Loose cards'}</span>
              {org && g && (
                <span className="rbtools">
                  <button className="ib" aria-label="Move divider up" disabled={gi === 0} onClick={() => moveGroup(gi, -1)}>▲</button>
                  <button className="ib" aria-label="Move divider down" disabled={gi === groups.length - 1} onClick={() => moveGroup(gi, 1)}>▼</button>
                  <button className="rbswatch" style={{ background: g.color }} aria-label="Divider color" onClick={() => setColorFor(colorFor === g.name ? null : g.name)} />
                  <button className="mini" onClick={() => renameGroup(g)}>Rename</button>
                  <button className="ib" aria-label={'Remove divider ' + g.name} onClick={() => removeGroup(g)}><Icon n="trash" s={15} /></button>
                </span>
              )}
              {!org && sec.name && <button className="rbadd" aria-label={'New card in ' + sec.name} onClick={() => onNew(sec.name)}>+</button>}
            </div>
            {org && g && colorFor === g.name && (
              <div className="rbcolor">
                <div className="swatches">
                  {pal.map((c, ci) => (
                    <span key={c + ci} className="swwrap">
                      <button className={'sw' + (g.color === c ? ' on' : '')} style={{ background: c }} aria-label={'Color ' + c}
                        onClick={() => onGroups(groups.map((x) => (x.name === g.name ? { ...x, color: c } : x)))} />
                      {editPresets && <button className="swx" aria-label="Remove preset" onClick={() => onPresets(pal.filter((_, j) => j !== ci))}>×</button>}
                    </span>
                  ))}
                </div>
                <ColorPicker value={g.color} onChange={(c) => onGroups(groups.map((x) => (x.name === g.name ? { ...x, color: c } : x)))} />
                <div className="prow" style={{ gap: 6 }}>
                  <button className="mini" onClick={() => !pal.includes(g.color) && onPresets([...pal, g.color])}>+ Save as preset</button>
                  <button className={'mini' + (editPresets ? ' on' : '')} onClick={() => setEditPresets((v) => !v)}>{editPresets ? 'Done editing' : 'Edit presets'}</button>
                  <button className="btn primary" onClick={() => { setColorFor(null); setEditPresets(false); }}>Done</button>
                </div>
              </div>
            )}
            <div className="rbcards">
              {cards.map((p, i) => {
                const k = KIND[p.ref_type || 'freeform'] || KIND.freeform;
                const card = p.content?.card || {};
                return (
                  <div key={p.id} className="rbcard" style={{ '--g': sec.color }}>
                    <button className="rbface" style={cardBg(card)} onClick={() => onOpen(p.id)} aria-label={'Open ' + p.name}>
                      {card.tape !== 'none' && <span className="rbtape" style={{ background: tapeBg(card, sec.color) }} />}
                      <span className={'rbname hand' + (p.name.length > 18 ? ' long' : '')}><span className="rbnt">{p.name}</span></span>
                      {card.blurb && <span className="rbblurb hand">{card.blurb}</span>}
                      {card.sticker && <span className="rbsticker"><Art st={card.sticker} /></span>}
                    </button>
                    <button className="rbmore" aria-label={'Card settings for ' + p.name} onClick={() => setCardFor({ id: p.id, list: cards.map((c) => c.id) })}>⋯</button>
                  </div>
                );
              })}
              {!org && sec.name && !cards.length && <p className="hint" style={{ margin: '4px 2px' }}>No cards yet.</p>}
            </div>
          </section>
        );
      })}
      {org && <button className="mini" style={{ marginTop: 10 }} onClick={addGroup}>+ New divider</button>}
      {cardFor && (() => {
        const p = pages.find((x) => x.id === cardFor.id); if (!p) return null;
        const inG = (x) => (names.includes(x.ref_group) ? x.ref_group : null);
        const list = pages.filter((x) => inG(x) === inG(p)).sort(byPos);
        const i = list.findIndex((x) => x.id === p.id);
        return <CardSheet p={p} groups={groups} stickers={stickers} onUpdate={onUpdate} onDelete={onDelete} onClose={() => setCardFor(null)}
          canMove={[i > 0, i < list.length - 1]} onMove={(d) => moveCard(list, i, d)} />;
      })()}
    </div>
  );
}

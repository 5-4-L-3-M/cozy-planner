import { useEffect, useState } from 'react';
import Icon from './Icon';

export const REF_TYPES = [
  ['freeform', 'Freeform', 'Draw and write anywhere'],
  ['contacts', 'Contacts', 'Names, numbers, emails'],
  ['links', 'Saved links', 'Websites you want to keep'],
  ['list', 'List', 'Checklists and quick notes'],
];

const uid = () => crypto.randomUUID();
const clean = (u) => (/^https?:\/\//i.test(u) ? u : 'https://' + u);
const host = (u) => { try { return new URL(clean(u)).hostname.replace(/^www\./, ''); } catch { return u; } };

// Typed reference pages. Edits save when you leave a field.
export default function RefPage({ page, onSave }) {
  const [rows, setRows] = useState(page.content?.rows || []);
  useEffect(() => { setRows(page.content?.rows || []); }, [page.id, JSON.stringify(page.content?.rows || [])]);
  const commit = (next) => { setRows(next); onSave({ ...(page.content || {}), rows: next }); };
  const patch = (id, p) => setRows((r) => r.map((x) => (x.id === id ? { ...x, ...p } : x)));
  const blur = () => onSave({ ...(page.content || {}), rows });
  const del = (id) => commit(rows.filter((x) => x.id !== id));
  const type = page.ref_type;

  return (
    <div className="refpage">
      <h2 className="hand">{page.name}</h2>

      {type === 'contacts' && (
        <>
          {rows.map((c) => (
            <div key={c.id} className="refcard">
              <input className="rname hand" value={c.name || ''} placeholder="Name" onChange={(e) => patch(c.id, { name: e.target.value })} onBlur={blur} />
              <div className="rfields">
                <input value={c.phone || ''} placeholder="Phone" inputMode="tel" onChange={(e) => patch(c.id, { phone: e.target.value })} onBlur={blur} />
                <input value={c.email || ''} placeholder="Email" inputMode="email" onChange={(e) => patch(c.id, { email: e.target.value })} onBlur={blur} />
                <input value={c.note || ''} placeholder="Note (birthday, address…)" onChange={(e) => patch(c.id, { note: e.target.value })} onBlur={blur} />
              </div>
              <div className="ractions">
                {c.phone && <a href={`tel:${c.phone}`} className="mini">Call</a>}
                {c.phone && <a href={`sms:${c.phone}`} className="mini">Text</a>}
                {c.email && <a href={`mailto:${c.email}`} className="mini">Email</a>}
                <button className="ib" aria-label="Delete contact" onClick={() => confirm('Delete this contact?') && del(c.id)}><Icon n="trash" s={16} /></button>
              </div>
            </div>
          ))}
          <button className="refadd" onClick={() => commit([...rows, { id: uid(), name: '' }])}>+ Add contact</button>
        </>
      )}

      {type === 'links' && (
        <>
          {rows.map((l) => (
            <div key={l.id} className="refcard link">
              <div className="rfields">
                <input className="rname hand" value={l.title || ''} placeholder={l.url ? host(l.url) : 'Title'} onChange={(e) => patch(l.id, { title: e.target.value })} onBlur={blur} />
                <input value={l.url || ''} placeholder="Paste a link" inputMode="url" onChange={(e) => patch(l.id, { url: e.target.value })} onBlur={blur} />
                <input value={l.note || ''} placeholder="Note" onChange={(e) => patch(l.id, { note: e.target.value })} onBlur={blur} />
              </div>
              <div className="ractions">
                {l.url && <a href={clean(l.url)} target="_blank" rel="noreferrer" className="mini">Open ↗</a>}
                <button className="ib" aria-label="Delete link" onClick={() => del(l.id)}><Icon n="trash" s={16} /></button>
              </div>
            </div>
          ))}
          <button className="refadd" onClick={() => commit([...rows, { id: uid(), url: '' }])}>+ Add link</button>
        </>
      )}

      {type === 'list' && (
        <>
          {rows.map((r) => (
            <div key={r.id} className={'reflist' + (r.done ? ' done' : '')}>
              <input type="checkbox" checked={!!r.done} onChange={() => commit(rows.map((x) => (x.id === r.id ? { ...x, done: !x.done } : x)))} aria-label="Done" />
              <input className="rtext" value={r.text || ''} placeholder="Something to remember" onChange={(e) => patch(r.id, { text: e.target.value })} onBlur={blur}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commit([...rows, { id: uid(), text: '' }]); } }} />
              <button className="ib" aria-label="Delete item" onClick={() => del(r.id)}><Icon n="x" s={14} /></button>
            </div>
          ))}
          <button className="refadd" onClick={() => commit([...rows, { id: uid(), text: '' }])}>+ Add item</button>
        </>
      )}
    </div>
  );
}

export function NewRefSheet({ onCreate, onClose }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('contacts');
  return (
    <>
      <div className="sheet-bg" />
      <section className="sheet" aria-label="New reference page">
        <div className="ptitle hand">New reference page</div>
        <label className="field">Name<input value={name} autoFocus placeholder={REF_TYPES.find((t) => t[0] === type)[1]} onChange={(e) => setName(e.target.value)} /></label>
        <div className="reftypes">
          {REF_TYPES.map(([id, l, d]) => (
            <button key={id} className={'reftype' + (type === id ? ' on' : '')} onClick={() => setType(id)}><b>{l}</b><small>{d}</small></button>
          ))}
        </div>
        <div className="prow" style={{ marginTop: 14 }}>
          <button className="mini" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={() => { onCreate((name.trim() || REF_TYPES.find((t) => t[0] === type)[1]), type); onClose(); }}>Create</button>
        </div>
      </section>
    </>
  );
}

"use client";
import { useState } from "react";
import { DB_STATUSES, bid, type Block, type Db, type DbStatus } from "@/lib/notion/blocks";

const I = (d: string, extra?: React.ReactNode) => <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={d} />{extra}</svg>;
const ICONS: [string, string, React.ReactNode?][] = [["Filter", "M2.5 4.5h11M4.5 8h7M6.5 11.5h3"], ["Sort", "M5 13V3M2.5 5.5L5 3l2.500 2.500M11 3v10M8.500 10.500L11 13l2.500-2.500"], ["Automations", "M9 1.500L4 9h3.500L7 14.500 12 7H8.500z"], ["Properties", "M3 3l1 1M8 1.500V3M13 3l-1 1M1.500 8H3M3 13l1.500-1.500M8 14.500V13", <path key="p" d="M7 7l6 6M10 6.500l-.5 1 1-.5" />], ["Search", "M7 12a5 5 0 100-10 5 5 0 000 10zM11 11l3 3"], ["Expand", "M9.500 2.500h4v4M13.500 2.500L9 7M6.500 13.500h-4v-4M2.500 13.500L7 9"]];
const Page = () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#787774" strokeWidth="1.1" strokeLinejoin="round" aria-hidden><path d="M4 1.800h5l3 3V14H4z M9 1.800v3h3" /></svg>;
const CHIP: Record<DbStatus, { dot: string; chip: string; text: string; col: string; cnt: string }> = {
  "Not started": { dot: "#91918e", chip: "#e3e2e0", text: "#32302c", col: "#f7f7f5", cnt: "#787774" },
  "In progress": { dot: "#2383e2", chip: "#cde5f9", text: "#183347", col: "#f4f9fd", cnt: "#2383e2" },
  "Done": { dot: "#4d9e6c", chip: "#cfe8d9", text: "#1c3829", col: "#f6f9f7", cnt: "#2f9e5e" },
};

export function DatabaseBlock({ block, onChange, onDelete }: { block: Block; onChange: (patch: Partial<Block>) => void; onDelete: () => void }) {
  const db: Db = block.db ?? { title: "", rows: [] }; const board = block.type === "board";
  const [menu, setMenu] = useState(false);
  const setDb = (n: Db) => onChange({ db: n });
  const addRow = (status: DbStatus = "Not started") => setDb({ ...db, rows: [...db.rows, { id: bid(), name: "", status }] });
  const rename = (id: string, name: string) => setDb({ ...db, rows: db.rows.map(r => r.id === id ? { ...r, name } : r) });
  const move = (id: string) => setDb({ ...db, rows: db.rows.map(r => r.id === id ? { ...r, status: DB_STATUSES[(DB_STATUSES.indexOf(r.status) + 1) % DB_STATUSES.length] } : r) });
  const remove = (id: string) => setDb({ ...db, rows: db.rows.filter(r => r.id !== id) });
  return <div className={"ntn-db" + (board ? " is-board" : "")} data-testid="database" data-view={board ? "board" : "table"}>
    <div className="ntn-db__head">
      <input className="ntn-db__title" aria-label="Database title" placeholder="New database" value={db.title} onChange={e => setDb({ ...db, title: e.target.value })} />
      <div className="ntn-db__tools">{ICONS.map(([l, d, x]) => <button key={l} type="button" className="ntn-db__ic" aria-label={l} title={l}>{I(d, x)}</button>)}
        <span className="ntn-popwrap"><button type="button" className={"ntn-db__ic" + (menu ? " on" : "")} aria-label="View settings" aria-haspopup="menu" aria-expanded={menu} title="Settings" onClick={() => setMenu(m => !m)}>{I("M2 5h8M12 5h2M2 11h2M6 11h8", <><circle cx="11" cy="5" r="1.300" /><circle cx="5" cy="11" r="1.300" /></>)}</button>
          {menu && <div className="ntn-menu ntn-db__menu" role="menu" onMouseLeave={() => setMenu(false)}><b>Layout</b>
            <button role="menuitemradio" aria-checked={!board} onClick={() => { onChange({ type: "table" }); setMenu(false); }}>{!board ? "✓ " : ""}Table</button>
            <button role="menuitemradio" aria-checked={board} onClick={() => { onChange({ type: "board" }); setMenu(false); }}>{board ? "✓ " : ""}Board</button>
            <div className="ntn-menu__sep" /><button role="menuitem" className="is-danger" onClick={onDelete}>Delete database</button></div>}</span>
        <span className="ntn-db__new"><button type="button" onClick={() => addRow()}>New</button><button type="button" aria-label="New options" onClick={() => addRow()}><svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M2.500 4.500L6 8l3.500-3.500" /></svg></button></span>
      </div>
    </div>
    {board ? <div className="ntn-db__board">{DB_STATUSES.map(st => { const c = CHIP[st], rows = db.rows.filter(r => r.status === st);
      return <section key={st} className="ntn-bcol" style={{ background: c.col }} aria-label={st}>
        <header><span className="chip" style={{ background: c.chip, color: c.text }}><i style={{ background: c.dot }} />{st}</span><span className="cnt" style={{ color: c.cnt }}>{rows.length}</span></header>
        {rows.map(r => <div key={r.id} className="ntn-bcard"><input aria-label="Page title" placeholder="Untitled" value={r.name} onChange={e => rename(r.id, e.target.value)} />
          <span className="acts"><button type="button" aria-label={`Move ${r.name || "page"} to next column`} title="Move to next column" onClick={() => move(r.id)}>→</button><button type="button" aria-label={`Delete ${r.name || "page"}`} title="Delete" onClick={() => remove(r.id)}>✕</button></span></div>)}
        <button type="button" className="ntn-bnew" style={{ color: c.cnt }} onClick={() => addRow(st)}><span>＋</span> New page</button></section>; })}</div>
      : <div className="ntn-db__table" role="table" aria-label={db.title || "Database"}>
        <div className="hdr" role="row"><span className="c1"><b>Aa</b> Name</span><span className="c2"><span>＋</span> Add property</span></div>
        {db.rows.map(r => <div key={r.id} className="row" role="row"><span className="c1"><Page /><input aria-label="Page title" placeholder="Untitled" value={r.name} onChange={e => rename(r.id, e.target.value)} /></span><span className="c2" /><button type="button" className="del" aria-label={`Delete ${r.name || "row"}`} title="Delete" onClick={() => remove(r.id)}>✕</button></div>)}
        <button type="button" className="add" onClick={() => addRow()}><span>＋</span> New page</button></div>}
  </div>;
}

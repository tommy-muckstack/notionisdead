// Inline databases: properties (typed columns), rows (cells + optional page content), views (layout + filter + sort + group).
// The first property is always the title. Legacy shape `{ title, rows: [{ id, name, status }] }` is migrated on read.
export type PropType = "title" | "text" | "number" | "select" | "multi" | "status" | "date" | "checkbox" | "url" | "email" | "phone";
export type Option = { id: string; name: string; color: string };
export type Prop = { id: string; name: string; type: PropType; options?: Option[] };
export type Cell = string | number | boolean | string[] | null | undefined;
export type Row = { id: string; cells: Record<string, Cell>; content?: import("./blocks").Block[] };
export type Layout = "table" | "board" | "list" | "calendar" | "gallery" | "timeline" | "chart";
export type FilterOp = "contains" | "not_contains" | "is" | "is_not" | "empty" | "not_empty" | "gt" | "lt" | "gte" | "lte" | "before" | "after" | "checked" | "unchecked";
export type Filter = { id: string; prop: string; op: FilterOp; value?: string };
export type Sort = { id: string; prop: string; dir: "asc" | "desc" };
export type View = { id: string; name: string; layout: Layout; groupBy?: string; dateBy?: string; filters: Filter[]; sorts: Sort[]; hidden?: string[] };
export type Db = { title: string; props: Prop[]; rows: Row[]; views: View[]; /** id of the view shown last */ active?: string };
export const LAYOUTS: { id: Layout; label: string; icon: string }[] = [{ id: "table", label: "Table", icon: "▦" }, { id: "board", label: "Board", icon: "▥" }, { id: "list", label: "List", icon: "☰" }, { id: "calendar", label: "Calendar", icon: "▦" }, { id: "gallery", label: "Gallery", icon: "▣" }, { id: "timeline", label: "Timeline", icon: "⟷" }, { id: "chart", label: "Chart", icon: "▮" }];
export const PROP_TYPES: { id: PropType; label: string; icon: string }[] = [{ id: "text", label: "Text", icon: "≡" }, { id: "number", label: "Number", icon: "#" }, { id: "select", label: "Select", icon: "◎" }, { id: "multi", label: "Multi-select", icon: "☷" }, { id: "status", label: "Status", icon: "◐" }, { id: "date", label: "Date", icon: "📅" }, { id: "checkbox", label: "Checkbox", icon: "☑" }, { id: "url", label: "URL", icon: "🔗" }, { id: "email", label: "Email", icon: "@" }, { id: "phone", label: "Phone", icon: "☎" }];
export const OPTION_COLORS = ["gray", "brown", "orange", "yellow", "green", "blue", "purple", "pink", "red"];
let n = 0; export const did = (p = "d") => `${p}_${Date.now().toString(36)}${(n++).toString(36)}${Math.random().toString(36).slice(2, 5)}`;
export const STATUS_OPTIONS = (): Option[] => [{ id: "st_todo", name: "Not started", color: "gray" }, { id: "st_doing", name: "In progress", color: "blue" }, { id: "st_done", name: "Done", color: "green" }];
export const newView = (layout: Layout, name?: string): View => ({ id: did("v"), name: name ?? LAYOUTS.find(l => l.id === layout)!.label, layout, filters: [], sorts: [] });
/** New database: Name (title) + Status, three empty rows, a table view. */
export const newDb = (layout: Layout = "table"): Db => { const dated = layout === "calendar" || layout === "timeline"; const dateId = dated ? "date" : null; const today = iso(new Date()); return { title: "", props: [{ id: "name", name: "Name", type: "title" }, { id: "status", name: "Status", type: "status", options: STATUS_OPTIONS() }, ...(dateId ? [{ id: dateId, name: "Date", type: "date" as const }] : [])], rows: [0, 1, 2].map(k => ({ id: did("r"), cells: { status: "Not started", ...(dateId ? { [dateId]: new Date(Date.now() + k * 864e5).toISOString().slice(0, 10) } : {}) } })), views: [{ ...newView(layout), ...(dateId ? { dateBy: dateId } : {}) }] }; void today; };
export const isLegacy = (d: unknown): d is { title: string; rows: { id: string; name: string; status: string }[] } => !!d && typeof d === "object" && !("props" in (d as object)) && Array.isArray((d as { rows?: unknown }).rows);
export function migrateDb(raw: unknown, board = false): Db {
  if (isLegacy(raw)) return { title: raw.title ?? "", props: newDb().props, rows: raw.rows.map(r => ({ id: r.id, cells: { name: r.name, status: r.status || "Not started" } })), views: [newView(board ? "board" : "table")] };
  const d = (raw ?? newDb()) as Db; const views = d.views?.length ? d.views : [newView(board ? "board" : "table")];
  return { title: d.title ?? "", props: d.props?.length ? d.props : newDb().props, rows: d.rows ?? [], views, ...(d.active ? { active: d.active } : {}) };
}
/** True when the schema is exactly the default Name + Status one (then Markdown export stays the legacy `| Name | Status |` table). */
export const isDefaultSchema = (d: Db) => d.props.length === 2 && d.props[0].id === "name" && d.props[0].type === "title" && d.props[1].id === "status" && d.props[1].type === "status" && d.views.length === 1 && !d.views[0].filters.length && !d.views[0].sorts.length && (d.views[0].layout === "table" || d.views[0].layout === "board") && d.rows.every(r => !r.content?.length && Object.keys(r.cells).every(k => k === "name" || k === "status"));
export const titleProp = (d: Db) => d.props.find(p => p.type === "title") ?? d.props[0];
export const rowTitle = (d: Db, r: Row) => String(r.cells[titleProp(d).id] ?? "");
export const optionsOf = (p: Prop) => p.options ?? [];
export const firstProp = (d: Db, types: PropType[]) => d.props.find(p => types.includes(p.type));
export const addOption = (p: Prop, name: string): Prop => optionsOf(p).some(o => o.name === name) ? p : { ...p, options: [...optionsOf(p), { id: did("o"), name, color: OPTION_COLORS[optionsOf(p).length % OPTION_COLORS.length] }] };
export const addProp = (d: Db, type: PropType, name?: string): { db: Db; prop: Prop } => { const base = name ?? PROP_TYPES.find(t => t.id === type)!.label; let nm = base; let k = 2; while (d.props.some(p => p.name === nm)) nm = `${base} ${k++}`; const prop: Prop = { id: did("p"), name: nm, type, ...(type === "status" ? { options: STATUS_OPTIONS() } : type === "select" || type === "multi" ? { options: [] } : {}) }; return { db: { ...d, props: [...d.props, prop] }, prop }; };
export const updateProp = (d: Db, id: string, patch: Partial<Prop>): Db => ({ ...d, props: d.props.map(p => p.id === id ? { ...p, ...patch, ...(patch.type && patch.type !== p.type ? { options: patch.type === "status" ? STATUS_OPTIONS() : patch.type === "select" || patch.type === "multi" ? p.options ?? [] : undefined } : {}) } : p) });
export const removeProp = (d: Db, id: string): Db => ({ ...d, props: d.props.filter(p => p.id !== id), rows: d.rows.map(r => { const c = { ...r.cells }; delete c[id]; return { ...r, cells: c }; }), views: d.views.map(v => ({ ...v, groupBy: v.groupBy === id ? undefined : v.groupBy, dateBy: v.dateBy === id ? undefined : v.dateBy, filters: v.filters.filter(f => f.prop !== id), sorts: v.sorts.filter(s => s.prop !== id), hidden: v.hidden?.filter(h => h !== id) })) });
export const addRow = (d: Db, cells: Record<string, Cell> = {}): { db: Db; row: Row } => { const st = d.props.find(p => p.type === "status"); const row: Row = { id: did("r"), cells: { ...(st ? { [st.id]: optionsOf(st)[0]?.name ?? "" } : {}), ...cells } }; return { db: { ...d, rows: [...d.rows, row] }, row }; };
export const setCell = (d: Db, rowId: string, propId: string, v: Cell): Db => { const p = d.props.find(x => x.id === propId); let db = d; if (p && (p.type === "select" || p.type === "status") && typeof v === "string" && v && !optionsOf(p).some(o => o.name === v)) db = updateProp(db, p.id, addOption(p, v)); if (p && p.type === "multi" && Array.isArray(v)) for (const name of v) if (!optionsOf(db.props.find(x => x.id === propId)!).some(o => o.name === name)) db = updateProp(db, p.id, addOption(db.props.find(x => x.id === propId)!, name)); return { ...db, rows: db.rows.map(r => r.id === rowId ? { ...r, cells: { ...r.cells, [propId]: v } } : r) }; };
export const updateView = (d: Db, id: string, patch: Partial<View>): Db => ({ ...d, views: d.views.map(v => v.id === id ? { ...v, ...patch } : v) });
export const addView = (d: Db, layout: Layout): { db: Db; view: View } => { const view = newView(layout); return { db: { ...d, views: [...d.views, view] }, view }; };
export const removeView = (d: Db, id: string): Db => (d.views.length > 1 ? { ...d, views: d.views.filter(v => v.id !== id) } : d);

// ---- cells ----
export const dateOf = (c: Cell): string | null => (typeof c === "string" && /^\d{4}-\d{2}-\d{2}/.test(c) ? c.slice(0, 10) : null);
export const dateEnd = (c: Cell): string | null => (typeof c === "string" && /^\d{4}-\d{2}-\d{2}\/\d{4}-\d{2}-\d{2}$/.test(c) ? c.slice(11, 21) : null);
export const cellText = (p: Prop, c: Cell): string => c === null || c === undefined ? "" : Array.isArray(c) ? c.join(", ") : p.type === "checkbox" ? (c ? "✓" : "") : p.type === "date" ? [dateOf(c), dateEnd(c)].filter(Boolean).map(d => new Date(d! + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })).join(" → ") : String(c);
export const isEmpty = (c: Cell) => c === null || c === undefined || c === "" || (Array.isArray(c) && !c.length);
export const OPS: Record<PropType, { id: FilterOp; label: string; needsValue: boolean }[]> = (() => {
  const text = [{ id: "contains" as const, label: "Contains", needsValue: true }, { id: "not_contains" as const, label: "Does not contain", needsValue: true }, { id: "is" as const, label: "Is", needsValue: true }, { id: "is_not" as const, label: "Is not", needsValue: true }, { id: "empty" as const, label: "Is empty", needsValue: false }, { id: "not_empty" as const, label: "Is not empty", needsValue: false }];
  const sel = [{ id: "is" as const, label: "Is", needsValue: true }, { id: "is_not" as const, label: "Is not", needsValue: true }, { id: "empty" as const, label: "Is empty", needsValue: false }, { id: "not_empty" as const, label: "Is not empty", needsValue: false }];
  const num = [{ id: "is" as const, label: "=", needsValue: true }, { id: "is_not" as const, label: "≠", needsValue: true }, { id: "gt" as const, label: ">", needsValue: true }, { id: "lt" as const, label: "<", needsValue: true }, { id: "gte" as const, label: "≥", needsValue: true }, { id: "lte" as const, label: "≤", needsValue: true }, { id: "empty" as const, label: "Is empty", needsValue: false }, { id: "not_empty" as const, label: "Is not empty", needsValue: false }];
  const date = [{ id: "is" as const, label: "Is", needsValue: true }, { id: "before" as const, label: "Is before", needsValue: true }, { id: "after" as const, label: "Is after", needsValue: true }, { id: "empty" as const, label: "Is empty", needsValue: false }, { id: "not_empty" as const, label: "Is not empty", needsValue: false }];
  const check = [{ id: "checked" as const, label: "Is checked", needsValue: false }, { id: "unchecked" as const, label: "Is unchecked", needsValue: false }];
  const multi = [{ id: "contains" as const, label: "Contains", needsValue: true }, { id: "not_contains" as const, label: "Does not contain", needsValue: true }, { id: "empty" as const, label: "Is empty", needsValue: false }, { id: "not_empty" as const, label: "Is not empty", needsValue: false }];
  return { title: text, text, url: text, email: text, phone: text, number: num, select: sel, status: sel, multi, date, checkbox: check };
})();
export function matches(p: Prop, c: Cell, f: Filter): boolean {
  const v = (f.value ?? "").trim().toLowerCase(); const s = Array.isArray(c) ? c.map(x => x.toLowerCase()) : String(c ?? "").toLowerCase();
  switch (f.op) {
    case "empty": return isEmpty(c); case "not_empty": return !isEmpty(c);
    case "checked": return !!c; case "unchecked": return !c;
    case "contains": return Array.isArray(s) ? s.includes(v) : s.includes(v); case "not_contains": return Array.isArray(s) ? !s.includes(v) : !s.includes(v);
    case "is": return p.type === "number" ? Number(c) === Number(f.value) : p.type === "date" ? dateOf(c) === f.value : (Array.isArray(s) ? s.join(", ") : s) === v;
    case "is_not": return p.type === "number" ? Number(c) !== Number(f.value) : (Array.isArray(s) ? s.join(", ") : s) !== v;
    case "gt": return Number(c) > Number(f.value); case "lt": return Number(c) < Number(f.value); case "gte": return Number(c) >= Number(f.value); case "lte": return Number(c) <= Number(f.value);
    case "before": return !!dateOf(c) && dateOf(c)! < (f.value ?? ""); case "after": return !!dateOf(c) && dateOf(c)! > (f.value ?? "");
  }
}
export function cmp(p: Prop, a: Cell, b: Cell): number {
  if (isEmpty(a) && isEmpty(b)) return 0; if (isEmpty(a)) return 1; if (isEmpty(b)) return -1;
  if (p.type === "number") return Number(a) - Number(b); if (p.type === "checkbox") return Number(!!b) - Number(!!a);
  if (p.type === "select" || p.type === "status") { const o = optionsOf(p).map(x => x.name); return o.indexOf(String(a)) - o.indexOf(String(b)); }
  return String(Array.isArray(a) ? a.join(",") : a).localeCompare(String(Array.isArray(b) ? b.join(",") : b), undefined, { numeric: true, sensitivity: "base" });
}
/** Rows a view shows: filters (AND) then sorts (in order). */
export function viewRows(d: Db, v: View): Row[] {
  const props = Object.fromEntries(d.props.map(p => [p.id, p]));
  let rows = d.rows.filter(r => v.filters.every(f => { const p = props[f.prop]; if (!p) return true; const op = OPS[p.type].find(o => o.id === f.op); if (op?.needsValue && !(f.value ?? "").trim()) return true; return matches(p, r.cells[f.prop], f); }));
  if (v.sorts.length) rows = [...rows].sort((a, b) => { for (const s of v.sorts) { const p = props[s.prop]; if (!p) continue; const c = cmp(p, a.cells[s.prop], b.cells[s.prop]); if (c) return s.dir === "asc" ? c : -c; } return 0; });
  return rows;
}
export const groupProp = (d: Db, v: View) => (v.groupBy && d.props.find(p => p.id === v.groupBy && ["select", "status", "multi", "checkbox"].includes(p.type))) || firstProp(d, ["status", "select", "multi", "checkbox"]);
export const dateProp = (d: Db, v: View) => (v.dateBy && d.props.find(p => p.id === v.dateBy && p.type === "date")) || firstProp(d, ["date"]);
/** Groups for board/chart: one per option (plus "No <prop>"), or Checked/Unchecked. */
export function groups(d: Db, v: View, rows: Row[]): { key: string; label: string; color: string; rows: Row[] }[] {
  const p = groupProp(d, v); if (!p) return [{ key: "", label: "All", color: "gray", rows }];
  if (p.type === "checkbox") return [{ key: "1", label: "Checked", color: "green", rows: rows.filter(r => !!r.cells[p.id]) }, { key: "0", label: "Unchecked", color: "gray", rows: rows.filter(r => !r.cells[p.id]) }];
  const opts = optionsOf(p); const has = (r: Row, name: string) => Array.isArray(r.cells[p.id]) ? (r.cells[p.id] as string[]).includes(name) : r.cells[p.id] === name;
  const out = opts.map(o => ({ key: o.name, label: o.name, color: o.color, rows: rows.filter(r => has(r, o.name)) })); const none = rows.filter(r => isEmpty(r.cells[p.id]) || (!Array.isArray(r.cells[p.id]) && !opts.some(o => o.name === r.cells[p.id])));
  return [{ key: "", label: `No ${p.name}`, color: "gray", rows: none }, ...out];
}
export const csvOf = (d: Db) => { const q = (s: string) => /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; return [d.props.map(p => q(p.name)).join(","), ...d.rows.map(r => d.props.map(p => q(cellText(p, r.cells[p.id]))).join(","))].join("\n") + "\n"; };
/** Build a database from CSV rows (first row = header). "Status"-like columns become status, numeric columns number, yes/no columns checkbox, ISO dates date. */
export function dbFromCsv(name: string, rows: string[][]): Db {
  const head = rows[0] ?? []; const body = rows.slice(1); const props: Prop[] = head.map((h, i) => { const vals = body.map(r => (r[i] ?? "").trim()).filter(Boolean); const type: PropType = i === 0 ? "title" : /^status$/i.test(h) ? "status" : vals.length && vals.every(v => /^-?\d+(\.\d+)?$/.test(v)) ? "number" : vals.length && vals.every(v => /^(yes|no|true|false)$/i.test(v)) ? "checkbox" : vals.length && vals.every(v => /^\d{4}-\d{2}-\d{2}/.test(v)) ? "date" : vals.length && vals.length <= 40 && new Set(vals).size <= Math.max(3, vals.length / 3) ? "select" : "text"; const p: Prop = { id: i === 0 ? "name" : did("p"), name: h || `Column ${i + 1}`, type }; if (type === "status") p.options = STATUS_OPTIONS(); if (type === "select") p.options = [...new Set(vals)].map((v, k) => ({ id: did("o"), name: v, color: OPTION_COLORS[k % OPTION_COLORS.length] })); return p; });
  const rs: Row[] = body.map(r => ({ id: did("r"), cells: Object.fromEntries(props.map((p, i) => { const v = (r[i] ?? "").trim(); return [p.id, p.type === "number" ? (v === "" ? null : Number(v)) : p.type === "checkbox" ? /^(yes|true)$/i.test(v) : p.type === "status" ? (STATUS_OPTIONS().some(o => o.name === v) ? v : "Not started") : v]; })) }));
  return { title: name, props, rows: rs, views: [newView("table")] };
}
export const parseCsv = (text: string): string[][] => text.replace(/\r\n/g, "\n").split("\n").filter(l => l.trim()).map(l => { const out: string[] = []; let cur = ""; let q = false; for (let i = 0; i < l.length; i++) { const ch = l[i]; if (q) { if (ch === '"' && l[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') q = false; else cur += ch; } else if (ch === '"') q = true; else if (ch === ",") { out.push(cur); cur = ""; } else cur += ch; } out.push(cur); return out; });
export const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

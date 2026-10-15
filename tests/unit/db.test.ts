import { describe, it, expect } from "vitest";
import { addProp, addRow, csvOf, dbFromCsv, groups, migrateDb, newDb, parseCsv, setCell, viewRows, updateView, isDefaultSchema, removeProp } from "@/lib/notion/db";
describe("database model", () => {
  it("migrates the legacy shape and keeps new ones", () => { const d = migrateDb({ title: "T", rows: [{ id: "a", name: "x", status: "Done" }] }, true); expect(d.props.map(p => p.id)).toEqual(["name", "status"]); expect(d.rows[0].cells).toEqual({ name: "x", status: "Done" }); expect(d.views[0].layout).toBe("board"); expect(migrateDb(d)).toEqual(d); expect(isDefaultSchema(newDb())).toBe(true); });
  it("adds typed properties with unique names and seeds options; select creates options on write", () => {
    let d = newDb(); const a = addProp(d, "select"); d = a.db; const b = addProp(d, "select"); d = b.db; expect([a.prop.name, b.prop.name]).toEqual(["Select", "Select 2"]);
    d = setCell(d, d.rows[0].id, a.prop.id, "Urgent"); expect(d.props.find(p => p.id === a.prop.id)!.options!.map(o => o.name)).toEqual(["Urgent"]);
    d = removeProp(d, a.prop.id); expect(d.props.some(p => p.id === a.prop.id)).toBe(false); expect(d.rows[0].cells[a.prop.id]).toBeUndefined();
  });
  it("filters (AND) and sorts (multi-key) per type", () => {
    let d = newDb(); const n = addProp(d, "number", "N"); d = n.db; const ids = d.rows.map(r => r.id);
    d = setCell(d, ids[0], "name", "b"); d = setCell(d, ids[1], "name", "a"); d = setCell(d, ids[2], "name", "c"); d = setCell(d, ids[0], n.prop.id, 2); d = setCell(d, ids[1], n.prop.id, 10); d = setCell(d, ids[2], n.prop.id, 2); d = setCell(d, ids[2], "status", "Done");
    const v = d.views[0];
    expect(viewRows(d, { ...v, filters: [{ id: "f", prop: n.prop.id, op: "gte", value: "2" }, { id: "g", prop: "status", op: "is_not", value: "Done" }] }).map(r => r.cells.name)).toEqual(["b", "a"]);
    expect(viewRows(d, { ...v, sorts: [{ id: "s", prop: n.prop.id, dir: "asc" }, { id: "t", prop: "name", dir: "desc" }] }).map(r => r.cells.name)).toEqual(["c", "b", "a"]);
    expect(viewRows(d, { ...v, filters: [{ id: "f", prop: "name", op: "contains", value: "" }] })).toHaveLength(3);
    expect(viewRows(d, { ...v, sorts: [{ id: "s", prop: "status", dir: "desc" }] })[0].cells.name).toBe("c");
  });
  it("groups by status including the empty bucket; checkbox groups", () => {
    let d = newDb(); d = setCell(d, d.rows[0].id, "status", "Done"); d = { ...d, rows: d.rows.map((r, i) => i === 1 ? { ...r, cells: {} } : r) };
    const g = groups(d, d.views[0], d.rows); expect(g.map(x => [x.label, x.rows.length])).toEqual([["No Status", 1], ["Not started", 1], ["In progress", 0], ["Done", 1]]);
    const c = addProp(d, "checkbox", "Ok"); d = updateView(c.db, d.views[0].id, { groupBy: c.prop.id }); expect(groups(d, d.views[0], d.rows).map(x => x.label)).toEqual(["Checked", "Unchecked"]);
  });
  it("CSV in and out", () => {
    const rows = parseCsv('Name,Status,Points,Due,Done?\n"Write, it",Done,3,2026-10-20,yes\nShip,In progress,5,2026-10-22,no\n'); const d = dbFromCsv("tasks", rows);
    expect(d.props.map(p => p.type)).toEqual(["title", "status", "number", "date", "checkbox"]); expect(d.rows[0].cells).toMatchObject({ name: "Write, it", [d.props[1].id]: "Done" }); expect(d.rows[1].cells[d.props[2].id]).toBe(5); expect(d.rows[0].cells[d.props[4].id]).toBe(true);
    expect(csvOf(d).split("\n")[1]).toBe('"Write, it",Done,3,"Oct 20, 2026",✓');
    const r = addRow(d, { name: "z" }); expect(r.row.cells[d.props[1].id]).toBe("Not started");
  });
});

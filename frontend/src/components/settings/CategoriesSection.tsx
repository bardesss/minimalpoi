import { useState } from "react";
import { useCategories, useCreateCategory, useDeleteCategory, useUpdateCategory } from "../../queries/hooks";
import { useToast } from "../Toast";
import { CategoryIcon } from "../../lib/categoryIcon";
import type { Category } from "../../types/api";
import { dangerButtonStyle, ghostButtonStyle, inputStyle, primaryButtonStyle, theme } from "../../theme";

const ICONS = [
  "utensils", "coffee", "beer", "wine", "bed", "tree-pine", "mountain", "camera",
  "landmark", "store", "shopping-cart", "fuel", "parking-circle", "bike",
  "train-front", "plane", "ship", "music", "film", "dumbbell", "heart", "star",
  "flag", "map-pin",
];

interface Draft { id: number | null; name: string; color: string; icon: string | null; }
const EMPTY: Draft = { id: null, name: "", color: theme.color.primary, icon: null };
const label = { fontSize: 12, fontWeight: 700, color: theme.color.textBody, marginBottom: 6, display: "block" } as const;

export default function CategoriesSection() {
  const categories = useCategories().data ?? [];
  const createCat = useCreateCategory();
  const updateCat = useUpdateCategory();
  const deleteCat = useDeleteCategory();
  const { notify } = useToast();
  const [draft, setDraft] = useState<Draft | null>(null);

  function startAdd() { setDraft({ ...EMPTY }); }
  function startEdit(c: Category) { setDraft({ id: c.id, name: c.name, color: c.color, icon: c.icon }); }

  async function save() {
    if (!draft || draft.name.trim() === "") return;
    const body = { name: draft.name.trim(), color: draft.color, icon: draft.icon };
    try {
      if (draft.id == null) await createCat.mutateAsync(body);
      else await updateCat.mutateAsync({ id: draft.id, body });
      setDraft(null);
      notify("Category saved");
    } catch (e) {
      notify(e instanceof Error ? e.message : "Save failed", "error");
    }
  }

  function remove(c: Category) {
    if (!confirm(`Delete "${c.name}"? Places keep existing but become uncategorized.`)) return;
    deleteCat.mutate(c.id, {
      onSuccess: () => notify("Category deleted"),
      onError: (e) => notify(e instanceof Error ? e.message : "Delete failed", "error"),
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {categories.map((c) => (
          <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", border: `1px solid ${theme.color.borderCard}`, borderRadius: theme.radius.input }}>
            <span style={{ width: 24, height: 24, borderRadius: 6, background: c.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <CategoryIcon name={c.icon} size={14} color="#fff" />
            </span>
            <span style={{ flex: 1, fontSize: 13.5, fontWeight: 700 }}>{c.name}</span>
            <button type="button" onClick={() => startEdit(c)} style={{ ...ghostButtonStyle, padding: "6px 12px" }}>Edit</button>
            <button type="button" aria-label={`Delete ${c.name}`} onClick={() => remove(c)} style={{ ...dangerButtonStyle, padding: "6px 12px" }}>Delete</button>
          </div>
        ))}
      </div>

      {draft ? (
        <div style={{ border: `1px solid ${theme.color.borderCard}`, borderRadius: theme.radius.card, padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={label} htmlFor="cat-name">Category name</label>
            <input id="cat-name" style={inputStyle} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </div>
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <label style={{ ...label, marginBottom: 0 }} htmlFor="cat-color">Color</label>
            <input id="cat-color" type="color" value={draft.color} onChange={(e) => setDraft({ ...draft, color: e.target.value })} style={{ width: 44, height: 32, border: "none", background: "none", cursor: "pointer" }} />
          </div>
          <div>
            <span style={label}>Icon</span>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 6 }}>
              {ICONS.map((name) => (
                <button key={name} type="button" aria-label={name} onClick={() => setDraft({ ...draft, icon: name })} style={{ height: 34, borderRadius: theme.radius.icon, cursor: "pointer", border: `1px solid ${draft.icon === name ? theme.color.primary : theme.color.borderStd}`, background: draft.icon === name ? theme.color.tintBg : "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <CategoryIcon name={name} size={16} color={theme.color.textBody} />
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button type="button" onClick={() => setDraft(null)} style={ghostButtonStyle}>Cancel</button>
            <button type="button" onClick={save} style={primaryButtonStyle}>Save</button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={startAdd} style={{ ...ghostButtonStyle, alignSelf: "flex-start" }}>+ Add category</button>
      )}
    </div>
  );
}

import { useState } from "react";
import { useDeleteTag, useRenameTag, useTags } from "../../queries/hooks";
import { dangerButtonStyle, ghostButtonStyle, inputStyle, primaryButtonStyle, theme } from "../../theme";

export default function TagsSection() {
  const tags = useTags().data ?? [];
  const renameTag = useRenameTag();
  const deleteTag = useDeleteTag();
  const [editing, setEditing] = useState<string | null>(null);
  const [value, setValue] = useState("");

  function startRename(tag: string) { setEditing(tag); setValue(tag); }
  async function save() {
    if (editing == null || value.trim() === "") return;
    await renameTag.mutateAsync({ oldTag: editing, newTag: value.trim() });
    setEditing(null);
  }

  if (tags.length === 0) return <p style={{ fontSize: 13, color: theme.color.textSecondary }}>No tags yet. Tags you add to places show up here.</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {tags.map((t) => (
        <div key={t.tag} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", border: `1px solid ${theme.color.borderCard}`, borderRadius: theme.radius.input }}>
          {editing === t.tag ? (
            <>
              <input aria-label={`New name for ${t.tag}`} style={{ ...inputStyle, flex: 1 }} value={value} onChange={(e) => setValue(e.target.value)} />
              <button type="button" onClick={save} style={{ ...primaryButtonStyle, padding: "6px 14px" }}>Save</button>
              <button type="button" onClick={() => setEditing(null)} style={{ ...ghostButtonStyle, padding: "6px 12px" }}>Cancel</button>
            </>
          ) : (
            <>
              <span style={{ flex: 1, fontSize: 13.5, fontWeight: 700 }}>{t.tag}</span>
              <span style={{ fontSize: 12, color: theme.color.textSecondary, fontFamily: theme.font.mono }}>{t.count}</span>
              <button type="button" aria-label={`Rename ${t.tag}`} onClick={() => startRename(t.tag)} style={{ ...ghostButtonStyle, padding: "6px 12px" }}>Rename</button>
              <button type="button" aria-label={`Delete ${t.tag}`} onClick={() => { if (confirm(`Delete the "${t.tag}" tag from all places?`)) deleteTag.mutate(t.tag); }} style={{ ...dangerButtonStyle, padding: "6px 12px" }}>Delete</button>
            </>
          )}
        </div>
      ))}
      <p style={{ fontSize: 11.5, color: theme.color.textPlaceholder, margin: "4px 0 0" }}>Renaming a tag into an existing one merges them.</p>
    </div>
  );
}

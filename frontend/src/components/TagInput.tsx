import { useMemo, useState, type CSSProperties, type KeyboardEvent } from "react";
import { theme } from "../theme";
import { splitTags } from "./PoiFormModal";

export interface TagSuggestion {
  tag: string;
  count: number;
}

const SEP = /[,;|]/;
const MAX_SUGGESTIONS = 8;

const boxStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: 6,
  width: "100%",
  minHeight: 40,
  padding: "6px 8px",
  border: `1px solid ${theme.color.borderStd}`,
  borderRadius: theme.radius.input,
  background: theme.color.pageBg,
  boxSizing: "border-box",
  cursor: "text",
};

const chipStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  padding: "2px 4px 2px 8px",
  borderRadius: theme.radius.tag,
  background: theme.color.tintBg,
  border: `1px solid ${theme.color.tintBorder}`,
  color: theme.color.deepIndigoText,
  fontSize: 12.5,
  fontWeight: 600,
  fontFamily: theme.font.ui,
};

const removeBtnStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 18,
  height: 18,
  border: "none",
  borderRadius: theme.radius.icon,
  background: "transparent",
  color: theme.color.deepIndigoText,
  cursor: "pointer",
  fontSize: 14,
  lineHeight: 1,
};

const innerInputStyle: CSSProperties = {
  flex: 1,
  minWidth: 80,
  border: "none",
  outline: "none",
  background: "transparent",
  fontFamily: theme.font.ui,
  fontSize: "13.5px",
  color: theme.color.textPrimary,
  padding: "4px 2px",
};

const dropdownStyle: CSSProperties = {
  position: "absolute",
  top: "100%",
  left: 0,
  right: 0,
  marginTop: 4,
  background: theme.color.surface0,
  border: `1px solid ${theme.color.borderCard}`,
  borderRadius: theme.radius.input,
  boxShadow: theme.shadow.expand,
  zIndex: 30,
  maxHeight: 220,
  overflowY: "auto",
  padding: 4,
  listStyle: "none",
  margin: 0,
};

/**
 * A chip-based tag editor with autocomplete over existing tags. `value` is the
 * source of truth for the committed tags; the inline field holds the
 * in-progress token. Reusing an existing tag (matched case-insensitively)
 * avoids near-duplicate tags drifting apart.
 */
export default function TagInput({
  value,
  onChange,
  suggestions = [],
  inputId,
  placeholder = "Add a tag…",
}: {
  value: string[];
  onChange: (tags: string[]) => void;
  suggestions?: TagSuggestion[];
  inputId?: string;
  placeholder?: string;
}) {
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);

  const has = (tag: string) => value.some((v) => v.toLowerCase() === tag.toLowerCase());

  // Add one or more tokens in a single onChange, skipping blanks and
  // case-insensitive duplicates. No-op (and no onChange) when nothing new.
  const addTags = (tokens: string[]) => {
    const next = [...value];
    for (const raw of tokens) {
      const t = raw.trim();
      if (t && !next.some((v) => v.toLowerCase() === t.toLowerCase())) next.push(t);
    }
    if (next.length !== value.length) onChange(next);
  };

  const removeAt = (i: number) => onChange(value.filter((_, idx) => idx !== i));

  const filtered = useMemo(() => {
    const q = text.trim().toLowerCase();
    return suggestions
      .filter((s) => !has(s.tag) && (q === "" || s.tag.toLowerCase().includes(q)))
      .slice(0, MAX_SUGGESTIONS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggestions, text, value]);

  const commitPending = () => {
    if (text.trim()) addTags([text]);
    setText("");
    setHighlight(-1);
  };

  const onInputChange = (raw: string) => {
    if (SEP.test(raw)) {
      const parts = raw.split(SEP);
      addTags(splitTags(parts.slice(0, -1).join(",")));
      setText(parts[parts.length - 1]);
    } else {
      setText(raw);
    }
    setHighlight(-1);
    setOpen(true);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (open && highlight >= 0 && filtered[highlight]) {
        addTags([filtered[highlight].tag]);
        setText("");
        setHighlight(-1);
      } else {
        commitPending();
      }
    } else if (e.key === "ArrowDown") {
      if (filtered.length) {
        e.preventDefault();
        setOpen(true);
        setHighlight((h) => Math.min(h + 1, filtered.length - 1));
      }
    } else if (e.key === "ArrowUp") {
      if (filtered.length) {
        e.preventDefault();
        setHighlight((h) => Math.max(h - 1, -1));
      }
    } else if (e.key === "Backspace" && text === "" && value.length) {
      e.preventDefault();
      removeAt(value.length - 1);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const listId = inputId ? `${inputId}-listbox` : "taginput-listbox";
  const activeId = highlight >= 0 && filtered[highlight] ? `${listId}-opt-${highlight}` : undefined;

  return (
    <div style={{ position: "relative" }}>
      <div style={boxStyle} onClick={() => document.getElementById(inputId ?? "")?.focus()}>
        {value.map((tag, i) => (
          <span key={`${tag}-${i}`} style={chipStyle}>
            {tag}
            <button
              type="button"
              aria-label={`Remove ${tag}`}
              style={removeBtnStyle}
              onClick={() => removeAt(i)}
            >
              ×
            </button>
          </span>
        ))}
        <input
          id={inputId}
          style={innerInputStyle}
          value={text}
          placeholder={value.length === 0 ? placeholder : "Add a tag…"}
          role="combobox"
          aria-expanded={open && filtered.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={activeId}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            commitPending();
            setOpen(false);
          }}
        />
      </div>
      {open && filtered.length > 0 && (
        <ul id={listId} role="listbox" style={dropdownStyle}>
          {filtered.map((s, i) => (
            <li
              key={s.tag}
              id={`${listId}-opt-${i}`}
              role="option"
              aria-selected={i === highlight}
              // onMouseDown (not onClick) + preventDefault keeps focus on the
              // input, so the field's blur-commit doesn't also add the
              // half-typed token before the suggestion is picked.
              onMouseDown={(e) => {
                e.preventDefault();
                addTags([s.tag]);
                setText("");
                setHighlight(-1);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                padding: "9px 10px",
                borderRadius: theme.radius.icon,
                cursor: "pointer",
                fontSize: 13,
                fontFamily: theme.font.ui,
                color: theme.color.textBody,
                background: i === highlight ? theme.color.tintBg : "transparent",
              }}
            >
              <span>{s.tag}</span>
              <span style={{ color: theme.color.textPlaceholder, fontSize: 12 }}>{s.count}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

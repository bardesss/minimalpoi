import { useRef, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import {
  useAddComment, useComments, useDeleteComment, useDeleteVisit,
  useUpdateComment, useUpsertVisit, useVisits,
} from "../queries/hooks";
import { useToast } from "./Toast";
import { dangerButtonStyle, ghostButtonStyle, inputStyle, primaryButtonStyle, theme } from "../theme";

const sectionLabel = { fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".04em", color: theme.color.textPlaceholder, margin: "0 0 8px" } as const;

/** Read-only star rating shown next to a reviewer's name. */
function RatingStars({ value }: { value: number }) {
  return (
    <span aria-label={`Rated ${value}`} style={{ color: theme.color.starActive, fontSize: 13, letterSpacing: 1 }}>
      {"★".repeat(value)}
      <span style={{ color: theme.color.starInactive }}>{"★".repeat(5 - value)}</span>
    </span>
  );
}

/** Interactive star rating used to set or change your own review. */
function RatePicker({ value, onRate, size = 26 }: { value: number; onRate: (n: number) => void; size?: number }) {
  return (
    <span aria-label="Rating" style={{ display: "inline-flex", gap: 0 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          aria-label={`Rate ${n}`}
          onClick={() => onRate(n)}
          style={{ border: "none", background: "none", cursor: "pointer", fontSize: size, lineHeight: 1, padding: 0, minWidth: 44, minHeight: 44, display: "inline-flex", alignItems: "center", justifyContent: "center", color: value >= n ? theme.color.starActive : theme.color.starInactive }}
        >
          {value >= n ? "★" : "☆"}
        </button>
      ))}
    </span>
  );
}

/**
 * A person's review = one rating + one comment, kept as a single unit. You set
 * yours with a star (required) and an optional note; one Edit changes both and
 * one Delete removes both. Everyone else's review is read-only (admins may
 * delete it).
 */
export default function PoiActions({ poiId }: { poiId: number }) {
  const { user } = useAuth();
  const meId = user?.id;
  const isAdmin = user?.role === "admin";

  const visits = useVisits(poiId).data ?? [];
  const myVisit = visits.find((v) => v.user_id === meId);
  const comments = useComments(poiId).data ?? [];
  const myComments = comments.filter((c) => c.user_id === meId);
  const myComment = myComments[0];
  // One review per person, from the union of ratings and comments, so a
  // rating without a comment is still listed.
  const otherReviews = (() => {
    const byUser = new Map<number, { userId: number; username: string; rating: number | null; comments: typeof comments }>();
    const entry = (userId: number) => {
      let e = byUser.get(userId);
      if (!e) {
        e = { userId, username: "", rating: null, comments: [] };
        byUser.set(userId, e);
      }
      return e;
    };
    for (const v of visits) {
      if (v.user_id === meId) continue;
      const e = entry(v.user_id);
      e.rating = v.rating;
      if (v.username) e.username = v.username;
    }
    for (const c of comments) {
      if (c.user_id === meId) continue;
      const e = entry(c.user_id);
      e.comments.push(c);
      e.username = c.username;
    }
    return [...byUser.values()].filter((e) => e.rating != null || e.comments.length > 0)
      .map((e) => ({ ...e, username: e.username || "Someone" }));
  })();

  const upsertVisit = useUpsertVisit(poiId);
  const deleteVisit = useDeleteVisit(poiId);
  const addComment = useAddComment(poiId);
  const updateComment = useUpdateComment(poiId);
  const deleteComment = useDeleteComment(poiId);

  const [editing, setEditing] = useState(false);
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  // Which delete is awaiting inline confirmation: "me" or another user's id.
  const [confirming, setConfirming] = useState<"me" | number | null>(null);
  const { notify } = useToast();

  // This component is reused as you click between places (only `poiId` changes),
  // so reset the draft when the place changes — otherwise the rating/comment you
  // started on one POI would appear pre-filled on the next, unreviewed one.
  const [shownPoiId, setShownPoiId] = useState(poiId);
  if (poiId !== shownPoiId) {
    setShownPoiId(poiId);
    setEditing(false);
    setRating(0);
    setText("");
    setConfirming(null);
  }

  // Show the editor while you have no review, or while editing an existing one.
  const showEditor = !myVisit || editing;

  function openEdit() {
    setRating(myVisit?.rating ?? 0);
    setText(myComment?.text ?? "");
    setEditing(true);
  }

  // Runs one guarded mutation sequence: ignores re-entry (double clicks),
  // disables the controls while pending, and toasts on failure. Returns success.
  async function guarded(action: () => Promise<unknown>, failure: string): Promise<boolean> {
    if (busyRef.current) return false;
    busyRef.current = true;
    setBusy(true);
    try {
      await action();
      return true;
    } catch {
      notify(failure, "error");
      return false;
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function saveReview() {
    if (rating < 1) return;
    const t = text.trim();
    const ok = await guarded(async () => {
      await upsertVisit.mutateAsync({ rating });
      if (myComment) {
        if (t === "") await Promise.all(myComments.map((c) => deleteComment.mutateAsync(c.id)));
        else if (t !== myComment.text) await updateComment.mutateAsync({ commentId: myComment.id, text: t });
      } else if (t !== "") {
        await addComment.mutateAsync({ text: t });
      }
    }, "Could not save your review");
    if (ok) setEditing(false);
  }

  async function deleteMyReview() {
    const ok = await guarded(
      () => Promise.all([deleteVisit.mutateAsync(), ...myComments.map((c) => deleteComment.mutateAsync(c.id))]),
      "Could not delete your review",
    );
    if (ok) setConfirming(null);
  }

  async function deleteOtherReview(userComments: { id: number }[]) {
    const ok = await guarded(
      () => Promise.all(userComments.map((c) => deleteComment.mutateAsync(c.id))),
      "Could not delete the review",
    );
    if (ok) setConfirming(null);
  }

  function confirmBar(onConfirm: () => void, label: string) {
    return (
      <span role="group" aria-label="Confirm delete" data-dialog-escape="ignore" onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); setConfirming(null); } }} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: theme.color.dangerText }}>{label}</span>
        <button type="button" autoFocus onClick={() => setConfirming(null)} disabled={busy} style={{ ...ghostButtonStyle, padding: "1px 8px", fontSize: 11 }}>Cancel</button>
        <button type="button" onClick={onConfirm} disabled={busy} style={{ ...dangerButtonStyle, padding: "1px 8px", fontSize: 11 }}>Delete</button>
      </span>
    );
  }

  return (
    <div style={{ marginTop: 18 }}>
      <p style={sectionLabel}>Reviews</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Your review */}
        {showEditor ? (
          <div style={{ borderRadius: theme.radius.card, border: `1px solid ${theme.color.borderSubtle}`, background: theme.color.pageBg, padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>
            <p style={{ ...sectionLabel, margin: 0 }}>Your review</p>
            <RatePicker value={rating} onRate={setRating} />
            <textarea
              style={{ ...inputStyle, background: theme.color.surface0, resize: "vertical", minHeight: 56, lineHeight: 1.5 }}
              placeholder="Share a comment (optional)"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button
                type="button"
                onClick={saveReview}
                disabled={rating < 1 || busy}
                aria-label="Save review"
                style={{ ...primaryButtonStyle, flex: 1, opacity: rating < 1 || busy ? 0.45 : 1, cursor: rating < 1 || busy ? "not-allowed" : "pointer" }}
              >
                {rating < 1 ? "Tap a star to rate" : "Save review"}
              </button>
              {editing && (
                <button type="button" disabled={busy} onClick={() => setEditing(false)} style={{ border: "none", background: "none", padding: "0 6px", cursor: "pointer", fontSize: 12, fontWeight: 700, color: theme.color.textPlaceholder }}>
                  Cancel
                </button>
              )}
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 13, lineHeight: 1.45 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontWeight: 700 }}>{user?.username}</span>
              {myVisit?.rating != null && <RatingStars value={myVisit.rating} />}
              {confirming === "me" ? confirmBar(deleteMyReview, "Delete your review?") : (<>
              <button type="button" aria-label="Edit review" onClick={openEdit} style={{ border: "none", background: "none", padding: 0, cursor: "pointer", fontSize: 11, fontWeight: 700, color: theme.color.primary }}>
                Edit
              </button>
              <button type="button" aria-label="Delete review" onClick={() => setConfirming("me")} style={{ ...dangerButtonStyle, padding: "1px 8px", fontSize: 11 }}>
                Delete
              </button></>)}
            </div>
            {myComment?.text && <div style={{ color: theme.color.textBody, whiteSpace: "pre-wrap" }}>{myComment.text}</div>}
          </div>
        )}

        {/* Everyone else's reviews — read-only (admins may delete). */}
        {otherReviews.map((r) => (
          <div key={r.userId} style={{ fontSize: 13, lineHeight: 1.45 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontWeight: 700 }}>{r.username}</span>
              {r.rating != null && <RatingStars value={r.rating} />}
              {r.comments[0] && <span style={{ color: theme.color.textPlaceholder }}>· {new Date(r.comments[0].created_at).toLocaleDateString()}</span>}
              {isAdmin && r.comments.length > 0 && (confirming === r.userId ? confirmBar(() => deleteOtherReview(r.comments), `Delete ${r.username}'s review?`) : (
                <button type="button" aria-label={`Delete ${r.username}'s review`} onClick={() => setConfirming(r.userId)} style={{ ...dangerButtonStyle, padding: "1px 8px", fontSize: 11 }}>
                  Delete
                </button>
              ))}
            </div>
            {r.comments.map((c) => <div key={c.id} style={{ color: theme.color.textBody, whiteSpace: "pre-wrap" }}>{c.text}</div>)}
          </div>
        ))}
      </div>
    </div>
  );
}

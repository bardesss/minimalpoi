import { useVersion } from "../../queries/hooks";
import { safeLinkHref } from "../../lib/safeUrl";
import { theme } from "../../theme";

const REPO_URL = "https://github.com/Bardesss/minimalpoi";
const RELEASES_URL = "https://github.com/Bardesss/minimalpoi/releases";

export default function AboutSection() {
  const { data } = useVersion();
  const releasesHref = safeLinkHref(RELEASES_URL);
  const repoHref = safeLinkHref(REPO_URL);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ fontSize: 14 }}>
        <span style={{ fontWeight: 800 }}>MinimalPOI</span>{" "}
        <span style={{ fontFamily: theme.font.mono, color: theme.color.textSecondary }}>v{data?.current ?? "…"}</span>
      </div>
      {data?.update_available && data.latest ? (
        <div role="status" style={{ fontSize: 12.5, color: theme.color.deepIndigoText, background: theme.color.tintBg, border: `1px solid ${theme.color.tintBorder}`, borderRadius: theme.radius.input, padding: "8px 10px" }}>
          Update available: <strong>v{data.latest}</strong>
          {releasesHref && <> · <a href={releasesHref} target="_blank" rel="noreferrer" style={{ color: theme.color.link }}>View releases</a></>}
        </div>
      ) : data?.latest ? (
        <div style={{ fontSize: 12.5, color: theme.color.textSecondary }}>You're up to date.</div>
      ) : null}
      {repoHref && (
        <div style={{ fontSize: 12.5 }}>
          <a href={repoHref} target="_blank" rel="noreferrer" style={{ color: theme.color.link, fontWeight: 700 }}>View on GitHub →</a>
        </div>
      )}
    </div>
  );
}

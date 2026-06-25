def tag_counts(pois) -> list[dict]:
    counts: dict[str, int] = {}
    for p in pois:
        for t in p.tags or []:
            counts[t] = counts.get(t, 0) + 1
    return [
        {"tag": t, "count": c}
        for t, c in sorted(counts.items(), key=lambda kv: (-kv[1], kv[0]))
    ]


def rename_in(tags: list[str], old: str, new: str) -> list[str]:
    out: list[str] = []
    for t in tags:
        repl = new if t == old else t
        if repl not in out:
            out.append(repl)
    return out


def remove_from(tags: list[str], tag: str) -> list[str]:
    return [t for t in tags if t != tag]

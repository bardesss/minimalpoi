import json
from html.parser import HTMLParser

_RELEVANT_TYPES = {"Restaurant", "LocalBusiness", "Place", "Hotel", "TouristAttraction"}


class _MetaScriptParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.og: dict[str, str] = {}
        self._ld_scripts: list[str] = []
        self._in_ld = False

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "meta":
            prop = a.get("property", "")
            if prop.startswith("og:") and a.get("content"):
                self.og[prop[3:]] = a["content"]
        if tag == "script" and a.get("type") == "application/ld+json":
            self._in_ld = True

    def handle_endtag(self, tag):
        if tag == "script":
            self._in_ld = False

    def handle_data(self, data):
        if self._in_ld and data.strip():
            self._ld_scripts.append(data)


def _parse(html: str) -> _MetaScriptParser:
    p = _MetaScriptParser()
    p.feed(html)
    return p


def parse_opengraph(html: str) -> dict[str, str]:
    return _parse(html).og


def _iter_ld_objects(scripts: list[str]):
    for raw in scripts:
        try:
            obj = json.loads(raw)
        except (ValueError, TypeError):
            continue
        items = obj if isinstance(obj, list) else [obj]
        # @graph wrapper
        for item in list(items):
            if isinstance(item, dict) and isinstance(item.get("@graph"), list):
                items.extend(item["@graph"])
        for item in items:
            if isinstance(item, dict):
                yield item


def _types(item: dict) -> set[str]:
    t = item.get("@type", "")
    return set(t) if isinstance(t, list) else {t}


def _address_str(addr) -> str | None:
    if isinstance(addr, str):
        return addr
    if isinstance(addr, dict):
        parts = [addr.get("streetAddress"), addr.get("addressLocality"),
                 addr.get("postalCode"), addr.get("addressCountry")]
        joined = ", ".join(p for p in parts if isinstance(p, str) and p)
        return joined or None
    return None


def parse_jsonld(html: str) -> dict:
    scripts = _parse(html)._ld_scripts
    for item in _iter_ld_objects(scripts):
        if not (_types(item) & _RELEVANT_TYPES):
            continue
        out: dict = {}
        if isinstance(item.get("name"), str):
            out["name"] = item["name"]
        addr = _address_str(item.get("address"))
        if addr:
            out["address"] = addr
        geo = item.get("geo")
        if isinstance(geo, dict):
            try:
                out["lat"] = float(geo["latitude"])
                out["lng"] = float(geo["longitude"])
            except (KeyError, TypeError, ValueError):
                pass
        if isinstance(item.get("telephone"), str):
            out["phone"] = item["telephone"]
        if isinstance(item.get("url"), str):
            out["website"] = item["url"]
        img = item.get("image")
        if isinstance(img, str):
            out["image"] = img
        elif isinstance(img, dict) and isinstance(img.get("url"), str):
            out["image"] = img["url"]
        if isinstance(item.get("description"), str):
            out["description"] = item["description"]
        if out:
            return out
    return {}

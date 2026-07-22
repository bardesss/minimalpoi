from xml.sax.saxutils import escape

from .models import RouteNode


def route_to_geojson(name: str, nodes: list[RouteNode]) -> dict:
    """Mirror portability.pois_to_geojson: nodes as Point features, plus a
    LineString of the path in order. Coordinates are [lng, lat] per GeoJSON."""
    features = []
    for order, n in enumerate(nodes):
        features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [n.lng, n.lat]},
            "properties": {
                "name": n.name,
                "kind": n.kind.value,
                "nights": n.nights,
                "notes": n.notes,
                "order": order,
            },
        })
    if len(nodes) >= 2:
        features.append({
            "type": "Feature",
            "geometry": {"type": "LineString", "coordinates": [[n.lng, n.lat] for n in nodes]},
            "properties": {"name": name},
        })
    return {"type": "FeatureCollection", "features": features}


def route_to_gpx(name: str, nodes: list[RouteNode]) -> str:
    """GPX 1.1: each node as a <wpt>, plus a <trk> tracing the path in order."""
    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<gpx version="1.1" creator="MinimalPOI" xmlns="http://www.topografix.com/GPX/1/1">',
        f"  <metadata><name>{escape(name)}</name></metadata>",
    ]
    for n in nodes:
        lines.append(f'  <wpt lat="{n.lat}" lon="{n.lng}"><name>{escape(n.name)}</name></wpt>')
    if len(nodes) >= 2:
        lines.append(f"  <trk><name>{escape(name)}</name><trkseg>")
        lines += [f'    <trkpt lat="{n.lat}" lon="{n.lng}"></trkpt>' for n in nodes]
        lines.append("  </trkseg></trk>")
    lines.append("</gpx>")
    return "\n".join(lines)


def route_to_kml(name: str, nodes: list[RouteNode]) -> str:
    """KML 2.2: each node as a Placemark/Point, plus a LineString of the path.
    KML coordinates are lng,lat (optionally with altitude)."""
    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<kml xmlns="http://www.opengis.net/kml/2.2">',
        "  <Document>",
        f"    <name>{escape(name)}</name>",
    ]
    for n in nodes:
        lines.append(
            f"    <Placemark><name>{escape(n.name)}</name>"
            f"<Point><coordinates>{n.lng},{n.lat}</coordinates></Point></Placemark>"
        )
    if len(nodes) >= 2:
        coords = " ".join(f"{n.lng},{n.lat}" for n in nodes)
        lines.append(
            f"    <Placemark><name>{escape(name)}</name>"
            f"<LineString><coordinates>{coords}</coordinates></LineString></Placemark>"
        )
    lines += ["  </Document>", "</kml>"]
    return "\n".join(lines)

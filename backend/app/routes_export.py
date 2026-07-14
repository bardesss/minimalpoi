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

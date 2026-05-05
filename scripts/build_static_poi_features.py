#!/usr/bin/env python3
"""Build static dong-level POI / built-environment features from local GeoJSON."""

from __future__ import annotations

import csv
import json
import math
from pathlib import Path


CENTER_LAT = 37.51
LON_M = 111_320 * math.cos(math.radians(CENTER_LAT))
LAT_M = 110_540


def load_geojson(path: str) -> dict:
    return json.loads(Path(path).read_text(encoding="utf-8"))


def iter_positions(geometry: dict):
    if not geometry:
        return
    geom_type = geometry.get("type")
    coords = geometry.get("coordinates")
    if geom_type == "Point":
        yield coords
    elif geom_type in {"LineString", "MultiPoint"}:
        yield from coords
    elif geom_type in {"Polygon", "MultiLineString"}:
        for ring in coords:
            yield from ring
    elif geom_type == "MultiPolygon":
        for polygon in coords:
            for ring in polygon:
                yield from ring


def representative_point(geometry: dict) -> tuple[float, float] | None:
    points = list(iter_positions(geometry))
    if not points:
        return None
    lon = sum(point[0] for point in points) / len(points)
    lat = sum(point[1] for point in points) / len(points)
    return lon, lat


def point_in_ring(point: tuple[float, float], ring: list[list[float]]) -> bool:
    lon, lat = point
    inside = False
    previous = len(ring) - 1
    for index in range(len(ring)):
        x1, y1 = ring[index]
        x2, y2 = ring[previous]
        intersects = (y1 > lat) != (y2 > lat) and lon < ((x2 - x1) * (lat - y1)) / ((y2 - y1) or 1e-12) + x1
        if intersects:
            inside = not inside
        previous = index
    return inside


def point_in_polygon(point: tuple[float, float], geometry: dict) -> bool:
    if geometry.get("type") == "Polygon":
        rings = geometry["coordinates"]
        return point_in_ring(point, rings[0]) and not any(point_in_ring(point, hole) for hole in rings[1:])
    if geometry.get("type") == "MultiPolygon":
        return any(point_in_polygon(point, {"type": "Polygon", "coordinates": polygon}) for polygon in geometry["coordinates"])
    return False


def project(point: list[float]) -> tuple[float, float]:
    lon, lat = point
    return lon * LON_M, lat * LAT_M


def line_length_m(geometry: dict) -> float:
    total = 0.0
    lines = []
    if geometry.get("type") == "LineString":
        lines = [geometry["coordinates"]]
    elif geometry.get("type") == "MultiLineString":
        lines = geometry["coordinates"]
    for line in lines:
        for left, right in zip(line, line[1:]):
            x1, y1 = project(left)
            x2, y2 = project(right)
            total += math.hypot(x2 - x1, y2 - y1)
    return total


def ring_area_m2(ring: list[list[float]]) -> float:
    area = 0.0
    for left, right in zip(ring, ring[1:]):
        x1, y1 = project(left)
        x2, y2 = project(right)
        area += x1 * y2 - x2 * y1
    return abs(area) / 2


def polygon_area_m2(geometry: dict) -> float:
    if geometry.get("type") == "Polygon":
        return ring_area_m2(geometry["coordinates"][0])
    if geometry.get("type") == "MultiPolygon":
        return sum(ring_area_m2(polygon[0]) for polygon in geometry["coordinates"])
    return 0.0


def dong_name(feature: dict) -> str:
    return feature.get("properties", {}).get("name") or feature.get("properties", {}).get("dong_name")


def assign_to_dong(feature: dict, dongs: list[dict]) -> str | None:
    point = representative_point(feature.get("geometry"))
    if not point:
        return None
    for dong in dongs:
        if point_in_polygon(point, dong["geometry"]):
            return dong_name(dong)
    return None


def default_summary(name: str, area_m2: float) -> dict:
    return {
        "dong_name": name,
        "dong_area_m2": round(area_m2, 2),
        "building_count": 0,
        "building_footprint_area_m2": 0.0,
        "estimated_floor_area_m2": 0.0,
        "avg_building_height_m": 0.0,
        "commercial_building_count": 0,
        "apartments_building_count": 0,
        "hotel_building_count": 0,
        "bus_stop_count": 0,
        "subway_station_count": 0,
        "transit_importance_sum": 0,
        "traffic_signal_count": 0,
        "road_count": 0,
        "road_length_m": 0.0,
        "arterial_road_length_m": 0.0,
        "connector_road_length_m": 0.0,
        "local_road_length_m": 0.0,
        "green_area_m2": 0.0,
        "water_area_m2": 0.0,
        "nonroad_feature_count": 0,
    }


def main() -> None:
    dongs = load_geojson("public/dongs.geojson")["features"]
    summaries = {
        dong_name(feature): default_summary(dong_name(feature), polygon_area_m2(feature["geometry"]))
        for feature in dongs
    }

    height_sums = {name: 0.0 for name in summaries}

    for feature in load_geojson("public/buildings.geojson")["features"]:
        name = assign_to_dong(feature, dongs)
        if not name:
            continue
        props = feature.get("properties", {})
        area = float(props.get("area") or polygon_area_m2(feature.get("geometry")))
        height = float(props.get("height") or 0)
        kind = str(props.get("kind") or "").lower()
        summary = summaries[name]
        summary["building_count"] += 1
        summary["building_footprint_area_m2"] += area
        summary["estimated_floor_area_m2"] += area * max(height / 3.4, 1)
        height_sums[name] += height
        if any(token in kind for token in ["commercial", "office", "retail"]):
            summary["commercial_building_count"] += 1
        if "apartments" in kind or "residential" in kind:
            summary["apartments_building_count"] += 1
        if "hotel" in kind:
            summary["hotel_building_count"] += 1

    for feature in load_geojson("public/transit.geojson")["features"]:
        name = assign_to_dong(feature, dongs)
        if not name:
            continue
        category = feature.get("properties", {}).get("category")
        if category == "bus_stop":
            summaries[name]["bus_stop_count"] += 1
        elif category == "subway_station":
            summaries[name]["subway_station_count"] += 1
        summaries[name]["transit_importance_sum"] += int(feature.get("properties", {}).get("importance") or 0)

    for feature in load_geojson("public/traffic-signals.geojson")["features"]:
        name = assign_to_dong(feature, dongs)
        if name:
            summaries[name]["traffic_signal_count"] += 1

    for feature in load_geojson("public/roads.geojson")["features"]:
        name = assign_to_dong(feature, dongs)
        if not name:
            continue
        road_class = feature.get("properties", {}).get("roadClass")
        length = line_length_m(feature.get("geometry"))
        summaries[name]["road_count"] += 1
        summaries[name]["road_length_m"] += length
        if road_class == "arterial":
            summaries[name]["arterial_road_length_m"] += length
        elif road_class == "connector":
            summaries[name]["connector_road_length_m"] += length
        else:
            summaries[name]["local_road_length_m"] += length

    for feature in load_geojson("public/non-road.geojson")["features"]:
        name = assign_to_dong(feature, dongs)
        if not name:
            continue
        category = feature.get("properties", {}).get("category")
        area = float(feature.get("properties", {}).get("area") or polygon_area_m2(feature.get("geometry")))
        summaries[name]["nonroad_feature_count"] += 1
        if category == "green":
            summaries[name]["green_area_m2"] += area
        if category == "water":
            summaries[name]["water_area_m2"] += area

    rows = []
    for name, summary in summaries.items():
        if summary["building_count"]:
            summary["avg_building_height_m"] = round(height_sums[name] / summary["building_count"], 2)
        for key, value in list(summary.items()):
            if isinstance(value, float):
                summary[key] = round(value, 2)
        rows.append(summary)
    rows.sort(key=lambda row: row["dong_name"])

    out_dir = Path("data/processed/poi")
    out_dir.mkdir(parents=True, exist_ok=True)
    csv_path = out_dir / "dong_static_poi_features.csv"
    with csv_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)

    summary = {
        "source": "local OSM-derived GeoJSON assets",
        "output_csv": str(csv_path),
        "row_count": len(rows),
        "covered_dongs": [row["dong_name"] for row in rows],
        "inputs": [
            "public/dongs.geojson",
            "public/buildings.geojson",
            "public/transit.geojson",
            "public/roads.geojson",
            "public/traffic-signals.geojson",
            "public/non-road.geojson",
        ],
        "notes": [
            "Static built-environment features are assigned by representative geometry point.",
            "These are explanatory features, not time-varying demand labels.",
        ],
    }
    summary_path = out_dir / "dong_static_poi_features.summary.json"
    summary_path.write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {csv_path} ({len(rows)} rows)")
    print(f"Wrote {summary_path}")


if __name__ == "__main__":
    main()

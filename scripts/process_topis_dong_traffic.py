#!/usr/bin/env python3
"""Convert a TOPIS monthly traffic workbook into dong-hour CSV files.

TOPIS monthly traffic volume is spot/sensor based, not dong based. This script
keeps direct point-in-polygon matches when they exist, then fills target dongs
without a sensor by assigning the nearest TOPIS spot as a proxy.
"""

from __future__ import annotations

import argparse
import csv
import json
import math
from collections import defaultdict
from pathlib import Path
from zipfile import ZipFile
from xml.etree import ElementTree as ET

MAIN_NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
REL_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
PKG_REL_NS = "http://schemas.openxmlformats.org/package/2006/relationships"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--period", required=True, help="YYYY-MM")
    parser.add_argument("--xlsx", required=True)
    parser.add_argument("--dongs", default="public/dongs.geojson")
    parser.add_argument("--out-dir", default="data/processed/topis")
    parser.add_argument("--nearest-km", type=float, default=2.2)
    return parser.parse_args()


def cell_col_index(ref: str) -> int:
    letters = "".join(ch for ch in ref if ch.isalpha())
    index = 0
    for ch in letters:
        index = index * 26 + ord(ch.upper()) - 64
    return index - 1


def load_shared_strings(zf: ZipFile) -> list[str]:
    try:
        raw = zf.read("xl/sharedStrings.xml")
    except KeyError:
        return []

    root = ET.fromstring(raw)
    values: list[str] = []
    for si in root.findall(f"{{{MAIN_NS}}}si"):
        values.append("".join(t.text or "" for t in si.findall(f".//{{{MAIN_NS}}}t")))
    return values


def workbook_sheet_paths(zf: ZipFile) -> dict[str, str]:
    workbook = ET.fromstring(zf.read("xl/workbook.xml"))
    rels = ET.fromstring(zf.read("xl/_rels/workbook.xml.rels"))
    targets = {
        rel.attrib["Id"]: rel.attrib["Target"]
        for rel in rels.findall(f"{{{PKG_REL_NS}}}Relationship")
    }

    paths: dict[str, str] = {}
    for sheet in workbook.findall(f".//{{{MAIN_NS}}}sheet"):
        name = sheet.attrib["name"]
        rel_id = sheet.attrib[f"{{{REL_NS}}}id"]
        target = targets[rel_id]
        if not target.startswith("xl/"):
            target = f"xl/{target}"
        paths[name] = target.replace("\\", "/")
    return paths


def read_sheet(zf: ZipFile, sheet_path: str, strings: list[str]) -> list[list[object]]:
    root = ET.fromstring(zf.read(sheet_path))
    rows: list[list[object]] = []
    for row in root.findall(f".//{{{MAIN_NS}}}sheetData/{{{MAIN_NS}}}row"):
        values: list[object] = []
        for cell in row.findall(f"{{{MAIN_NS}}}c"):
            index = cell_col_index(cell.attrib["r"])
            while len(values) <= index:
                values.append("")

            value_node = cell.find(f"{{{MAIN_NS}}}v")
            if value_node is None:
                inline = cell.find(f".//{{{MAIN_NS}}}t")
                value: object = inline.text if inline is not None else ""
            elif cell.attrib.get("t") == "s":
                value = strings[int(value_node.text or 0)]
            else:
                raw = value_node.text or ""
                try:
                    parsed = float(raw)
                    value = int(parsed) if parsed.is_integer() else parsed
                except ValueError:
                    value = raw

            values[index] = value
        rows.append(values)
    return rows


def point_in_ring(lon: float, lat: float, ring: list[list[float]]) -> bool:
    inside = False
    previous = len(ring) - 1
    for index, point in enumerate(ring):
        x1, y1 = point
        x2, y2 = ring[previous]
        intersects = (y1 > lat) != (y2 > lat) and lon < (
            (x2 - x1) * (lat - y1) / ((y2 - y1) or 1e-12) + x1
        )
        if intersects:
            inside = not inside
        previous = index
    return inside


def point_in_geometry(lon: float, lat: float, geometry: dict) -> bool:
    if geometry["type"] == "Polygon":
        polygons = [geometry["coordinates"]]
    elif geometry["type"] == "MultiPolygon":
        polygons = geometry["coordinates"]
    else:
        return False

    for polygon in polygons:
        if point_in_ring(lon, lat, polygon[0]) and not any(
            point_in_ring(lon, lat, hole) for hole in polygon[1:]
        ):
            return True
    return False


def geometry_centroid(geometry: dict) -> tuple[float, float]:
    points: list[list[float]] = []
    polygons = [geometry["coordinates"]] if geometry["type"] == "Polygon" else geometry["coordinates"]
    for polygon in polygons:
        for ring in polygon:
            points.extend(ring)
    lon = sum(point[0] for point in points) / len(points)
    lat = sum(point[1] for point in points) / len(points)
    return lon, lat


def geometry_points(geometry: dict) -> list[list[float]]:
    points: list[list[float]] = []
    polygons = [geometry["coordinates"]] if geometry["type"] == "Polygon" else geometry["coordinates"]
    for polygon in polygons:
        for ring in polygon:
            points.extend(ring)
    return points


def feature_bounds(features: list[dict], padding: float = 0.0022) -> dict[str, float]:
    points: list[list[float]] = []
    for feature in features:
        points.extend(geometry_points(feature["geometry"]))
    lons = [point[0] for point in points]
    lats = [point[1] for point in points]
    return {
        "west": min(lons) - padding,
        "east": max(lons) + padding,
        "south": min(lats) - padding,
        "north": max(lats) + padding,
    }


def point_in_bounds(lon: float, lat: float, bounds: dict[str, float]) -> bool:
    return bounds["west"] <= lon <= bounds["east"] and bounds["south"] <= lat <= bounds["north"]


def distance_km(lon1: float, lat1: float, lon2: float, lat2: float) -> float:
    lat_km = (lat1 - lat2) * 111.32
    lon_km = (lon1 - lon2) * 111.32 * math.cos(math.radians((lat1 + lat2) / 2))
    return math.sqrt(lat_km * lat_km + lon_km * lon_km)


def normalized_date(value: object) -> str:
    ymd = str(int(float(value))).zfill(8)
    return f"{ymd[:4]}-{ymd[4:6]}-{ymd[6:8]}"


def normalized_datetime(value: object, hour: int) -> str:
    return f"{normalized_date(value)} {hour:02d}:00:00"


def numeric_or_none(value: object) -> int | None:
    if value in ("", None):
        return None
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return None


def safe_text(value: object) -> str:
    return "" if value is None else str(value).strip()


def parse_spot_rows(rows: list[list[object]]) -> list[dict]:
    spots: list[dict] = []
    header = [safe_text(value) for value in rows[0]] if rows else []

    # Newer workbooks have one row per direction:
    # 지점번호, 방향, 지점명칭, 검지기 유형, 위도, 경도, ...
    if len(header) > 1 and header[1] == "방향":
        current_num = ""
        current_lat: float | None = None
        current_lon: float | None = None

        for row in rows[1:]:
            padded = row + [""] * max(0, 9 - len(row))
            spot_num, direction, name, detector_type, lat, lon, address, road_address, corridor = padded[:9]

            if safe_text(spot_num):
                current_num = safe_text(spot_num)
            if numeric_or_none(lat) is not None and float(lat) != 0:
                current_lat = float(lat)
            if numeric_or_none(lon) is not None and float(lon) != 0:
                current_lon = float(lon)

            use_lat = float(lat) if numeric_or_none(lat) is not None and float(lat) != 0 else current_lat
            use_lon = float(lon) if numeric_or_none(lon) is not None and float(lon) != 0 else current_lon

            if not current_num or use_lat is None or use_lon is None:
                continue

            spots.append(
                {
                    "spot_num": current_num,
                    "direction": safe_text(direction),
                    "spot_name": safe_text(name),
                    "detector_type": safe_text(detector_type),
                    "lat": use_lat,
                    "lon": use_lon,
                    "address": safe_text(address),
                    "road_address": safe_text(road_address),
                    "corridor": safe_text(corridor),
                }
            )
        return spots

    # Older workbooks have one row per spot, with inbound/outbound corridors
    # in separate columns:
    # 지점번호, 지점명칭, 검지기 유형, 위도, 경도, 주소, 도로명 주소, 유입 방향, 유출방향
    for row in rows[1:]:
        padded = row + [""] * max(0, 9 - len(row))
        spot_num, name, detector_type, lat, lon, address, road_address, inbound, outbound = padded[:9]
        if not safe_text(spot_num):
            continue
        if numeric_or_none(lat) is None or numeric_or_none(lon) is None:
            continue
        use_lat = float(lat)
        use_lon = float(lon)
        if use_lat == 0 or use_lon == 0:
            continue

        for direction, corridor in [("유입", inbound), ("유출", outbound)]:
            if not safe_text(corridor):
                continue
            spots.append(
                {
                    "spot_num": safe_text(spot_num),
                    "direction": direction,
                    "spot_name": safe_text(name),
                    "detector_type": safe_text(detector_type),
                    "lat": use_lat,
                    "lon": use_lon,
                    "address": safe_text(address),
                    "road_address": safe_text(road_address),
                    "corridor": safe_text(corridor),
                }
            )
    return spots


def header_index(header: list[object], name: str, default: int | None = None) -> int | None:
    try:
        return [safe_text(value) for value in header].index(name)
    except ValueError:
        return default


def traffic_layout(header: list[object]) -> dict[str, int | None]:
    return {
        "date": header_index(header, "일자", 0),
        "weekday": header_index(header, "요일", 1),
        "day_type": header_index(header, "요일(2)", None),
        "spot_name": header_index(header, "지점명", 3 if header_index(header, "요일(2)", None) is not None else 2),
        "spot_num": header_index(header, "지점번호", 4 if header_index(header, "요일(2)", None) is not None else 3),
        "direction": header_index(header, "방향", 5 if header_index(header, "요일(2)", None) is not None else 4),
        "section": header_index(header, "구분", 6 if header_index(header, "요일(2)", None) is not None else 5),
        "hours_start": header_index(header, "0시", 7 if header_index(header, "요일(2)", None) is not None else 6),
    }


def inferred_day_type(weekday: str) -> str:
    return "주말" if weekday in ("토", "일") else "평일"


def build_mappings(spots: list[dict], dong_features: list[dict], nearest_km: float) -> list[dict]:
    target_dongs = [feature["properties"]["name"] for feature in dong_features]
    centroids = {
        feature["properties"]["name"]: geometry_centroid(feature["geometry"])
        for feature in dong_features
    }
    bounds = feature_bounds(dong_features)

    mappings: list[dict] = []
    mapped_dongs: set[str] = set()
    direct_spot_keys: set[tuple[str, str]] = set()

    for spot in spots:
        for feature in dong_features:
            dong_name = feature["properties"]["name"]
            if point_in_geometry(spot["lon"], spot["lat"], feature["geometry"]):
                mappings.append({**spot, "dong_name": dong_name, "assignment": "polygon", "distance_km": 0.0})
                mapped_dongs.add(dong_name)
                direct_spot_keys.add((spot["spot_num"], spot["direction"]))
                break

    spot_by_num: dict[str, list[dict]] = defaultdict(list)
    for spot in spots:
        spot_by_num[spot["spot_num"]].append(spot)

    existing_keys = {(m["spot_num"], m["direction"], m["dong_name"]) for m in mappings}

    for spot in spots:
        spot_key = (spot["spot_num"], spot["direction"])
        if spot_key in direct_spot_keys or not point_in_bounds(spot["lon"], spot["lat"], bounds):
            continue

        nearest_dong = None
        nearest_distance = float("inf")
        for dong_name, (centroid_lon, centroid_lat) in centroids.items():
            dist = distance_km(spot["lon"], spot["lat"], centroid_lon, centroid_lat)
            if dist < nearest_distance:
                nearest_dong = dong_name
                nearest_distance = dist

        if nearest_dong and nearest_distance <= nearest_km:
            key = (spot["spot_num"], spot["direction"], nearest_dong)
            if key not in existing_keys:
                mappings.append(
                    {
                        **spot,
                        "dong_name": nearest_dong,
                        "assignment": "nearest_corridor",
                        "distance_km": round(nearest_distance, 3),
                    }
                )
                existing_keys.add(key)
                mapped_dongs.add(nearest_dong)

    missing_dongs = [dong for dong in target_dongs if dong not in mapped_dongs]
    for dong_name in missing_dongs:
        centroid_lon, centroid_lat = centroids[dong_name]
        nearest_by_spot: dict[str, tuple[float, dict]] = {}
        for spot in spots:
            dist = distance_km(spot["lon"], spot["lat"], centroid_lon, centroid_lat)
            current = nearest_by_spot.get(spot["spot_num"])
            if current is None or dist < current[0]:
                nearest_by_spot[spot["spot_num"]] = (dist, spot)

        nearest = sorted(nearest_by_spot.values(), key=lambda item: item[0])
        if not nearest or nearest[0][0] > nearest_km:
            continue

        dist, nearest_spot = nearest[0]
        for spot in spot_by_num[nearest_spot["spot_num"]]:
            key = (spot["spot_num"], spot["direction"], dong_name)
            if key not in existing_keys:
                mappings.append(
                    {
                        **spot,
                        "dong_name": dong_name,
                        "assignment": "nearest_fill",
                        "distance_km": round(dist, 3),
                    }
                )
                existing_keys.add(key)

    mappings.sort(key=lambda row: (row["dong_name"], row["spot_num"], row["direction"]))
    return mappings


def write_csv(path: Path, fieldnames: list[str], rows: list[dict]) -> None:
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def main() -> None:
    args = parse_args()
    year, month = args.period.split("-")
    traffic_sheet = f"{int(year)}년 {month}월"
    coord_sheet = "수집지점 주소 및 좌표"

    with ZipFile(args.xlsx) as zf:
        strings = load_shared_strings(zf)
        sheet_paths = workbook_sheet_paths(zf)
        if traffic_sheet not in sheet_paths:
            raise SystemExit(f"Missing TOPIS traffic sheet: {traffic_sheet}")
        if coord_sheet not in sheet_paths:
            raise SystemExit(f"Missing TOPIS coordinate sheet: {coord_sheet}")
        traffic_rows = read_sheet(zf, sheet_paths[traffic_sheet], strings)
        coord_rows = read_sheet(zf, sheet_paths[coord_sheet], strings)

    dongs = json.loads(Path(args.dongs).read_text(encoding="utf-8"))
    dong_features = dongs["features"]
    target_dong_names = [feature["properties"]["name"] for feature in dong_features]

    spots = parse_spot_rows(coord_rows)
    mappings = build_mappings(spots, dong_features, args.nearest_km)
    mapping_by_spot_dir: dict[tuple[str, str], list[dict]] = defaultdict(list)
    for mapping in mappings:
        mapping_by_spot_dir[(mapping["spot_num"], mapping["direction"])].append(mapping)

    spot_rows: list[dict] = []
    aggregate: dict[tuple[str, str], dict] = {}
    layout = traffic_layout(traffic_rows[0] if traffic_rows else [])

    for row in traffic_rows[1:]:
        padded = row + [""] * max(0, 31 - len(row))
        date_value = padded[layout["date"] or 0]
        weekday = safe_text(padded[layout["weekday"] or 1])
        day_type_index = layout["day_type"]
        day_type = (
            safe_text(padded[day_type_index])
            if day_type_index is not None and safe_text(padded[day_type_index])
            else inferred_day_type(weekday)
        )
        spot_name = padded[layout["spot_name"] or 2]
        spot_num = padded[layout["spot_num"] or 3]
        direction = padded[layout["direction"] or 4]
        section = padded[layout["section"] or 5]
        hours_start = layout["hours_start"] or 6
        key = (safe_text(spot_num), safe_text(direction))
        if key not in mapping_by_spot_dir:
            continue

        for hour in range(24):
            vehicle_count = numeric_or_none(padded[hours_start + hour])
            for mapping in mapping_by_spot_dir[key]:
                datetime_kst = normalized_datetime(date_value, hour)
                out_row = {
                    "datetime_kst": datetime_kst,
                    "date": normalized_date(date_value),
                    "hour": hour,
                    "weekday": weekday,
                    "day_type": day_type,
                    "dong_name": mapping["dong_name"],
                    "dong_assign": mapping["assignment"],
                    "assignment_distance_km": mapping["distance_km"],
                    "spot_num": mapping["spot_num"],
                    "spot_name": safe_text(spot_name) or mapping["spot_name"],
                    "direction": safe_text(direction),
                    "section": safe_text(section),
                    "vehicle_count": vehicle_count,
                    "lat": mapping["lat"],
                    "lon": mapping["lon"],
                    "corridor": mapping["corridor"],
                }
                spot_rows.append(out_row)

                agg_key = (datetime_kst, mapping["dong_name"])
                if agg_key not in aggregate:
                    aggregate[agg_key] = {
                        "datetime_kst": datetime_kst,
                        "date": normalized_date(date_value),
                        "hour": hour,
                        "weekday": weekday,
                        "day_type": day_type,
                        "dong_name": mapping["dong_name"],
                        "traffic_volume_proxy": 0,
                        "source_rows": 0,
                        "source_spots": set(),
                        "assignments": set(),
                        "missing_value_rows": 0,
                    }
                agg = aggregate[agg_key]
                agg["source_rows"] += 1
                agg["source_spots"].add(mapping["spot_num"])
                agg["assignments"].add(mapping["assignment"])
                if vehicle_count is None:
                    agg["missing_value_rows"] += 1
                else:
                    agg["traffic_volume_proxy"] += vehicle_count

    dong_rows = []
    for row in aggregate.values():
        assignments = sorted(row.pop("assignments"))
        source_spots = sorted(row.pop("source_spots"))
        row["source_spot_count"] = len(source_spots)
        row["source_spots"] = "|".join(source_spots)
        row["assignment_type"] = "mixed" if len(assignments) > 1 else assignments[0]
        dong_rows.append(row)
    dong_rows.sort(key=lambda item: (item["datetime_kst"], item["dong_name"]))
    spot_rows.sort(key=lambda item: (item["datetime_kst"], item["dong_name"], item["spot_num"], item["direction"]))

    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    suffix = args.period
    mappings_path = out_dir / f"topis_dong_spot_mapping_{suffix}.csv"
    spot_path = out_dir / f"topis_spot_hourly_{suffix}.csv"
    dong_path = out_dir / f"topis_dong_hourly_{suffix}.csv"
    meta_path = out_dir / f"topis_dong_hourly_{suffix}.meta.json"

    write_csv(
        mappings_path,
        [
            "dong_name",
            "assignment",
            "distance_km",
            "spot_num",
            "direction",
            "spot_name",
            "detector_type",
            "lat",
            "lon",
            "address",
            "road_address",
            "corridor",
        ],
        [
            {
                "dong_name": row["dong_name"],
                "assignment": row["assignment"],
                "distance_km": row["distance_km"],
                "spot_num": row["spot_num"],
                "direction": row["direction"],
                "spot_name": row["spot_name"],
                "detector_type": row["detector_type"],
                "lat": row["lat"],
                "lon": row["lon"],
                "address": row["address"],
                "road_address": row["road_address"],
                "corridor": row["corridor"],
            }
            for row in mappings
        ],
    )
    write_csv(
        spot_path,
        [
            "datetime_kst",
            "date",
            "hour",
            "weekday",
            "day_type",
            "dong_name",
            "dong_assign",
            "assignment_distance_km",
            "spot_num",
            "spot_name",
            "direction",
            "section",
            "vehicle_count",
            "lat",
            "lon",
            "corridor",
        ],
        spot_rows,
    )
    write_csv(
        dong_path,
        [
            "datetime_kst",
            "date",
            "hour",
            "weekday",
            "day_type",
            "dong_name",
            "traffic_volume_proxy",
            "source_spot_count",
            "source_spots",
            "source_rows",
            "assignment_type",
            "missing_value_rows",
        ],
        dong_rows,
    )

    covered_dongs = sorted({row["dong_name"] for row in dong_rows})
    meta = {
        "source": "TOPIS monthly traffic volume workbook",
        "period": args.period,
        "traffic_unit": "vehicles_per_hour",
        "target_dongs": target_dong_names,
        "covered_dongs": covered_dongs,
        "spot_mapping_count": len(mappings),
        "spot_hourly_rows": len(spot_rows),
        "dong_hourly_rows": len(dong_rows),
        "nearest_fill_km": args.nearest_km,
        "notes": [
            "TOPIS source data is spot-level, not administrative-dong-level.",
            "Rows with assignment=polygon are inside a target dong boundary.",
            "Rows with assignment=nearest_corridor are nearby TOPIS spots inside the target-region bounding box.",
            "Rows with assignment=nearest_fill fill target dongs that still have no mapped TOPIS spot.",
            "traffic_volume_proxy should not be summed across dongs as a citywide total because nearest proxies may reuse a spot.",
        ],
        "outputs": {
            "mapping_csv": str(mappings_path),
            "spot_hourly_csv": str(spot_path),
            "dong_hourly_csv": str(dong_path),
        },
    }
    meta_path.write_text(json.dumps(meta, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(f"Wrote {mappings_path}")
    print(f"Wrote {spot_path} ({len(spot_rows)} rows)")
    print(f"Wrote {dong_path} ({len(dong_rows)} rows)")
    print(f"Wrote {meta_path}")
    print("Covered dongs:", ", ".join(covered_dongs))


if __name__ == "__main__":
    main()

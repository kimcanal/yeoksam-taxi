#!/usr/bin/env python3
"""Process Seoul Metro station/day/hour passenger counts into 9-dong features.

Input is the public file-data CSV from data.go.kr dataset 15048032:
서울교통공사_역별 일별 시간대별 승하차인원 정보.

The source is station-level and wide by hour. This script:
- maps station points from public/transit.geojson to public/dongs.geojson
- keeps stations inside the 9 target dongs
- converts wide hourly columns to long rows
- aggregates station activity to dong-hour features
"""

from __future__ import annotations

import argparse
import json
import math
import re
from pathlib import Path
from typing import Iterable

import pandas as pd


DEFAULT_INPUT_DIR = Path("data/raw/metro")
DEFAULT_OUT_DIR = Path("data/processed/station_hourly")
DEFAULT_DONGS = Path("public/dongs.geojson")
DEFAULT_TRANSIT = Path("public/transit.geojson")
DEFAULT_PUBLIC = Path("public/metro-station-activity.json")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "input",
        nargs="?",
        default=str(DEFAULT_INPUT_DIR),
        help="CSV file or directory containing Seoul Metro station hourly CSV files.",
    )
    parser.add_argument("--out-dir", default=str(DEFAULT_OUT_DIR))
    parser.add_argument("--dongs", default=str(DEFAULT_DONGS))
    parser.add_argument("--transit", default=str(DEFAULT_TRANSIT))
    parser.add_argument("--public-out", default=str(DEFAULT_PUBLIC))
    return parser.parse_args()


def load_geojson(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


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


def normalize_station_name(value: object) -> str:
    text = str(value or "").strip()
    text = re.sub(r"\([^)]*\)", "", text)
    text = re.sub(r"\s+", "", text)
    text = text.removesuffix("역")
    return text


def dong_name(feature: dict) -> str:
    return feature.get("properties", {}).get("name") or feature.get("properties", {}).get("dong_name")


def target_dong_names(dongs_path: Path) -> list[str]:
    return sorted(dong_name(feature) for feature in load_geojson(dongs_path)["features"])


def station_dong_map(dongs_path: Path, transit_path: Path) -> pd.DataFrame:
    dongs = load_geojson(dongs_path)["features"]
    transit = load_geojson(transit_path)["features"]
    rows = []
    for feature in transit:
        props = feature.get("properties", {})
        if props.get("category") != "subway_station" or props.get("sourceType") != "station":
            continue
        coords = feature.get("geometry", {}).get("coordinates")
        if not coords:
            continue
        point = (float(coords[0]), float(coords[1]))
        assigned = None
        for dong in dongs:
            if point_in_polygon(point, dong["geometry"]):
                assigned = dong_name(dong)
                break
        if not assigned:
            continue
        rows.append(
            {
                "station_name": props.get("name"),
                "station_key": normalize_station_name(props.get("name")),
                "station_ref": props.get("ref"),
                "dong_name": assigned,
                "lon": point[0],
                "lat": point[1],
            }
        )
    return pd.DataFrame(rows).drop_duplicates(subset=["station_key", "dong_name"])


def candidate_csvs(input_path: Path) -> list[Path]:
    if input_path.is_file():
        return [input_path]
    if not input_path.exists():
        return []
    return sorted(
        path for path in input_path.glob("**/*")
        if path.is_file() and path.suffix.lower() in {".csv", ".txt"}
    )


def read_csv_with_fallback(path: Path) -> pd.DataFrame:
    for encoding in ("utf-8-sig", "cp949", "euc-kr"):
        try:
            return pd.read_csv(path, encoding=encoding)
        except UnicodeDecodeError:
            continue
    return pd.read_csv(path)


def find_column(columns: Iterable[str], patterns: list[str]) -> str:
    for pattern in patterns:
        regex = re.compile(pattern)
        for column in columns:
            if regex.search(str(column)):
                return str(column)
    raise ValueError(f"Cannot find required column matching {patterns}")


def hour_from_column(column: str) -> int | None:
    text = str(column)
    if "합계" in text or "총" in text:
        return None
    compact = re.sub(r"\s+", "", text)
    if "이전" in compact:
        match = re.search(r"(\d{1,2})시", compact)
        return int(match.group(1)) - 1 if match else 5
    match = re.search(r"(\d{1,2})\s*시", compact)
    if match:
        return int(match.group(1))
    match = re.search(r"(\d{1,2})[-~](\d{1,2})", compact)
    if match:
        return int(match.group(1))
    return None


def normalize_ride_type(value: object) -> str:
    text = str(value or "").strip()
    if "하" in text:
        return "alighting"
    return "boarding"


def normalize_date(value: object) -> str:
    text = str(value or "").strip()
    digits = re.sub(r"\D", "", text)
    if len(digits) == 8:
        return f"{digits[:4]}-{digits[4:6]}-{digits[6:8]}"
    parsed = pd.to_datetime(text, errors="coerce")
    if pd.isna(parsed):
        return text
    return parsed.strftime("%Y-%m-%d")


def melt_station_file(path: Path, station_map: pd.DataFrame) -> pd.DataFrame:
    raw = read_csv_with_fallback(path)
    raw.columns = [str(column).strip() for column in raw.columns]
    date_col = find_column(raw.columns, [r"^날짜$", r"사용일자", r"수송일자", r"일자"])
    station_col = find_column(raw.columns, [r"역명"])
    ride_col = find_column(raw.columns, [r"승하차", r"구분"])
    line_col = None
    try:
        line_col = find_column(raw.columns, [r"호선"])
    except ValueError:
        pass

    hour_cols = [column for column in raw.columns if hour_from_column(column) is not None]
    if not hour_cols:
        raise ValueError(f"No hourly columns found in {path}")

    keep_cols = [date_col, station_col, ride_col] + ([line_col] if line_col else [])
    long = raw[keep_cols + hour_cols].copy()
    long["service_date"] = long[date_col].map(normalize_date)
    long["station_name_source"] = long[station_col].astype(str).str.strip()
    long["station_key"] = long[station_col].map(normalize_station_name)
    long["ride_type"] = long[ride_col].map(normalize_ride_type)
    long["line_name"] = long[line_col].astype(str).str.strip() if line_col else ""

    melted = long.melt(
        id_vars=["service_date", "line_name", "station_name_source", "station_key", "ride_type"],
        value_vars=hour_cols,
        var_name="hour_label",
        value_name="passenger_count",
    )
    melted["hour"] = melted["hour_label"].map(hour_from_column).astype(int)
    melted["passenger_count"] = pd.to_numeric(melted["passenger_count"], errors="coerce").fillna(0).astype(int)
    matched = melted.merge(station_map, on="station_key", how="inner")
    matched["source_file"] = path.name
    return matched


def summarize_public(dong_hour: pd.DataFrame, station_hour: pd.DataFrame, station_map: pd.DataFrame) -> dict:
    latest_date = dong_hour["service_date"].max() if not dong_hour.empty else None
    latest_rows = dong_hour[dong_hour["service_date"] == latest_date] if latest_date else dong_hour
    top_dong_rows = (
        latest_rows.groupby("dong_name", as_index=False)["station_total_passengers"].sum()
        .sort_values("station_total_passengers", ascending=False)
        .head(9)
    )
    top_station_rows = (
        station_hour[station_hour["service_date"] == latest_date]
        .groupby(["dong_name", "station_name"], as_index=False)["station_total_passengers"].sum()
        .sort_values("station_total_passengers", ascending=False)
        .head(15)
        if latest_date else station_hour.head(0)
    )
    return {
        "source": "seoul_metro_station_daily_hourly_passenger_counts",
        "source_url": "https://www.data.go.kr/data/15048032/fileData.do",
        "generated_at": pd.Timestamp.now(tz="Asia/Seoul").strftime("%Y-%m-%dT%H:%M:%S%z"),
        "latest_service_date": latest_date,
        "matched_station_count": int(station_map["station_key"].nunique()),
        "dong_hour_rows": int(len(dong_hour)),
        "station_hour_rows": int(len(station_hour)),
        "top_dongs_latest_date": top_dong_rows.to_dict(orient="records"),
        "top_stations_latest_date": top_station_rows.to_dict(orient="records"),
        "station_dong_map": station_map.to_dict(orient="records"),
        "caveat": "Station-level data is mapped to administrative dongs using OSM station coordinates; it refines subway hotspot pressure, not direct taxi calls.",
    }


def main() -> None:
    args = parse_args()
    input_path = Path(args.input)
    out_dir = Path(args.out_dir)
    public_out = Path(args.public_out)
    out_dir.mkdir(parents=True, exist_ok=True)
    public_out.parent.mkdir(parents=True, exist_ok=True)

    csvs = candidate_csvs(input_path)
    if not csvs:
        raise FileNotFoundError(
            f"No CSV files found at {input_path}. Download data.go.kr dataset 15048032 into data/raw/metro/ first."
        )

    dongs_path = Path(args.dongs)
    target_dongs = target_dong_names(dongs_path)
    station_map = station_dong_map(dongs_path, Path(args.transit))
    if station_map.empty:
        raise ValueError("No target subway stations could be mapped to dongs.")

    station_frames = [melt_station_file(path, station_map) for path in csvs]
    station_long = pd.concat(station_frames, ignore_index=True)

    station_hour = (
        station_long.pivot_table(
            index=["service_date", "hour", "dong_name", "station_name"],
            columns="ride_type",
            values="passenger_count",
            aggfunc="sum",
            fill_value=0,
        )
        .reset_index()
        .rename_axis(None, axis=1)
    )
    for column in ("boarding", "alighting"):
        if column not in station_hour.columns:
            station_hour[column] = 0
    station_hour = station_hour.rename(
        columns={
            "boarding": "station_boardings",
            "alighting": "station_alightings",
        }
    )
    station_hour["station_total_passengers"] = station_hour["station_boardings"] + station_hour["station_alightings"]
    station_hour["station_net_inflow"] = station_hour["station_alightings"] - station_hour["station_boardings"]

    dong_hour = (
        station_hour.groupby(["service_date", "hour", "dong_name"], as_index=False)
        .agg(
            station_boardings=("station_boardings", "sum"),
            station_alightings=("station_alightings", "sum"),
            station_total_passengers=("station_total_passengers", "sum"),
            station_net_inflow=("station_net_inflow", "sum"),
            active_station_count=("station_name", "nunique"),
        )
        .sort_values(["service_date", "hour", "dong_name"])
    )
    complete_index = pd.MultiIndex.from_product(
        [
            sorted(dong_hour["service_date"].unique()),
            sorted(dong_hour["hour"].unique()),
            target_dongs,
        ],
        names=["service_date", "hour", "dong_name"],
    )
    dong_hour = (
        dong_hour.set_index(["service_date", "hour", "dong_name"])
        .reindex(complete_index)
        .reset_index()
    )
    fill_columns = [
        "station_boardings",
        "station_alightings",
        "station_total_passengers",
        "station_net_inflow",
        "active_station_count",
    ]
    dong_hour[fill_columns] = dong_hour[fill_columns].fillna(0)
    dong_hour[fill_columns] = dong_hour[fill_columns].astype(int)
    dong_hour["station_peak_pressure"] = dong_hour["station_total_passengers"] / dong_hour["active_station_count"].clip(lower=1)
    max_total = dong_hour["station_total_passengers"].max()
    dong_hour["station_activity_score"] = 0.0 if max_total <= 0 else dong_hour["station_total_passengers"] / max_total

    station_hour = station_hour.sort_values(["service_date", "hour", "dong_name", "station_name"])
    station_map = station_map.sort_values(["dong_name", "station_name"])

    dong_hour.to_csv(out_dir / "seoul_metro_station_dong_hourly.csv", index=False)
    station_hour.to_csv(out_dir / "seoul_metro_station_hourly_by_station.csv", index=False)
    station_map.to_csv(out_dir / "seoul_metro_station_dong_map.csv", index=False)

    summary = summarize_public(dong_hour, station_hour, station_map)
    (out_dir / "seoul_metro_station_hourly.summary.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    public_out.write_text(
        json.dumps(summary, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    print(f"Wrote {out_dir / 'seoul_metro_station_dong_hourly.csv'}")
    print(f"Wrote {out_dir / 'seoul_metro_station_hourly_by_station.csv'}")
    print(f"Wrote {out_dir / 'seoul_metro_station_dong_map.csv'}")
    print(f"Wrote {public_out}")


if __name__ == "__main__":
    main()

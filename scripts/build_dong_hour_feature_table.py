#!/usr/bin/env python3
"""Build a joined dong-hour feature table for model training.

This combines:
- TOPIS spot-to-dong traffic proxy
- Seoul public-transit OD dong-hour movement
- KMA ASOS hourly weather
- Korean public holidays
- Seoul living population
- Static POI / built-environment features
"""

from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path


DEFAULT_TOPIS = "data/processed/topis/topis_dong_hourly_2023-01_2026-03.csv"
DEFAULT_OD = "data/processed/transit_od/seoul_transit_od_dong_hourly_2023-01_2025-12.csv"
DEFAULT_WEATHER = "data/processed/weather/seoul_asos_hourly_2023-01-01_2026-03-31.csv"
DEFAULT_HOLIDAYS = "data/processed/calendar/korean_public_holidays_2023_2026.csv"
DEFAULT_LIVING_POP = "data/processed/living_population/seoul_living_population_dong_hourly_2023-01_2025-12.csv"
DEFAULT_POI = "data/processed/poi/dong_static_poi_features.csv"
DEFAULT_OUT = "data/processed/features/dong_hour_features_v2_2023-01_2025-12.csv"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--start-date", default="2023-01-01")
    parser.add_argument("--end-date", default="2025-12-31")
    parser.add_argument("--topis", default=DEFAULT_TOPIS)
    parser.add_argument("--od", default=DEFAULT_OD)
    parser.add_argument("--weather", default=DEFAULT_WEATHER)
    parser.add_argument("--holidays", default=DEFAULT_HOLIDAYS)
    parser.add_argument("--living-pop", default=DEFAULT_LIVING_POP)
    parser.add_argument("--poi", default=DEFAULT_POI)
    parser.add_argument("--out", default=DEFAULT_OUT)
    return parser.parse_args()


def read_csv_map(path: Path, key_fn) -> dict:
    result = {}
    with path.open(newline="", encoding="utf-8") as handle:
        for row in csv.DictReader(handle):
            result[key_fn(row)] = row
    return result


def read_holidays(path: Path) -> dict[str, dict]:
    holidays: dict[str, dict] = {}
    with path.open(newline="", encoding="utf-8") as handle:
        for row in csv.DictReader(handle):
            date = row["date"]
            entry = holidays.setdefault(date, {"is_holiday": "N", "holiday_names": []})
            if row.get("is_holiday") == "Y":
                entry["is_holiday"] = "Y"
            if row.get("date_name"):
                entry["holiday_names"].append(row["date_name"])
    for entry in holidays.values():
        entry["holiday_names"] = "|".join(dict.fromkeys(entry["holiday_names"]))
    return holidays


def weather_key(row: dict) -> tuple[str, str]:
    date, time = row["datetime_kst"].split(" ")
    return date, str(int(time.split(":")[0]))


def csv_value(value):
    return "" if value is None else value


def to_float(value) -> float | None:
    if value in (None, ""):
        return None
    try:
        return float(value)
    except ValueError:
        return None


def per_1000(value, population) -> str:
    numerator = to_float(value)
    denominator = to_float(population)
    if numerator is None or denominator is None or denominator <= 0:
        return ""
    return round(numerator / denominator * 1000, 6)


def main() -> None:
    args = parse_args()
    topis_path = Path(args.topis)
    od_path = Path(args.od)
    weather_path = Path(args.weather)
    holidays_path = Path(args.holidays)
    living_pop_path = Path(args.living_pop)
    poi_path = Path(args.poi)
    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    od_by_key = read_csv_map(
        od_path,
        lambda row: (row["date"], row["hour"], row["dong_name"]),
    )
    weather_by_key = read_csv_map(weather_path, weather_key)
    holidays_by_date = read_holidays(holidays_path)
    living_pop_by_key = read_csv_map(
        living_pop_path,
        lambda row: (row["date"], row["hour"], row["dong_name"]),
    ) if living_pop_path.exists() else {}
    poi_by_dong = read_csv_map(poi_path, lambda row: row["dong_name"]) if poi_path.exists() else {}

    poi_fields = [
        "dong_area_m2",
        "building_count",
        "building_footprint_area_m2",
        "estimated_floor_area_m2",
        "avg_building_height_m",
        "commercial_building_count",
        "apartments_building_count",
        "hotel_building_count",
        "bus_stop_count",
        "subway_station_count",
        "transit_importance_sum",
        "traffic_signal_count",
        "road_count",
        "road_length_m",
        "arterial_road_length_m",
        "connector_road_length_m",
        "local_road_length_m",
        "green_area_m2",
        "water_area_m2",
        "nonroad_feature_count",
    ]

    fieldnames = [
        "datetime_kst",
        "date",
        "hour",
        "weekday",
        "day_type",
        "dong_name",
        "is_holiday",
        "holiday_names",
        "traffic_volume_proxy",
        "topis_source_spot_count",
        "topis_assignment_type",
        "topis_missing_value_rows",
        "living_population_available",
        "living_population_total",
        "living_population_20s",
        "living_population_30s",
        "living_population_40s",
        "living_population_50s",
        "traffic_volume_proxy_per_1k_pop",
        "transit_od_available",
        "outbound_boardings",
        "inbound_boardings",
        "net_inbound_boardings",
        "outbound_boardings_per_1k_pop",
        "inbound_boardings_per_1k_pop",
        "net_inbound_boardings_per_1k_pop",
        "within_target_outbound_boardings",
        "within_target_inbound_boardings",
        "od_source_rows",
        "od_nonzero_rows",
        "temperature_c",
        "precipitation_mm",
        "wind_speed_ms",
        "humidity_pct",
        "sea_level_pressure_hpa",
        "snow_depth_cm",
        "cloud_total_tenths",
        "visibility_10m",
        *poi_fields,
    ]

    row_count = 0
    od_missing_count = 0
    weather_missing_count = 0
    living_pop_missing_count = 0
    poi_missing_count = 0
    holiday_count = 0
    dongs = set()
    dates = set()

    with topis_path.open(newline="", encoding="utf-8") as topis_handle, out_path.open(
        "w",
        newline="",
        encoding="utf-8",
    ) as out_handle:
        reader = csv.DictReader(topis_handle)
        writer = csv.DictWriter(out_handle, fieldnames=fieldnames)
        writer.writeheader()

        for topis in reader:
            date = topis["date"]
            if date < args.start_date or date > args.end_date:
                continue

            hour = topis["hour"]
            dong_name = topis["dong_name"]
            od = od_by_key.get((date, hour, dong_name))
            weather = weather_by_key.get((date, hour))
            holiday = holidays_by_date.get(date, {"is_holiday": "N", "holiday_names": ""})
            living_pop = living_pop_by_key.get((date, hour, dong_name))
            poi = poi_by_dong.get(dong_name)

            if od is None:
                od_missing_count += 1
                od = {}
            if weather is None:
                weather_missing_count += 1
                weather = {}
            if living_pop is None:
                living_pop_missing_count += 1
                living_pop = {}
            if poi is None:
                poi_missing_count += 1
                poi = {}
            if holiday["is_holiday"] == "Y":
                holiday_count += 1

            dongs.add(dong_name)
            dates.add(date)
            row_count += 1

            writer.writerow(
                {
                    "datetime_kst": topis["datetime_kst"],
                    "date": date,
                    "hour": hour,
                    "weekday": topis["weekday"],
                    "day_type": topis["day_type"],
                    "dong_name": dong_name,
                    "is_holiday": holiday["is_holiday"],
                    "holiday_names": holiday["holiday_names"],
                    "traffic_volume_proxy": topis["traffic_volume_proxy"],
                    "topis_source_spot_count": topis["source_spot_count"],
                    "topis_assignment_type": topis["assignment_type"],
                    "topis_missing_value_rows": topis["missing_value_rows"],
                    "living_population_available": "Y" if living_pop else "N",
                    "living_population_total": csv_value(living_pop.get("living_population_total")),
                    "living_population_20s": csv_value(living_pop.get("living_population_20s")),
                    "living_population_30s": csv_value(living_pop.get("living_population_30s")),
                    "living_population_40s": csv_value(living_pop.get("living_population_40s")),
                    "living_population_50s": csv_value(living_pop.get("living_population_50s")),
                    "traffic_volume_proxy_per_1k_pop": per_1000(
                        topis["traffic_volume_proxy"],
                        living_pop.get("living_population_total"),
                    ),
                    "transit_od_available": "Y" if od else "N",
                    "outbound_boardings": csv_value(od.get("outbound_boardings")),
                    "inbound_boardings": csv_value(od.get("inbound_boardings")),
                    "net_inbound_boardings": csv_value(od.get("net_inbound_boardings")),
                    "outbound_boardings_per_1k_pop": per_1000(
                        od.get("outbound_boardings"),
                        living_pop.get("living_population_total"),
                    ),
                    "inbound_boardings_per_1k_pop": per_1000(
                        od.get("inbound_boardings"),
                        living_pop.get("living_population_total"),
                    ),
                    "net_inbound_boardings_per_1k_pop": per_1000(
                        od.get("net_inbound_boardings"),
                        living_pop.get("living_population_total"),
                    ),
                    "within_target_outbound_boardings": csv_value(od.get("within_target_outbound_boardings")),
                    "within_target_inbound_boardings": csv_value(od.get("within_target_inbound_boardings")),
                    "od_source_rows": csv_value(od.get("source_od_rows")),
                    "od_nonzero_rows": csv_value(od.get("nonzero_od_rows")),
                    "temperature_c": csv_value(weather.get("temperature_c")),
                    "precipitation_mm": csv_value(weather.get("precipitation_mm")),
                    "wind_speed_ms": csv_value(weather.get("wind_speed_ms")),
                    "humidity_pct": csv_value(weather.get("humidity_pct")),
                    "sea_level_pressure_hpa": csv_value(weather.get("sea_level_pressure_hpa")),
                    "snow_depth_cm": csv_value(weather.get("snow_depth_cm")),
                    "cloud_total_tenths": csv_value(weather.get("cloud_total_tenths")),
                    "visibility_10m": csv_value(weather.get("visibility_10m")),
                    **{field: csv_value(poi.get(field)) for field in poi_fields},
                }
            )

    summary = {
        "source": "joined dong-hour feature table",
        "range": {"start_date": args.start_date, "end_date": args.end_date},
        "output_csv": str(out_path),
        "row_count": row_count,
        "date_count": len(dates),
        "dong_count": len(dongs),
        "covered_dongs": sorted(dongs),
        "transit_od_missing_rows": od_missing_count,
        "weather_missing_rows": weather_missing_count,
        "living_population_missing_rows": living_pop_missing_count,
        "poi_missing_rows": poi_missing_count,
        "holiday_rows": holiday_count,
        "inputs": {
            "topis": str(topis_path),
            "transit_od": str(od_path),
            "weather": str(weather_path),
            "holidays": str(holidays_path),
            "living_population": str(living_pop_path),
            "poi": str(poi_path),
        },
        "notes": [
            "Base grain is dong x date x hour.",
            "traffic_volume_proxy comes from TOPIS spot data spatially mapped to dongs.",
            "living_population_total enables per-1,000-population normalization.",
            "POI fields are static dong-level explanatory features.",
            "transit OD missing rows are blank, not zero, because some source months are partial.",
            "This is a model feature table, not a direct taxi-call label table.",
        ],
    }
    summary_path = out_path.with_suffix(".summary.json")
    summary_path.write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(f"Wrote {out_path} ({row_count:,} rows)")
    print(f"Wrote {summary_path}")
    print(f"Transit OD missing rows: {od_missing_count:,}")
    print(f"Weather missing rows: {weather_missing_count:,}")
    print(f"Living population missing rows: {living_pop_missing_count:,}")
    print(f"POI missing rows: {poi_missing_count:,}")


if __name__ == "__main__":
    main()

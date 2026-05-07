# Gangnam Event Calendar Notes: Mar 2 to Apr 2, 2025 and 2026

## Scope

This note summarizes holiday and event context for Gangnam taxi-demand error analysis.

- Date windows: `2025-03-02` to `2025-04-02`, and `2026-03-02` to `2026-04-02`.
- Focus dates: March 8, 15, 22, and 29 in both years.
- Machine-readable event rows: [gangnam_event_calendar_2025_2026_mar02_apr02.csv](/home/kenny31/yeoksam-taxi/data/raw/events/gangnam_event_calendar_2025_2026_mar02_apr02.csv)
- Project target dongs: `역삼1동`, `역삼2동`, `논현1동`, `논현2동`, `삼성1동`, `삼성2동`, `신사동`, `청담동`, `대치4동`.
- User-requested extra dong: `압구정동`. Current project POI config tracks `압구정로데오거리` as an unmapped watch point, not a live target-dong aggregation input.

## Public Holidays

The local processed calendar, sourced from 한국천문연구원 특일 정보 via data.go.kr, has:

- `2025-03-01`: 삼일절, Saturday.
- `2025-03-03`: 대체공휴일.
- `2026-03-01`: 삼일절, Sunday.
- `2026-03-02`: 대체공휴일(삼일절).

Modeling implication:

- 2025 window starts on the middle of a three-day holiday weekend (`2025-03-02`) and includes the Monday substitute holiday (`2025-03-03`).
- 2026 window starts directly on a substitute holiday (`2026-03-02`).

## Date Pattern

In 2025, March 8, 15, 22, and 29 were all Saturdays.

In 2026, March 8, 15, 22, and 29 were all Sundays.

This matters because 2025 Saturday evening/night movement can be materially different from 2026 Sunday return-home movement even when the calendar day-of-month is the same.

## 2025 High-Error Candidate Drivers

### March 8, 2025

Likely event stack:

- COEX: 제370회 웨딩박람회, March 8 to 9.
- COEX: 제24회 edm세계유학박람회, March 8 to 9.
- Gangnam Station / Monaco Space: IDP 2025 세계유학박람회, March 8 to 9.
- Citywide: major impeachment-related rallies, with reporting that included Seoul citywide crowds and some Gangnam/Seocho movement.
- Calendar-cultural: March 8 was a 손 없는 날.
- COEX residual: InterBattery ended March 7, so teardown/hotel/business-taxi residue is plausible but secondary.

Interpretation:

This is not one single COEX mega-event day. It is a Saturday with several medium events plus a large citywide political mobility shock. If all Gangnam dongs had high error, the citywide rally/supply-reallocation factor is more convincing than only the COEX/강남역 events.

### March 15, 2025

Likely event stack:

- COEX: 제371회 웨딩박람회, March 15 to 16.
- Gangnam Station / Monaco Space: 2025 영국대학박람회, March 14 to 15.
- Citywide: 탄핵 선고 전 대규모 찬반 집회 and police traffic management.
- COEX residual: Smart Factory + Automation World ended March 14, so teardown/business-travel residue is possible.

Interpretation:

3/15 has less direct COEX volume than 3/22 or 3/29. If the whole Gangnam panel had high error, citywide rally/taxi-supply effects and ordinary Saturday nightlife should be considered ahead of a single local event.

### March 22, 2025

Likely event stack:

- COEX: KIMES 2025, March 20 to 23, all halls and a very strong candidate.
- SETEC: 2025 티앤크래프트페어, March 20 to 23, adjacent to the Daechi corridor.
- Citywide: impeachment-related rallies and road management.
- Adjacent Seoul southeast: 2025 KBO opening weekend at Jamsil.

Interpretation:

3/22 has the strongest local venue explanation. KIMES is the main event candidate for `삼성1동`, `삼성2동`, and spillover to `청담동`/`대치4동`. SETEC strengthens the `대치4동` adjacent explanation.

### March 29, 2025

Likely event stack:

- COEX: SPOEX 2025, March 27 to 30.
- COEX: 제372회 웨딩박람회, March 29 to 30.
- Citywide: large 서울 도심 탄핵 집회 and traffic disruption reporting.
- Calendar-cultural: March 29 was a 손 없는 날.
- Seasonal: late-March spring leisure/cherry-blossom pre-season can raise outing demand, but this is weaker than the venue/rally evidence.

Interpretation:

3/29 combines a high-volume COEX exhibition, a wedding fair, and citywide rally pressure. For all-Gangnam high error, use both `coex_major_event` and `citywide_rally` style features.

## 2026 Comparable Dates

### March 8, 2026

Likely event stack:

- COEX: 제410회 웨덱스 웨딩박람회, March 7 to 8.
- COEX: 제61회 캐나다 유학박람회, March 7 to 8.
- COEX residual: AW 2026 ended March 6.
- Cheongdam: Philippe Geluck gallery exhibition opened March 7, low local impact.

Interpretation:

This is a Sunday with medium COEX convention-room events. It is not comparable to 2025-03-08's Saturday plus political-rally shock.

### March 15, 2026

Likely event stack:

- COEX: 제411회 웨덱스 웨딩박람회, March 14 to 15.
- COEX residual: InterBattery 2026 ended March 13.

Interpretation:

This is a lighter Sunday event stack than 2025-03-15 unless residual InterBattery business travel is visible in observed data.

### March 22, 2026

Likely event stack:

- COEX: KIMES 2026, March 19 to 22, all halls.
- SETEC: 2026 케이펫페어 세텍, March 20 to 22, all SETEC halls.

Interpretation:

This is a strong Sunday venue day. Compared with 2025-03-22, both years have KIMES, but 2026 also has a stronger SETEC overlap than the 2025 tea/craft event.

### March 29, 2026

Likely event stack:

- COEX: SPOEX 2026, March 26 to 29.
- COEX: 2026 상반기 해외 유학 이민 박람회, March 28 to 29.
- COEX: 제412회 웨덱스 웨딩박람회, March 28 to 29.
- SETEC: 푸드테크 비건페스타&그린페스타, March 27 to 29.
- SETEC: SMKX 2026, March 28 to 29.
- Adjacent southeast Seoul: 2026 KBO opening weekend at Jamsil, March 28 to 29.

Interpretation:

This is the densest 2026 focus date. If 2026-03-29 has large observed demand, model it as multi-venue overlap rather than a generic Sunday.

## Dong-Level Notes

- `삼성1동`: COEX/MICE district is the direct driver. Use COEX event size, hall coverage, and event end day.
- `삼성2동`: Seolleung/office corridor spillover. COEX is indirect but still plausible through road/taxi redistribution.
- `역삼1동`: 강남역 events such as Monaco Space fairs are direct. Also sensitive to citywide taxi supply shifts and nightlife.
- `논현1동`: 신논현/논현 corridor spillover from 강남역 and nightlife; direct large events were not found in the period.
- `논현2동`: no major mass event found. Keep small venue items only as low-impact context; high errors here likely indicate spillover, supply, weather, or generic weekend effects.
- `청담동`: galleries and popups exist, but they are low-intensity compared with COEX/SETEC. Use as local context, not primary explanation.
- `압구정동`: requested by user, but not a current project target dong. 압구정로데오 should remain a watch point until boundary mapping is explicit.
- `대치4동`: no direct major venue found. SETEC is adjacent to the Daechi corridor and should be modeled as `setec_adjacent_event`, not as a direct 대치4동 event unless boundary mapping is updated.

## Recommended Feature Flags

Add or backfill these as event/calendar features before retraining or error slicing:

- `is_holiday`
- `is_holiday_bridge`
- `is_saturday`
- `is_sunday`
- `coex_event_count`
- `coex_major_event`
- `coex_all_hall_event`
- `coex_event_end_day`
- `gangnam_station_fair`
- `setec_adjacent_event`
- `citywide_rally_or_major_traffic_control`
- `jamsil_sports_adjacent`
- `moving_lucky_day`

For 2025 March Saturdays, `citywide_rally_or_major_traffic_control` is especially important. Without it, the model may incorrectly attribute all-Gangnam error to individual COEX events.

## Source Reliability

Most high-impact venue rows use official COEX or SETEC event pages. Public-holiday rows use the local processed KASI/data.go.kr calendar file. Citywide rally rows use press reports and should be treated as external shock annotations, not venue events. Small gallery/popup rows are low-impact context and should not dominate modeling.

# Data Sources Summary

이 폴더는 A-Eye / 역삼동 택시 Digital Twin의 로컬 데이터 수집 결과를 담습니다.
대용량 원본과 처리 산출물은 git에 올리지 않고, 출처와 재현 명령만 문서화합니다.

## Target Region

대상 행정동은 `public/dongs.geojson` 기준 강남구 9개 동입니다.

- 역삼1동
- 역삼2동
- 논현1동
- 논현2동
- 삼성1동
- 삼성2동
- 신사동
- 청담동
- 대치4동

## Source Classes

- 행정동 원천 데이터: 대중교통 승차량, 버스/지하철 승차량, 대중교통 OD, 생활인구/생활이동
- 지점/링크 매핑 데이터: TOPIS 교통량, 도로 링크 혼잡도, ASOS/AWS 날씨
- 비공개/제한 데이터: 실제 KakaoT 호출량, 실시간 택시 위치, 택시 iDTG/GPS 원천 로그

## Current Collection Status

- TOPIS 월별 교통량: 2023-01 ~ 2026-03 수집 및 9개 동 proxy 변환 완료
- 서울 행정동 대중교통 OpenAPI: 최신 60일권 수집 완료, 장기 과거분은 파일 기반 OD로 보강
- 서울 대중교통 OD 월별 파일: 2023-01 ~ 2025-12 수집 및 9개 동 dong-hour 변환 완료
- 서울 생활인구(내국인): 2023-01 ~ 2025-12 수집 및 9개 동 dong-hour 변환 완료
- KMA ASOS 장기 시간자료: 2023-01-01 ~ 2026-03-31 서울 관측소 108 수집 완료
- 한국 공휴일/특일: 2023 ~ 2026 수집 완료
- POI/건물/도로 정적 feature: 9개 동 생성 완료
- 통합 dong-hour feature table v2: 2023-01-01 ~ 2025-12-31 생성 완료
- 1시간 뒤 이동 수요 proxy 모델: 학습/평가 산출물 생성 완료
- 실시간 도시데이터/citydata: 최신 도로 링크 혼잡도 수집 및 동별 요약 생성 완료

## Repro Commands

```bash
npm run data:collect:topis -- 2026-03
npm run data:collect:transit -- 2023-01-01:2025-12-31
npm run data:collect:transit:od -- 2023-01:2025-12
npm run data:combine:transit:od -- --start 2023-01 --end 2025-12
npm run data:collect:living-pop -- 2023-01:2025-12
npm run data:combine:living-pop -- --start 2023-01 --end 2025-12
npm run data:collect:weather:asos -- 2023-01-01:2026-03-31 108
npm run data:collect:holidays -- 2023:2026
npm run data:features:poi
npm run data:features:dong-hour
npm run model:train:demand-proxy
npm run data:collect:citydata
npm run data:traffic
npm run data:collect:live
```

API 키 값은 문서나 로그에 기록하지 않습니다.

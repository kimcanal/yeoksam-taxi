const KMA_NX = 61;
const KMA_NY = 125;

function kstBaseTime(): { base_date: string; base_time: string } {
  const kstMs = Date.now() + 9 * 60 * 60 * 1000;
  const kst = new Date(kstMs);

  const year = kst.getUTCFullYear();
  const month = String(kst.getUTCMonth() + 1).padStart(2, "0");
  const day = kst.getUTCDate();
  let hour = kst.getUTCHours();
  const minute = kst.getUTCMinutes();

  if (minute < 10) {
    if (hour === 0) {
      const yesterday = new Date(kstMs - 24 * 60 * 60 * 1000);
      return {
        base_date: `${yesterday.getUTCFullYear()}${String(yesterday.getUTCMonth() + 1).padStart(2, "0")}${String(yesterday.getUTCDate()).padStart(2, "0")}`,
        base_time: "2300",
      };
    }
    hour -= 1;
  }

  return {
    base_date: `${year}${month}${String(day).padStart(2, "0")}`,
    base_time: `${String(hour).padStart(2, "0")}00`,
  };
}

export async function GET() {
  const apiKey = process.env.KMA_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "KMA_API_KEY not configured" }, { status: 503 });
  }

  const { base_date, base_time } = kstBaseTime();

  const params = new URLSearchParams({
    serviceKey: apiKey,
    numOfRows: "10",
    pageNo: "1",
    dataType: "JSON",
    base_date,
    base_time,
    nx: String(KMA_NX),
    ny: String(KMA_NY),
  });

  const res = await fetch(
    `https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst?${params}`,
    { cache: "no-store" },
  );

  if (!res.ok) {
    return Response.json(
      { error: "KMA upstream error", status: res.status },
      { status: 502 },
    );
  }

  const json = await res.json() as Record<string, unknown>;
  const rawItems =
    (json as { response?: { body?: { items?: { item?: unknown[] } } } })
      ?.response?.body?.items?.item ?? [];
  const items = rawItems as Array<Record<string, unknown>>;

  return Response.json({
    meta: {
      source: "KMA VilageFcstInfoService_2.0",
      grid: { nx: KMA_NX, ny: KMA_NY },
      fetched_at: new Date().toISOString(),
    },
    nowcast: {
      base_date,
      base_time,
      categories: ["T1H", "RN1", "PTY", "REH"],
      items: items.map((item) => ({
        category: String(item.category ?? ""),
        value: String(item.obsrValue ?? ""),
        base_date: String(item.baseDate ?? base_date),
        base_time: String(item.baseTime ?? base_time),
        nx: KMA_NX,
        ny: KMA_NY,
        forecast_date: null,
        forecast_time: null,
      })),
    },
  });
}

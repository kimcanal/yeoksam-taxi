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
  const apiKeyCandidates = [
    ["KMA_API_KEY", process.env.KMA_API_KEY],
    ["DATA_GO_KR_API", process.env.DATA_GO_KR_API],
    ["DATA_GO_KR_API_KEY", process.env.DATA_GO_KR_API_KEY],
    ["apihub_kma_go_kr_api", process.env.apihub_kma_go_kr_api],
  ]
    .filter((candidate): candidate is [string, string] => Boolean(candidate[1]))
    .filter(
      (candidate, index, candidates) =>
        candidates.findIndex(([, value]) => value === candidate[1]) === index,
    );

  if (!apiKeyCandidates.length) {
    return Response.json(
      { error: "KMA API key not configured" },
      { status: 503 },
    );
  }

  const { base_date, base_time } = kstBaseTime();

  const params = new URLSearchParams({
    numOfRows: "10",
    pageNo: "1",
    dataType: "JSON",
    base_date,
    base_time,
    nx: String(KMA_NX),
    ny: String(KMA_NY),
  });

  let json: Record<string, unknown> | null = null;
  let credentialSource: string | null = null;
  let lastStatus: number | null = null;
  let lastError = "";

  for (const [source, apiKey] of apiKeyCandidates) {
    const res = await fetch(
      `https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst?serviceKey=${apiKey}&${params}`,
      { cache: "no-store" },
    );
    lastStatus = res.status;
    credentialSource = source;
    if (res.ok) {
      json = await res.json() as Record<string, unknown>;
      break;
    }
    lastError = (await res.text()).slice(0, 500);
  }

  if (!json) {
    return Response.json(
      {
        error: "KMA upstream error",
        status: lastStatus,
        credential_source: credentialSource,
        detail: lastError,
      },
      { status: 502 },
    );
  }

  const rawItems =
    (json as { response?: { body?: { items?: { item?: unknown[] } } } })
      ?.response?.body?.items?.item ?? [];
  const items = rawItems as Array<Record<string, unknown>>;

  return Response.json({
    meta: {
      source: "KMA VilageFcstInfoService_2.0",
      credential_source: credentialSource,
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

"use client";

import { useEffect } from "react";
import { createStore, type StoreApi } from "@/lib/external-store";

export type QueryStatus = "idle" | "loading" | "ok" | "error";

type QueryState<Data> = {
  data: Data | null;
  status: QueryStatus;
  errorMessage: string | null;
  updatedAt: string | null;
};

type QueryEntry<Data> = {
  key: string;
  store: StoreApi<QueryState<Data>>;
  listeners: number;
  inflight: Promise<void> | null;
  retryTimer: ReturnType<typeof setTimeout> | null;
  disposeTimer: ReturnType<typeof setTimeout> | null;
  eventSource: EventSource | null;
  stop: (() => void) | null;
};

type JsonQueryOptions = {
  staleTimeMs?: number;
  retryCount?: number;
  retryDelayMs?: number;
  revalidateOnFocus?: boolean;
};

type EventSourceQueryOptions<Data> = {
  eventName?: string;
  retryDelayMs?: number;
  maxRetryDelayMs?: number;
  parse: (payload: unknown) => Data;
};

type ResolvedEventSourceQueryOptions<Data> = {
  eventName: string;
  retryDelayMs: number;
  maxRetryDelayMs: number;
  parse: (payload: unknown) => Data;
};

const QUERY_ENTRY_DISPOSE_MS = 60_000;
const DEFAULT_JSON_OPTIONS: Required<JsonQueryOptions> = {
  staleTimeMs: 60_000,
  retryCount: 1,
  retryDelayMs: 1_500,
  revalidateOnFocus: true,
};

const queryEntries = new Map<string, QueryEntry<unknown>>();

function createQueryEntry<Data>(key: string): QueryEntry<Data> {
  return {
    key,
    store: createStore<QueryState<Data>>({
      data: null,
      status: "idle",
      errorMessage: null,
      updatedAt: null,
    }),
    listeners: 0,
    inflight: null,
    retryTimer: null,
    disposeTimer: null,
    eventSource: null,
    stop: null,
  };
}

function getQueryEntry<Data>(key: string) {
  const existing = queryEntries.get(key);
  if (existing) {
    return existing as QueryEntry<Data>;
  }
  const next = createQueryEntry<Data>(key);
  queryEntries.set(key, next as QueryEntry<unknown>);
  return next;
}

function clearEntryTimers<Data>(entry: QueryEntry<Data>) {
  if (entry.retryTimer) {
    clearTimeout(entry.retryTimer);
    entry.retryTimer = null;
  }
  if (entry.disposeTimer) {
    clearTimeout(entry.disposeTimer);
    entry.disposeTimer = null;
  }
}

function disposeEntry<Data>(entry: QueryEntry<Data>) {
  clearEntryTimers(entry);
  entry.stop?.();
  entry.stop = null;
  entry.eventSource?.close();
  entry.eventSource = null;
  queryEntries.delete(entry.key);
}

function retainEntry<Data>(entry: QueryEntry<Data>) {
  entry.listeners += 1;
  if (entry.disposeTimer) {
    clearTimeout(entry.disposeTimer);
    entry.disposeTimer = null;
  }

  return () => {
    entry.listeners = Math.max(0, entry.listeners - 1);
    if (entry.listeners > 0) {
      return;
    }

    entry.disposeTimer = setTimeout(() => {
      if (entry.listeners === 0) {
        disposeEntry(entry);
      }
    }, QUERY_ENTRY_DISPOSE_MS);
  };
}

function shouldRevalidate<Data>(
  entry: QueryEntry<Data>,
  staleTimeMs: number,
) {
  const state = entry.store.getState();
  if (!state.updatedAt) {
    return true;
  }
  return Date.now() - new Date(state.updatedAt).getTime() > staleTimeMs;
}

async function runJsonFetch<Data>(
  entry: QueryEntry<Data>,
  fetcher: () => Promise<Data | null>,
  options: Required<JsonQueryOptions>,
  attempt = 0,
): Promise<void> {
  const currentState = entry.store.getState();
  if (currentState.status === "idle" && currentState.data === null) {
    entry.store.setState({ status: "loading", errorMessage: null });
  } else {
    entry.store.setState({ status: "loading" });
  }

  entry.inflight = (async () => {
    try {
      const data = await fetcher();
      entry.store.setState({
        data,
        status: "ok",
        errorMessage: null,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown fetch error";
      entry.store.setState({
        status: "error",
        errorMessage: message,
      });

      if (attempt < options.retryCount) {
        entry.retryTimer = setTimeout(() => {
          void runJsonFetch(entry, fetcher, options, attempt + 1);
        }, options.retryDelayMs * (attempt + 1));
      }
    } finally {
      entry.inflight = null;
    }
  })();

  await entry.inflight;
}

export function useJsonQuery<Data>(
  key: string,
  fetcher: () => Promise<Data | null>,
  options?: JsonQueryOptions,
) {
  const entry = getQueryEntry<Data>(key);
  const staleTimeMs = options?.staleTimeMs ?? DEFAULT_JSON_OPTIONS.staleTimeMs;
  const retryCount = options?.retryCount ?? DEFAULT_JSON_OPTIONS.retryCount;
  const retryDelayMs = options?.retryDelayMs ?? DEFAULT_JSON_OPTIONS.retryDelayMs;
  const revalidateOnFocus =
    options?.revalidateOnFocus ?? DEFAULT_JSON_OPTIONS.revalidateOnFocus;
  const snapshot = entry.store.useStore((state) => state);

  useEffect(() => {
    const release = retainEntry(entry);

    if (!entry.inflight && shouldRevalidate(entry, staleTimeMs)) {
      void runJsonFetch(entry, fetcher, {
        staleTimeMs,
        retryCount,
        retryDelayMs,
        revalidateOnFocus,
      });
    }

    if (revalidateOnFocus) {
      const onFocus = () => {
        if (!entry.inflight && shouldRevalidate(entry, staleTimeMs)) {
          void runJsonFetch(entry, fetcher, {
            staleTimeMs,
            retryCount,
            retryDelayMs,
            revalidateOnFocus,
          });
        }
      };
      window.addEventListener("focus", onFocus);

      return () => {
        window.removeEventListener("focus", onFocus);
        release();
      };
    }

    return release;
  }, [entry, fetcher, revalidateOnFocus, retryCount, retryDelayMs, staleTimeMs]);

  return snapshot;
}

function startEventSource<Data>(
  entry: QueryEntry<Data>,
  url: string,
  options: ResolvedEventSourceQueryOptions<Data>,
  attempt = 0,
) {
  if (entry.eventSource || entry.listeners === 0) {
    return;
  }

  entry.store.setState((current) => ({
    status: current.data === null ? "loading" : current.status,
    errorMessage: null,
  }));

  const eventSource = new EventSource(url);
  entry.eventSource = eventSource;

  const stop = () => {
    if (entry.eventSource === eventSource) {
      eventSource.close();
      entry.eventSource = null;
    }
  };

  entry.stop = stop;

  const handleSnapshotEvent = (event: Event) => {
    const messageEvent = event as MessageEvent<string>;
    try {
      const payload = JSON.parse(messageEvent.data) as unknown;
      entry.store.setState({
        data: options.parse(payload),
        status: "ok",
        errorMessage: null,
        updatedAt: new Date().toISOString(),
      });
      attempt = 0;
    } catch (error) {
      entry.store.setState({
        status: "error",
        errorMessage:
          error instanceof Error ? error.message : "Invalid stream payload",
      });
    }
  };

  eventSource.addEventListener(options.eventName ?? "snapshot", handleSnapshotEvent);
  if ((options.eventName ?? "snapshot") !== "message") {
    eventSource.addEventListener("message", handleSnapshotEvent);
  }

  eventSource.addEventListener("snapshot-error", (event) => {
    const messageEvent = event as MessageEvent<string>;
    let errorMessage = messageEvent.data;
    try {
      const parsed = JSON.parse(messageEvent.data) as {
        message?: string;
        status?: number;
      };
      errorMessage = parsed.status
        ? `${parsed.status}: ${parsed.message ?? "Realtime snapshot error"}`
        : (parsed.message ?? errorMessage);
    } catch {
      // Keep raw message.
    }
    entry.store.setState({
      status: "error",
      errorMessage,
    });
  });

  eventSource.onerror = () => {
    stop();
    if (entry.listeners === 0) {
      return;
    }
    const retryDelay = Math.min(
      options.retryDelayMs * 2 ** attempt,
      options.maxRetryDelayMs,
    );
    entry.store.setState({
      status: entry.store.getState().data ? "ok" : "error",
      errorMessage: "Realtime stream disconnected",
    });
    entry.retryTimer = setTimeout(() => {
      startEventSource(entry, url, options, attempt + 1);
    }, retryDelay);
  };
}

export function useEventSourceQuery<Data>(
  key: string,
  url: string,
  options: EventSourceQueryOptions<Data>,
) {
  const entry = getQueryEntry<Data>(key);
  const eventName = options.eventName ?? "snapshot";
  const retryDelayMs = options.retryDelayMs ?? 1_500;
  const maxRetryDelayMs = options.maxRetryDelayMs ?? 15_000;
  const snapshot = entry.store.useStore((state) => state);

  useEffect(() => {
    const release = retainEntry(entry);
    startEventSource(entry, url, {
      eventName,
      retryDelayMs,
      maxRetryDelayMs,
      parse: options.parse,
    });

    return () => {
      release();
    };
  }, [entry, eventName, maxRetryDelayMs, options.parse, retryDelayMs, url]);

  return snapshot;
}

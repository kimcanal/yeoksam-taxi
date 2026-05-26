type DeferredAssetLoadSchedulerOptions = {
  isDisposed: () => boolean;
  userIdleMs?: number;
};

type CancelScheduledLoad = () => void;

export type DeferredAssetLoadScheduler = {
  markUserInteraction: () => void;
  schedule: (
    callback: () => void,
    delayMs: number,
    idleTimeoutMs: number,
  ) => CancelScheduledLoad;
};

export function createDeferredAssetLoadScheduler({
  isDisposed,
  userIdleMs = 650,
}: DeferredAssetLoadSchedulerOptions): DeferredAssetLoadScheduler {
  let lastUserInteractionTimestamp = performance.now();

  const markUserInteraction = () => {
    lastUserInteractionTimestamp = performance.now();
  };

  const waitForIdleSlice = (callback: () => void, timeoutMs: number) => {
    const requestIdleCallback = window.requestIdleCallback?.bind(window);
    if (requestIdleCallback) {
      return requestIdleCallback(
        () => {
          if (!isDisposed()) {
            callback();
          }
        },
        { timeout: timeoutMs },
      );
    }

    return window.setTimeout(() => {
      if (!isDisposed()) {
        callback();
      }
    }, 0);
  };

  const cancelIdleSlice = (handle: number) => {
    if (!handle) {
      return;
    }

    const cancelIdleCallback = window.cancelIdleCallback?.bind(window);
    if (cancelIdleCallback) {
      cancelIdleCallback(handle);
      return;
    }

    window.clearTimeout(handle);
  };

  const schedule = (
    callback: () => void,
    delayMs: number,
    idleTimeoutMs: number,
  ) => {
    let idleHandle = 0;
    let retryHandle = 0;
    const scheduleWhenInteractionSettles = () => {
      if (isDisposed()) {
        return;
      }

      const idleForMs = performance.now() - lastUserInteractionTimestamp;
      if (idleForMs < userIdleMs) {
        retryHandle = window.setTimeout(
          scheduleWhenInteractionSettles,
          Math.min(userIdleMs - idleForMs, 420),
        );
        return;
      }

      idleHandle = waitForIdleSlice(callback, idleTimeoutMs);
    };

    const timeoutHandle = window.setTimeout(
      scheduleWhenInteractionSettles,
      delayMs,
    );

    return () => {
      window.clearTimeout(timeoutHandle);
      window.clearTimeout(retryHandle);
      cancelIdleSlice(idleHandle);
    };
  };

  return { markUserInteraction, schedule };
}

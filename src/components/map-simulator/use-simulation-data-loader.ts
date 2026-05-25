import {
  startTransition,
  useEffect,
  type Dispatch,
  type SetStateAction,
} from "react";
import { loadSimulationData } from "@/components/map-simulator/load-simulation-data";
import type {
  SceneStatus,
  SimulationData,
} from "@/components/map-simulator/map-simulator-types";

type UseSimulationDataLoaderParams = {
  setData: Dispatch<SetStateAction<SimulationData | null>>;
  setStatus: Dispatch<SetStateAction<SceneStatus>>;
  setStatusDetail: Dispatch<SetStateAction<string>>;
  setLoadingProgress: Dispatch<SetStateAction<number>>;
};

export function useSimulationDataLoader({
  setData,
  setStatus,
  setStatusDetail,
  setLoadingProgress,
}: UseSimulationDataLoaderParams) {
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const markSceneRendering = (detail: string) => {
      setStatus("rendering");
      setStatusDetail(detail);
    };
    const markSceneError = (detail: string) => {
      setStatus("error");
      setStatusDetail(detail);
    };

    void loadSimulationData({
      signal: controller.signal,
      onAssetProgress: (loaded, total) => {
        if (!cancelled) {
          setLoadingProgress(Math.round((loaded / total) * 42));
        }
      },
      onStageChange: (detail, progress) => {
        if (!cancelled) {
          setStatusDetail(detail);
          setLoadingProgress(progress);
        }
      },
    })
      .then((nextData) => {
        if (cancelled) {
          return;
        }

        setLoadingProgress(72);
        markSceneRendering("3D 장면과 차량 레이어 구성 중");
        requestAnimationFrame(() => {
          if (!cancelled) {
            startTransition(() => {
              setData(nextData);
            });
          }
        });
      })
      .catch((error) => {
        if (!cancelled) {
          console.error(error);
          markSceneError("자산 또는 초기 장면 준비에 실패했습니다");
        }
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [setData, setLoadingProgress, setStatus, setStatusDetail]);
}

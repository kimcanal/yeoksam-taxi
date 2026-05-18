"use client";

import { Component, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackDetail?: string;
};

type State = {
  error: Error | null;
};

export class MapSimulatorErrorBoundary extends Component<Props, State> {
  state: State = {
    error: null,
  };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error("Map simulator boundary caught an error.", error);
  }

  private readonly handleRetry = () => {
    this.setState({ error: null });
  };

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-[#060d16] px-6 text-center text-slate-200">
        <div className="space-y-2">
          <div className="text-sm font-semibold">
            {this.props.fallbackTitle ?? "3D 캔버스를 복구하지 못했습니다"}
          </div>
          <p className="max-w-md text-sm text-slate-400">
            {this.props.fallbackDetail ??
              "잘못된 좌표 또는 렌더링 예외가 감지되어 캔버스를 격리했습니다. 다시 시도하거나 지도 자산 상태를 확인하세요."}
          </p>
        </div>
        <button
          type="button"
          onClick={this.handleRetry}
          className="rounded-xl border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:border-cyan-200/50 hover:bg-cyan-300/15"
        >
          캔버스 다시 시작
        </button>
      </div>
    );
  }
}

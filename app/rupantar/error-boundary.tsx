import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { failed: boolean };

export class SiteErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Rupantar Homes render failure", error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <main className="min-h-screen bg-white text-zinc-950 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-[560px] rounded-[1.5rem] border border-zinc-100 bg-white p-7 shadow-sm text-center">
          <h1 className="font-heading text-[22px] font-bold">Rupantar Homes could not finish loading</h1>
          <p className="mt-2 text-[14px] leading-6 text-zinc-600">
            Your saved website data is unchanged. Reload the page to recover the current view.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="h-10 px-5 rounded-full bg-[#FF1A3D] text-white text-[13px] font-semibold"
            >
              Reload
            </button>
            <button
              type="button"
              onClick={() => window.location.assign("/")}
              className="h-10 px-5 rounded-full border border-zinc-200 text-[13px] font-medium"
            >
              Back Home
            </button>
          </div>
        </div>
      </main>
    );
  }
}

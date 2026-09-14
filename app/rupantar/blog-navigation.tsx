import { ArrowLeft } from "lucide-react";
import type { Page } from "./types";

export function BackToPostsButton({ navigate, className = "" }: { navigate: (page: Page) => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={() => navigate("blog")}
      className={`${className} inline-flex items-center gap-1.5 text-[13px] text-zinc-600 transition-colors duration-200 hover:text-[#FF1A3D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF1A3D]/40`}
    >
      <ArrowLeft className="w-4 h-4" /> Back to Posts
    </button>
  );
}

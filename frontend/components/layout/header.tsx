"use client";

import { usePathname } from "next/navigation";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";

function getPageTitle(pathname: string) {
  if (pathname === "/") return "仪表盘";
  if (pathname === "/datasets") return "数据集";
  if (pathname.startsWith("/datasets/")) return "数据集详情";
  if (pathname === "/tasks") return "任务";
  if (pathname.startsWith("/tasks/")) return "任务详情";
  return "工程管理平台";
}

export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-zinc-200 bg-zinc-50/90 px-8 backdrop-blur">
      <h1 className="text-base font-semibold text-zinc-950">{getPageTitle(pathname)}</h1>

      <div className="flex items-center gap-3">
        <div className="relative w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input className="pl-9" placeholder="搜索资产、任务..." />
        </div>
        <div
          className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 bg-white text-xs font-medium text-zinc-600"
          aria-label="User avatar"
        >
          EA
        </div>
      </div>
    </header>
  );
}

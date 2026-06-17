"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Database,
  GitFork,
  HardDrive,
  LayoutDashboard,
  ListChecks,
  Search,
  Users,
} from "lucide-react";

import { getDatasets, getTasks } from "@/lib/api";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "仪表盘", icon: LayoutDashboard },
  { href: "/datasets", label: "数据集", icon: Database },
  { href: "/tasks", label: "任务", icon: ListChecks },
  { href: "/lineage", label: "数据血缘", icon: GitFork },
  { href: "/search", label: "全局搜索", icon: Search },
  { href: "/owners", label: "负责人", icon: Users },
  { href: "/storage", label: "存储概览", icon: HardDrive },
];

export function Sidebar() {
  const pathname = usePathname();
  const [counts, setCounts] = useState<{
    datasets: number | null;
    tasks: number | null;
  }>({ datasets: null, tasks: null });

  useEffect(() => {
    Promise.all([getDatasets(), getTasks()]).then(
      ([datasetResult, taskResult]) => {
        setCounts({
          datasets: datasetResult.data?.length ?? null,
          tasks: taskResult.data?.length ?? null,
        });
      },
    );
  }, []);

  return (
    <aside className="fixed inset-y-0 left-0 z-20 flex w-64 flex-col border-r border-zinc-200 bg-white">
      <div className="flex h-16 items-center border-b border-zinc-200 px-5">
        <div>
          <div className="text-sm font-semibold text-zinc-950">工程管理平台</div>
          <div className="text-xs text-zinc-500">内部数据资产</div>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex h-9 items-center gap-2 rounded-md px-2.5 text-sm font-medium text-zinc-600 transition-colors",
                "hover:bg-zinc-100 hover:text-zinc-950",
                active && "bg-zinc-100 text-zinc-950",
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              <span className="flex-1">{item.label}</span>
              {item.href === "/datasets" && counts.datasets !== null && (
                <span className="ml-auto text-xs text-zinc-400 tabular-nums">
                  {counts.datasets}
                </span>
              )}
              {item.href === "/tasks" && counts.tasks !== null && (
                <span className="ml-auto text-xs text-zinc-400 tabular-nums">
                  {counts.tasks}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

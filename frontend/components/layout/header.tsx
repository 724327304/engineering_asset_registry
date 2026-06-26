"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, FolderKanban, Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import type { Project } from "@/lib/types";
import { getProjects } from "@/lib/api";

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
  const router = useRouter();
  const searchParams = useSearchParams();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    getProjects().then((result) => {
      if (result.data) {
        setProjects(result.data);
      }
    });
  }, []);

  useEffect(() => {
    const projectId = searchParams.get("project_id") ?? "";
    setSelectedProjectId(projectId);
  }, [searchParams]);

  const selectedProject = projects.find(
    (p) => String(p.id) === selectedProjectId,
  );

  function handleProjectSelect(projectId: string) {
    setMenuOpen(false);
    setSelectedProjectId(projectId);

    const params = new URLSearchParams(searchParams.toString());
    if (projectId) {
      params.set("project_id", projectId);
    } else {
      params.delete("project_id");
    }
    const queryString = params.toString();
    router.push(`${pathname}${queryString ? `?${queryString}` : ""}`);
  }

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-zinc-200 bg-zinc-50/90 px-8 backdrop-blur">
      <div className="flex items-center gap-6">
        <h1 className="text-base font-semibold text-zinc-950">
          {getPageTitle(pathname)}
        </h1>

        {/* 项目选择器 */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors min-w-[160px]"
          >
            <FolderKanban className="h-4 w-4 text-zinc-400" />
            <span className="flex-1 text-left truncate">
              {selectedProject ? selectedProject.name : "全部项目"}
            </span>
            {selectedProject && selectedProject.datasetCount !== undefined && (
              <span className="text-xs text-zinc-400 tabular-nums">
                {selectedProject.datasetCount}数据集
              </span>
            )}
            <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
          </button>

          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute left-0 top-full z-20 mt-1 w-72 rounded-lg border border-zinc-200 bg-white shadow-lg py-1">
                <button
                  type="button"
                  onClick={() => handleProjectSelect("")}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-zinc-50 transition-colors ${
                    !selectedProjectId
                      ? "text-zinc-950 font-medium bg-zinc-50"
                      : "text-zinc-600"
                  }`}
                >
                  <FolderKanban className="h-4 w-4 text-zinc-400" />
                  全部项目
                </button>
                <div className="h-px bg-zinc-100 my-1" />
                {projects.map((project) => (
                  <button
                    key={project.id}
                    type="button"
                    onClick={() => handleProjectSelect(String(project.id))}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-zinc-50 transition-colors ${
                      String(project.id) === selectedProjectId
                        ? "text-zinc-950 font-medium bg-zinc-50"
                        : "text-zinc-600"
                    }`}
                  >
                    <span className="flex-1 text-left truncate">
                      {project.name}
                    </span>
                    {project.datasetCount !== undefined && (
                      <span className="text-xs text-zinc-400 tabular-nums">
                        {project.datasetCount}数据集
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

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
import type { LucideIcon } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type StatCardProps = {
  title: string;
  value: string;
  detail: string;
  icon: LucideIcon;
};

export function StatCard({ title, value, detail, icon: Icon }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm text-zinc-500">{title}</CardTitle>
        <Icon className="h-4 w-4 text-zinc-400" aria-hidden="true" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold tracking-normal text-zinc-950">{value}</div>
        <p className="mt-1 text-xs text-zinc-500">{detail}</p>
      </CardContent>
    </Card>
  );
}

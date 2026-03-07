import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuditLog } from "@/hooks/use-audit-log";

const SuperAdminAudit = () => {
  const { entries } = useAuditLog();
  const [searchTerm, setSearchTerm] = useState("");
  const [moduleFilter, setModuleFilter] = useState("all");

  const modules = useMemo(() => {
    const allModules = (entries || []).map((item) => item.module);
    return ["all", ...Array.from(new Set(allModules))];
  }, [entries]);

  const filteredLogs = (entries || []).filter((entry) => {
    const query = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !query ||
      entry.action.toLowerCase().includes(query) ||
      entry.details.toLowerCase().includes(query) ||
      entry.userName.toLowerCase().includes(query);
    const matchesModule = moduleFilter === "all" || entry.module === moduleFilter;
    return matchesSearch && matchesModule;
  });

  const handleExport = () => {
    const payload = JSON.stringify(filteredLogs, null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `superadmin-audit-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-slate-500">Total Logs</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{(entries || []).length}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-slate-500">Modules Tracked</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{Math.max(0, modules.length - 1)}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-slate-500">Visible Logs</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{filteredLogs.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Audit Logs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <Input
              placeholder="Search action, details, actor"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="md:col-span-2"
            />
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
            >
              {modules.map((module) => (
                <option key={module} value={module}>
                  {module === "all" ? "All Modules" : module}
                </option>
              ))}
            </select>
            <Button variant="outline" onClick={handleExport}>
              Export JSON
            </Button>
          </div>

          {filteredLogs.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
              No audit entries found. Perform actions in superadmin modules to generate logs.
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div key={log.id} className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-slate-900">{log.action}</p>
                  <p className="text-xs text-slate-500">{new Date(log.timestamp).toLocaleString()}</p>
                </div>
                <p className="mt-2 text-sm text-slate-600">Actor: {log.userName} ({log.userRole})</p>
                <p className="text-sm text-slate-600">Module: {log.module}</p>
                <p className="text-sm text-slate-600">Details: {log.details}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SuperAdminAudit;

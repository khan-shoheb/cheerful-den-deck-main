import { useMemo, useState } from "react";
import { Outlet } from "react-router-dom";
import SuperAdminSidebar from "@/components/SuperAdminSidebar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, ShieldCheck } from "lucide-react";
import { isSupabaseConfigured } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

const SuperAdminLayout = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { authUserId } = useAuth();

  const authMode = useMemo(() => {
    const source = typeof window !== "undefined" ? window.localStorage.getItem("rm_auth_source") : null;
    if (source === "local-mock" || authUserId?.startsWith("local-")) return "Local Mock";
    if (isSupabaseConfigured) return "Supabase";
    return "Local";
  }, [authUserId]);

  const modeDescription = useMemo(() => {
    if (authMode === "Supabase") return "Data is stored in Supabase database tables.";
    if (authMode === "Local Mock") return "Data is stored in browser local storage/app_state cache.";
    return "Data is currently stored locally.";
  }, [authMode]);

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="hidden md:block">
        <SuperAdminSidebar />
      </div>

      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur md:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-600">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <p className="text-sm font-semibold text-slate-800">Super Admin</p>
        </div>
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" aria-label="Open menu">
              <Menu className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80 p-0">
            <SuperAdminSidebar mobile onNavigate={() => setMobileMenuOpen(false)} />
          </SheetContent>
        </Sheet>
      </header>

      <main className="min-h-screen p-4 md:ml-72 md:p-8">
        <div className="mb-4 flex justify-end">
          <button
            type="button"
            title={modeDescription}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              authMode === "Supabase" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
            }`}
          >
            Mode: {authMode}
          </button>
        </div>
        <Outlet />
      </main>
    </div>
  );
};

export default SuperAdminLayout;

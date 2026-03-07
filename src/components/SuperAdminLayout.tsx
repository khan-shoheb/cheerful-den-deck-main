import { useState } from "react";
import { Outlet } from "react-router-dom";
import SuperAdminSidebar from "@/components/SuperAdminSidebar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, ShieldCheck } from "lucide-react";

const SuperAdminLayout = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
        <Outlet />
      </main>
    </div>
  );
};

export default SuperAdminLayout;

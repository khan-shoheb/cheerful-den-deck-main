import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { isSupabaseConfigured } from "@/lib/supabase";

const SuperAdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const normalizedEmail = email.trim();
    const normalizedPassword = password.trim();

    if (!normalizedEmail || !normalizedPassword) {
      setError("Please enter both email and password");
      return;
    }

    const result = await login(normalizedEmail, normalizedPassword, "superadmin");
    if (result.success) {
      navigate("/superadmin");
      return;
    }

    setError(result.error || "Invalid superadmin credentials");
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0b1220] px-4 py-10">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(251,191,36,0.2),transparent_30%),radial-gradient(circle_at_85%_15%,rgba(148,163,184,0.2),transparent_30%),radial-gradient(circle_at_50%_90%,rgba(245,158,11,0.15),transparent_32%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(2,6,23,0.5),rgba(17,24,39,0.35),rgba(2,6,23,0.65))]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:42px_42px]" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <section>
          <form
            onSubmit={handleSubmit}
            className="space-y-6 rounded-3xl border border-amber-300/20 bg-[#070d1a]/95 p-8 shadow-[0_30px_120px_rgba(0,0,0,0.7)] backdrop-blur"
          >
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-300/40 bg-amber-400/15 text-amber-100 shadow-[0_0_55px_rgba(245,158,11,0.35)]">
                <ShieldCheck className="h-8 w-8" />
              </div>
              <div>
                <h2 className="text-3xl font-extrabold tracking-tight text-white">Super Admin Login</h2>
                <p className="mt-1 text-sm text-slate-300">Sign in to manage room management control center</p>
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                <p>{error}</p>
                <p className="mt-1 text-xs text-red-200/90">
                  Quick check: Supabase Auth Users me `superadmin@room.com` user create/reset password karein, then retry.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-100">Email</label>
              <Input
                type="email"
                placeholder="superadmin@platform.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 border-slate-700 bg-slate-900/85 text-slate-100 placeholder:text-slate-500"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-100">Password</label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 border-slate-700 bg-slate-900/85 pr-10 text-slate-100 placeholder:text-slate-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="h-12 w-full bg-amber-400 text-slate-950 hover:bg-amber-300">
              Sign In as Super Admin
            </Button>

            <p className="text-center text-xs text-slate-300">
              {isSupabaseConfigured
                ? "Use a Supabase user with role=superadmin"
                : "Demo: superadmin@room.com / Super@123"}
            </p>

            <p className="text-center text-xs text-slate-400">
              For Admin login,{" "}
              <Link className="font-semibold text-amber-300 hover:text-amber-200 hover:underline" to="/login">
                click here
              </Link>
            </p>
          </form>
        </section>
      </div>
    </div>
  );
};

export default SuperAdminLogin;

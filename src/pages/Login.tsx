import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { BedDouble, Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { isSupabaseConfigured } from "@/lib/supabase";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Please enter both email and password");
      return;
    }
    const success = await login(email, password, "admin");
    if (success) {
      navigate("/");
    } else {
      setError("Invalid credentials");
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0b1220] px-4 py-10">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(59,130,246,0.22),transparent_30%),radial-gradient(circle_at_82%_16%,rgba(30,64,175,0.18),transparent_30%),radial-gradient(circle_at_50%_88%,rgba(14,165,233,0.15),transparent_30%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(2,6,23,0.5),rgba(15,23,42,0.35),rgba(2,6,23,0.65))]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:42px_42px]" />
      </div>

      <div className="relative z-10 w-full max-w-md space-y-8">
        <div className="flex flex-col items-center gap-3 text-white">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-blue-300/40 bg-blue-400/15 text-blue-100 shadow-[0_0_55px_rgba(59,130,246,0.35)]">
            <BedDouble className="h-8 w-8" />
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-extrabold tracking-tight text-white">Admin Login</h1>
            <p className="mt-1 text-sm text-slate-300">Sign in to your hotel management dashboard</p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-3xl border border-blue-300/20 bg-[#070d1a]/95 p-8 shadow-[0_30px_120px_rgba(0,0,0,0.7)] backdrop-blur"
        >
          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-100">Email</label>
            <Input
              type="email"
              placeholder="admin@hotel.com"
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

          <Button type="submit" className="h-12 w-full bg-blue-400 text-slate-950 hover:bg-blue-300">
            Sign In
          </Button>

          <p className="text-center text-xs text-slate-300">
            {isSupabaseConfigured
              ? "Use Supabase user, or demo: sujalpatne583@gmail.com / Sujal@123"
              : "Demo: sujalpatne583@gmail.com / Sujal@123"}
          </p>

          <p className="text-center text-xs text-slate-400">
            For Super Admin login,{" "}
            <Link className="font-semibold text-blue-300 hover:text-blue-200 hover:underline" to="/superadmin/login">
              click here
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Login;

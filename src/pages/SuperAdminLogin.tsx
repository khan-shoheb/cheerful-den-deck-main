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

    const success = await login(normalizedEmail, normalizedPassword, "superadmin");
    if (success) {
      navigate("/superadmin");
      return;
    }

    setError("Invalid superadmin credentials");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-600 text-white">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-slate-900">Super Admin Login</h1>
            <p className="mt-1 text-sm text-slate-600">Sign in to manage full platform access</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-900">Email</label>
            <Input
              type="email"
              placeholder="superadmin@platform.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-900">Password</label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-900"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button type="submit" className="w-full bg-cyan-600 text-white hover:bg-cyan-700">
            Sign In as Super Admin
          </Button>

          <p className="text-center text-xs text-slate-500">
            {isSupabaseConfigured
              ? "Use a Supabase user with role=superadmin"
              : "Demo: superadmin@room.com / Super@123"}
          </p>

          <p className="text-center text-xs text-slate-600">
            Admin login ke liye <Link className="font-medium text-cyan-700 hover:underline" to="/login">yahan click karein</Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default SuperAdminLogin;

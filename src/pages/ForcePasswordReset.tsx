import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { Eye, EyeOff, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const ForcePasswordReset = () => {
  const navigate = useNavigate();
  const { user, completePasswordReset, logout } = useAuth();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (user?.role === "superadmin") {
      navigate("/superadmin", { replace: true });
      return;
    }

    if (!newPassword || !confirmPassword) {
      setError("Please fill both password fields.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSaving(true);
    const result = await completePasswordReset(newPassword);
    setIsSaving(false);

    if (!result.success) {
      setError("error" in result ? result.error : "Unable to reset password.");
      return;
    }

    navigate("/", { replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md space-y-5 rounded-2xl border border-slate-700 bg-slate-900 p-8 shadow-2xl"
      >
        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-2 text-amber-300">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Set New Password</h1>
            <p className="text-sm text-slate-300">First login detected. Password change is required.</p>
          </div>
        </div>

        {error ? <p className="rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p> : null}

        <div className="space-y-2">
          <label className="text-sm text-slate-200">New Password</label>
          <div className="relative">
            <Input
              type={showNewPassword ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="border-slate-700 bg-slate-950 pr-10 text-slate-100"
              placeholder="At least 8 characters"
            />
            <button
              type="button"
              onClick={() => setShowNewPassword((value) => !value)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm text-slate-200">Confirm Password</label>
          <div className="relative">
            <Input
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="border-slate-700 bg-slate-950 pr-10 text-slate-100"
              placeholder="Re-enter password"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((value) => !value)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <Button type="submit" className="w-full bg-amber-400 text-slate-950 hover:bg-amber-300" disabled={isSaving}>
          {isSaving ? "Saving..." : "Update Password"}
        </Button>

        <Button type="button" variant="outline" className="w-full" onClick={() => void logout()}>
          Logout
        </Button>
      </form>
    </div>
  );
};

export default ForcePasswordReset;

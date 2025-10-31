"use client";
import { useAuth } from "../app/providers";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import ChangePasswordDialog from "./ChangePasswordDialog";
import toast from "react-hot-toast";

export default function ProtectedRoute({ allowedRoles, children }) {
  const { user, role, loading, forcePasswordChange } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        toast.error("Please login first.");
        router.push("/login");
      } else if (forcePasswordChange || user?.user_metadata?.forcePasswordChange) {
        toast("⚠️ Please change your password before continuing.");
      } else if (allowedRoles && !allowedRoles.includes(role)) {
        toast.error("You do not have permission to access this page.");
        router.push("/dashboard");
      }
    }
  }, [user, loading, router, role, forcePasswordChange, allowedRoles]);

  if (loading) return null;

  if (forcePasswordChange || user?.user_metadata?.forcePasswordChange) {
    return <ChangePasswordDialog />;
  }

  return <>{children}</>;
}

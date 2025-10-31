"use client";

import Machines from "../../components/Machines";
import { useAuth } from "../providers";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function MachinesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading]);

  if (loading) return <div className="p-4">Loading user...</div>;
  if (!user) return null;

  return (
    <div className="p-4">
      <Machines />
    </div>
  );
}

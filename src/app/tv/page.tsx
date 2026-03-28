"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function TvRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/appointments/tv");
  }, [router]);
  return null;
}

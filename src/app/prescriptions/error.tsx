"use client";

import { useEffect } from "react";
import AdminLayout from "@/app/(admin)/layout";

export default function PrescriptionsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Prescriptions page error:", error);
  }, [error]);

  return (
    <AdminLayout>
      <div className="flex flex-col items-center justify-center h-full py-20 gap-4">
        <div className="text-red-500 text-6xl">!</div>
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
          Something went wrong loading prescriptions
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md text-center">
          {error.message || "An unexpected error occurred."}
        </p>
        <button
          onClick={reset}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
        >
          Try Again
        </button>
      </div>
    </AdminLayout>
  );
}

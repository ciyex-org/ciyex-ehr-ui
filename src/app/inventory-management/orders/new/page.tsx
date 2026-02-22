"use client";
import { redirect } from "next/navigation";

// Order creation is now handled via the modal in Orders.tsx
export default function Page() {
    redirect("/inventory-management/orders");
}

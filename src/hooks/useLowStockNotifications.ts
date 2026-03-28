"use client";

import { getEnv } from "@/utils/env";
import { useEffect } from "react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";

type InventoryItem = {
    id: string;
    name: string;
    stock: number;
    minStock: number;
};

export function useLowStockNotifications(
    orgId: string | null,
    threshold: number,
    enabled: boolean
) {
    useEffect(() => {
        if (!orgId || !enabled) return; // 🔒 only run when ON

        const checkLowStock = async () => {
            try {
                const res = await fetchWithAuth(
                    `${getEnv("NEXT_PUBLIC_API_URL")}/api/inventory/list`
                );
                const json = await res.json();
                if (res.ok && json.success) {
                    const outItems: InventoryItem[] = [];
                    const criticalItems: InventoryItem[] = [];
                    const lowItems: InventoryItem[] = [];

                    (json.data || []).forEach((item: InventoryItem) => {
                        const percent =
                            item.minStock > 0 ? (item.stock / item.minStock) * 100 : 100;

                        if (item.stock === 0) outItems.push(item);
                        else if (percent <= threshold) criticalItems.push(item);
                        else if (item.stock <= item.minStock) lowItems.push(item);
                    });

                    // 🔔 Dispatch events once
                    if (outItems.length > 0) {
                        window.dispatchEvent(
                            new CustomEvent("app-notification", {
                                detail: {
                                    message: `Out of Stock: ${outItems
                                        .map((i) => i.name)
                                        .join(", ")}`,
                                },
                            })
                        );
                    }

                    if (criticalItems.length > 0) {
                        window.dispatchEvent(
                            new CustomEvent("app-notification", {
                                detail: {
                                    message: `Critical Stock: ${criticalItems
                                        .map((i) => i.name)
                                        .join(", ")}`,
                                },
                            })
                        );
                    }

                    if (lowItems.length > 0) {
                        window.dispatchEvent(
                            new CustomEvent("app-notification", {
                                detail: {
                                    message: `Low Stock: ${lowItems
                                        .map((i) => i.name)
                                        .join(", ")}`,
                                },
                            })
                        );
                    }
                }
            } catch (err) {
                console.error("Failed to check low stock:", err);
            }
        };

        // Run immediately only once
        checkLowStock();
    }, [orgId, threshold, enabled]); // 👈 watch enabled
}

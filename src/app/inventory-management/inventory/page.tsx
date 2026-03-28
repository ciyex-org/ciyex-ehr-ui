import { Metadata } from "next";
import Inventory from "@/components/inventory-management/Inventory/Inventory";

export const metadata: Metadata = {
    title: "Inventory Management",
};

export default function Page() {
    return <Inventory />;
}

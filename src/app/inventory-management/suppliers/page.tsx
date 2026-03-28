import { Metadata } from "next";
import Suppliers from "@/components/inventory-management/Suppliers/Suppliers";

export const metadata: Metadata = {
    title: "Suppliers Management",
};

export default function Page() {
    return <Suppliers />;
}
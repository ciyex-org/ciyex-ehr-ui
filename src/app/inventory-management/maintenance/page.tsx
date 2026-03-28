import { Metadata } from "next";
import Maintenance from "@/components/inventory-management/Maintenance/Maintenance";

export const metadata: Metadata = {
    title: "Maintenance Management",
};

export default function Page() {
    return <Maintenance />;
}

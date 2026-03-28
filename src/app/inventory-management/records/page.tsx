import { Metadata } from "next";
import Records from "@/components/inventory-management/Records/Records";

export const metadata: Metadata = {
    title: "Records Management",
};

export default function Page() {
    return <Records />;
}

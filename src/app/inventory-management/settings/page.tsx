import { Metadata } from "next";
import Settings from "@/components/inventory-management/Settings/Settings";

export const metadata: Metadata = {
    title: "Settings Management",
};

export default function Page() {
    return <Settings />;
}

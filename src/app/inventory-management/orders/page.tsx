import { Metadata } from "next";
import Orders from "@/components/inventory-management/Orders/Orders";

export const metadata: Metadata = {
    title: "Orders Management",
};

export default function Page() {
    return <Orders />;
}

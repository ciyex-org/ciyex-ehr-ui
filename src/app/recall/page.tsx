import { Metadata } from "next";
import RecallPage from "@/components/recall/RecallBoard";

export const metadata: Metadata = {
    title: "Recall Board",
};

export default function Page() {
    return <RecallPage />;
}

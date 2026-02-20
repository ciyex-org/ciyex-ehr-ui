"use client";

import { useParams } from "next/navigation";
import GenericSettingsPage from "@/components/settings/GenericSettingsPage";

export default function DynamicSettingsPage() {
    const params = useParams()!;
    const pageKey = params.pageKey as string;

    return <GenericSettingsPage pageKey={pageKey} embedded />;
}

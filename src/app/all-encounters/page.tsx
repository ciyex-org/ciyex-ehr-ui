"use client";

import AdminLayout from "@/app/(admin)/layout";
import EncountersTable from "@/components/encounter/EncountersTable";

export default function EncountersPage() {
    return (
        <AdminLayout>
            <EncountersTable />
        </AdminLayout>
    );
}

// src/app/labs/orders/page.tsx
import LabOrderPage from "@/components/laborder/LabOrderPage";
import AdminLayout from "@/app/(admin)/layout";

export default function Page() {
    return (
        <AdminLayout>
            <LabOrderPage />
        </AdminLayout>
    );
}


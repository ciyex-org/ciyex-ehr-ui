import React from "react";
import AdminLayout from "@/app/(admin)/layout";
import ClaimManagementDashboard from "@/components/claimManagement/ClaimManagementDashboard";


const ClaimManagementPage: React.FC = () => {
  return (
    <AdminLayout>
      <ClaimManagementDashboard />
    </AdminLayout>
  );
};

export default ClaimManagementPage;


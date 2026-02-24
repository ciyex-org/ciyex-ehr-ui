export interface RolePermission {
  id: number;
  roleName: string;
  roleLabel: string;
  description: string;
  permissions: string[];
  isSystem: boolean;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export const PERMISSION_CATEGORIES: { category: string; permissions: { key: string; label: string }[] }[] = [
  {
    category: "Scheduling",
    permissions: [
      { key: "scheduling.read", label: "View Schedule" },
      { key: "scheduling.write", label: "Edit Schedule" },
    ],
  },
  {
    category: "Demographics",
    permissions: [
      { key: "demographics.read", label: "View Demographics" },
      { key: "demographics.write", label: "Edit Demographics" },
    ],
  },
  {
    category: "Clinical Chart",
    permissions: [
      { key: "chart.read", label: "View Chart" },
      { key: "chart.write", label: "Edit Chart" },
      { key: "chart.sign", label: "Sign Notes" },
    ],
  },
  {
    category: "Orders",
    permissions: [
      { key: "orders.read", label: "View Orders" },
      { key: "orders.create", label: "Create Orders" },
      { key: "orders.sign", label: "Sign Orders" },
    ],
  },
  {
    category: "Prescriptions",
    permissions: [
      { key: "rx.read", label: "View Prescriptions" },
      { key: "rx.prescribe", label: "Prescribe" },
    ],
  },
  {
    category: "Billing",
    permissions: [
      { key: "billing.read", label: "View Billing" },
      { key: "billing.write", label: "Edit Billing" },
      { key: "billing.submit", label: "Submit Claims" },
    ],
  },
  {
    category: "Administration",
    permissions: [
      { key: "admin.users", label: "Manage Users" },
      { key: "admin.settings", label: "Manage Settings" },
      { key: "admin.roles", label: "Manage Roles" },
    ],
  },
  {
    category: "Documents",
    permissions: [
      { key: "documents.read", label: "View Documents" },
      { key: "documents.write", label: "Upload/Edit Documents" },
    ],
  },
  {
    category: "Messaging",
    permissions: [
      { key: "messaging.read", label: "View Messages" },
      { key: "messaging.send", label: "Send Messages" },
    ],
  },
  {
    category: "Reports",
    permissions: [
      { key: "reports.read", label: "View Reports" },
      { key: "reports.write", label: "Manage Reports" },
    ],
  },
];

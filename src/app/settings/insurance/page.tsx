"use client";
import { useEffect, useState } from "react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import AdminLayout from "@/app/(admin)/layout";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import Button from "@/components/ui/button/Button";

type InsuranceCompany = {
    id: number;
    fhirId?: string;
    payerId: string;
    name: string;
    address: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    status: "ACTIVE" | "ARCHIVED";
    audit?: {
        createdDate: string;
        lastModifiedDate: string;
    };
};

type CompanyForm = {
    payerId: string;
    name: string;
    address: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    status: string;
};

export default function InsurancePage() {
    const [companies, setCompanies] = useState<InsuranceCompany[]>([]);
    const [filtered, setFiltered] = useState<InsuranceCompany[]>([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [editCompany, setEditCompany] = useState<InsuranceCompany | null>(null);
    const [form, setForm] = useState<CompanyForm>({
        payerId: "",
        name: "",
        address: "",
        city: "",
        state: "",
        postalCode: "",
        country: "",
        status: "ACTIVE",
    });
    const [errors, setErrors] = useState<{ [k: string]: string }>({});
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "ARCHIVED">("ALL");
    const [page, setPage] = useState(1);
    const pageSize = 10;

    const loadCompanies = async () => {
        setLoading(true);
        try {
            const res = await fetchWithAuth(
                `${process.env.NEXT_PUBLIC_API_URL}/api/insurance-companies`
            );
            const data = await res.json();
            
            if (data.success && data.data) {
                setCompanies(data.data);
                setFiltered(data.data);
            } else {
                console.error('API Error:', data.message);
                setCompanies([]);
                setFiltered([]);
            }
        } catch (err) {
            console.error("Error loading companies:", err);
            setCompanies([]);
            setFiltered([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCompanies();
    }, []);

    useEffect(() => {
        let result = companies;
        
        if (search.trim()) {
            result = result.filter((c) =>
                c.name?.toLowerCase().includes(search.toLowerCase()) ||
                c.payerId?.toLowerCase().includes(search.toLowerCase())
            );
        }
        
        if (statusFilter !== "ALL") {
            result = result.filter((c) => c.status === statusFilter);
        }
        
        setFiltered(result);
        setPage(1);
    }, [search, companies, statusFilter]);

    const validateForm = () => {
        const errs: { [k: string]: string } = {};
        if (!form.name.trim()) errs.name = "Name is required.";
        if (!form.payerId.trim()) errs.payerId = "Payer ID is required.";
        if (!form.address.trim()) errs.address = "Address is required.";
        if (!form.city.trim()) errs.city = "City is required.";
        if (!form.state.trim()) errs.state = "State is required.";
        if (!form.postalCode.trim()) errs.postalCode = "Postal code is required.";
        if (!form.country.trim()) errs.country = "Country is required.";
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSave = async () => {
        if (!validateForm()) return;
        try {
            const method = editCompany ? "PUT" : "POST";
            const url = editCompany
                ? `${process.env.NEXT_PUBLIC_API_URL}/api/insurance-companies/${editCompany.fhirId || editCompany.id}`
                : `${process.env.NEXT_PUBLIC_API_URL}/api/insurance-companies`;
            
            const response = await fetchWithAuth(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(form),
            });
            
            const result = await response.json();
            if (!result.success) {
                throw new Error(result.message);
            }
            setOpen(false);
            setEditCompany(null);
            setForm({
                payerId: "",
                name: "",
                address: "",
                city: "",
                state: "",
                postalCode: "",
                country: "",
                status: "ACTIVE",
            });
            setErrors({});
            loadCompanies();
        } catch (err) {
            console.error("Error saving company:", err);
        }
    };

    const handleToggleStatus = async (company: InsuranceCompany) => {
        const action = company.status === "ACTIVE" ? "archive" : "activate";
        try {
            const response = await fetchWithAuth(
                `${process.env.NEXT_PUBLIC_API_URL}/api/insurance-companies/${company.fhirId || company.id}/${action}`,
                { method: "POST" }
            );
            const result = await response.json();
            if (!result.success) {
                throw new Error(result.message);
            }
            loadCompanies();
        } catch (err) {
            console.error(`Error trying to ${action} company:`, err);
        }
    };

    const openAddModal = () => {
        setEditCompany(null);
        setForm({
            payerId: "",
            name: "",
            address: "",
            city: "",
            state: "",
            postalCode: "",
            country: "",
            status: "ACTIVE",
        });
        setErrors({});
        setOpen(true);
    };

    const openEditModal = (company: InsuranceCompany) => {
        setEditCompany(company);
        setForm({
            payerId: company.payerId || "",
            name: company.name,
            address: company.address,
            city: company.city,
            state: company.state,
            postalCode: company.postalCode,
            country: company.country,
            status: company.status,
        });
        setErrors({});
        setOpen(true);
    };

    const activeCount = companies.filter(c => c.status === "ACTIVE").length;
    const archivedCount = companies.filter(c => c.status === "ARCHIVED").length;
    const totalCount = companies.length;
    
    const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);
    const totalPages = Math.ceil(filtered.length / pageSize);

    return (
        <AdminLayout>
            <div className="p-4">
                <div className="flex justify-between items-center gap-3 mt-2 mb-4">
                    <div className="flex items-center gap-4">
                        <Input
                            placeholder="Search by Payer ID, Name, Address, City, State, Postal Code, Country, Status, Actions..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-96 text-sm"
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={() => setStatusFilter("ALL")}
                                className={`px-2 py-1 text-xs rounded-full border ${
                                    statusFilter === "ALL"
                                        ? "bg-blue-500 text-white border-blue-500"
                                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                                }`}
                            >
                                All {totalCount}
                            </button>
                            <button
                                onClick={() => setStatusFilter("ACTIVE")}
                                className={`px-2 py-1 text-xs rounded-full border ${
                                    statusFilter === "ACTIVE"
                                        ? "bg-blue-500 text-white border-blue-500"
                                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                                }`}
                            >
                                Active {activeCount}
                            </button>
                            <button
                                onClick={() => setStatusFilter("ARCHIVED")}
                                className={`px-2 py-1 text-xs rounded-full border ${
                                    statusFilter === "ARCHIVED"
                                        ? "bg-blue-500 text-white border-blue-500"
                                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                                }`}
                            >
                                Archived {archivedCount}
                            </button>
                        </div>
                    </div>
                    <button
                        onClick={openAddModal}
                        className="bg-blue-500 text-white text-sm font-semibold px-4 py-2 rounded-md hover:bg-blue-600"
                    >
                        + Insurance
                    </button>
                </div>

                <div className="bg-white rounded-lg shadow border overflow-x-auto">
                    {loading ? (
                        <p className="p-4 text-gray-500 text-sm">Loading...</p>
                    ) : (
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-3 py-2 text-left">Payer ID</th>
                                    <th className="px-3 py-2 text-left">Name</th>
                                    <th className="px-3 py-2 text-left">Address</th>
                                    <th className="px-3 py-2 text-left">City</th>
                                    <th className="px-3 py-2 text-left">State</th>
                                    <th className="px-3 py-2 text-left">Postal Code</th>
                                    <th className="px-3 py-2 text-left">Country</th>
                                    <th className="px-3 py-2 text-left">Status</th>
                                    <th className="px-3 py-2 text-left">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginated.map((c) => (
                                    <tr key={c.id} className="border-b hover:bg-gray-50">
                                        <td className="px-3 py-2">{c.payerId}</td>
                                        <td className="px-3 py-2">{c.name}</td>
                                        <td className="px-3 py-2">{c.address}</td>
                                        <td className="px-3 py-2">{c.city}</td>
                                        <td className="px-3 py-2">{c.state}</td>
                                        <td className="px-3 py-2">{c.postalCode}</td>
                                        <td className="px-3 py-2">{c.country}</td>
                                        <td className="px-3 py-2">
                                            <span className={`px-2 py-1 text-xs rounded-full ${
                                                c.status === "ACTIVE" 
                                                    ? "bg-green-100 text-green-700" 
                                                    : "bg-red-100 text-red-700"
                                            }`}>
                                                {c.status === "ACTIVE" ? "Active" : "Archived"}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2">
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => openEditModal(c)}
                                                    className="text-blue-600 hover:text-blue-800 text-xs"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => handleToggleStatus(c)}
                                                    className={`text-xs ${
                                                        c.status === "ACTIVE" 
                                                            ? "text-red-600 hover:text-red-800" 
                                                            : "text-green-600 hover:text-green-800"
                                                    }`}
                                                >
                                                    {c.status === "ACTIVE" ? "Archive" : "Activate"}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {totalPages > 1 && (
                    <div className="flex justify-center items-center gap-2 mt-4">
                        <button
                            onClick={() => setPage(Math.max(1, page - 1))}
                            disabled={page === 1}
                            className="px-3 py-1 text-sm border rounded disabled:opacity-50"
                        >
                            Previous
                        </button>
                        <span className="text-sm">Page {page} of {totalPages}</span>
                        <button
                            onClick={() => setPage(Math.min(totalPages, page + 1))}
                            disabled={page === totalPages}
                            className="px-3 py-1 text-sm border rounded disabled:opacity-50"
                        >
                            Next
                        </button>
                    </div>
                )}

                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogContent onClose={() => setOpen(false)} className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>
                                {editCompany ? "Edit" : "Add"} Insurance Company
                            </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Name *</label>
                                <Input
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    className={errors.name ? "border-red-500" : ""}
                                />
                                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Payer ID *</label>
                                <Input
                                    value={form.payerId}
                                    onChange={(e) => setForm({ ...form, payerId: e.target.value })}
                                    className={errors.payerId ? "border-red-500" : ""}
                                />
                                {errors.payerId && <p className="text-red-500 text-xs mt-1">{errors.payerId}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Address *</label>
                                <Input
                                    value={form.address}
                                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                                    className={errors.address ? "border-red-500" : ""}
                                />
                                {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium mb-1">City *</label>
                                    <Input
                                        value={form.city}
                                        onChange={(e) => setForm({ ...form, city: e.target.value })}
                                        className={errors.city ? "border-red-500" : ""}
                                    />
                                    {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">State *</label>
                                    <Input
                                        value={form.state}
                                        onChange={(e) => setForm({ ...form, state: e.target.value })}
                                        className={errors.state ? "border-red-500" : ""}
                                    />
                                    {errors.state && <p className="text-red-500 text-xs mt-1">{errors.state}</p>}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Postal Code *</label>
                                    <Input
                                        value={form.postalCode}
                                        onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
                                        className={errors.postalCode ? "border-red-500" : ""}
                                    />
                                    {errors.postalCode && <p className="text-red-500 text-xs mt-1">{errors.postalCode}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Country *</label>
                                    <Input
                                        value={form.country}
                                        onChange={(e) => setForm({ ...form, country: e.target.value })}
                                        className={errors.country ? "border-red-500" : ""}
                                    />
                                    {errors.country && <p className="text-red-500 text-xs mt-1">{errors.country}</p>}
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setOpen(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleSave}>
                                {editCompany ? "Update" : "Create"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AdminLayout>
    );
}
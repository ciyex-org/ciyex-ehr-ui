"use client";

import { getEnv } from "@/utils/env";
import React, {useState} from "react";
import AdminLayout from "@/app/(admin)/layout";
import Button from "@/components/ui/button/Button";
import {fetchWithAuth} from "@/utils/fetchWithAuth";
import {useRouter} from "next/navigation";
import Alert from "@/components/ui/alert/Alert";

type CreateOrderPayload = {
    orderNumber?: string;
    supplier: string;
    itemName: string;
    category: string;
    date?: string;
    status?: string;
    stock?: number;
    amount?: number;
};

export default function CreateOrderForm() {
    const router = useRouter();
    const [form, setForm] = useState<CreateOrderPayload>({
        supplier: "",
        itemName: "",
        category: "",
        date: new Date().toISOString().split("T")[0],
        status: "Pending",
        stock: 0,
        amount: 0,
    });

    const [alert, setAlert] = useState<{variant: "success"|"error"|"warning"|"info", title:string, message:string} | null>(null);
    const apiUrl = getEnv("NEXT_PUBLIC_API_URL");

    const onChange = (k: keyof CreateOrderPayload, v: any) => setForm(s => ({...s, [k]: v}));

    const handleSubmit = async () => {
        // basic validation: required by backend
        if (!form.supplier || !form.itemName || !form.category) {
            setAlert({variant: "warning", title: "Missing fields", message: "Supplier, item name and category are required."});
            return;
        }

        // quick auth check
        const token = typeof window !== 'undefined' ? (localStorage.getItem('token') || localStorage.getItem('authToken') || sessionStorage.getItem('token')) : null;
        if (!token) {
            setAlert({variant: 'error', title: 'Not Signed In', message: 'You are not signed in. Please sign in and try again.'});
            return;
        }

        try {
            // Ensure orderNumber is present (controller validation requires it)
            const payload = {
                ...form,
                orderNumber: (form as any).orderNumber || `PO-${Date.now()}`,
            };

            const res = await fetchWithAuth(`${apiUrl}/api/orders`, {
                method: "POST",
                headers: {"Content-Type": "application/json", Accept: "application/json"},
                body: JSON.stringify(payload),
            });

            const json = await (async () => {
                try { return await res.json(); } catch { return null; }
            })();

            if (res.status === 401) {
                setAlert({variant: 'error', title: 'Unauthorized', message: 'Your session has expired or you are not signed in. Please sign in and try again.'});
                return;
            }

            if (res.ok && json && json.success) {
                setAlert({variant: "success", title: "Created", message: "Order created successfully"});
                setTimeout(() => router.push('/inventory-management/orders'), 800);
            } else {
                console.error('Create order failed', {status: res.status, body: json});
                setAlert({variant: "error", title: "Error", message: (json && (json.message || json.error)) || `Create failed (status ${res.status})`} );
            }
        } catch (err) {
            console.error('Create order exception', err);
            setAlert({variant: "error", title: "Error", message: "Network or server error while creating order."});
        }
    };

    return (
        <AdminLayout>
            <div className="max-w-3xl mx-auto p-6">
                <h2 className="text-2xl font-semibold mb-4">Create Purchase Order</h2>
                {alert && <div className="mb-4"><Alert variant={alert.variant} title={alert.title} message={alert.message} /></div>}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-6 rounded shadow">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Supplier</label>
                        <input className="mt-1 w-full rounded border px-3 py-2" value={form.supplier} onChange={e => onChange('supplier', e.target.value)} />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Item Name</label>
                        <input className="mt-1 w-full rounded border px-3 py-2" value={form.itemName} onChange={e => onChange('itemName', e.target.value)} />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Category</label>
                        <input className="mt-1 w-full rounded border px-3 py-2" value={form.category} onChange={e => onChange('category', e.target.value)} />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Order Date</label>
                        <input type="date" className="mt-1 w-full rounded border px-3 py-2" value={form.date} onChange={e => onChange('date', e.target.value)} />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Quantity</label>
                        <input type="number" className="mt-1 w-full rounded border px-3 py-2" value={form.stock} onChange={e => onChange('stock', Number(e.target.value))} />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Amount</label>
                        <input type="number" step="0.01" className="mt-1 w-full rounded border px-3 py-2" value={form.amount} onChange={e => onChange('amount', Number(e.target.value))} />
                    </div>
                </div>

                <div className="mt-6 flex gap-3 justify-end">
                    <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
                    <Button variant="primary" onClick={handleSubmit}>Create Order</Button>
                </div>
            </div>
        </AdminLayout>
    );
}

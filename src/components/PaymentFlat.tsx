"use client";

import { getEnv } from "@/utils/env";
import React, { useEffect, useState } from "react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";

interface CreditCardDto {
    id?: number;
    patientId?: number;
    cardHolderName: string;
    cardNumber: string;
    cardType: string;
    expiryMonth: number;
    expiryYear: number;
    cvv: string;
    billingAddress?: string;
    billingCity?: string;
    billingState?: string;
    billingZip?: string;
    billingCountry?: string;
    isDefault?: boolean;
    isActive?: boolean;
    token?: string;
    maskedCardNumber?: string;
    isExpired?: boolean;
}

interface PaymentsFlatProps {
    patientId: number;
}

export default function PaymentsFlat({ patientId }: PaymentsFlatProps) {
    const [cards, setCards] = useState<CreditCardDto[]>([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editingCard, setEditingCard] = useState<CreditCardDto | null>(null);
    const [searchTerm, setSearchTerm] = useState("");

    const emptyCard: Partial<CreditCardDto> = {
        cardHolderName: "",
        cardNumber: "",
        cardType: "VISA",
        expiryMonth: 1,
        expiryYear: new Date().getFullYear(),
        cvv: "",
        billingAddress: "",
        billingCity: "",
        billingState: "",
        billingZip: "",
        billingCountry: "USA",
        isDefault: false,
        isActive: true,
    };

    const [form, setForm] = useState<Partial<CreditCardDto>>(emptyCard);

    useEffect(() => {
        fetchCards();
    }, [patientId]);

    const fetchCards = async () => {
        setLoading(true);
        try {
            const res = await fetchWithAuth(
                `${getEnv("NEXT_PUBLIC_API_URL")}/api/credit-cards/patient/${patientId}`
            );
            const json = await res.json();
            // Handle response format: { success: true, data: [...], message: "" }
            setCards(json.data || []);
        } catch (err) {
            console.error("Error fetching credit cards", err);
            setCards([]);
        } finally {
            setLoading(false);
        }
    };

    const setField = <K extends keyof CreditCardDto>(
        field: K,
        value: CreditCardDto[K]
    ) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const handleOpenModal = (card?: CreditCardDto) => {
        if (card) {
            setEditingCard(card);
            setForm({ ...card, cvv: "" }); // Don't populate CVV for security
        } else {
            setEditingCard(null);
            setForm(emptyCard);
        }
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingCard(null);
        setForm(emptyCard);
    };

    const handleSave = async () => {
        try {
            const payload = {
                ...form,
                patientId,
            };

            const url = editingCard
                ? `${getEnv("NEXT_PUBLIC_API_URL")}/api/credit-cards/${editingCard.id}`
                : `${getEnv("NEXT_PUBLIC_API_URL")}/api/credit-cards`;

            const method = editingCard ? "PUT" : "POST";

            const res = await fetchWithAuth(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const json = await res.json();

            if (res.ok && json.success) {
                handleCloseModal();
                await fetchCards();
            } else {
                alert(`Failed to save card: ${json.message || "Unknown error"}`);
            }
        } catch (err) {
            console.error("Error saving card", err);
            alert("Error saving card");
        }
    };

    const handleDelete = async (cardId: number) => {
        if (!confirm("Are you sure you want to delete this card?")) return;

        try {
            const res = await fetchWithAuth(
                `${getEnv("NEXT_PUBLIC_API_URL")}/api/credit-cards/${cardId}`,
                { method: "DELETE" }
            );

            const json = await res.json();

            if (res.ok && json.success) {
                await fetchCards();
            } else {
                alert(`Failed to delete card: ${json.message || "Unknown error"}`);
            }
        } catch (err) {
            console.error("Error deleting card", err);
            alert("Error deleting card");
        }
    };

    const handleSetDefault = async (cardId: number) => {
        try {
            const res = await fetchWithAuth(
                `${getEnv("NEXT_PUBLIC_API_URL")}/api/credit-cards/${cardId}/patient/${patientId}/set-default`,
                { method: "PUT" }
            );

            const json = await res.json();

            if (res.ok && json.success) {
                await fetchCards();
            } else {
                alert(`Failed to set default card: ${json.message || "Unknown error"}`);
            }
        } catch (err) {
            console.error("Error setting default card", err);
            alert("Error setting default card");
        }
    };

    const handleDeactivate = async (cardId: number) => {
        if (!confirm("Are you sure you want to deactivate this card?")) return;

        try {
            const res = await fetchWithAuth(
                `${getEnv("NEXT_PUBLIC_API_URL")}/api/credit-cards/${cardId}/deactivate`,
                { method: "PUT" }
            );

            const json = await res.json();

            if (res.ok && json.success) {
                await fetchCards();
            } else {
                alert(`Failed to deactivate card: ${json.message || "Unknown error"}`);
            }
        } catch (err) {
            console.error("Error deactivating card", err);
            alert("Error deactivating card");
        }
    };

    const filteredCards = cards.filter((card) =>
        [
            card.cardHolderName,
            card.cardType,
            card.maskedCardNumber,
            card.billingCity,
        ]
            .filter(Boolean)
            .some((field) =>
                field!.toLowerCase().includes(searchTerm.toLowerCase())
            )
    );

    const getCardIcon = (cardType: string) => {
        switch (cardType?.toUpperCase()) {
            case "VISA":
                return "💳";
            case "MASTERCARD":
                return "💳";
            case "AMEX":
                return "💳";
            case "DISCOVER":
                return "💳";
            default:
                return "💳";
        }
    };

    return (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 space-y-4">
            <div className="flex justify-between items-center">
                <h4 className="font-semibold text-lg text-gray-800">Payment Methods</h4>
                <button
                    onClick={() => handleOpenModal()}
                    className="px-4 py-2 bg-blue-600 text-white text-sm rounded shadow hover:bg-blue-700"
                >
                    + Add Card
                </button>
            </div>

            <input
                className="w-full rounded-lg bg-gray-50 border border-gray-200 px-3 py-2 text-sm"
                placeholder="Search cards..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />

            {loading ? (
                <div className="text-center text-gray-500 py-8">Loading...</div>
            ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredCards.length > 0 ? (
                        filteredCards.map((card) => (
                            <div
                                key={card.id}
                                className={`border rounded-lg p-4 relative ${
                                    card.isExpired
                                        ? "border-red-300 bg-red-50"
                                        : !card.isActive
                                        ? "border-gray-300 bg-gray-50 opacity-60"
                                        : card.isDefault
                                        ? "border-blue-400 bg-blue-50"
                                        : "border-gray-200 bg-white"
                                }`}
                            >
                                {/* Card Header */}
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-2">
                                        <span className="text-2xl">{getCardIcon(card.cardType)}</span>
                                        <div>
                                            <div className="font-medium text-sm">{card.cardType}</div>
                                            <div className="text-xs text-gray-500">
                                                {card.maskedCardNumber || "****"}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        {card.isDefault && (
                                            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                                                Default
                                            </span>
                                        )}
                                        {!card.isActive && (
                                            <span className="px-2 py-1 bg-gray-200 text-gray-600 text-xs rounded">
                                                Inactive
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Card Details */}
                                <div className="space-y-1 mb-3 text-sm">
                                    <div className="font-medium">{card.cardHolderName}</div>
                                    <div className="text-gray-600">
                                        Expires: {card.expiryMonth?.toString().padStart(2, "0")}/
                                        {card.expiryYear}
                                        {card.isExpired && (
                                            <span className="ml-2 text-red-600 font-medium">
                                                (Expired)
                                            </span>
                                        )}
                                    </div>
                                    {card.billingCity && (
                                        <div className="text-gray-500 text-xs">
                                            {card.billingCity}, {card.billingState} {card.billingZip}
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2 pt-2 border-t">
                                    {!card.isDefault && card.isActive && (
                                        <button
                                            onClick={() => handleSetDefault(card.id!)}
                                            className="text-xs text-blue-600 hover:text-blue-800"
                                        >
                                            Set Default
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleOpenModal(card)}
                                        className="text-xs text-gray-600 hover:text-gray-800"
                                    >
                                        Edit
                                    </button>
                                    {card.isActive && (
                                        <button
                                            onClick={() => handleDeactivate(card.id!)}
                                            className="text-xs text-orange-600 hover:text-orange-800"
                                        >
                                            Deactivate
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleDelete(card.id!)}
                                        className="text-xs text-red-600 hover:text-red-800 ml-auto"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="col-span-full text-center py-12 text-gray-400">
                            {searchTerm
                                ? "No matching payment methods found"
                                : "No payment methods on file"}
                        </div>
                    )}
                </div>
            )}

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-2xl space-y-4 max-h-[90vh] overflow-y-auto">
                        <h3 className="text-lg font-semibold">
                            {editingCard ? "Edit Payment Method" : "Add Payment Method"}
                        </h3>

                        <div className="grid md:grid-cols-2 gap-4">
                            {/* Card Holder Name */}
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium mb-1">
                                    Card Holder Name *
                                </label>
                                <input
                                    type="text"
                                    value={form.cardHolderName || ""}
                                    onChange={(e) => setField("cardHolderName", e.target.value)}
                                    className="w-full border rounded px-3 py-2"
                                    placeholder="John Doe"
                                    maxLength={100}
                                />
                            </div>

                            {/* Card Number */}
                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    Card Number *
                                </label>
                                <input
                                    type="text"
                                    value={form.cardNumber || ""}
                                    onChange={(e) => {
                                        const value = e.target.value.replace(/\D/g, "");
                                        if (value.length <= 16) {
                                            setField("cardNumber", value);
                                        }
                                    }}
                                    className="w-full border rounded px-3 py-2"
                                    placeholder="1234567890123456"
                                    maxLength={16}
                                />
                            </div>

                            {/* Card Type */}
                            <div>
                                <label className="block text-sm font-medium mb-1">Card Type</label>
                                <select
                                    value={form.cardType || "VISA"}
                                    onChange={(e) => setField("cardType", e.target.value)}
                                    className="w-full border rounded px-3 py-2"
                                >
                                    <option value="VISA">Visa</option>
                                    <option value="MASTERCARD">Mastercard</option>
                                    <option value="AMEX">American Express</option>
                                    <option value="DISCOVER">Discover</option>
                                </select>
                            </div>

                            {/* Expiry Month */}
                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    Expiry Month *
                                </label>
                                <select
                                    value={form.expiryMonth || 1}
                                    onChange={(e) =>
                                        setField("expiryMonth", parseInt(e.target.value))
                                    }
                                    className="w-full border rounded px-3 py-2"
                                >
                                    {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                                        <option key={month} value={month}>
                                            {month.toString().padStart(2, "0")}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Expiry Year */}
                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    Expiry Year *
                                </label>
                                <select
                                    value={form.expiryYear || new Date().getFullYear()}
                                    onChange={(e) =>
                                        setField("expiryYear", parseInt(e.target.value))
                                    }
                                    className="w-full border rounded px-3 py-2"
                                >
                                    {Array.from({ length: 15 }, (_, i) => new Date().getFullYear() + i).map(
                                        (year) => (
                                            <option key={year} value={year}>
                                                {year}
                                            </option>
                                        )
                                    )}
                                </select>
                            </div>

                            {/* CVV */}
                            <div>
                                <label className="block text-sm font-medium mb-1">CVV *</label>
                                <input
                                    type="text"
                                    value={form.cvv || ""}
                                    onChange={(e) => {
                                        const value = e.target.value.replace(/\D/g, "");
                                        if (value.length <= 4) {
                                            setField("cvv", value);
                                        }
                                    }}
                                    className="w-full border rounded px-3 py-2"
                                    placeholder="123"
                                    maxLength={4}
                                />
                            </div>

                            {/* Billing Address */}
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium mb-1">
                                    Billing Address
                                </label>
                                <input
                                    type="text"
                                    value={form.billingAddress || ""}
                                    onChange={(e) => setField("billingAddress", e.target.value)}
                                    className="w-full border rounded px-3 py-2"
                                    placeholder="123 Main St"
                                />
                            </div>

                            {/* City */}
                            <div>
                                <label className="block text-sm font-medium mb-1">City</label>
                                <input
                                    type="text"
                                    value={form.billingCity || ""}
                                    onChange={(e) => setField("billingCity", e.target.value)}
                                    className="w-full border rounded px-3 py-2"
                                    placeholder="New York"
                                    maxLength={50}
                                />
                            </div>

                            {/* State */}
                            <div>
                                <label className="block text-sm font-medium mb-1">State</label>
                                <input
                                    type="text"
                                    value={form.billingState || ""}
                                    onChange={(e) => setField("billingState", e.target.value)}
                                    className="w-full border rounded px-3 py-2"
                                    placeholder="NY"
                                    maxLength={50}
                                />
                            </div>

                            {/* Zip */}
                            <div>
                                <label className="block text-sm font-medium mb-1">Zip Code</label>
                                <input
                                    type="text"
                                    value={form.billingZip || ""}
                                    onChange={(e) => setField("billingZip", e.target.value)}
                                    className="w-full border rounded px-3 py-2"
                                    placeholder="10001"
                                    maxLength={10}
                                />
                            </div>

                            {/* Country */}
                            <div>
                                <label className="block text-sm font-medium mb-1">Country</label>
                                <input
                                    type="text"
                                    value={form.billingCountry || ""}
                                    onChange={(e) => setField("billingCountry", e.target.value)}
                                    className="w-full border rounded px-3 py-2"
                                    placeholder="USA"
                                    maxLength={50}
                                />
                            </div>

                            {/* Is Default */}
                            <div className="md:col-span-2">
                                <label className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={form.isDefault || false}
                                        onChange={(e) => setField("isDefault", e.target.checked)}
                                    />
                                    <span className="text-sm">Set as default payment method</span>
                                </label>
                            </div>

                            {/* Is Active */}
                            <div className="md:col-span-2">
                                <label className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={form.isActive ?? true}
                                        onChange={(e) => setField("isActive", e.target.checked)}
                                    />
                                    <span className="text-sm">Active</span>
                                </label>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-4 border-t">
                            <button
                                onClick={handleCloseModal}
                                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                                {editingCard ? "Update" : "Save"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

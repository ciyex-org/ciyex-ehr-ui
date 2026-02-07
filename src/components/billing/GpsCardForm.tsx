"use client";
import { getEnv } from "@/utils/env";
import React, { useState } from "react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";

interface GpsCardFormProps {
    onSaved: () => void;
    onCancel: () => void;
    showToast: (message: string, type: "success" | "error") => void;
}

interface GpsConfig {
    collectjsPublicKey?: string;
    transactUrl?: string;
}

const GpsCardForm: React.FC<GpsCardFormProps> = ({ onSaved, onCancel, showToast }) => {
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [street, setStreet] = useState("");
    const [city, setCity] = useState("");
    const [state, setState] = useState("");
    const [zip, setZip] = useState("");
    const [cardNumber, setCardNumber] = useState("");
    const [expMonth, setExpMonth] = useState("");
    const [expYear, setExpYear] = useState("");
    const [cvv, setCvv] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleSaveCard = async () => {
        if (!firstName || !lastName || !cardNumber || !expMonth || !expYear || !cvv) {
            showToast("Please fill in all required fields", "error");
            return;
        }

        setIsLoading(true);
        
        try {
            // Get GPS configuration
            const configRes = await fetchWithAuth(
                `${getEnv("NEXT_PUBLIC_API_URL")}/api/gps/config`,
                {
                    headers: { "x-org-id": "1" },
                }
            );
            
            const gpsConfig: GpsConfig = await configRes.json();
            
            if (!gpsConfig.collectjsPublicKey) {
                showToast("GPS payment is not configured", "error");
                return;
            }

            // Determine card brand from card number
            const brand = getCardBrand(cardNumber);
            const last4 = cardNumber.slice(-4);

            // Create GPS billing card
            const cardData = {
                firstName,
                lastName,
                street,
                city,
                state,
                zip,
                brand,
                last4,
                expMonth: parseInt(expMonth),
                expYear: parseInt(expYear),
                userId: 1, // This should come from user context
            };

            const res = await fetchWithAuth(
                `${getEnv("NEXT_PUBLIC_API_URL")}/api/gps/billing/tokenize`,
                {
                    method: "POST",
                    headers: { 
                        "Content-Type": "application/json", 
                        "x-org-id": "1" 
                    },
                    body: JSON.stringify(cardData),
                }
            );

            const json = await res.json();
            if (json?.success) {
                showToast("GPS card saved successfully!", "success");
                onSaved();
            } else {
                showToast(
                    "Failed to save GPS card: " + (json?.message ?? "Unknown error"),
                    "error"
                );
            }
        } catch (error) {
            console.error("GPS card save error:", error);
            showToast("Failed to save GPS card", "error");
        } finally {
            setIsLoading(false);
        }
    };

    const getCardBrand = (cardNumber: string): string => {
        const cleaned = cardNumber.replace(/\s/g, "");
        if (cleaned.startsWith("4")) return "visa";
        if (cleaned.startsWith("5") || cleaned.startsWith("2")) return "mastercard";
        if (cleaned.startsWith("3")) return "amex";
        if (cleaned.startsWith("6")) return "discover";
        return "unknown";
    };

    const formatCardNumber = (value: string) => {
        const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
        const matches = v.match(/\d{4,16}/g);
        const match = matches && matches[0] || '';
        const parts = [];
        for (let i = 0, len = match.length; i < len; i += 4) {
            parts.push(match.substring(i, i + 4));
        }
        if (parts.length) {
            return parts.join(' ');
        } else {
            return v;
        }
    };

    const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = formatCardNumber(e.target.value);
        if (formatted.replace(/\s/g, '').length <= 16) {
            setCardNumber(formatted);
        }
    };

    return (
        <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
                <input
                    placeholder="First Name *"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full p-2 border rounded"
                    disabled={isLoading}
                />
                <input
                    placeholder="Last Name *"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full p-2 border rounded"
                    disabled={isLoading}
                />
            </div>
            
            <input
                placeholder="Street Address"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                className="w-full p-2 border rounded"
                disabled={isLoading}
            />
            
            <div className="grid grid-cols-3 gap-3">
                <input
                    placeholder="City"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full p-2 border rounded"
                    disabled={isLoading}
                />
                <input
                    placeholder="State"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full p-2 border rounded"
                    disabled={isLoading}
                />
                <input
                    placeholder="ZIP Code"
                    value={zip}
                    onChange={(e) => setZip(e.target.value)}
                    className="w-full p-2 border rounded"
                    disabled={isLoading}
                />
            </div>

            <input
                placeholder="Card Number *"
                value={cardNumber}
                onChange={handleCardNumberChange}
                className="w-full p-2 border rounded"
                disabled={isLoading}
                maxLength={19} // 16 digits + 3 spaces
            />
            
            <div className="grid grid-cols-3 gap-3">
                <select
                    value={expMonth}
                    onChange={(e) => setExpMonth(e.target.value)}
                    className="w-full p-2 border rounded"
                    disabled={isLoading}
                >
                    <option value="">Month *</option>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                        <option key={month} value={month.toString().padStart(2, '0')}>
                            {month.toString().padStart(2, '0')}
                        </option>
                    ))}
                </select>
                
                <select
                    value={expYear}
                    onChange={(e) => setExpYear(e.target.value)}
                    className="w-full p-2 border rounded"
                    disabled={isLoading}
                >
                    <option value="">Year *</option>
                    {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + i).map(year => (
                        <option key={year} value={year.toString()}>
                            {year}
                        </option>
                    ))}
                </select>
                
                <input
                    placeholder="CVV *"
                    value={cvv}
                    onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    className="w-full p-2 border rounded"
                    disabled={isLoading}
                    maxLength={4}
                />
            </div>

            <div className="flex justify-end gap-2 mt-3">
                <button
                    onClick={onCancel}
                    className="px-4 py-2 rounded bg-gray-300 text-gray-700 hover:bg-gray-400"
                    disabled={isLoading}
                >
                    Cancel
                </button>
                <button
                    onClick={handleSaveCard}
                    className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                    disabled={isLoading}
                >
                    {isLoading ? "Saving..." : "Save GPS Card"}
                </button>
            </div>
        </div>
    );
};

export default GpsCardForm;
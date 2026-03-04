"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
    CreditCard, Shield, Check, AlertCircle, Loader2,
    Wifi, WifiOff, DollarSign, Settings, ChevronDown, ChevronRight,
} from "lucide-react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import type { PaymentGatewayConfig } from "./types";

const DEFAULT_CONFIG: PaymentGatewayConfig = {
    active_processor: "stripe",
    stripe_mode: "TEST",
    stripe_publishable_key: "",
    stripe_secret_key: "",
    stripe_webhook_secret: "",
    gps_merchant_id: "",
    gps_api_key: "",
    gps_terminal_id: "",
    square_application_id: "",
    square_access_token: "",
    square_location_id: "",
    accepted_methods: ["CARD"],
    convenience_fee_enabled: false,
    convenience_fee_percent: 0,
    convenience_fee_flat: 0,
    auto_receipt: true,
};

const PROCESSORS = [
    { id: "stripe" as const, name: "Stripe", desc: "Online card payments via Stripe", color: "indigo" },
    { id: "gps" as const, name: "Global Payments", desc: "In-office terminal + card payments", color: "blue" },
    { id: "square" as const, name: "Square", desc: "Square terminal + online payments", color: "green" },
    { id: "none" as const, name: "Demo Mode", desc: "No processor — simulated payments for testing", color: "gray" },
];

const PAYMENT_METHODS = [
    { id: "CARD", label: "Credit / Debit Card" },
    { id: "ACH", label: "ACH / Bank Transfer" },
    { id: "FSA_HSA", label: "FSA / HSA Card" },
    { id: "CASH", label: "Cash" },
    { id: "CHECK", label: "Check" },
];

export default function PaymentGatewaySettings() {
    const [config, setConfig] = useState<PaymentGatewayConfig>(DEFAULT_CONFIG);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [expandedProcessor, setExpandedProcessor] = useState<string | null>("stripe");

    const fetchConfig = useCallback(async () => {
        try {
            const res = await fetchWithAuth("/api/app-installations/payment-gateway");
            if (res.ok) {
                const json = await res.json();
                if (json.data?.config) {
                    setConfig({ ...DEFAULT_CONFIG, ...json.data.config });
                }
            }
        } catch (e) {
            console.error("Failed to load Payment Gateway config:", e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchConfig(); }, [fetchConfig]);

    const saveConfig = async () => {
        setSaving(true);
        setMessage(null);
        try {
            const res = await fetchWithAuth("/api/app-installations/payment-gateway/config", {
                method: "PUT",
                body: JSON.stringify(config),
            });
            if (res.ok) {
                setMessage({ type: "success", text: "Payment gateway settings saved" });
            } else {
                setMessage({ type: "error", text: "Failed to save settings" });
            }
        } catch {
            setMessage({ type: "error", text: "Error saving settings" });
        } finally {
            setSaving(false);
            setTimeout(() => setMessage(null), 4000);
        }
    };

    const testConnection = async () => {
        setTesting(true);
        setTestResult(null);
        try {
            // Test by calling the stripe-config endpoint
            const res = await fetchWithAuth("/api/payments/stripe-config");
            if (res.ok) {
                const json = await res.json();
                if (json.data?.configured) {
                    setTestResult({ ok: true, msg: "Connected to Stripe (live keys configured)" });
                } else {
                    setTestResult({ ok: true, msg: "Demo mode active — no live processor configured" });
                }
            } else {
                setTestResult({ ok: false, msg: "Could not reach payment service" });
            }
        } catch {
            setTestResult({ ok: false, msg: "Connection failed" });
        } finally {
            setTesting(false);
        }
    };

    const updateField = (field: keyof PaymentGatewayConfig, value: unknown) => {
        setConfig(prev => ({ ...prev, [field]: value }));
    };

    const toggleMethod = (method: string) => {
        setConfig(prev => ({
            ...prev,
            accepted_methods: prev.accepted_methods.includes(method)
                ? prev.accepted_methods.filter(m => m !== method)
                : [...prev.accepted_methods, method],
        }));
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400 mr-2" />
                <span className="text-sm text-gray-500">Loading settings...</span>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-green-50 to-emerald-100">
                        <CreditCard className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">Payment Gateway</h2>
                        <p className="text-xs text-gray-500">Configure payment processors for patient payments</p>
                    </div>
                </div>
                <button
                    onClick={saveConfig}
                    disabled={saving}
                    className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    {saving ? "Saving..." : "Save Settings"}
                </button>
            </div>

            {/* Status message */}
            {message && (
                <div className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm ${
                    message.type === "success" ? "bg-green-50 text-green-700 border border-green-200"
                        : "bg-red-50 text-red-700 border border-red-200"
                }`}>
                    {message.type === "success" ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                    {message.text}
                </div>
            )}

            {/* Active Processor Selection */}
            <div className="bg-white border border-gray-200 rounded-lg">
                <div className="px-4 py-3 border-b border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                        <Settings className="w-4 h-4 text-gray-500" />
                        Payment Processor
                    </h3>
                </div>
                <div className="p-4 grid grid-cols-2 gap-3">
                    {PROCESSORS.map(p => (
                        <button
                            key={p.id}
                            onClick={() => updateField("active_processor", p.id)}
                            className={`flex items-start gap-3 p-3 rounded-lg border-2 text-left transition-all ${
                                config.active_processor === p.id
                                    ? `border-${p.color}-500 bg-${p.color}-50/50 ring-1 ring-${p.color}-200`
                                    : "border-gray-200 hover:border-gray-300"
                            }`}
                        >
                            <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                                config.active_processor === p.id ? `border-${p.color}-500 bg-${p.color}-500` : "border-gray-300"
                            }`}>
                                {config.active_processor === p.id && <Check className="w-2.5 h-2.5 text-white" />}
                            </div>
                            <div>
                                <div className="text-sm font-medium text-gray-900">{p.name}</div>
                                <div className="text-xs text-gray-500 mt-0.5">{p.desc}</div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Processor Configuration */}
            <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
                <div className="px-4 py-3 border-b border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                        <Shield className="w-4 h-4 text-gray-500" />
                        Processor Credentials
                    </h3>
                </div>

                {/* Stripe */}
                <div>
                    <button
                        onClick={() => setExpandedProcessor(expandedProcessor === "stripe" ? null : "stripe")}
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50"
                    >
                        <div className="flex items-center gap-2">
                            {expandedProcessor === "stripe" ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                            <span className="text-sm font-medium text-gray-700">Stripe</span>
                            {config.active_processor === "stripe" && (
                                <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-indigo-100 text-indigo-700 rounded">ACTIVE</span>
                            )}
                        </div>
                        <div className="flex items-center gap-1.5">
                            {config.stripe_publishable_key ? (
                                <><Wifi className="w-3.5 h-3.5 text-green-500" /><span className="text-xs text-green-600">Configured</span></>
                            ) : (
                                <><WifiOff className="w-3.5 h-3.5 text-gray-400" /><span className="text-xs text-gray-400">Not configured</span></>
                            )}
                        </div>
                    </button>
                    {expandedProcessor === "stripe" && (
                        <div className="px-4 pb-4 space-y-3">
                            <div className="flex items-center gap-3">
                                <label className="text-xs font-medium text-gray-600 w-28">Mode</label>
                                <div className="flex gap-2">
                                    {(["TEST", "LIVE"] as const).map(m => (
                                        <button
                                            key={m}
                                            onClick={() => updateField("stripe_mode", m)}
                                            className={`px-3 py-1 text-xs font-medium rounded-md border ${
                                                config.stripe_mode === m
                                                    ? m === "LIVE" ? "bg-green-100 border-green-300 text-green-700" : "bg-yellow-100 border-yellow-300 text-yellow-700"
                                                    : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
                                            }`}
                                        >
                                            {m}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {[
                                { key: "stripe_publishable_key" as const, label: "Publishable Key", placeholder: "pk_test_..." },
                                { key: "stripe_secret_key" as const, label: "Secret Key", placeholder: "sk_test_...", sensitive: true },
                                { key: "stripe_webhook_secret" as const, label: "Webhook Secret", placeholder: "whsec_..." , sensitive: true },
                            ].map(f => (
                                <div key={f.key} className="flex items-center gap-3">
                                    <label className="text-xs font-medium text-gray-600 w-28">{f.label}</label>
                                    <input
                                        type={f.sensitive ? "password" : "text"}
                                        value={config[f.key] ?? ""}
                                        onChange={e => updateField(f.key, e.target.value)}
                                        placeholder={f.placeholder}
                                        className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-300"
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* GPS */}
                <div>
                    <button
                        onClick={() => setExpandedProcessor(expandedProcessor === "gps" ? null : "gps")}
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50"
                    >
                        <div className="flex items-center gap-2">
                            {expandedProcessor === "gps" ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                            <span className="text-sm font-medium text-gray-700">Global Payments (GPS)</span>
                            {config.active_processor === "gps" && (
                                <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-blue-100 text-blue-700 rounded">ACTIVE</span>
                            )}
                        </div>
                        <div className="flex items-center gap-1.5">
                            {config.gps_merchant_id ? (
                                <><Wifi className="w-3.5 h-3.5 text-green-500" /><span className="text-xs text-green-600">Configured</span></>
                            ) : (
                                <><WifiOff className="w-3.5 h-3.5 text-gray-400" /><span className="text-xs text-gray-400">Not configured</span></>
                            )}
                        </div>
                    </button>
                    {expandedProcessor === "gps" && (
                        <div className="px-4 pb-4 space-y-3">
                            {[
                                { key: "gps_merchant_id" as const, label: "Merchant ID", placeholder: "MID-..." },
                                { key: "gps_api_key" as const, label: "API Key", placeholder: "gps_...", sensitive: true },
                                { key: "gps_terminal_id" as const, label: "Terminal ID", placeholder: "TID-..." },
                            ].map(f => (
                                <div key={f.key} className="flex items-center gap-3">
                                    <label className="text-xs font-medium text-gray-600 w-28">{f.label}</label>
                                    <input
                                        type={f.sensitive ? "password" : "text"}
                                        value={config[f.key] ?? ""}
                                        onChange={e => updateField(f.key, e.target.value)}
                                        placeholder={f.placeholder}
                                        className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-300"
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Square */}
                <div>
                    <button
                        onClick={() => setExpandedProcessor(expandedProcessor === "square" ? null : "square")}
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50"
                    >
                        <div className="flex items-center gap-2">
                            {expandedProcessor === "square" ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                            <span className="text-sm font-medium text-gray-700">Square</span>
                            {config.active_processor === "square" && (
                                <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-green-100 text-green-700 rounded">ACTIVE</span>
                            )}
                        </div>
                        <div className="flex items-center gap-1.5">
                            {config.square_application_id ? (
                                <><Wifi className="w-3.5 h-3.5 text-green-500" /><span className="text-xs text-green-600">Configured</span></>
                            ) : (
                                <><WifiOff className="w-3.5 h-3.5 text-gray-400" /><span className="text-xs text-gray-400">Not configured</span></>
                            )}
                        </div>
                    </button>
                    {expandedProcessor === "square" && (
                        <div className="px-4 pb-4 space-y-3">
                            {[
                                { key: "square_application_id" as const, label: "Application ID", placeholder: "sq0idp-..." },
                                { key: "square_access_token" as const, label: "Access Token", placeholder: "EAAAl...", sensitive: true },
                                { key: "square_location_id" as const, label: "Location ID", placeholder: "L..." },
                            ].map(f => (
                                <div key={f.key} className="flex items-center gap-3">
                                    <label className="text-xs font-medium text-gray-600 w-28">{f.label}</label>
                                    <input
                                        type={f.sensitive ? "password" : "text"}
                                        value={config[f.key] ?? ""}
                                        onChange={e => updateField(f.key, e.target.value)}
                                        placeholder={f.placeholder}
                                        className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-green-300"
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Test Connection */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-semibold text-gray-800">Connection Status</h3>
                        <p className="text-xs text-gray-500 mt-0.5">Test your payment processor connection</p>
                    </div>
                    <button
                        onClick={testConnection}
                        disabled={testing}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-md transition-colors disabled:opacity-50"
                    >
                        {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wifi className="w-3.5 h-3.5" />}
                        Test Connection
                    </button>
                </div>
                {testResult && (
                    <div className={`mt-3 flex items-center gap-2 px-3 py-2 rounded-md text-xs ${
                        testResult.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                    }`}>
                        {testResult.ok ? <Check className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                        {testResult.msg}
                    </div>
                )}
            </div>

            {/* Accepted Payment Methods */}
            <div className="bg-white border border-gray-200 rounded-lg">
                <div className="px-4 py-3 border-b border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-gray-500" />
                        Accepted Payment Methods
                    </h3>
                </div>
                <div className="p-4 space-y-2">
                    {PAYMENT_METHODS.map(m => (
                        <label key={m.id} className="flex items-center gap-3 cursor-pointer group">
                            <input
                                type="checkbox"
                                checked={config.accepted_methods.includes(m.id)}
                                onChange={() => toggleMethod(m.id)}
                                className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                            />
                            <span className="text-sm text-gray-700 group-hover:text-gray-900">{m.label}</span>
                        </label>
                    ))}
                </div>
            </div>

            {/* Convenience Fee */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={config.convenience_fee_enabled}
                        onChange={e => updateField("convenience_fee_enabled", e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                    />
                    <div>
                        <span className="text-sm font-medium text-gray-800">Enable Convenience Fee</span>
                        <p className="text-xs text-gray-500">Add a processing fee to card payments</p>
                    </div>
                </label>
                {config.convenience_fee_enabled && (
                    <div className="flex items-center gap-4 pl-7">
                        <div className="flex items-center gap-2">
                            <label className="text-xs text-gray-600">Percent:</label>
                            <input
                                type="number"
                                value={config.convenience_fee_percent}
                                onChange={e => updateField("convenience_fee_percent", parseFloat(e.target.value) || 0)}
                                className="w-16 px-2 py-1 text-sm border border-gray-200 rounded-md"
                                min="0" max="10" step="0.25"
                            />
                            <span className="text-xs text-gray-400">%</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="text-xs text-gray-600">Flat:</label>
                            <input
                                type="number"
                                value={config.convenience_fee_flat}
                                onChange={e => updateField("convenience_fee_flat", parseFloat(e.target.value) || 0)}
                                className="w-16 px-2 py-1 text-sm border border-gray-200 rounded-md"
                                min="0" max="50" step="0.50"
                            />
                            <span className="text-xs text-gray-400">$</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Auto Receipt */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
                <label className="flex items-center gap-3 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={config.auto_receipt}
                        onChange={e => updateField("auto_receipt", e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                    />
                    <div>
                        <span className="text-sm font-medium text-gray-800">Auto-send Receipt</span>
                        <p className="text-xs text-gray-500">Automatically email payment receipt to patient after successful charge</p>
                    </div>
                </label>
            </div>
        </div>
    );
}

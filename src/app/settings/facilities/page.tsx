// Remove static UI shell export. The backend-connected FacilitiesPage below is now the main export.
"use client";

import React, { useState, useCallback, useEffect } from "react";
import AdminLayout from "@/app/(admin)/layout";
import { PlusIcon, PencilIcon, TrashBinIcon } from "@/icons";
import { facilityAPI } from "./facilityAPI";

/* ------------ Types ------------ */
interface Facility {
    id: string;
    name: string;
    // Address fields
    physicalAddress: string;
    physicalCity: string;
    physicalState: string;
    physicalZipCode: string;
    physicalCountry: string;
    mailingAddress: string;
    mailingCity: string;
    mailingState: string;
    mailingZipCode: string;
    mailingCountry: string;
    // Contact fields
    phone: string;
    fax: string;
    website: string;
    email: string;
    // Facility details
    color: string;
    iban: string;
    posCode: string;
    facilityTaxonomy: string;
    cliaNumber: string;
    taxIdType: string;
    taxId: string;
    billingAttn: string;
    facilityLabCode: string;
    npi: string;
    oid: string;
    // Checkboxes
    billingLocation: boolean;
    acceptsAssignment: boolean;
    serviceLocation: boolean;
    primaryBusinessEntity: boolean;
    facilityInactive: boolean;
    // Additional info
    info: string;
    isActive: boolean;
}

interface ToastNotification {
    id: number;
    message: string;
    type: "success" | "error" | "info";
    visible: boolean;
}

/* ------------ Toast Notification Component ------------ */
const ToastNotificationComponent: React.FC<{
    notification: ToastNotification;
    onClose: (id: number) => void;
}> = ({ notification, onClose }) => {
    const getToastStyles = () => {
        switch (notification.type) {
            case "success":
                return "bg-green-500 border-green-600";
            case "error":
                return "bg-red-500 border-red-600";
            case "info":
                return "bg-blue-500 border-blue-600";
            default:
                return "bg-gray-500 border-gray-600";
        }
    };

    return (
        <div
            className={`${getToastStyles()} text-white px-4 py-3 rounded-lg shadow-lg border-l-4 flex items-center justify-between min-w-80 max-w-96 transform transition-all duration-300 ${
                notification.visible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
            }`}
        >
            <div className="flex items-center">
                <div className="mr-3">
                    {notification.type === "success" && (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                            />
                        </svg>
                    )}
                    {notification.type === "error" && (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path
                                fillRule="evenodd"
                                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                clipRule="evenodd"
                            />
                        </svg>
                    )}
                    {notification.type === "info" && (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path
                                fillRule="evenodd"
                                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                                clipRule="evenodd"
                            />
                        </svg>
                    )}
                </div>
                <span className="text-sm font-medium">{notification.message}</span>
            </div>
            <button
                onClick={() => onClose(notification.id)}
                className="ml-4 text-white hover:text-gray-200 focus:outline-none"
            >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                        fillRule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clipRule="evenodd"
                    />
                </svg>
            </button>
        </div>
    );
};

/* ------------ Add/Edit Facility Modal ------------ */
interface FacilityModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (facility: Facility) => void;
    facility?: Facility;
}

const FacilityModal: React.FC<FacilityModalProps> = ({ isOpen, onClose, onSave, facility }) => {
    const [activeTab, setActiveTab] = useState<'physical' | 'mailing'>('physical');
    const [formData, setFormData] = useState<Omit<Facility, 'id'>>({
        name: facility?.name || "",
        // Address fields
        physicalAddress: facility?.physicalAddress || "",
        physicalCity: facility?.physicalCity || "",
        physicalState: facility?.physicalState || "",
        physicalZipCode: facility?.physicalZipCode || "",
        physicalCountry: facility?.physicalCountry || "",
        mailingAddress: facility?.mailingAddress || "",
        mailingCity: facility?.mailingCity || "",
        mailingState: facility?.mailingState || "",
        mailingZipCode: facility?.mailingZipCode || "",
        mailingCountry: facility?.mailingCountry || "",
        // Contact fields
        phone: facility?.phone || "",
        fax: facility?.fax || "",
        website: facility?.website || "",
        email: facility?.email || "",
        // Facility details
        color: facility?.color || "#3B82F6",
        iban: facility?.iban || "",
        posCode: facility?.posCode || "01: Pharmacy **",
        facilityTaxonomy: facility?.facilityTaxonomy || "",
        cliaNumber: facility?.cliaNumber || "",
        taxIdType: facility?.taxIdType || "EIN",
        taxId: facility?.taxId || "",
        billingAttn: facility?.billingAttn || "",
        facilityLabCode: facility?.facilityLabCode || "",
        npi: facility?.npi || "",
        oid: facility?.oid || "",
        // Checkboxes
        billingLocation: facility?.billingLocation || false,
        acceptsAssignment: facility?.acceptsAssignment || false,
        serviceLocation: facility?.serviceLocation || false,
        primaryBusinessEntity: facility?.primaryBusinessEntity || false,
        facilityInactive: facility?.facilityInactive || false,
        // Additional info
        info: facility?.info || "",
        isActive: facility?.isActive !== undefined ? facility.isActive : true,
    });

    React.useEffect(() => {
        if (facility) {
            setFormData({
                name: facility.name,
                physicalAddress: facility.physicalAddress,
                physicalCity: facility.physicalCity,
                physicalState: facility.physicalState,
                physicalZipCode: facility.physicalZipCode,
                physicalCountry: facility.physicalCountry,
                mailingAddress: facility.mailingAddress,
                mailingCity: facility.mailingCity,
                mailingState: facility.mailingState,
                mailingZipCode: facility.mailingZipCode,
                mailingCountry: facility.mailingCountry,
                phone: facility.phone,
                fax: facility.fax,
                website: facility.website,
                email: facility.email,
                color: facility.color,
                iban: facility.iban,
                posCode: facility.posCode,
                facilityTaxonomy: facility.facilityTaxonomy,
                cliaNumber: facility.cliaNumber,
                taxIdType: facility.taxIdType,
                taxId: facility.taxId,
                billingAttn: facility.billingAttn,
                facilityLabCode: facility.facilityLabCode,
                npi: facility.npi,
                oid: facility.oid,
                billingLocation: facility.billingLocation,
                acceptsAssignment: facility.acceptsAssignment,
                serviceLocation: facility.serviceLocation,
                primaryBusinessEntity: facility.primaryBusinessEntity,
                facilityInactive: facility.facilityInactive,
                info: facility.info,
                isActive: facility.isActive,
            });
        } else {
            setFormData({
                name: "",
                physicalAddress: "",
                physicalCity: "",
                physicalState: "",
                physicalZipCode: "",
                physicalCountry: "",
                mailingAddress: "",
                mailingCity: "",
                mailingState: "",
                mailingZipCode: "",
                mailingCountry: "",
                phone: "",
                fax: "",
                website: "",
                email: "",
                color: "#3B82F6",
                iban: "",
                posCode: "01: Pharmacy **",
                facilityTaxonomy: "",
                cliaNumber: "",
                taxIdType: "EIN",
                taxId: "",
                billingAttn: "",
                facilityLabCode: "",
                npi: "",
                oid: "",
                billingLocation: false,
                acceptsAssignment: false,
                serviceLocation: false,
                primaryBusinessEntity: false,
                facilityInactive: false,
                info: "",
                isActive: true,
            });
        }
    }, [facility]);

    const handleInputChange = (field: keyof typeof formData, value: string | boolean) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const facilityData: Facility = {
            id: facility?.id || Date.now().toString(),
            ...formData,
        };
        onSave(facilityData);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto">
            {/* Background overlay */}
            <div
                className="fixed inset-0 h-full w-full bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />
            
            {/* Modal content */}
            <div 
                className="relative bg-white rounded-lg w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col mx-4 shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b">
                    <h2 className="text-xl font-semibold">
                        {facility ? "Edit Facility" : "Add Facility"}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                    >
                        ×
                    </button>
                </div>
                
                {/* Form Container with scroll */}
                <div className="flex-1 overflow-y-auto">
                    <form onSubmit={handleSubmit} className="p-6">
                        {/* Facility Name */}
                        <div className="mb-6">
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={(e) => handleInputChange("name", e.target.value)}
                                className="w-full p-3 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-600"
                                placeholder="Facility Name"
                            />
                        </div>

                        {/* Main Content Grid */}
                        <div className="grid grid-cols-3 gap-6">
                            {/* Left Column - Address Section */}
                            <div className="col-span-2">
                                {/* Address Section with Tabs */}
                                <div className="mb-6">
                                    <div className="flex border-b border-gray-200 mb-4">
                                        <button
                                            type="button"
                                            onClick={() => setActiveTab('physical')}
                                            className={`px-6 py-3 text-sm font-medium rounded-t-lg ${
                                                activeTab === 'physical'
                                                    ? 'text-white bg-blue-500'
                                                    : 'text-gray-600 bg-gray-100 hover:bg-gray-200'
                                            }`}
                                        >
                                            Physical Address
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setActiveTab('mailing')}
                                            className={`px-6 py-3 text-sm font-medium rounded-t-lg ml-1 ${
                                                activeTab === 'mailing'
                                                    ? 'text-white bg-blue-500'
                                                    : 'text-gray-600 bg-gray-100 hover:bg-gray-200'
                                            }`}
                                        >
                                            Mailing Address
                                        </button>
                                    </div>

                                    {activeTab === 'physical' && (
                                        <div className="space-y-4">
                                            <div className="flex items-center space-x-2 mb-4">
                                                <div className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center">
                                                    <svg className="w-4 h-4 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                                                    </svg>
                                                </div>
                                                <textarea
                                                    value={formData.physicalAddress}
                                                    onChange={(e) => handleInputChange("physicalAddress", e.target.value)}
                                                    className="flex-1 p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                    rows={3}
                                                    placeholder="Address"
                                                />
                                            </div>
                                            <div className="grid grid-cols-4 gap-4">
                                                <div>
                                                    <input
                                                        type="text"
                                                        value={formData.physicalCity}
                                                        onChange={(e) => handleInputChange("physicalCity", e.target.value)}
                                                        className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                        placeholder="City"
                                                    />
                                                </div>
                                                <div>
                                                    <input
                                                        type="text"
                                                        value={formData.physicalState}
                                                        onChange={(e) => handleInputChange("physicalState", e.target.value)}
                                                        className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                        placeholder="State"
                                                    />
                                                </div>
                                                <div>
                                                    <input
                                                        type="text"
                                                        value={formData.physicalZipCode}
                                                        onChange={(e) => handleInputChange("physicalZipCode", e.target.value)}
                                                        className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                        placeholder="Zip Code"
                                                    />
                                                </div>
                                                <div>
                                                    <input
                                                        type="text"
                                                        value={formData.physicalCountry}
                                                        onChange={(e) => handleInputChange("physicalCountry", e.target.value)}
                                                        className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                        placeholder="Country"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === 'mailing' && (
                                        <div className="space-y-4">
                                            <div className="flex items-center space-x-2 mb-4">
                                                <div className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center">
                                                    <svg className="w-4 h-4 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                                                    </svg>
                                                </div>
                                                <textarea
                                                    value={formData.mailingAddress}
                                                    onChange={(e) => handleInputChange("mailingAddress", e.target.value)}
                                                    className="flex-1 p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                    rows={3}
                                                    placeholder="Address"
                                                />
                                            </div>
                                            <div className="grid grid-cols-4 gap-4">
                                                <div>
                                                    <input
                                                        type="text"
                                                        value={formData.mailingCity}
                                                        onChange={(e) => handleInputChange("mailingCity", e.target.value)}
                                                        className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                        placeholder="City"
                                                    />
                                                </div>
                                                <div>
                                                    <input
                                                        type="text"
                                                        value={formData.mailingState}
                                                        onChange={(e) => handleInputChange("mailingState", e.target.value)}
                                                        className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                        placeholder="State"
                                                    />
                                                </div>
                                                <div>
                                                    <input
                                                        type="text"
                                                        value={formData.mailingZipCode}
                                                        onChange={(e) => handleInputChange("mailingZipCode", e.target.value)}
                                                        className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                        placeholder="Zip Code"
                                                    />
                                                </div>
                                                <div>
                                                    <input
                                                        type="text"
                                                        value={formData.mailingCountry}
                                                        onChange={(e) => handleInputChange("mailingCountry", e.target.value)}
                                                        className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                        placeholder="Country"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Contact Information Grid */}
                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                                            <input
                                                type="tel"
                                                value={formData.phone}
                                                onChange={(e) => handleInputChange("phone", e.target.value)}
                                                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                placeholder="Phone"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Fax</label>
                                            <input
                                                type="tel"
                                                value={formData.fax}
                                                onChange={(e) => handleInputChange("fax", e.target.value)}
                                                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                placeholder="Fax"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                                            <input
                                                type="url"
                                                value={formData.website}
                                                onChange={(e) => handleInputChange("website", e.target.value)}
                                                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                placeholder="Website"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                            <input
                                                type="email"
                                                value={formData.email}
                                                onChange={(e) => handleInputChange("email", e.target.value)}
                                                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                placeholder="Email"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Color and IBAN Row */}
                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Color*</label>
                                        <div className="flex items-center space-x-2">
                                            <div className="relative">
                                                <input
                                                    type="color"
                                                    value={formData.color}
                                                    onChange={(e) => handleInputChange("color", e.target.value)}
                                                    className="sr-only"
                                                    id="colorPicker"
                                                />
                                                <label 
                                                    htmlFor="colorPicker"
                                                    className="w-12 h-10 border border-gray-300 rounded cursor-pointer flex items-center justify-center"
                                                    style={{backgroundColor: formData.color}}
                                                >
                                                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M4 2a2 2 0 00-2 2v11a2 2 0 002 2h12a2 2 0 002-2V4a2 2 0 00-2-2H4zm0 2h12v11H4V4zm2 2v7h8V6H6z" clipRule="evenodd" />
                                                    </svg>
                                                </label>
                                            </div>
                                            <input
                                                type="text"
                                                value={formData.color}
                                                onChange={(e) => handleInputChange("color", e.target.value)}
                                                className="flex-1 p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                placeholder="#3B82F6"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">IBAN</label>
                                        <input
                                            type="text"
                                            value={formData.iban}
                                            onChange={(e) => handleInputChange("iban", e.target.value)}
                                            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            placeholder="IBAN"
                                        />
                                    </div>
                                </div>

                                {/* POS Code and Facility Taxonomy */}
                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">POS Code</label>
                                        <select
                                            value={formData.posCode}
                                            onChange={(e) => handleInputChange("posCode", e.target.value)}
                                            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        >
                                            <option value="01: Pharmacy **">01: Pharmacy **</option>
                                            <option value="02: Telehealth">02: Telehealth</option>
                                            <option value="03: School">03: School</option>
                                            <option value="04: Homeless Shelter">04: Homeless Shelter</option>
                                            <option value="05: Indian Health Service">05: Indian Health Service</option>
                                            <option value="06: Tribal">06: Tribal</option>
                                            <option value="07: Residential Care">07: Residential Care</option>
                                            <option value="08: Office">08: Office</option>
                                            <option value="09: Mass Immunization">09: Mass Immunization</option>
                                            <option value="10: Other">10: Other</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Facility Taxonomy</label>
                                        <input
                                            type="text"
                                            value={formData.facilityTaxonomy}
                                            onChange={(e) => handleInputChange("facilityTaxonomy", e.target.value)}
                                            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            placeholder="Facility Taxonomy"
                                        />
                                    </div>
                                </div>

                                {/* CLIA Number and Billing Attn */}
                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">CLIA Number</label>
                                        <input
                                            type="text"
                                            value={formData.cliaNumber}
                                            onChange={(e) => handleInputChange("cliaNumber", e.target.value)}
                                            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            placeholder="CLIA Number"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Billing Attn</label>
                                        <input
                                            type="text"
                                            value={formData.billingAttn}
                                            onChange={(e) => handleInputChange("billingAttn", e.target.value)}
                                            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            placeholder="Billing Attention"
                                        />
                                    </div>
                                </div>

                                {/* Tax ID and Facility Lab Code */}
                                <div className="grid grid-cols-3 gap-4 mb-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Tax ID</label>
                                        <select
                                            value={formData.taxIdType}
                                            onChange={(e) => handleInputChange("taxIdType", e.target.value)}
                                            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        >
                                            <option value="EIN">EIN</option>
                                            <option value="SSN">SSN</option>
                                            <option value="ITIN">ITIN</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Tax ID Value</label>
                                        <input
                                            type="text"
                                            value={formData.taxId}
                                            onChange={(e) => handleInputChange("taxId", e.target.value)}
                                            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            placeholder="Tax ID"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Facility Lab Code</label>
                                        <input
                                            type="text"
                                            value={formData.facilityLabCode}
                                            onChange={(e) => handleInputChange("facilityLabCode", e.target.value)}
                                            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            placeholder="Facility Lab Code"
                                        />
                                    </div>
                                </div>

                                {/* Facility NPI and OID */}
                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Facility NPI</label>
                                        <input
                                            type="text"
                                            value={formData.npi}
                                            onChange={(e) => handleInputChange("npi", e.target.value)}
                                            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            placeholder="NPI number"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">OID:</label>
                                        <input
                                            type="text"
                                            value={formData.oid}
                                            onChange={(e) => handleInputChange("oid", e.target.value)}
                                            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            placeholder="OID"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Right Column - Radio Buttons and Info */}
                            <div className="col-span-1">
                                {/* Radio Buttons */}
                                <div className="space-y-4 mb-6">
                                    <div className="flex items-center">
                                        <input
                                            type="radio"
                                            id="billingLocation"
                                            name="facilityOptions"
                                            checked={formData.billingLocation}
                                            onChange={(e) => handleInputChange("billingLocation", e.target.checked)}
                                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                                        />
                                        <label htmlFor="billingLocation" className="ml-3 block text-sm text-gray-700">
                                            Billing Location
                                        </label>
                                    </div>
                                    <div className="flex items-center">
                                        <input
                                            type="radio"
                                            id="acceptsAssignment"
                                            name="facilityOptions"
                                            checked={formData.acceptsAssignment}
                                            onChange={(e) => handleInputChange("acceptsAssignment", e.target.checked)}
                                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                                        />
                                        <label htmlFor="acceptsAssignment" className="ml-3 block text-sm text-gray-700">
                                            Accepts Assignment
                                            <span className="text-xs text-gray-500 block">(only if billing location)</span>
                                        </label>
                                    </div>
                                    <div className="flex items-center">
                                        <input
                                            type="radio"
                                            id="serviceLocation"
                                            name="facilityOptions"
                                            checked={formData.serviceLocation}
                                            onChange={(e) => handleInputChange("serviceLocation", e.target.checked)}
                                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                                        />
                                        <label htmlFor="serviceLocation" className="ml-3 block text-sm text-gray-700">
                                            Service Location
                                        </label>
                                    </div>
                                    <div className="flex items-center">
                                        <input
                                            type="radio"
                                            id="primaryBusinessEntity"
                                            name="facilityOptions"
                                            checked={formData.primaryBusinessEntity}
                                            onChange={(e) => handleInputChange("primaryBusinessEntity", e.target.checked)}
                                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                                        />
                                        <label htmlFor="primaryBusinessEntity" className="ml-3 block text-sm text-gray-700">
                                            Primary Business Entity
                                        </label>
                                    </div>
                                    <div className="flex items-center">
                                        <input
                                            type="radio"
                                            id="facilityInactive"
                                            name="facilityOptions"
                                            checked={formData.facilityInactive}
                                            onChange={(e) => handleInputChange("facilityInactive", e.target.checked)}
                                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                                        />
                                        <label htmlFor="facilityInactive" className="ml-3 block text-sm text-gray-700">
                                            Facility Inactive
                                        </label>
                                    </div>
                                </div>

                                {/* Info Section */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Info</label>
                                    <textarea
                                        value={formData.info}
                                        onChange={(e) => handleInputChange("info", e.target.value)}
                                        className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        rows={6}
                                        placeholder="Additional information..."
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="text-xs text-gray-500 mt-6">
                            * Required
                        </div>
                    </form>
                </div>

                {/* Footer */}
                <div className="border-t p-6 bg-gray-50">
                    <div className="flex justify-end space-x-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            onClick={handleSubmit}
                            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                        >
                            {facility ? "Update" : "Save"} Facility
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

/* ------------ Confirmation Modal ------------ */
interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ 
    isOpen, 
    onClose, 
    onConfirm, 
    title, 
    message 
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Background overlay */}
            <div
                className="fixed inset-0 h-full w-full bg-black/50"
                onClick={onClose}
            />
            
            {/* Modal content */}
            <div 
                className="relative bg-white rounded-lg p-6 w-full max-w-md mx-4 shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                <h2 className="text-xl font-semibold mb-4 text-gray-900">{title}</h2>
                <p className="text-gray-600 mb-6">{message}</p>
                
                <div className="flex justify-end space-x-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
                    >
                        Delete
                    </button>
                </div>
            </div>
        </div>
    );
};

/* ------------ Main Page ------------ */
export default function FacilitiesPage() {
    const [notifications, setNotifications] = useState<ToastNotification[]>([]);
    const [nextNotificationId, setNextNotificationId] = useState(1);
    const [includeInactive, setIncludeInactive] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingFacility, setEditingFacility] = useState<Facility | undefined>();
    const [confirmationModal, setConfirmationModal] = useState<{
        isOpen: boolean;
        facilityId: string;
        facilityName: string;
    }>({
        isOpen: false,
        facilityId: "",
        facilityName: "",
    });
    const [facilities, setFacilities] = useState<Facility[]>([]);
    const [statistics, setStatistics] = useState({
        totalCount: 0,
        activeCount: 0,
        inactiveCount: 0,
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Load facilities and statistics on mount
    useEffect(() => {
        void loadFacilities();
        void loadStatistics();
    }, []);

    const loadFacilities = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await facilityAPI.getAll();
            if (response.success && Array.isArray(response.data)) {
                // Map backend data to frontend format
                const mappedFacilities = response.data.map((facility: any) => ({
                    id: (facility.fhirId || facility.externalId || facility.id || Date.now().toString()),
                    name: facility.name || "",
                    physicalAddress: facility.physicalAddress || "",
                    physicalCity: facility.physicalCity || "",
                    physicalState: facility.physicalState || "",
                    physicalZipCode: facility.physicalZipCode || "",
                    physicalCountry: facility.physicalCountry || "",
                    mailingAddress: facility.mailingAddress || "",
                    mailingCity: facility.mailingCity || "",
                    mailingState: facility.mailingState || "",
                    mailingZipCode: facility.mailingZipCode || "",
                    mailingCountry: facility.mailingCountry || "",
                    phone: facility.phone || "",
                    fax: facility.fax || "",
                    website: facility.website || "",
                    email: facility.email || "",
                    color: facility.color || "#3B82F6",
                    iban: facility.iban || "",
                    posCode: facility.posCode || "01: Pharmacy **",
                    facilityTaxonomy: facility.facilityTaxonomy || "",
                    cliaNumber: facility.cliaNumber || "",
                    taxIdType: facility.taxIdType || "EIN",
                    taxId: facility.taxId || "",
                    billingAttn: facility.billingAttn || "",
                    facilityLabCode: facility.facilityLabCode || "",
                    npi: facility.npi || "",
                    oid: facility.oid || "",
                    billingLocation: facility.billingLocation || false,
                    acceptsAssignment: facility.acceptsAssignment || false,
                    serviceLocation: facility.serviceLocation || false,
                    primaryBusinessEntity: facility.primaryBusinessEntity || false,
                    facilityInactive: facility.facilityInactive || false,
                    info: facility.info || "",
                    isActive: facility.isActive !== undefined ? facility.isActive : true,
                }));
                setFacilities(mappedFacilities.reverse());
                
                // Calculate statistics from the loaded data
                const total = mappedFacilities.length;
                const active = mappedFacilities.filter(f => f.isActive).length;
                const inactive = total - active;
                setStatistics({
                    totalCount: total,
                    activeCount: active,
                    inactiveCount: inactive,
                });
                // Map backend data to frontend format with proper null checks
                const mappedFacilities = response.data
                    .filter((facility: any) => facility && facility.id != null) // Filter out invalid entries
                    .map((facility: any) => ({
                        id: String(facility.id || Date.now()), // Ensure ID is always a string
                        name: facility.name || "",
                        physicalAddress: facility.physicalAddress || "",
                        physicalCity: facility.physicalCity || "",
                        physicalState: facility.physicalState || "",
                        physicalZipCode: facility.physicalZipCode || "",
                        physicalCountry: facility.physicalCountry || "",
                        mailingAddress: facility.mailingAddress || "",
                        mailingCity: facility.mailingCity || "",
                        mailingState: facility.mailingState || "",
                        mailingZipCode: facility.mailingZipCode || "",
                        mailingCountry: facility.mailingCountry || "",
                        phone: facility.phone || "",
                        fax: facility.fax || "",
                        website: facility.website || "",
                        email: facility.email || "",
                        color: facility.color || "#3B82F6",
                        iban: facility.iban || "",
                        posCode: facility.posCode || "01: Pharmacy **",
                        facilityTaxonomy: facility.facilityTaxonomy || "",
                        cliaNumber: facility.cliaNumber || "",
                        taxIdType: facility.taxIdType || "EIN",
                        taxId: facility.taxId || "",
                        billingAttn: facility.billingAttn || "",
                        facilityLabCode: facility.facilityLabCode || "",
                        npi: facility.npi || "",
                        oid: facility.oid || "",
                        billingLocation: facility.billingLocation || false,
                        acceptsAssignment: facility.acceptsAssignment || false,
                        serviceLocation: facility.serviceLocation || false,
                        primaryBusinessEntity: facility.primaryBusinessEntity || false,
                        facilityInactive: facility.facilityInactive || false,
                        info: facility.info || "",
                        isActive: facility.isActive !== undefined ? facility.isActive : true,
                    }));
                setFacilities(mappedFacilities);
                setError(null);
            } else {
                setFacilities([]);
                setError(response.message || "Failed to load facilities");
                showNotification(response.message || "Failed to load facilities", "error");
            }
        } catch (err) {
            console.error("Error loading facilities:", err);
            setFacilities([]);
            const errorMessage = err instanceof Error ? err.message : "Failed to load facilities";
            setError(errorMessage);
            showNotification(errorMessage, "error");
        } finally {
            setLoading(false);
        }
    };

    const loadStatistics = async () => {
        try {
            const response = await facilityAPI.getStatistics();
            if (response.success && response.data) {
                setStatistics({
                    totalCount: response.data.totalCount || 0,
                    activeCount: response.data.activeCount || 0,
                    inactiveCount: response.data.inactiveCount || 0,
                });
            }
        } catch (err) {
            console.error("Failed to load statistics:", err);
            setStatistics({ totalCount: 0, activeCount: 0, inactiveCount: 0 });
        }
    };

    const showNotification = useCallback((message: string, type: "success" | "error" | "info" = "success") => {
        const newNotification: ToastNotification = {
            id: nextNotificationId,
            message,
            type,
            visible: false,
        };

        setNotifications(prev => [...prev, newNotification]);
        setNextNotificationId(prev => prev + 1);

        setTimeout(() => {
            setNotifications(prev =>
                prev.map(n => n.id === newNotification.id ? { ...n, visible: true } : n)
            );
        }, 100);

        setTimeout(() => {
            hideNotification(newNotification.id);
        }, 5000);
    }, [nextNotificationId]);

    const hideNotification = useCallback((id: number) => {
        setNotifications(prev =>
            prev.map(n => n.id === id ? { ...n, visible: false } : n)
        );

        setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== id));
        }, 300);
    }, []);

    const filteredFacilities = facilities.filter(facility => 
        includeInactive || facility.isActive
    );

    const handleAddFacility = () => {
        setEditingFacility(undefined);
        setIsModalOpen(true);
    };

    const handleEditFacility = (facility: Facility) => {
        setEditingFacility(facility);
        setIsModalOpen(true);
    };

    const handleSaveFacility = (facility: Facility) => {
        saveFacilityToBackend(facility);
        setEditingFacility(undefined);
    };

    const saveFacilityToBackend = async (facility: Facility) => {
        try {
            const response = editingFacility
                ? await facilityAPI.update(parseInt(facility.id), facility)
                : await facilityAPI.create(facility);
            
            if (response.success) {
                showNotification(
                    editingFacility ? "Facility updated successfully!" : "Facility created successfully!",
                    "success"
                );
                void loadFacilities(); // Reload the list
                void loadStatistics(); // Reload statistics
            } else {
                showNotification(response.message || "Failed to save facility", "error");
            }
        } catch (err) {
            console.error("Error saving facility:", err);
            showNotification("Failed to save facility", "error");
        }
    };

    const handleDeleteClick = (facility: Facility) => {
        setConfirmationModal({
            isOpen: true,
            facilityId: facility.id,
            facilityName: facility.name,
        });
    };

    const handleDeleteConfirm = async () => {
        try {
            const response = await facilityAPI.delete(parseInt(confirmationModal.facilityId));
            if (response.success) {
                showNotification("Facility deleted successfully!", "success");
                void loadFacilities(); // Reload the list
                void loadStatistics(); // Reload statistics
            } else {
                showNotification(response.message || "Failed to delete facility", "error");
            }
        } catch (err) {
            console.error("Error deleting facility:", err);
            showNotification("Failed to delete facility", "error");
        } finally {
            setConfirmationModal({
                isOpen: false,
                facilityId: "",
                facilityName: "",
            });
        }
    };

    const formatAddress = (facility: Facility, type: 'physical' | 'mailing' = 'physical') => {
        const address = type === 'physical' 
            ? `${facility.physicalAddress}${facility.physicalCity ? '\n' + facility.physicalCity : ''}${facility.physicalState ? ', ' + facility.physicalState : ''}${facility.physicalZipCode ? ' ' + facility.physicalZipCode : ''}${facility.physicalCountry ? '\n' + facility.physicalCountry : ''}`
            : `${facility.mailingAddress}${facility.mailingCity ? '\n' + facility.mailingCity : ''}${facility.mailingState ? ', ' + facility.mailingState : ''}${facility.mailingZipCode ? ' ' + facility.mailingZipCode : ''}${facility.mailingCountry ? '\n' + facility.mailingCountry : ''}`;
        
        if (!address.trim()) return null;
        return address.split('\n').map((line, index) => (
            <div key={index}>{line}</div>
        ));
    };

    const formatPhoneNumber = (phone: string) => {
        // Format phone number as (XXX) XXX-XXXX
        const cleaned = phone.replace(/\D/g, '');
        if (cleaned.length === 10) {
            return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
        }
        return phone;
    };

    return (
        <AdminLayout>
            <div className="p-6">
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">Facilities</h1>
                    <div className="flex items-center space-x-4">
                        {/* Include Inactive Checkbox */}
                        <label className="flex items-center text-sm text-gray-700 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={includeInactive}
                                onChange={(e) => setIncludeInactive(e.target.checked)}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-2"
                            />
                            Include Inactive Facilities
                        </label>
                        
                        {/* Add Facility Button */}
                        <button
                            onClick={handleAddFacility}
                            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                        >
                            <PlusIcon className="w-4 h-4 mr-2" />
                            Add Facility
                        </button>
                    </div>
                </div>

                {/* Statistics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Total Facilities</h3>
                        <p className="text-3xl font-bold text-blue-600">{statistics.totalCount}</p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Active Facilities</h3>
                        <p className="text-3xl font-bold text-green-600">
                            {statistics.activeCount}
                        </p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Inactive Facilities</h3>
                        <p className="text-3xl font-bold text-red-600">
                            {statistics.inactiveCount}
                        </p>
                    </div>
                </div>

                {/* Facilities Table */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    {loading ? (
                        <div className="px-6 py-12 text-center">
                            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-blue-600"></div>
                            <p className="mt-4 text-gray-600">Loading facilities...</p>
                        </div>
                    ) : error ? (
                        <div className="px-6 py-12 text-center">
                            <div className="mb-4">
                                <svg className="mx-auto h-12 w-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to load facilities</h3>
                            <p className="text-red-600 mb-4 max-w-2xl mx-auto">{error}</p>
                            <div className="space-y-2 text-sm text-gray-600 mb-4">
                                <p>Please check:</p>
                                <ul className="list-disc list-inside">
                                    <li>Backend server is running at {process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}</li>
                                    <li>You are logged in with valid credentials</li>
                                    <li>Your network connection is stable</li>
                                </ul>
                            </div>
                            <button 
                                onClick={() => void loadFacilities()}
                                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Retry
                            </button>
                        </div>
                    ) : filteredFacilities.length === 0 ? (
                        <div className="px-6 py-12 text-center">
                            <div className="mb-4">
                                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No facilities found</h3>
                            <p className="text-gray-500 mb-4">
                                {!includeInactive 
                                    ? "No active facilities found. Try including inactive facilities or add a new one." 
                                    : "No facilities have been added yet."
                                }
                            </p>
                            <button 
                                onClick={handleAddFacility}
                                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <PlusIcon className="w-4 h-4 mr-2" />
                                Add Your First Facility
                            </button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Name
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Tax ID
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            NPI
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Physical Address
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Phone
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filteredFacilities.map((facility) => (
                                        <tr key={facility.id} className={`hover:bg-gray-50 ${!facility.isActive ? 'opacity-60' : ''}`}>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="flex items-center space-x-2">
                                                        <div 
                                                            className="w-4 h-4 rounded-full" 
                                                            style={{backgroundColor: facility.color}}
                                                        ></div>
                                                        <div className="text-sm font-medium text-blue-600 hover:text-blue-800">
                                                            {facility.name}
                                                        </div>
                                                    </div>
                                                    {!facility.isActive && (
                                                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                            Inactive
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {facility.taxId}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {facility.npi}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-900">
                                                {formatAddress(facility, 'physical')}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {formatPhoneNumber(facility.phone)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                <div className="flex space-x-2">
                                                    <button
                                                        onClick={() => handleEditFacility(facility)}
                                                        className="text-blue-600 hover:text-blue-900 p-1 rounded transition-colors"
                                                        title="Edit facility"
                                                    >
                                                        <PencilIcon className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteClick(facility)}
                                                        className="text-red-600 hover:text-red-900 p-1 rounded transition-colors"
                                                        title="Delete facility"
                                                    >
                                                        <TrashBinIcon className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Add/Edit Facility Modal */}
            <FacilityModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setEditingFacility(undefined);
                }}
                onSave={handleSaveFacility}
                facility={editingFacility}
            />

            {/* Confirmation Modal */}
            <ConfirmationModal
                isOpen={confirmationModal.isOpen}
                onClose={() => setConfirmationModal({
                    isOpen: false,
                    facilityId: "",
                    facilityName: "",
                })}
                onConfirm={handleDeleteConfirm}
                title="Delete Facility"
                message={`Are you sure you want to delete "${confirmationModal.facilityName}"? This action cannot be undone.`}
            />

            {/* Toast Notifications Container */}
            <div className="fixed bottom-4 right-4 z-50 space-y-3">
                {notifications.map((notification, idx) => (
                    <ToastNotificationComponent
                        key={`${notification.id}-${idx}`}
                        notification={notification}
                        onClose={hideNotification}
                    />
                ))}
            </div>
        </AdminLayout>
    );
}

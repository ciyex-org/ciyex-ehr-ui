"use client";
import React from "react";
import DateInput from "@/components/ui/DateInput";

interface ProfessionalInfoFormData {
    providerType: string;
    specialty: string;
    licenseNumber: string;
    npiNumber: string;
    licenseExpiry: string;
    licenseState: string;
}
interface ProfessionalInfoProps {
    formData: ProfessionalInfoFormData;
    handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
    errors: Record<string, string>;
}


const ProfessionalInfo: React.FC<ProfessionalInfoProps> = ({ formData, handleChange, errors }) => {
    return (
        <div className="bg-white p-6 rounded-lg shadow-md grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Provider Type Input */}
            <div>
                <label htmlFor="providerType" className="block text-sm font-medium text-gray-700">
                    Provider Type <span className="text-red-500">*</span>
                </label>
                <input
                    type="text"
                    id="providerType"
                    name="providerType"
                    value={formData.providerType}
                    onChange={handleChange}
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your provider type"
                />
                {errors.providerType && <p className="text-red-500 text-xs">{errors.providerType}</p>}
            </div>

            {/* Specialty Input */}
            <div>
                <label htmlFor="specialty" className="block text-sm font-medium text-gray-700">
                    Specialty <span className="text-red-500">*</span>
                </label>
                <input
                    type="text"
                    id="specialty"
                    name="specialty"
                    value={formData.specialty}
                    onChange={handleChange}
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your specialty"
                />
                {errors.specialty && <p className="text-red-500 text-xs">{errors.specialty}</p>}
            </div>

            {/* NPI Number Input */}
            <div>
                <label htmlFor="npiNumber" className="block text-sm font-medium text-gray-700">
                    NPI Number <span className="text-red-500">*</span>
                </label>
                <input
                    type="text"
                    id="npiNumber"
                    name="npiNumber"
                    value={formData.npiNumber || ""}
                    onChange={handleChange}
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your NPI number"
                />
                {errors.npiNumber && <p className="text-red-500 text-xs">{errors.npiNumber}</p>}
            </div>

            {/* License Number Input */}
            <div>
                <label htmlFor="licenseNumber" className="block text-sm font-medium text-gray-700">
                    License Number <span className="text-red-500">*</span>
                </label>
                <input
                    type="text"
                    id="licenseNumber"
                    name="licenseNumber"
                    value={formData.licenseNumber}
                    onChange={handleChange}
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your license number"
                />
                {errors.licenseNumber && <p className="text-red-500 text-xs">{errors.licenseNumber}</p>}
            </div>

            {/* License Expiry Input */}
            <div>
                <label className="block text-sm font-medium text-gray-700">
                    License Expiry <span className="text-red-500">*</span>
                </label>
                <DateInput
                    name="licenseExpiry"
                    value={formData.licenseExpiry}
                    onChange={(e) => handleChange(e as unknown as React.ChangeEvent<HTMLInputElement>)}
                    required
                    className="order-date-input flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm shadow-sm focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
                {errors.licenseExpiry && <p className="text-red-500 text-xs">{errors.licenseExpiry}</p>}
            </div>

            {/* License State Input */}
            <div>
                <label htmlFor="licenseState" className="block text-sm font-medium text-gray-700">
                    License State <span className="text-red-500">*</span>
                </label>
                <input
                    type="text"
                    id="licenseState"
                    name="licenseState"
                    value={formData.licenseState}
                    onChange={handleChange}
                    required
                    placeholder="Enter State"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {errors.licenseState && <p className="text-red-500 text-xs">{errors.licenseState}</p>}
            </div>
        </div>
    );
};

export default ProfessionalInfo;

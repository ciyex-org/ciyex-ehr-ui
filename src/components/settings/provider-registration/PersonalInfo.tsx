"use client";
import React from "react";
import DateInput from "@/components/ui/DateInput";

interface PersonalInfoFormData {
    firstName: string;
    lastName: string;
    dob: string;
    gender: string;
    phone: string;
    email: string;
}

interface PersonalInfoProps {
    formData: PersonalInfoFormData;
    handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
    errors: Record<string, string>;
}

const PersonalInfo: React.FC<PersonalInfoProps> = ({ formData, handleChange, errors }) => {
    return (
        <div className="bg-white p-6 rounded-lg shadow-md grid grid-cols-1 md:grid-cols-2 gap-6">
            {/*<h2 className="text-xl font-semibold mb-4 col-span-2">Personal Information</h2>*/}

            {/* First Name Input */}
            <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                    First Name <span className="text-red-500">*</span>
                </label>
                <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your first name"
                />
                {errors.firstName && <p className="text-red-500 text-xs">{errors.firstName}</p>}
            </div>

            {/* Last Name Input */}
            <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                    Last Name <span className="text-red-500">*</span>
                </label>
                <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your last name"
                />
                {errors.lastName && <p className="text-red-500 text-xs">{errors.lastName}</p>}
            </div>


            {/* Date of Birth Input */}
            <div>
                <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
                <DateInput
                    name="dob"
                    value={formData.dob}
                    onChange={(e) => handleChange(e as unknown as React.ChangeEvent<HTMLInputElement>)}
                    className="order-date-input flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm shadow-sm focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
                {errors.dob && <p className="text-red-500 text-xs">{errors.dob}</p>}
            </div>

            {/* Gender Input */}
            <div>
                <label htmlFor="gender" className="block text-sm font-medium text-gray-700">
                    Gender
                </label>
                <select
                    id="gender"
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                </select>
                {errors.gender && <p className="text-red-500 text-xs">{errors.gender}</p>}
            </div>

            {/* Phone Input */}
            <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                    Mobile Number <span className="text-red-500">*</span>
                </label>
                <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your mobile number"
                />
                {errors.phone && <p className="text-red-500 text-xs">{errors.phone}</p>}
            </div>

            {/* Email Input */}
            <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email <span className="text-red-500">*</span>
                </label>
                <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your email"
                />
                {errors.email && <p className="text-red-500 text-xs">{errors.email}</p>}
            </div>
        </div>
    );
};

export default PersonalInfo;

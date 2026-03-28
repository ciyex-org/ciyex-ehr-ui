"use client";

import {
    Table,
    TableBody,
    TableCell,
    TableHeader,
    TableRow,
} from "../ui/table";
import Badge from "../ui/badge/Badge";
import Image from "next/image";

// Sample patient data
const patients = [
    {
        id: 1,
        name: "Emily Parker",
        avatar: "/images/avatar/avatar-01.jpg",
        joined: "Aug 4, 2025",
        type: "New",
    },
    {
        id: 2,
        name: "Alex Johnson",
        avatar: "/images/avatar/avatar-02.jpg",
        joined: "Aug 3, 2025",
        type: "Returning",
    },
];

// Sample appointment data
const appointments = [
    {
        id: 1,
        patient: "John Doe",
        avatar: "/images/avatar/avatar-03.jpg",
        service: "Consultation",
        date: "Aug 4, 2025",
        status: "Confirmed",
    },
    {
        id: 2,
        patient: "Jane Smith",
        avatar: "/images/avatar/avatar-04.jpg",
        service: "Lab Test",
        date: "Aug 3, 2025",
        status: "Pending",
    },
];

export default function RecentPatientsAppointments() {
    return (
        <div className="space-y-6">
            {/* Recent Patients */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">
                    Recent Patients
                </h3>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableCell isHeader className="text-xs text-gray-500 dark:text-gray-400">Patient</TableCell>
                            <TableCell isHeader className="text-xs text-gray-500 dark:text-gray-400">Joined</TableCell>
                            <TableCell isHeader className="text-xs text-gray-500 dark:text-gray-400">Type</TableCell>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {patients.map((p) => (
                            <TableRow key={p.id}>
                                <TableCell className="py-3">
                                    <div className="flex items-center gap-3">
                                        <Image
                                            src={p.avatar}
                                            width={40}
                                            height={40}
                                            alt={p.name}
                                            className="rounded-full"
                                        />
                                        <span className="text-sm font-medium text-gray-800 dark:text-white/90">
                      {p.name}
                    </span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-sm text-gray-500 dark:text-gray-400">{p.joined}</TableCell>
                                <TableCell className="text-sm text-gray-500 dark:text-gray-400">{p.type}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {/* Recent Appointments */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">
                    Recent Appointments
                </h3>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableCell isHeader className="text-xs text-gray-500 dark:text-gray-400">Patient</TableCell>
                            <TableCell isHeader className="text-xs text-gray-500 dark:text-gray-400">Service</TableCell>
                            <TableCell isHeader className="text-xs text-gray-500 dark:text-gray-400">Date</TableCell>
                            <TableCell isHeader className="text-xs text-gray-500 dark:text-gray-400">Status</TableCell>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {appointments.map((a) => (
                            <TableRow key={a.id}>
                                <TableCell className="py-3">
                                    <div className="flex items-center gap-3">
                                        <Image
                                            src={a.avatar}
                                            width={40}
                                            height={40}
                                            alt={a.patient}
                                            className="rounded-full"
                                        />
                                        <span className="text-sm font-medium text-gray-800 dark:text-white/90">
                      {a.patient}
                    </span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-sm text-gray-500 dark:text-gray-400">{a.service}</TableCell>
                                <TableCell className="text-sm text-gray-500 dark:text-gray-400">{a.date}</TableCell>
                                <TableCell className="text-sm text-gray-500 dark:text-gray-400">
                                    <Badge
                                        size="sm"
                                        color={
                                            a.status === "Confirmed"
                                                ? "success"
                                                : a.status === "Pending"
                                                    ? "warning"
                                                    : "error"
                                        }
                                    >
                                        {a.status}
                                    </Badge>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}

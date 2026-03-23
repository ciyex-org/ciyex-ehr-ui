import Calendar from "@/components/calendar/Calendar";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
    title: "Calendar", // will render as "Ciyex | Calendar"
    description: "Manage and schedule appointments in Ciyex",
};
export default function page() {
  return (
    <div className="h-full min-h-0 flex flex-col">
      <Calendar />
    </div>
  );
}

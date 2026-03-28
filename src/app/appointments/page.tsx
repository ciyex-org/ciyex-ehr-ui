import { Metadata } from "next";
import AppointmentPage from "./AppointmentPage";

export const metadata: Metadata = {
    title: "FlowBoard",
};

export default function Page() {
    return <AppointmentPage />;
}

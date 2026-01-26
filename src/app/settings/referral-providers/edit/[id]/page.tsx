import { Metadata } from "next";
import EditReferralProvider from "./EditReferralProvider";

export const metadata: Metadata = {
    title: "Edit Referral Provider",
};

export default async function Page(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    return <EditReferralProvider id={params.id} />;
}

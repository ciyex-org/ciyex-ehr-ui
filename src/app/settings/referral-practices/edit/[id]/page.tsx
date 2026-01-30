import { Metadata } from "next";
import EditReferralPractice from "./EditReferralPractice";

export const metadata: Metadata = {
    title: "Edit Referral Practice",
};

export default async function Page(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    return <EditReferralPractice id={params.id} />;
}

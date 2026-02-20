import SignUpForm from "@/components/auth/SignUpForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "SignUp | Ciyex EHR",
  description: "SignUp page for Ciyex EHR",
  // other metadata
};

export default function SignUp() {
  return <SignUpForm />;
}

import SignInForm from "@/components/auth/SignInForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Signin",
  description: "Signin page for Ciyex EHR",
};

export default function SignIn() {
  return <SignInForm />;
}

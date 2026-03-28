import PracticeSelection from "@/components/auth/PracticeSelection";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Select Practice",
  description: "Select your practice to continue",
};

export default function SelectPractice() {
  return <PracticeSelection />;
}

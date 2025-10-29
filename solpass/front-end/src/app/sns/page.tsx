import { redirect } from "next/navigation";

export default function SnsPage() {
  redirect("/onboarding?sns=1");
}

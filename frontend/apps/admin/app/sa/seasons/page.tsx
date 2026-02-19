import { redirect } from "next/navigation";

export default function LegacySASeasonsPage() {
  redirect("/sa/estimation-governance?legacy=seasons");
}

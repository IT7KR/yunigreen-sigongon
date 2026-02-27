import { redirect } from "next/navigation";

export default function LegacySAPricebooksPage() {
  redirect("/sa/estimation-governance?legacy=pricebooks");
}

import { redirect } from "next/navigation";

export default async function AdminManagePage() {
  redirect("/admin/content");
}

import { redirect } from "next/navigation";

export default function MyCustomersRedirect() {
  redirect("/profile");
}

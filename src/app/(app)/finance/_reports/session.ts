import { getAuthSessionVersion, getUser } from "@/lib/auth";
export function reportSessionGuard(audience: "finance" | "sales" = "finance") {
  const user = getUser(),
    version = getAuthSessionVersion();
  return () => {
    const current = getUser();
    return (
      !!user &&
      !!current &&
      user.id === current.id &&
      user.role === current.role &&
      version === getAuthSessionVersion() &&
      (audience === "sales" ? ["SALES"] : ["ADMIN", "ACCOUNTING"]).includes(
        current.role,
      ) &&
      !current.isPreview &&
      current.originalRole !== "PREVIEW"
    );
  };
}

import { getAuthSessionVersion, getUser } from "@/lib/auth";
export function reportSessionGuard() {
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
      ["ADMIN", "ACCOUNTING"].includes(current.role) &&
      !current.isPreview &&
      current.originalRole !== "PREVIEW"
    );
  };
}

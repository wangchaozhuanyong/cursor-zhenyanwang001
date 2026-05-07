import { useMemo } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import { isLoggedIn } from "@/utils/token";
import GuestHome from "@/modules/public/pages/home/GuestHome";
import MemberHome from "@/modules/public/pages/home/MemberHome";

export default function Index() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const loggedIn = useMemo(() => isAuthenticated && isLoggedIn(), [isAuthenticated]);
  return loggedIn ? <MemberHome /> : <GuestHome />;
}


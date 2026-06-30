import { cookies } from "next/headers";
import { ADMIN_COOKIE_NAME, verifyAdminCookie } from "@/lib/auth/admin";
import BoLoginForm from "./BoLoginForm";
import BoNav from "./BoNav";

export default async function BoLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;

  if (!verifyAdminCookie(token)) {
    return <BoLoginForm />;
  }

  return (
    <>
      <BoNav />
      {children}
    </>
  );
}

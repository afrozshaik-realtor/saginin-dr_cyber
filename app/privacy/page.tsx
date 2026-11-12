import { LegalPage } from "@/components/LegalPage";
import { legalVars, privacyDoc } from "@/lib/config/legal";

export const dynamic = "force-dynamic";
export const metadata = { title: "Privacy Policy | Dr Cyber" };

export default function Page() {
  const vars = legalVars();
  return <LegalPage doc={privacyDoc(vars)} vars={vars} />;
}

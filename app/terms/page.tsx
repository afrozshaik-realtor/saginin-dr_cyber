import { LegalPage } from "@/components/LegalPage";
import { legalVars, termsDoc } from "@/lib/config/legal";

export const dynamic = "force-dynamic";
export const metadata = { title: "Terms of Service | Dr Cyber" };

export default function Page() {
  const vars = legalVars();
  return <LegalPage doc={termsDoc(vars)} vars={vars} />;
}

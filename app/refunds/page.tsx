import { LegalPage } from "@/components/LegalPage";
import { legalVars, refundDoc } from "@/lib/config/legal";

export const dynamic = "force-dynamic";
export const metadata = { title: "Refund Policy | Dr Cyber" };

export default function Page() {
  const vars = legalVars();
  return <LegalPage doc={refundDoc(vars)} vars={vars} />;
}

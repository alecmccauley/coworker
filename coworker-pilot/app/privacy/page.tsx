import fs from "fs"
import path from "path"
import { LegalPageLayout } from "@/components/legal/legal-page-layout"

export const metadata = {
  title: "Privacy Policy | Coworkers",
  description: "Coworkers Privacy Policy",
}

export default function PrivacyPage() {
  const content = fs.readFileSync(
    path.join(process.cwd(), "..", "content", "PRIVACY_POLICY.md"),
    "utf-8"
  )

  return <LegalPageLayout content={content} />
}

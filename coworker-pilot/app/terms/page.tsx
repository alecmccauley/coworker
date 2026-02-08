import fs from "fs"
import path from "path"
import { LegalPageLayout } from "@/components/legal/legal-page-layout"

export const metadata = {
  title: "Terms of Service | Coworkers",
  description: "Coworkers Terms of Service",
}

export default function TermsPage() {
  const content = fs.readFileSync(
    path.join(process.cwd(), "..", "content", "TERMS_OF_SERVICE.md"),
    "utf-8"
  )

  return <LegalPageLayout content={content} />
}

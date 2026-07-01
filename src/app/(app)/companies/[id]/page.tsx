import { type Metadata } from "next";

import { CompanyDetail } from "./company-detail";

export const metadata: Metadata = { title: "Company" };

export default async function CompanyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CompanyDetail companyId={id} />;
}

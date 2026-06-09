import { redirect } from "next/navigation";

import { CatalogClient } from "@/components/catalog-client";
import { getAuthenticatedPocketBase } from "@/lib/auth";
import { getCatalogState } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function CatalogPage() {
  let catalogState;

  try {
    const { pb, user } = await getAuthenticatedPocketBase();
    catalogState = await getCatalogState(pb, user.id);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized.") {
      redirect("/auth");
    }

    throw error;
  }

  return <CatalogClient initialState={catalogState} />;
}

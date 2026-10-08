"use client";

import { useParams } from "next/navigation";
import IsoClauseDetail from "../_components/IsoClauseDetail";

export default function IsoClausePage() {
  const { code } = useParams<{ code: string }>();
  return <IsoClauseDetail key={code} code={code} />;
}

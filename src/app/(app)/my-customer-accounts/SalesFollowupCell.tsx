"use client";

import { useEffect, useRef, useState } from "react";
import { getUser } from "@/lib/auth";
import { authedFetch } from "@/lib/authedFetch";
import { reportSessionGuard } from "../finance/_reports/session";
import { invalidatePaymentListCache } from "../finance/payment-tracking/_lib/list-cache";
import { problem } from "../finance/payment-tracking/_lib/utils";
import type { PaymentAssignee, PaymentTrackingDetail, PaymentTrackingRow } from "../finance/payment-tracking/_lib/types";
import SalesFollowupAssignment from "./SalesFollowupAssignment";

export default function SalesFollowupCell({ row, tr, canAssign, assignees, disabled, onAssigned }: {
  row: PaymentTrackingRow;
  tr: boolean;
  canAssign: boolean;
  assignees: PaymentAssignee[];
  disabled: boolean;
  onAssigned: (row: PaymentTrackingRow) => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const mutation = useRef<AbortController | null>(null);
  useEffect(() => () => mutation.current?.abort(), []);
  const label = row.followupAssignment?.userName || (tr ? "Atanmamış" : "Unassigned");
  const user = getUser();
  const editable = canAssign && ["ADMIN", "MANAGER"].includes(user?.role || "") &&
    !user?.isPreview && user?.originalRole !== "PREVIEW" &&
    !!row.identity.customerCode && !!row.identity.unitCode;
  if (!editable) return <span>{label}</span>;
  return <SalesFollowupAssignment
    label={label}
    data={{ item: row, canAssignFollowup: true, followupAssignees: assignees }}
    tr={tr}
    disabled={disabled || saving}
    error={error}
    onSave={async (userId, expectedVersion) => {
      if (mutation.current || disabled) return false;
      const allowed = reportSessionGuard("sales");
      if (!allowed()) return false;
      const controller = new AbortController();
      mutation.current = controller;
      setSaving(true);
      setError("");
      try {
        const next = await authedFetch(`/sales-ledger/${encodeURIComponent(row.key)}/followup-assignment`, {
          method: "PUT",
          signal: controller.signal,
          body: JSON.stringify({ userId, expectedVersion }),
        }) as PaymentTrackingDetail;
        invalidatePaymentListCache();
        if (controller.signal.aborted || !allowed()) return false;
        await onAssigned(next.item);
        return true;
      } catch (cause) {
        if (!controller.signal.aborted && allowed()) setError(problem(cause, tr).message);
        return false;
      } finally {
        mutation.current = null;
        if (!controller.signal.aborted) setSaving(false);
      }
    }}
  />;
}

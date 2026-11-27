import { authedFetch } from "@/lib/authedFetch";
import type { ReceiptReportData } from "./receipts";

export function waitForLogo(signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(signal.reason);
      return;
    }
    const abort = () => {
      clearTimeout(timer);
      reject(signal.reason);
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", abort);
      resolve();
    }, 2000);
    signal.addEventListener("abort", abort, { once: true });
  });
}

type ReceiptStatus =
  | { status: "READY"; report: ReceiptReportData }
  | {
      status: "QUEUED" | "RUNNING" | "FAILED" | "NOT_REQUESTED";
      error?: string;
    };

export async function requestReceiptReport({
  endpoint,
  caseKey,
  tr,
  signal,
  allowed,
  useRecent = false,
}: {
  endpoint: string;
  caseKey: string;
  tr: boolean;
  signal: AbortSignal;
  allowed: () => boolean;
  useRecent?: boolean;
}) {
  function verifySession() {
    if (!allowed())
      throw new Error(tr ? "Oturum değişti." : "Your session changed.");
  }
  function verifyReport(result: ReceiptReportData) {
    verifySession();
    if (result.key !== caseKey || !Array.isArray(result.rows))
      throw new Error(
        tr
          ? "Cari bilgileri doğrulanamadı."
          : "The account could not be verified.",
      );
    return result;
  }
  async function read() {
    verifySession();
    return (await authedFetch(endpoint, { signal })) as ReceiptStatus;
  }

  const existing = useRecent ? await read() : undefined;
  if (
    existing?.status === "READY" &&
    Date.now() - Date.parse(existing.report.source.generatedAt) < 5 * 60_000
  )
    return verifyReport(existing.report);
  if (existing?.status !== "QUEUED" && existing?.status !== "RUNNING") {
    verifySession();
    await authedFetch(endpoint, { method: "POST", signal });
  }
  while (true) {
    const result = await read();
    if (result.status === "READY") return verifyReport(result.report);
    if (result.status !== "QUEUED" && result.status !== "RUNNING")
      throw new Error(
        (tr && result.error) ||
          (tr
            ? "Tahsilat hareketleri okunamadı. Tekrar deneyin."
            : "The collection records could not be read. Please retry."),
      );
    await waitForLogo(signal);
  }
}

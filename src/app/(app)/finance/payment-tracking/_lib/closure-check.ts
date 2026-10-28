import type { PaymentSourceCase } from "./types";

export function customerActionsAllowed(item: Pick<PaymentSourceCase, "unallocatedCredit">) {
  return item.unallocatedCredit?.status === "clear";
}
export function closureWarning(item: Pick<PaymentSourceCase, "unallocatedCredit">, tr: boolean) {
  if (item.unallocatedCredit?.status === "blocked")
    return tr
      ? "Lütfen bu müşteri carisi hakkında Tanem Hanım ile görüşün. Caride henüz kapatılmamış hesaplar vardır. Kontrol tamamlanıp Logo verileri güncellenene kadar bu müşteriye borç bildirimi gönderemez veya bu cari üzerinde herhangi bir işlem yapamazsınız."
      : "Please contact Ms. Tanem about this customer account. It contains unallocated credit entries. Until the review is completed and Logo data is refreshed, you cannot send a debt notification or perform any action on this account.";
  return tr
    ? "Kapatma kontrolü doğrulanamadı. Logo verileri güncellenene kadar bu cari üzerinde işlem yapılamaz."
    : "Payment closure could not be verified. Actions on this account are blocked until Logo data is refreshed.";
}
export function requireCustomerActions(item: Pick<PaymentSourceCase, "unallocatedCredit">, tr: boolean) {
  if (!customerActionsAllowed(item)) throw new Error(closureWarning(item, tr));
}

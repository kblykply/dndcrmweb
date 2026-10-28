"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink, Mail, MessageCircle, RefreshCw, X } from "lucide-react";
import type { PaymentTrackingAction, PaymentTrackingDetail } from "../_lib/types";
import { composeLink, currencyName, dateLabel, money } from "../_lib/utils";
import { buildPaymentMessage } from "../_lib/payment-message";
import { customerActionsAllowed } from "../_lib/closure-check";
import s from "../payment-tracking.module.css";

export default function ComposeDialog({
  channel,
  data,
  tr,
  onClose,
  onRecord,
  saveError,
}: {
  channel: "email" | "whatsapp";
  data: PaymentTrackingDetail;
  tr: boolean;
  onClose: () => void;
  onRecord: (action: Omit<PaymentTrackingAction, "expectedVersion">) => Promise<boolean | undefined>;
  saveError?: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const messageBody = useRef<HTMLTextAreaElement>(null);
  const t = (a: string, b: string) => (tr ? a : b);
  const [recipient, setRecipient] = useState(
    channel === "email" ? data.contact.email || "" : data.contact.phone || "",
  );
  const [subject, setSubject] = useState(
    `${t("Ödeme takibi", "Payment follow-up")} · ${data.item.unitName || data.item.identity.unitCode || ""}`,
  );
  const isWhatsApp = channel === "whatsapp";
  const [messageScope, setMessageScope] = useState<"portfolio" | "selected">("portfolio");
  const [messageTr, setMessageTr] = useState(tr);
  const [appliedTemplate, setAppliedTemplate] = useState({ scope: "portfolio" as "portfolio" | "selected", tr });
  const [template, setTemplate] = useState(() => isWhatsApp
    ? buildPaymentMessage(data, { tr, scope: "portfolio" })
    : null);
  const [body, setBody] = useState(() => {
    if (template) return template.body;
    const item = data.item,
      unit =
        item.unitName || item.identity.unitCode || t("daireniz", "your unit");
    const hasOverdue = item.overdueAmount != null && item.overdueAmount > 0;
    const amount = `${money(hasOverdue ? item.overdueAmount : item.outstanding, tr)} ${currencyName(item.identity.currency, tr)}`;
    const position =
      item.incompleteRows > 0
        ? t(
            `${unit} ödeme kayıtları hakkında sizinle iletişime geçmek istiyoruz.`,
            `We would like to discuss the payment records for ${unit}.`,
          )
        : hasOverdue
          ? t(
              `${unit} için kayıtlarımızdaki vadesi geçmiş tutar ${amount} olarak görünmektedir. Asıl vade: ${dateLabel(item.oldestDueDate, tr)}.`,
              `Our records show an overdue amount of ${amount} for ${unit}. Original due date: ${dateLabel(item.oldestDueDate, tr)}.`,
            )
          : item.outstanding != null && item.outstanding > 0
            ? t(
                `${unit} için kayıtlarımızdaki açık bakiye ${amount} olarak görünmektedir.`,
                `Our records show an outstanding balance of ${amount} for ${unit}.`,
              )
            : t(
                `${unit} ödeme kayıtları hakkında sizinle iletişime geçmek istiyoruz.`,
                `We would like to discuss the payment records for ${unit}.`,
              );
    return tr
      ? `Sayın ${item.customerName},\n\n${position}\n\nÖdeme durumuyla ilgili bilgi paylaşmanızı rica ederiz. Ödeme yaptıysanız dekontunuzu iletebilirsiniz.\n\nTeşekkür ederiz.`
      : `Dear ${item.customerName},\n\n${position}\n\nPlease let us know the payment status. If you have already paid, you may share the payment receipt.\n\nThank you.`;
  });
  const [opened, setOpened] = useState(false);
  const [preparedId, setPreparedId] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordError, setRecordError] = useState("");
  const recordingRef = useRef(false);
  const attempt = useRef<{ signature: string; id: string } | null>(null);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  const dirty = template !== null && body !== template.body;
  const pendingTemplate = isWhatsApp &&
    (messageScope !== appliedTemplate.scope || messageTr !== appliedTemplate.tr);
  const tooLong = isWhatsApp && (body.length > 4000 || (!dirty && template?.tooLong === true));
  const href = composeLink(channel, recipient, subject, body);
  const canOpen = customerActionsAllowed(data.item) && !!href && !!body.trim() && !tooLong && !pendingTemplate;
  async function openAndRecord() {
    if (!canOpen || recordingRef.current) return;
    setRecordError("");
    // Keep the user gesture for popup blockers. No external navigation before persistence.
    const popup = window.open("about:blank", "_blank");
    if (!popup) {
      setRecordError(t("Yeni pencereye izin verip tekrar deneyin.", "Allow popups and try again."));
      return;
    }
    popup.opener = null;
    recordingRef.current = true;
    setRecording(true);
    try {
      const signature = JSON.stringify([channel, recipient.trim(), subject, body]);
      if (attempt.current?.signature !== signature) attempt.current = { signature, id: crypto.randomUUID() };
      const id = attempt.current.id;
      const saved = await onRecord({ type: "message_draft", messageId: id, channel, recipient: recipient.trim(), subject: channel === "email" ? subject : "", body });
      if (!saved) throw new Error("save_failed");
      setPreparedId(id);
      if (popup.closed) throw new Error("window_closed");
      popup.location.href = href!;
      setOpened(true);
    } catch {
      popup.close();
      setRecordError(t("İşlem tamamlanamadı. Hata bilgisini kontrol edip tekrar deneyin.", "Could not complete the action. Check the error and try again."));
    } finally {
      recordingRef.current = false;
      setRecording(false);
    }
  }
  async function confirmSent() {
    if (!preparedId || recordingRef.current || confirmed) return;
    recordingRef.current = true;
    setRecording(true);
    setRecordError("");
    try {
      if (await onRecord({ type: "message_sent", messageId: preparedId, body: "" })) setConfirmed(true);
      else setRecordError(t("Gönderim onayı kaydedilemedi. Tekrar deneyin.", "Could not save confirmation. Try again."));
    } finally {
      recordingRef.current = false;
      setRecording(false);
    }
  }
  function regenerateTemplate(scope = messageScope, nextTr = messageTr) {
    const next = buildPaymentMessage(data, { scope, tr: nextTr });
    setTemplate(next);
    setAppliedTemplate({ scope, tr: nextTr });
    setBody(next.body);
    setOpened(false);
    requestAnimationFrame(() => {
      if (messageBody.current) messageBody.current.scrollTop = 0;
    });
  }
  function changeTemplateOptions(scope: "portfolio" | "selected", nextTr: boolean) {
    setMessageScope(scope);
    setMessageTr(nextTr);
    setOpened(false);
    if (!dirty) regenerateTemplate(scope, nextTr);
  }
  const draftCurrency = currencyName(data.item.identity.currency, tr);
  return (
    <dialog
      ref={dialog}
      className={`${s.dialog} ${isWhatsApp ? s.whatsappDialog : ""}`}
      aria-labelledby="payment-compose-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!recordingRef.current) onClose();
      }}
      onClose={(event) => {
        // A development effect replay can queue an old close event after reopening.
        if (!event.currentTarget.open) onClose();
      }}
    >
      <div className={s.panelHead}>
        <div>
          <div className={s.eyebrow}>
            {channel === "email" ? (
              <Mail size={15} />
            ) : (
              <MessageCircle size={15} />
            )}
            {t("İletişim taslağı", "Message draft")}
          </div>
          <h2 id="payment-compose-title">
            {channel === "email"
              ? t("E-posta önizlemesi", "Email preview")
              : t("WhatsApp ödeme hatırlatması", "WhatsApp payment reminder")}
          </h2>
        </div>
        <button
          type="button"
          className={s.button}
          onClick={onClose}
          disabled={recording}
          aria-label={t("Taslağı kapat", "Close draft")}
        >
          <X size={17} />
        </button>
      </div>
      <fieldset disabled={recording || preparedId !== null} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
      <p className={s.hint}>
        {t(
          "Adresi ve mesajı kontrol edin. Taslak harici uygulamada açılır; gönderme işlemi size aittir.",
          "Check the address and message. The draft opens in an external application; you choose whether to send it.",
        )}
      </p>
      {channel === "email" && <>
      <p className={s.hint}>
        {t(
          "Taslak, bu müşteri/daire/döviz dosyasındaki tüm ödeme türlerinin toplamını içerir. Taksit türü filtresi taslaktaki tutarı daraltmaz.",
          "The draft includes all payment types in this customer/unit/currency case. The installment type filter does not narrow the draft amount.",
        )}
      </p>
      <p className={s.hint}>
        <strong>{t("Taslak dövizi", "Draft currency")}: {currencyName(data.item.identity.currency, tr)}</strong>
        {" "}{t("Diğer dövizlerdeki tutarlar bu taslağa dahil değildir.", "Amounts in other currencies are not included in this draft.")}
      </p>
      </>}
      {isWhatsApp && (
        <>
          <p className={s.hint}>
            {t(
              "Müşteri ve daire, borç tutarı, ödenmeyen aylar ve gecikme bilgisi kaynak kayıtlardan doldurulur. Mesajı göndermeden önce kontrol edip düzenleyebilirsiniz.",
              "Customer and unit details, balances, unpaid months and overdue days are filled from the source records. Review and edit the message before sending.",
            )}
          </p>
          <div className={s.templateControls}>
            <label className={s.field}>
              <span>{t("Mesaj kapsamı", "Message scope")}</span>
              <select
                aria-label={t("Mesaj kapsamı", "Message scope")}
                value={messageScope}
                onChange={(event) => changeTemplateOptions(event.target.value as "portfolio" | "selected", messageTr)}
              >
                <option value="portfolio">{t("Tüm dövizler", "All currencies")}</option>
                <option value="selected">{t(`Seçili ${draftCurrency}`, `Selected ${draftCurrency}`)}</option>
              </select>
            </label>
            <label className={s.field}>
              <span>{t("Mesaj dili", "Message language")}</span>
              <select
                aria-label={t("Mesaj dili", "Message language")}
                value={messageTr ? "tr" : "en"}
                onChange={(event) => changeTemplateOptions(messageScope, event.target.value === "tr")}
              >
                <option value="tr">Türkçe</option>
                <option value="en">English</option>
              </select>
            </label>
            <button type="button" className={s.button} onClick={() => regenerateTemplate()}>
              <RefreshCw size={14} />
              {t("Şablonu yeniden oluştur", "Regenerate template")}
            </button>
          </div>
          <p className={s.messageScope}>
            <strong>{t("Mevcut mesaj kapsamı", "Current message scope")}: </strong>
            {appliedTemplate.scope === "portfolio"
              ? t("Bu müşteri ve dairenin tüm dövizleri ve ödeme türleri; döviz tutarları ayrı gösterilir.", "All currencies and payment types for this customer and unit; currency amounts are shown separately.")
              : t(`${draftCurrency} dosyasının tüm ödeme türleri.`, `Every payment type in the ${draftCurrency} case.`)}
            {" · "}{appliedTemplate.tr ? "Türkçe" : "English"}
          </p>
          {pendingTemplate && (
            <p className={s.notice} role="status">
              {t(
                "Yazdığınız metin korunuyor. Yeni kapsamı veya dili uygulamak için şablonu yeniden oluşturun; mevcut metin yenisiyle değişir.",
                "Your edited text is preserved. Regenerate the template to apply the new scope or language; this replaces the current text.",
              )}
            </p>
          )}
          {dirty && !pendingTemplate && (
            <p className={s.hint}>{t(
              "Metni düzenlediniz. Şablonu yeniden oluşturmak düzenlemelerinizi değiştirir.",
              "You edited this message. Regenerating the template replaces your edits.",
            )}</p>
          )}
        </>
      )}
      {data.contact.status !== "matched" && (
        <p className={s.notice}>
          {t(
            "Doğrulanmış bir iletişim eşleşmesi bulunmuyor. Alıcı bilgisini kontrol ederek girin.",
            "No verified contact match is available. Check and enter the recipient.",
          )}
        </p>
      )}
      {channel === "email" && data.item.incompleteRows > 0 && (
        <p className={s.notice}>
          {t(
            "Kaynakta eksik ödeme bilgileri var. Taslağa kesin tutar veya vade eklenmedi; bilgileri kontrol edin.",
            "The source has incomplete payment information. No definite amount or due date was included in the draft; review the records.",
          )}
        </p>
      )}
      {isWhatsApp && template?.incomplete && (
        <p className={s.notice}>
          {t(
            "Bazı ödeme bilgileri eksik. Bilinmeyen tutarlar sıfır kabul edilmedi; mesajdaki bilgileri kontrol edin.",
            "Some payment information is incomplete. Unknown amounts are not treated as zero; check the details in the message.",
          )}
        </p>
      )}
      <label className={s.field}>
        <span>
          {channel === "email"
            ? t("Alıcı e-posta", "Recipient email")
            : t("Telefon · ülke koduyla", "Phone · with country code")}
        </span>
        <input
          autoFocus
          type={channel === "email" ? "email" : "tel"}
          aria-label={
            channel === "email"
              ? t("Alıcı e-posta", "Recipient email")
              : t("Telefon · ülke koduyla", "Phone · with country code")
          }
          value={recipient}
          onChange={(event) => setRecipient(event.target.value)}
          placeholder={channel === "email" ? "name@example.com" : "+90…"}
        />
      </label>
      {(channel === "email" ? data.contact.emailSource : data.contact.phoneSource) === "crm" && (
        <p className={s.hint}>{t("Alıcı bilgisi CRM müşteri kaydından tamamlandı.", "Recipient details filled from the CRM customer record.")}</p>
      )}
      {(data.contact.crmFallbackStatus === "ambiguous" || data.contact.crmFallbackStatus === "unit_mismatch") && (
        <p className={s.hint}>{t("CRM müşteri veya daire eşleşmesi kontrol gerektiriyor; eksik iletişim bilgisi otomatik doldurulmadı.", "The CRM customer or unit match needs review; missing contact details were not filled automatically.")}</p>
      )}
      {channel === "email" && (
        <label className={s.field}>
          <span>{t("Konu", "Subject")}</span>
          <input
            aria-label={t("Konu", "Subject")}
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            maxLength={200}
          />
        </label>
      )}
      <label className={s.field}>
        <span>{t("Mesaj", "Message")}</span>
        <textarea
          ref={messageBody}
          aria-label={t("Mesaj", "Message")}
          value={body}
          onChange={(event) => { setBody(event.target.value); setOpened(false); }}
          maxLength={isWhatsApp ? undefined : 4000}
          rows={isWhatsApp ? 12 : 9}
          className={isWhatsApp ? s.whatsappMessageBody : undefined}
          aria-describedby={isWhatsApp ? "payment-message-length" : undefined}
          aria-invalid={tooLong || undefined}
        />
      </label>
      {isWhatsApp && (
        <p id="payment-message-length" className={`${s.messageLength} ${tooLong ? s.red : ""}`} role={tooLong ? "alert" : undefined}>
          {body.length} / 4000 {t("karakter", "characters")}
          {tooLong && <> · {t(
            "Mesaj kesilmedi. WhatsApp'ta açmak için metni 4000 karaktere kısaltın veya daha dar bir kapsamla şablon oluşturun.",
            "The message was not truncated. Shorten it to 4000 characters or generate a narrower scope before opening WhatsApp.",
          )}</>}
        </p>
      )}
      {!href && recipient && (
        <p className={s.hint}>
          {channel === "email"
            ? t(
                "Geçerli bir e-posta adresi girin.",
                "Enter a valid email address.",
              )
            : t(
                "Telefon numarasını ülke koduyla girin.",
                "Enter a phone number with its country code.",
              )}
        </p>
      )}
      </fieldset>
      {recordError && <p className={s.notice} role="alert">{saveError || recordError}</p>}
      {confirmed && <p className={s.success} role="status">{t("Gönderildi olarak kaydedildi · kullanıcı onayı.", "Recorded as sent · user confirmation.")}</p>}
      {opened && !confirmed && (
        <p className={s.success} role="status">
          {t(
            "Taslak geçmişe kaydedildi. Uygulamada gönderdikten sonra “Gönderdim” ile onaylayın. Harici uygulamada yaptığınız değişiklikler CRM’ye aktarılmaz.",
            "Draft saved to history. After sending in the app, confirm with “I sent it”. Edits made in the external app are not reflected in CRM.",
          )}
        </p>
      )}
      <div className={s.dialogFooter}>
        <button className={s.button} onClick={onClose} disabled={recording}>
          {t("Kapat", "Close")}
        </button>
        {preparedId && !confirmed && (
          <button className={s.primary} disabled={recording} onClick={() => void confirmSent()}>
            {recording ? t("Kaydediliyor…", "Saving…") : t("Gönderdim · kaydet", "I sent it · save")}
          </button>
        )}
        {preparedId ? (
          <a className={s.button} href={href!} target="_blank" rel="noopener noreferrer">
            <ExternalLink size={15} />{t("Uygulamada tekrar aç", "Reopen in app")}
          </a>
        ) : (
          <button className={`${s.primary} ${isWhatsApp ? s.whatsappButton : ""}`} disabled={!canOpen || recording} onClick={() => void openAndRecord()}>
            <ExternalLink size={15} />
            {recording ? t("Kaydediliyor…", "Saving…") : channel === "email"
              ? t("E-posta uygulamasında aç", "Open in email app")
              : t("WhatsApp’ta aç", "Open in WhatsApp")}
          </button>
        )}
      </div>
    </dialog>
  );
}

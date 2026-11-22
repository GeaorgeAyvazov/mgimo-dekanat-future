"use client";

import { useState, type FormEvent } from "react";

type DocumentInfo = {
  number: string;
  preparedAt: string;
  pdfDigest: string;
  signatureDigest: string;
};

async function digest(file: File) {
  const hash = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(hash), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export function DocumentVerification({ id }: { id: string }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ text: string; error?: boolean }>();

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const pdf = data.get("pdf");
    const sig = data.get("signature");
    if (
      !(pdf instanceof File) ||
      !(sig instanceof File) ||
      !pdf.size ||
      !sig.size
    ) {
      setResult({ text: "Выберите оба файла.", error: true });
      return;
    }
    if (pdf.size > 2_000_000 || sig.size > 100_000) {
      setResult({ text: "Выберите PDF до 2 МБ и SIG до 100 КБ.", error: true });
      return;
    }
    setBusy(true);
    setResult(undefined);
    try {
      const response = await fetch(`/api/portal/requests/${id}/document-info`);
      if (!response.ok) throw new Error();
      const info: DocumentInfo = await response.json();
      const [pdfHash, sigHash] = await Promise.all([digest(pdf), digest(sig)]);
      const pdfMatches = pdfHash === info.pdfDigest;
      const sigMatches = sigHash === info.signatureDigest;
      setResult(
        pdfMatches && sigMatches
          ? { text: "Оба файла совпадают с выпущенным комплектом." }
          : {
              text:
                !pdfMatches && !sigMatches
                  ? "Оба файла отличаются от выпущенного комплекта."
                  : `Файл ${pdfMatches ? "SIG" : "PDF"} отличается от выпущенного комплекта.`,
              error: true,
            },
      );
    } catch {
      setResult({
        text: "Не удалось сверить комплект. Попробуйте ещё раз.",
        error: true,
      });
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="panel document-verification">
      <summary>Электронная подпись</summary>
      <p className="page-note">SIG выпущен с учебным сертификатом. Здесь можно скачать его и сверить файлы с комплектом этой заявки.</p>
      <a className="button secondary" href={`/api/portal/requests/${id}/signature`}>
        Скачать SIG
      </a>
      <form onSubmit={verify} onChange={() => setResult(undefined)}>
        <p>При сверке файлы остаются в браузере.</p>
        <div className="document-verification-fields">
          <label>
            Документ PDF
            <input
              name="pdf"
              type="file"
              accept=".pdf,application/pdf"
              required
              disabled={busy}
            />
          </label>
          <label>
            Подпись SIG
            <input
              name="signature"
              type="file"
              accept=".sig,application/pkcs7-signature"
              required
              disabled={busy}
            />
          </label>
        </div>
        <button className="button secondary" disabled={busy}>
          {busy ? "Сверяем…" : "Сверить файлы"}
        </button>
        {result && (
          <p className={result.error ? "error" : undefined} role="status">
            {result.text}
          </p>
        )}
      </form>
    </details>
  );
}

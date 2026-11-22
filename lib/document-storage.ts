import { certificate, type DocumentStudent } from "./pdf";
import { fileDigest, signDocument } from "./document-signature";
import type { Case } from "./catalog";

type DocumentRequest = Pick<
  Case,
  "id" | "owner_id" | "service" | "organization" | "latin_name" | "format"
>;
type StoredDocument = {
  prepared_at: string;
  pdf: ArrayBuffer;
  signature: ArrayBuffer;
  pdf_digest: string;
  signature_digest: string;
};

export async function prepareDocument(
  db: D1Database,
  row: DocumentRequest,
  preparedAt: string,
) {
  const student = await db
    .prepare(
      "SELECT name,faculty,program,course,student_group,grades FROM users WHERE id=?",
    )
    .bind(row.owner_id)
    .first<DocumentStudent>();
  if (!student) throw new Error("Document owner missing");
  const bytes = await certificate(row, student, preparedAt);
  const pdf = new Uint8Array(bytes).buffer;
  const signature = await signDocument(pdf);
  const [pdfDigest, signatureDigest] = await Promise.all([
    fileDigest(pdf),
    fileDigest(signature),
  ]);
  return { preparedAt, pdf, signature, pdfDigest, signatureDigest };
}

export function insertDocument(
  db: D1Database,
  id: string,
  prepared: Awaited<ReturnType<typeof prepareDocument>>,
  expectedStatus = "ready",
) {
  return db
    .prepare(
      "INSERT OR IGNORE INTO document_artifacts (request_id,prepared_at,pdf,signature,pdf_digest,signature_digest) SELECT id,?,?,?,?,? FROM requests WHERE id=? AND status IN (?,?)",
    )
    .bind(
      prepared.preparedAt,
      prepared.pdf,
      prepared.signature,
      prepared.pdfDigest,
      prepared.signatureDigest,
      id,
      expectedStatus,
      expectedStatus === "ready" ? "issued" : expectedStatus,
    );
}

export async function getDocument(db: D1Database, row: Case) {
  const existing = db
    .prepare("SELECT * FROM document_artifacts WHERE request_id=?")
    .bind(row.id);
  const stored = await existing.first<StoredDocument>();
  if (stored) return stored;
  // Older ready requests have an event timestamp but no saved file.
  const preparedAt =
    row.events?.find((event) => event.status === "ready")?.created_at ??
    row.created_at;
  await insertDocument(
    db,
    row.id,
    await prepareDocument(db, row, preparedAt),
  ).run();
  const recovered = await existing.first<StoredDocument>();
  if (!recovered) throw new Error("Document artifact missing");
  return recovered;
}

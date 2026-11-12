import crypto from "node:crypto"
import JSZip from "jszip"

/**
 * Electronic signature helpers.
 *
 * A simple electronic signature is a typed name plus explicit consent, backed
 * by an audit trail (time, IP, user agent) and a document hash. That is the
 * model most property platforms use; it is not a cryptographic PKI signature.
 */

export const SIGN_TOKEN_DAYS = 14

export function createSignToken(): { raw: string; hash: string; expiresAt: Date } {
  const raw = crypto.randomBytes(32).toString("base64url")
  return {
    raw,
    hash: hashSignToken(raw),
    expiresAt: new Date(Date.now() + SIGN_TOKEN_DAYS * 86_400_000),
  }
}

export function hashSignToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex")
}

export function isSignTokenActive(
  row: { expires_at: string | Date; status?: string | null } | null | undefined,
  now = new Date(),
): boolean {
  if (!row) return false
  if (row.status === "void") return false
  return new Date(row.expires_at).getTime() > now.getTime()
}

export function sha256(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex")
}

const escapeXml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")

function run(text: string, options: { bold?: boolean; size?: number; color?: string } = {}) {
  const props = [
    options.bold ? "<w:b/>" : "",
    `<w:sz w:val="${options.size ?? 20}"/>`,
    `<w:szCs w:val="${options.size ?? 20}"/>`,
    options.color ? `<w:color w:val="${options.color}"/>` : "",
  ].join("")
  return `<w:r><w:rPr>${props}</w:rPr><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>`
}

function paragraph(text: string, options: { bold?: boolean; size?: number; color?: string; after?: number } = {}) {
  return `<w:p><w:pPr><w:spacing w:after="${options.after ?? 80}"/></w:pPr>${run(text, options)}</w:p>`
}

export type SignatureCertificate = {
  documentTitle: string
  signerName: string
  signerEmail?: string | null
  signedAt: string
  ip?: string | null
  userAgent?: string | null
  originalHash: string
}

/**
 * Append a signature certificate page to the generated .docx.
 *
 * The original document formatting is preserved; the certificate is a new
 * page at the end with the signer, consent statement, audit facts and the hash
 * of the document that was signed.
 */
export async function appendSignatureCertificate(
  buffer: Buffer,
  certificate: SignatureCertificate,
): Promise<Buffer> {
  const zip = await JSZip.loadAsync(buffer)
  const documentFile = zip.file("word/document.xml")
  if (!documentFile) throw new Error("The generated document has no body")

  const xml = await documentFile.async("string")
  const pageBreak =
    '<w:p><w:r><w:br w:type="page"/></w:r></w:p>'

  const certificateXml = [
    pageBreak,
    paragraph("ELECTRONIC SIGNATURE CERTIFICATE", { bold: true, size: 28, color: "17624A", after: 180 }),
    paragraph(certificate.documentTitle, { bold: true, size: 22, after: 220 }),
    paragraph("SIGNED BY", { bold: true, size: 16, color: "64726D", after: 40 }),
    paragraph(certificate.signerName, { bold: true, size: 22, after: 40 }),
    paragraph(certificate.signerEmail || "No email provided", { size: 18, color: "64726D", after: 200 }),
    paragraph("SIGNED AT", { bold: true, size: 16, color: "64726D", after: 40 }),
    paragraph(new Date(certificate.signedAt).toUTCString(), { size: 18, after: 200 }),
    paragraph(
      `By typing their name and selecting the consent box, the signer agreed that this typed name is their signature for this document, and that they had the opportunity to read it before signing.`,
      { size: 18, after: 160 },
    ),
    paragraph(`Original document SHA-256: ${certificate.originalHash}`, {
      size: 15,
      color: "64726D",
      after: 60,
    }),
    paragraph(`Signing IP: ${certificate.ip || "not recorded"}`, { size: 15, color: "64726D", after: 60 }),
    paragraph(
      `Device: ${(certificate.userAgent || "not recorded").slice(0, 160)}`,
      { size: 15, color: "64726D", after: 240 },
    ),
    paragraph("Signature: ______________________________", { size: 20, after: 60 }),
    paragraph("Date: ______________________________", { size: 20, after: 60 }),
  ].join("")

  const nextXml = xml.replace("</w:body>", `${certificateXml}</w:body>`)
  zip.file("word/document.xml", nextXml)

  return await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" })
}

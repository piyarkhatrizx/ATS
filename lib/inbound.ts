export type InboundAttachment = {
  Name: string;
  Content: string;
  ContentType?: string;
  ContentLength?: number;
};

export type PostmarkInboundPayload = {
  MessageID: string;
  From?: string;
  FromFull?: { Email?: string };
  To?: string;
  ToFull?: Array<{ Email?: string }>;
  Subject?: string;
  TextBody?: string;
  HtmlBody?: string;
  Attachments?: InboundAttachment[];
  Date?: string;
};

export function getToAddresses(payload: PostmarkInboundPayload) {
  const fullAddresses = payload.ToFull?.map((entry) => entry.Email).filter(
    (email): email is string => Boolean(email),
  );
  if (fullAddresses?.length) return fullAddresses;
  return payload.To?.split(",").map((address) => address.trim()).filter(Boolean) ?? [];
}

export function getIngestAlias(address: string) {
  const email = address.match(/<([^>]+)>/)?.[1] ?? address;
  const match = email.trim().toLowerCase().match(/^jobs\+([^@]+)@/);
  return match?.[1] ?? null;
}

export function normalizeEmail(email: string | null | undefined) {
  const normalized = email?.trim().toLowerCase();
  return normalized || null;
}

export function normalizePhone(phone: string | null | undefined) {
  const digits = phone?.replace(/\D/g, "") ?? "";
  return digits.length >= 10 ? digits.slice(-10) : null;
}

export type DedupeRecord = {
  id: string;
  email?: string | null;
  phone?: string | null;
};

export function findDedupeMatch(input: DedupeRecord, existing: DedupeRecord[]) {
  const email = normalizeEmail(input.email);
  if (email) {
    const emailMatch = existing.find((record) => normalizeEmail(record.email) === email);
    if (emailMatch) return emailMatch;
  }

  const phone = normalizePhone(input.phone);
  if (phone) {
    return existing.find((record) => normalizePhone(record.phone) === phone) ?? null;
  }

  return null;
}

export function isResumeAttachment(attachment: InboundAttachment) {
  const name = attachment.Name.toLowerCase();
  const contentType = attachment.ContentType?.toLowerCase();
  return (
    contentType === "application/pdf" ||
    contentType === "application/msword" ||
    contentType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    /\.(pdf|docx?|rtf)$/.test(name)
  );
}

export function extractForwardingCode(subject?: string, body?: string) {
  const text = `${subject ?? ""}\n${body ?? ""}`;
  const match = text.match(/(?:confirmation|verification)\s*(?:code|number)\s*[:#-]?\s*([A-Z0-9-]{4,})/i);
  return match?.[1] ?? text.match(/\b\d{4,8}\b/)?.[0] ?? null;
}

export function getAttachmentKey(messageId: string, filename: string) {
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `inbound/${messageId}/${safeName}`;
}
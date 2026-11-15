/** Email normalised from IMAP/mailparser, independent of provider. */
export type NormalizedEmail = {
  messageId: string;
  mailbox: string;
  imapUid: number | null;
  from: string; // lower-cased address
  subject: string;
  text: string; // plain text body (HTML converted)
  receivedAt: Date;
  authResults: string | null; // Authentication-Results header, if any
};

export type ParsedPayment = {
  parser: string;
  direction: "CREDIT" | "DEBIT";
  amountPaise: number | null;
  transactionRef: string | null;
  transactionAt: Date | null;
  payerHandle: string | null;
  note: string | null;
  referencedOrderNumber: string | null;
};

export interface PaymentEmailParser {
  name: string;
  /** Cheap check, usually on sender domain or subject. */
  canParse(email: NormalizedEmail): boolean;
  /** Returns null when the email is not a payment notification this parser understands. */
  parse(email: NormalizedEmail): ParsedPayment | null;
}

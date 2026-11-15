import QRCode from "qrcode";
import { paiseToDecimalString } from "lib/utils";

/** Builds a UPI deep link. Amount always comes from the server-side order total. */
export function buildUpiUri(opts: { upiId: string; payeeName: string; amountPaise: number; orderNumber: string }): string {
  const params = new URLSearchParams({
    pa: opts.upiId,
    pn: opts.payeeName,
    am: paiseToDecimalString(opts.amountPaise),
    cu: "INR",
    tn: opts.orderNumber,
    tr: opts.orderNumber,
  });
  // UPI apps expect %20 rather than + for spaces.
  return `upi://pay?${params.toString().replace(/\+/g, "%20")}`;
}

export async function upiQrDataUrl(uri: string): Promise<string> {
  return QRCode.toDataURL(uri, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 360,
    color: { dark: "#09090F", light: "#FFFFFF" },
  });
}

// Real content sniffing via magic bytes. A client-sent Content-Type header
// (multer's file.mimetype) is trivially spoofable — this checks the actual
// leading bytes of the file instead, so an uploaded non-image can't slip
// through as one.
const SIGNATURES: { mime: string; bytes: number[] }[] = [
  { mime: "image/png", bytes: [0x89, 0x50, 0x4e, 0x47] },
  { mime: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
  { mime: "image/gif", bytes: [0x47, 0x49, 0x46, 0x38] },
];

export function sniffImageMime(buf: Buffer): string | null {
  for (const s of SIGNATURES) {
    if (s.bytes.every((b, i) => buf[i] === b)) return s.mime;
  }
  // WEBP: "RIFF" + 4 bytes size + "WEBP"
  if (buf.length >= 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") {
    return "image/webp";
  }
  return null;
}

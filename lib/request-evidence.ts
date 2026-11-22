export const maxEvidenceBytes = 512 * 1024;
export const evidenceAccept = ".txt,.png,text/plain,image/png";

export function requiresEvidence(service: string, reason: unknown) {
  return (service === "exam-request" && reason === "absence") ||
    (service === "profile-correction" && reason === "official");
}

export function evidenceFileType(file: File): "text/plain" | "image/png" {
  if (!file.size || file.size > maxEvidenceBytes)
    throw new Error("Выберите непустой файл размером до 512 КБ");
  if (!/^[\p{L}\p{N}][\p{L}\p{M}\p{N} ()._-]{0,90}\.(?:txt|png)$/iu.test(file.name))
    throw new Error("Используйте имя из букв, цифр и пробелов с расширением .txt или .png");
  const type = file.name.toLowerCase().endsWith(".txt") ? "text/plain" : "image/png";
  if (file.type && file.type !== "application/octet-stream" && file.type !== type)
    throw new Error("Тип файла не совпадает с его расширением");
  return type;
}

// PNG stores a CRC-32 after every chunk. Validate it without inflating the image.
const pngCrcTable = Uint32Array.from({ length: 256 }, (_, index) => {
  let crc = index;
  for (let bit = 0; bit < 8; bit++) crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  return crc;
});
function hasPngStructure(bytes: Uint8Array) {
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (bytes.length < 57 || !signature.every((value, i) => bytes[i] === value)) return false;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let hasImageData = false;
  for (let offset = 8; offset + 12 <= bytes.length;) {
    const length = view.getUint32(offset);
    const end = offset + 12 + length;
    if (end > bytes.length) return false;
    let crc = 0xffffffff;
    for (let i = offset + 4; i < end - 4; i++) crc = pngCrcTable[(crc ^ bytes[i]) & 255] ^ (crc >>> 8);
    if ((~crc >>> 0) !== view.getUint32(end - 4)) return false;
    const type = String.fromCharCode(...bytes.subarray(offset + 4, offset + 8));
    if (offset === 8) {
      if (type !== "IHDR" || length !== 13) return false;
      const width = view.getUint32(offset + 8), height = view.getUint32(offset + 12);
      if (!width || !height || width * height > 16_000_000) return false;
    } else if (type === "IHDR") return false;
    if (type === "IDAT" && length) hasImageData = true;
    if (type === "IEND") return hasImageData && length === 0 && end === bytes.length;
    offset = end;
  }
  return false;
}

export async function readEvidence(file: File) {
  const mediaType = evidenceFileType(file);
  const content = await file.arrayBuffer();
  if (mediaType === "image/png") {
    if (!hasPngStructure(new Uint8Array(content)))
      throw new Error("Выберите целое изображение PNG до 16 мегапикселей");
  } else {
    let text: string;
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(content);
    } catch {
      throw new Error("Сохраните текстовый файл в кодировке UTF-8");
    }
    // Accept printable text, line breaks and tabs. Reject binary content.
    if (!text.trim() || Array.from(text).some((char) => {
      const code = char.charCodeAt(0);
      return (code < 32 && code !== 9 && code !== 10 && code !== 13) || (code >= 127 && code <= 159);
    })) throw new Error("Выберите текстовый файл UTF-8 с читаемым текстом");
  }
  return { name: file.name, mediaType, content };
}

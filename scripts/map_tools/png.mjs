// Códec PNG mínimo en Node puro (zlib built-in). Soporta RGBA 8-bit (color type 6)
// y RGB 8-bit (color type 2) sin entrelazado. Suficiente para el tooling de mapas.
import zlib from 'node:zlib';

const SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  return pb <= pc ? b : c;
}

function unfilter(raw, width, height, bpp) {
  const stride = width * bpp;
  const out = Buffer.alloc(height * stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const prev = y > 0 ? out.subarray((y - 1) * stride, y * stride) : null;
    const cur = out.subarray(y * stride, (y + 1) * stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? cur[x - bpp] : 0;
      const b = prev ? prev[x] : 0;
      const c = (prev && x >= bpp) ? prev[x - bpp] : 0;
      let v = line[x];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) v += paeth(a, b, c);
      cur[x] = v & 0xff;
    }
  }
  return out;
}

// Decodifica un PNG → { width, height, data } con data RGBA (4 bytes/px).
export function decodePng(buf) {
  if (!buf.subarray(0, 8).equals(SIG)) throw new Error('No es un PNG');
  let pos = 8, width = 0, height = 0, colorType = 0, bitDepth = 0;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      if (data[12] !== 0) throw new Error('PNG entrelazado no soportado');
      if (bitDepth !== 8 || (colorType !== 6 && colorType !== 2)) {
        throw new Error(`Formato no soportado: depth=${bitDepth} color=${colorType}`);
      }
    } else if (type === 'IDAT') {
      idat.push(data);
    } else if (type === 'IEND') break;
    pos += 12 + len;
  }
  const bpp = colorType === 6 ? 4 : 3;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const pixels = unfilter(raw, width, height, bpp);
  if (bpp === 4) return { width, height, data: pixels };
  const rgba = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    rgba[i * 4] = pixels[i * 3];
    rgba[i * 4 + 1] = pixels[i * 3 + 1];
    rgba[i * 4 + 2] = pixels[i * 3 + 2];
    rgba[i * 4 + 3] = 255;
  }
  return { width, height, data: rgba };
}

function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

// Codifica RGBA (4 bytes/px) → Buffer PNG.
export function encodePng(width, height, data) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; // RGBA 8-bit
  const stride = width * 4;
  const raw = Buffer.alloc(height * (stride + 1));
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filtro none
    data.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  return Buffer.concat([SIG, chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

// Copia un rect de un bitmap RGBA a otro (sobrescribe, sin alpha).
export function blit(src, sx, sy, w, h, dst, dx, dy) {
  for (let y = 0; y < h; y++) {
    const srcOff = ((sy + y) * src.width + sx) * 4;
    const dstOff = ((dy + y) * dst.width + dx) * 4;
    src.data.copy(dst.data, dstOff, srcOff, srcOff + w * 4);
  }
}

// Igual que blit pero componiendo con el canal alpha del origen.
export function alphaBlit(src, sx, sy, w, h, dst, dx, dy) {
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const s = ((sy + y) * src.width + sx + x) * 4;
    const d = ((dy + y) * dst.width + dx + x) * 4;
    const a = src.data[s + 3] / 255;
    if (a === 0) continue;
    for (let c = 0; c < 3; c++) {
      dst.data[d + c] = Math.round(src.data[s + c] * a + dst.data[d + c] * (1 - a));
    }
    dst.data[d + 3] = Math.max(dst.data[d + 3], src.data[s + 3]);
  }
}

export function makeBitmap(width, height, fill = [0, 0, 0, 255]) {
  const data = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    data[i * 4] = fill[0]; data[i * 4 + 1] = fill[1];
    data[i * 4 + 2] = fill[2]; data[i * 4 + 3] = fill[3];
  }
  return { width, height, data };
}

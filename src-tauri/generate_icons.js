import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { deflateSync } from 'node:zlib';

const iconsDir = resolve('src-tauri/icons');
mkdirSync(iconsDir, { recursive: true });

function createPng(width, height) {
  // Minimal uncompressed PNG generator
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8); // bit depth 8
  ihdrData.writeUInt8(6, 9); // color type 6: RGBA
  ihdrData.writeUInt8(0, 10); // compression
  ihdrData.writeUInt8(0, 11); // filter
  ihdrData.writeUInt8(0, 12); // interlace

  const ihdrChunk = createChunk('IHDR', ihdrData);

  // Raw image data with scanlines (filter type 0: None)
  const rawData = Buffer.alloc(height * (width * 4 + 1));
  let offset = 0;
  for (let y = 0; y < height; y++) {
    rawData.writeUInt8(0, offset++); // filter byte
    for (let x = 0; x < width; x++) {
      // Gordon Blue/Indigo color #4f46e5 with alpha 255
      rawData.writeUInt8(79, offset++); // R
      rawData.writeUInt8(70, offset++); // G
      rawData.writeUInt8(229, offset++); // B
      rawData.writeUInt8(255, offset++); // A
    }
  }

  const idatData = deflateSync(rawData);
  const idatChunk = createChunk('IDAT', idatData);

  // IEND chunk
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const length = data.length;
  const chunk = Buffer.alloc(4 + 4 + length + 4);
  chunk.writeUInt32BE(length, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  const crc = crc32(chunk.subarray(4, 8 + length));
  chunk.writeUInt32BE(crc, 8 + length);
  return chunk;
}

// CRC32 implementation
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function createIco(pngBuffers) {
  // ICO header: 6 bytes
  const count = pngBuffers.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // 1 = ICO
  header.writeUInt16LE(count, 4);

  let offset = 6 + count * 16;
  const entries = [];
  const images = [];

  for (const png of pngBuffers) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(32, 0); // width
    entry.writeUInt8(32, 1); // height
    entry.writeUInt8(0, 2); // colors
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bpp
    entry.writeUInt32LE(png.length, 8); // size
    entry.writeUInt32LE(offset, 12); // offset

    entries.push(entry);
    images.push(png);
    offset += png.length;
  }

  return Buffer.concat([header, ...entries, ...images]);
}

function createIcns(pngBuffer) {
  // Apple ICNS header: 'icns' + total_length
  const totalLength = 8 + 8 + pngBuffer.length;
  const header = Buffer.alloc(8);
  header.write('icns', 0, 4, 'ascii');
  header.writeUInt32BE(totalLength, 4);

  // 'ic07' = 128x128 PNG icon
  const tagHeader = Buffer.alloc(8);
  tagHeader.write('ic07', 0, 4, 'ascii');
  tagHeader.writeUInt32BE(8 + pngBuffer.length, 4);

  return Buffer.concat([header, tagHeader, pngBuffer]);
}

// Generate PNGs
const png32 = createPng(32, 32);
const png128 = createPng(128, 128);
const png256 = createPng(256, 256);

writeFileSync(resolve(iconsDir, '32x32.png'), png32);
writeFileSync(resolve(iconsDir, '128x128.png'), png128);
writeFileSync(resolve(iconsDir, '128x128@2x.png'), png256);
writeFileSync(resolve(iconsDir, 'icon.ico'), createIco([png32]));
writeFileSync(resolve(iconsDir, 'icon.icns'), createIcns(png128));

console.log('All Tauri icons successfully generated in src-tauri/icons/');

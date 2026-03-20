// Generate simple placeholder PNG icons using pure Node.js
// Creates minimal valid PNG files with a lobster-orange color
const fs = require('fs');

function createMinimalPng(size) {
  // Minimal valid PNG: 8-byte signature + IHDR + IDAT + IEND
  // This creates a solid-color square
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(size, 0);  // width
  ihdrData.writeUInt32BE(size, 4);  // height
  ihdrData[8] = 8;  // bit depth
  ihdrData[9] = 2;  // color type (RGB)
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace

  // Raw image data (filter byte + RGB pixels per row)
  const rawRows = [];
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 3);
    row[0] = 0; // no filter
    for (let x = 0; x < size; x++) {
      const offset = 1 + x * 3;
      // Orange color #f97316
      row[offset] = 249;     // R
      row[offset + 1] = 115; // G
      row[offset + 2] = 22;  // B
    }
    rawRows.push(row);
  }
  const rawData = Buffer.concat(rawRows);

  // Compress with zlib
  const zlib = require('zlib');
  const compressed = zlib.deflateSync(rawData);

  // Build chunks
  function makeChunk(type, data) {
    const typeBytes = Buffer.from(type);
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length, 0);
    const crcData = Buffer.concat([typeBytes, data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(require('zlib').crc32(crcData) >>> 0, 0);
    return Buffer.concat([length, typeBytes, data, crc]);
  }

  const ihdr = makeChunk('IHDR', ihdrData);
  const idat = makeChunk('IDAT', compressed);
  const iend = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdr, idat, iend]);
}

[16, 48, 128].forEach(size => {
  const png = createMinimalPng(size);
  fs.writeFileSync(`icons/icon-${size}.png`, png);
  console.log(`Created icon-${size}.png (${png.length} bytes)`);
});

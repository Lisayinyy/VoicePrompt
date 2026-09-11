"""Render an original square waveform mark using only Python's standard library."""
import pathlib, struct, zlib
W = 256
pixels = bytearray()
heights = [36, 76, 120, 166, 120, 76, 36]
for y in range(W):
    pixels.append(0)
    for x in range(W):
        # Warm porcelain background, plum waveform with rounded caps.
        color = (249, 247, 251, 255)
        for i, h in enumerate(heights):
            cx, radius = 47 + i * 27, 8
            cy = max(128 - h / 2 + radius, min(y, 128 + h / 2 - radius))
            if (x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2:
                color = (91 + i * 10, 55 + i * 5, 127 + i * 9, 255)
                break
        pixels.extend(color)
def chunk(kind, data):
    return struct.pack('>I', len(data)) + kind + data + struct.pack('>I', zlib.crc32(kind + data))
out = pathlib.Path(__file__).resolve().parents[1] / 'minimax/icon.png'
out.write_bytes(b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', W, W, 8, 6, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(pixels, 9)) + chunk(b'IEND', b''))
print(out)

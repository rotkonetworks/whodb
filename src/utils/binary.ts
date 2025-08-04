
export const decodeUint8Array = (data: Uint8Array): string => {
  try {
    return new TextDecoder().decode(data);
  } catch (error) {
    console.error("Failed to decode Uint8Array:", error);
    return "";
  }
};
export const encodeUint8Array = (data: string): Uint8Array => {
  try {
    return new TextEncoder().encode(data);
  } catch (error) {
    console.error("Failed to encode string to Uint8Array:", error);
    return new Uint8Array();
  }
};

export const toHexString = (data: Uint8Array): string => {
  return Array.from(data)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
};

export const fromHexString = (hex: string): Uint8Array => {
  if (hex.length % 2 !== 0) {
    throw new Error("Invalid hex string length");
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
};

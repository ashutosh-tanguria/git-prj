export function hex(bytes: Uint8Array) {
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join(
    "",
  );
}

export function base64(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes));
}

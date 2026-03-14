export const wipeString = (_value: string | null | undefined): void => {
  // JS strings are immutable; this helper centralizes intent and keeps wiping calls explicit.
};

export const wipeUint8 = (bytes?: Uint8Array | null): void => {
  if (!bytes) {
    return;
  }
  bytes.fill(0);
};

export const wipeArray = (arr?: Array<string> | null): void => {
  if (!arr) {
    return;
  }
  for (let i = 0; i < arr.length; i += 1) {
    arr[i] = '';
  }
};

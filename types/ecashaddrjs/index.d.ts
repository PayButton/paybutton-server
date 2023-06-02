declare module 'ecashaddrjs' {
  export function decode (address: string): { prefix: string, type: string, hash: Uint8Array }
  export function encode (prefix: string, type: string, hash: Uint8Array): string
}

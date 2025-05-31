declare module 'ecashaddrjs' {
  export function decodeCashAddress (address: string): { prefix: string, type: string, hash: Uint8Array }
  export function encodeCashAddress (prefix: string, type: string, hash: Uint8Array): string
}

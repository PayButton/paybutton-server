export const SUPPORTED_CHAINS = [
  'ecash',
  'bitcoincash',
  'bchtest',
  'bchreg'
] // WIP integration tests to check if this corresponds to the database

export const SUPPORTED_ADDRESS_PATTERN = /((q|p)[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{41}|(Q|P)[QPZRY9X8GF2TVDW0S3JN54KHCE6MUA7L]{41})/

export const RESPONSE_MESSAGES = {
  INVALID_INPUT_400: { statusCode: 400, message: 'Invalid input.' },
  USER_ID_NOT_PROVIDED_400: { statusCode: 400, message: "'userId' not provided."},
  ADDRESSES_NOT_PROVIDED_400: { statusCode: 400, message: "'addresses' not provided."},
  NOT_FOUND_404: { statusCode: 404, message: "Not found."}
}

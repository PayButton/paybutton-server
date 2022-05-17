export const SUPPORTED_CHAINS = [
  'ecash',
  'bitcoincash'
] // WIP integration tests to check if this corresponds to the database
export const SUPPORTED_ADDRESS_PATTERN = /(q|p)[a-z0-9]{41}/

export const REPONSE_MESSAGES = {
  INVALID_INPUT_400: { statusCode: 400, message: 'Invalid input.' },
  USER_ID_NOT_PROVIDED_400: { statusCode: 400, message: "'userId' not provided."},
  NOT_FOUND_404: { statusCode: 404, message: "Not found."}
}

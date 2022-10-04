export const SUPPORTED_ADDRESS_PATTERN = /((q|p)[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{41}|(Q|P)[QPZRY9X8GF2TVDW0S3JN54KHCE6MUA7L]{41})/

export const RESPONSE_MESSAGES = {
  SUCCESSFULLY_SYNCED_200: { statusCode: 200, message: 'Successfully synced.' },
  NOT_FOUND_404: { statusCode: 404, message: 'Not found.' },
  INVALID_INPUT_400: { statusCode: 400, message: 'Invalid input.' },
  USER_ID_NOT_PROVIDED_400: { statusCode: 400, message: "'userId' not provided." },
  MULTIPLE_USER_IDS_PROVIDED_400: { statusCode: 400, message: "Multiple 'userId' provided." },
  NAME_NOT_PROVIDED_400: { statusCode: 400, message: "'name' not provided." },
  NAME_ALREADY_EXISTS_400: { statusCode: 400, message: 'Button name already exists for this user.' },
  ADDRESSES_NOT_PROVIDED_400: { statusCode: 400, message: "'addresses' not provided." },
  BUTTON_IDS_NOT_PROVIDED_400: { statusCode: 400, message: "'paybuttonIdList' not provided." },
  TRANSACTION_ID_NOT_PROVIDED_400: { statusCode: 400, message: "'transactionId' not provided." },
  INVALID_NETWORK_SLUG_400: { statusCode: 400, message: 'Invalid network slug.' },
  INVALID_BUTTON_DATA_400: { statusCode: 400, message: "'buttonData' is not valid JSON." },
  PAYBUTTON_ALREADY_BELONGS_TO_WALLET_400: { statusCode: 400, message: 'Some of the paybuttons already belong to another wallet.' },
  WALLET_CREATION_FAILED_400: { statusCode: 400, message: 'Wallet creation failed.' },
  ADDRESS_ALREADY_BELONGS_TO_WALLET_400: { statusCode: 400, message: "Some of the paybuttons' addresses already belong to another wallet." },
  ADDRESS_NOT_PROVIDED_400: { statusCode: 400, message: "'address' not provided." },
  INVALID_ADDRESS_400: { statusCode: 400, message: 'Invalid address.' },
  NO_ADDRESS_FOUND_404: { statusCode: 404, message: 'No address found.' },
  MULTIPLE_ADDRESSES_FOUND_400: { statusCode: 400, message: 'Multiple addresses found.' }
}

// When fetching some address transactions, number of transactions to fetch at a time.
export const FETCH_N = 100

// When fetching some address transactions, delay (in ms) between each fetch.
export const FETCH_DELAY = 100

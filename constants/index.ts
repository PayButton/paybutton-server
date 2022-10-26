export const SUPPORTED_ADDRESS_PATTERN = /((q|p)[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{41}|(Q|P)[QPZRY9X8GF2TVDW0S3JN54KHCE6MUA7L]{41})/

export const RESPONSE_MESSAGES = {
  SUCCESSFULLY_SYNCED_200: { statusCode: 200, message: 'Successfully synced.' },
  NOT_FOUND_404: { statusCode: 404, message: 'Not found.' },
  INVALID_INPUT_400: { statusCode: 400, message: 'Invalid input.' },
  USER_ID_NOT_PROVIDED_400: { statusCode: 400, message: "'userId' not provided." },
  MULTIPLE_USER_IDS_PROVIDED_400: { statusCode: 400, message: "Multiple 'userId' provided." },
  NAME_NOT_PROVIDED_400: { statusCode: 400, message: "'name' not provided." },
  PAYBUTTON_NAME_ALREADY_EXISTS_400: { statusCode: 400, message: 'Button name already exists for this user.' },
  WALLET_NAME_ALREADY_EXISTS_400: { statusCode: 400, message: 'Wallet name already exists for this user.' },
  ADDRESSES_NOT_PROVIDED_400: { statusCode: 400, message: "'addresses' not provided." },
  BUTTON_IDS_NOT_PROVIDED_400: { statusCode: 400, message: "'paybuttonIdList' not provided." },
  TRANSACTION_ID_NOT_PROVIDED_400: { statusCode: 400, message: "'transactionId' not provided." },
  INVALID_NETWORK_SLUG_400: { statusCode: 400, message: 'Invalid network slug.' },
  INVALID_NETWORK_ID_400: { statusCode: 400, message: 'Invalid network id.' },
  INVALID_BUTTON_DATA_400: { statusCode: 400, message: "'buttonData' is not valid JSON." },
  PAYBUTTON_ALREADY_BELONGS_TO_WALLET_400: { statusCode: 400, message: 'One or more buttons already belong to another wallet.' },
  WALLET_CREATION_FAILED_400: { statusCode: 400, message: 'Wallet creation failed.' },
  ADDRESS_ALREADY_BELONGS_TO_WALLET_400: { statusCode: 400, message: 'One or more button addresses already belong to another wallet.' },
  ADDRESS_NOT_PROVIDED_400: { statusCode: 400, message: "'address' not provided." },
  INVALID_ADDRESS_400: { statusCode: 400, message: 'Invalid address.' },
  NO_ADDRESS_FOUND_404: { statusCode: 404, message: 'No address found.' },
  NO_BUTTON_FOUND_404: { statusCode: 404, message: 'No button found.' },
  NO_WALLET_FOUND_404: { statusCode: 404, message: 'No wallet found.' },
  NO_USER_PROFILE_FOUND_ON_WALLET_404: { statusCode: 404, message: 'No user profile found for wallet.' },
  MULTIPLE_ADDRESSES_FOUND_400: { statusCode: 400, message: 'Multiple addresses found.' },
  RESOURCE_DOES_NOT_BELONG_TO_USER_400: { statusCode: 400, message: 'Resource does not belong to user.' },
  DEFAULT_XEC_WALLET_MUST_HAVE_SOME_XEC_ADDRESS_400: { statusCode: 400, message: 'Default XEC wallet must have some XEC address.' },
  DEFAULT_BCH_WALLET_MUST_HAVE_SOME_BCH_ADDRESS_400: { statusCode: 400, message: 'Default BCH wallet must have some BCH address.' }
}

// When fetching some address transactions, number of transactions to fetch at a time.
export const FETCH_N = 100

// When fetching some address transactions, delay (in ms) between each fetch.
export const FETCH_DELAY = 100

export const XEC_NETWORK_ID = 1
export const BCH_NETWORK_ID = 2

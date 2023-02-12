export const SUPPORTED_ADDRESS_PATTERN = /((q|p)[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{41}|(Q|P)[QPZRY9X8GF2TVDW0S3JN54KHCE6MUA7L]{41})/

export const RESPONSE_MESSAGES = {
  SUCCESSFULLY_SYNCED_200: { statusCode: 200, message: 'Successfully synced.' },
  NOT_FOUND_404: { statusCode: 404, message: 'Not found.' },
  INVALID_INPUT_400: { statusCode: 400, message: 'Invalid input.' },
  USER_ID_NOT_PROVIDED_400: { statusCode: 400, message: "'userId' not provided." },
  WALLET_ID_NOT_PROVIDED_400: { statusCode: 400, message: "'walletId' not provided." },
  MULTIPLE_USER_IDS_PROVIDED_400: { statusCode: 400, message: "Multiple 'userId' provided." },
  NAME_NOT_PROVIDED_400: { statusCode: 400, message: "'name' not provided." },
  PAYBUTTON_NAME_ALREADY_EXISTS_400: { statusCode: 400, message: 'Button name already exists.' },
  WALLET_NAME_ALREADY_EXISTS_400: { statusCode: 400, message: 'Wallet name already exists.' },
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
  DEFAULT_BCH_WALLET_MUST_HAVE_SOME_BCH_ADDRESS_400: { statusCode: 400, message: 'Default BCH wallet must have some BCH address.' },
  MISSING_PRICE_API_URL_400: { statusCode: 400, message: 'Missing PRICE_API_URL environment variable.' },
  MISSING_PRICE_FOR_TRANSACTION_400: { statusCode: 400, message: 'Missing price for transaction.' },
  INVALID_PRICE_STATE_400: { statusCode: 400, message: 'Missing expected quote price for transaction.' },
  COULD_NOT_GET_BLOCK_INFO: { statusCode: 500, message: "Couldn't get block info." },
  NETWORK_SLUG_NOT_PROVIDED_400: { statusCode: 400, message: "'networkSlug' not provided." },
  QUOTE_SLUG_NOT_PROVIDED_400: { statusCode: 400, message: "'quoteSlug' not provided." },
  NO_CURRENT_PRICES_FOUND_404: { statusCode: 404, message: 'Current prices not found.' },
  INVALID_QUOTE_SLUG_400: { statusCode: 400, message: 'Invalid quote slug.' },
  INVALID_TICKER_400: { statusCode: 400, message: 'Invalid ticker.' }
}

export interface KeyValueString {
  [key: string]: string
}

export const NETWORK_SLUGS: KeyValueString = {
  ecash: 'ecash',
  bitcoincash: 'bitcoincash',
  ectest: 'ectest',
  bchtest: 'bchtest',
  bchreg: 'bchreg'
}

export const TICKERS: KeyValueString = {
  ecash: 'XEC',
  bitcoincash: 'BCH'
}

export const FIRST_DATES_PRICES: KeyValueString = {
  XEC: '2020-11-14',
  BCH: '2017-08-01'
}

// When fetching some address transactions, number of transactions to fetch at a time.
export const FETCH_N = 100

// When fetching the FETCH_N transactions, max time (in ms) to wait to upsert them.
export const FETCH_N_TIMEOUT = 120000

// When fetching some address transactions, delay (in ms) between each fetch.
export const FETCH_DELAY = 100

// Wait time (in ms) to see if there are new unsynced addresses
export const SYNC_NEW_ADDRESSES_DELAY = 10000

export const XEC_NETWORK_ID = 1
export const BCH_NETWORK_ID = 2

export const USD_QUOTE_ID = 1
export const CAD_QUOTE_ID = 2
export const N_OF_QUOTES = 2 // USD and CAD for now
export const DEFAULT_QUOTE_SLUG = 'usd'
export const SUPPORTED_QUOTES = [ // avoids hitting the DB every time for data that won't change
  'usd',
  'cad'
]

export const PRICE_API_DATE_FORMAT = 'YYYYMMDD'

export const BCH_TIMESTAMP_THRESHOLD = 1501588800 // 2017 Aug 1, 12PM
export const XEC_TIMESTAMP_THRESHOLD = 1605398400 // 2020 Nov 15, 12AM

// Wait time (in ms) between sync of current prices
export const CURRENT_PRICE_SYNC_DELAY = 60000
export const DEFAULT_WORKER_LOCK_DURATION = 120000

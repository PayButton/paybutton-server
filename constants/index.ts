export const SUPPORTED_ADDRESS_PATTERN = /((q|p)[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{41}|(Q|P)[QPZRY9X8GF2TVDW0S3JN54KHCE6MUA7L]{41})/

export interface ResponseMessage {
  statusCode: number
  message: string
}
export const TX_PAGE_SIZE_LIMIT = 2000
export const RESPONSE_MESSAGES = {
  SUCCESSFULLY_SYNCED_200: { statusCode: 200, message: 'Successfully synced.' },
  STARTED_SYNC_200: { statusCode: 200, message: 'Sync started.' },
  NOT_FOUND_404: { statusCode: 404, message: 'Not found.' },
  INVALID_INPUT_400: { statusCode: 400, message: 'Invalid input.' },
  USER_ID_NOT_PROVIDED_400: { statusCode: 400, message: "'userId' not provided." },
  WALLET_ID_NOT_PROVIDED_400: { statusCode: 400, message: "'walletId' not provided." },
  MULTIPLE_USER_IDS_PROVIDED_400: { statusCode: 400, message: "Multiple 'userId' provided." },
  NAME_NOT_PROVIDED_400: { statusCode: 400, message: "'name' not provided." },
  PAYBUTTON_NAME_ALREADY_EXISTS_400: { statusCode: 400, message: 'Button name already exists.' },
  IFP_ADDRESS_NOT_SUPPORTED_400: { statusCode: 400, message: 'Please choose a different address.' },
  WALLET_NAME_ALREADY_EXISTS_400: { statusCode: 400, message: 'Wallet name already exists.' },
  TRANSACTION_ALREADY_EXISTS_FOR_ADDRESS_400: { statusCode: 400, message: 'Transaction already exists for address.' },
  ADDRESSES_NOT_PROVIDED_400: { statusCode: 400, message: "'addresses' not provided." },
  BUTTON_IDS_NOT_PROVIDED_400: { statusCode: 400, message: 'Paybuttons were not provided.' },
  ADDRESS_IDS_NOT_PROVIDED_400: { statusCode: 400, message: 'Addresses were not provided.' },
  TRANSACTION_ID_NOT_PROVIDED_400: { statusCode: 400, message: "'transactionId' not provided." },
  INVALID_NETWORK_SLUG_400: { statusCode: 400, message: 'Invalid network slug.' },
  INVALID_NETWORK_ID_400: { statusCode: 400, message: 'Invalid network id.' },
  INVALID_BUTTON_DATA_400: { statusCode: 400, message: "'buttonData' is not valid JSON." },
  INVALID_DATA_JSON_400: { statusCode: 400, message: 'Data is not valid JSON.' },
  PAYBUTTON_ALREADY_BELONGS_TO_WALLET_400: { statusCode: 400, message: 'One or more buttons already belong to another wallet.' },
  WALLET_CREATION_FAILED_400: { statusCode: 400, message: 'Wallet creation failed.' },
  ADDRESS_ALREADY_BELONGS_TO_WALLET_400: { statusCode: 400, message: 'One or more button addresses already belong to another wallet.' },
  ADDRESS_NOT_PROVIDED_400: { statusCode: 400, message: "'address' not provided." },
  INVALID_ADDRESS_400: { statusCode: 400, message: 'Invalid address.' },
  NO_ADDRESS_FOUND_404: { statusCode: 404, message: 'No address found.' },
  NO_TRANSACTION_FOUND_404: { statusCode: 404, message: 'No transaction found.' },
  NO_BUTTON_FOUND_404: { statusCode: 404, message: 'No button found.' },
  NO_WALLET_FOUND_404: { statusCode: 404, message: 'No wallet found.' },
  NO_WALLET_FOUND_FOR_USER_ADDRESS_404: { statusCode: 404, message: 'No wallet found for user address.' },
  NO_USER_PROFILE_FOUND_ON_WALLET_404: { statusCode: 404, message: 'No user profile found for wallet.' },
  NO_USER_PROFILE_FOUND_ON_PAYBUTTON_404: { statusCode: 404, message: 'No user profile found for paybutton.' },
  MULTIPLE_ADDRESSES_FOUND_400: { statusCode: 400, message: 'Multiple addresses found.' },
  RESOURCE_DOES_NOT_BELONG_TO_USER_400: { statusCode: 400, message: 'Resource does not belong to user.' },
  INVALID_RESOURCE_UPDATE_400: { statusCode: 400, message: 'Invalid attempt of updating resource.' },
  MISSING_PRICE_API_URL_400: { statusCode: 400, message: 'Missing PRICE_API_URL environment variable.' },
  MISSING_PRICE_API_TOKEN_400: { statusCode: 400, message: 'Missing PRICE_API_TOKEN environment variable.' },
  MISSING_WS_AUTH_KEY_400: { statusCode: 400, message: 'Missing WS_AUTH_KEY environment variable' },
  MISSING_PRICE_FOR_TRANSACTION_400: { statusCode: 400, message: 'Missing price for transaction.' },
  INVALID_PRICE_STATE_400: { statusCode: 400, message: 'Missing expected quote price for transaction.' },
  COULD_NOT_GET_BLOCK_INFO_500: { statusCode: 500, message: "Couldn't get block info." },
  NETWORK_SLUG_NOT_PROVIDED_400: { statusCode: 400, message: "'networkSlug' not provided." },
  QUOTE_SLUG_NOT_PROVIDED_400: { statusCode: 400, message: "'quoteSlug' not provided." },
  NO_CURRENT_PRICES_FOUND_404: { statusCode: 404, message: 'Current prices not found.' },
  NO_PRICES_FOUND_404: (networkId: number, timestamp: number) => { return { statusCode: 404, message: `Prices not found for ${NETWORK_TICKERS_FROM_ID[networkId]} at timestamp ${timestamp}.` } },
  INVALID_QUOTE_SLUG_400: { statusCode: 400, message: 'Invalid quote slug.' },
  INVALID_TICKER_400: { statusCode: 400, message: 'Invalid ticker.' },
  MISSING_BLOCKCHAIN_CLIENT_400: { statusCode: 400, message: 'There is no blockchain client chosen for this network.' },
  NO_BLOCKCHAIN_CLIENT_INSTANTIATED_400: { statusCode: 400, message: 'Blockchain client was not instantiated.' },
  DEFAULT_WALLET_CANNOT_BE_DELETED_400: { statusCode: 400, message: 'A default wallet cannot be deleted.' },
  NO_USER_PROFILE_FOUND_404: { statusCode: 404, message: 'User profile not found.' },
  NO_USER_FOUND_404: { statusCode: 404, message: 'User not found.' },
  CACHED_PAYMENT_NOT_FOUND_404: { statusCode: 404, message: 'Cached payment not found.' },
  NO_CONTEXT_TO_INFER_USER_ADRESS_WALLET_400: { statusCode: 400, message: 'Trying to update the wallet for a user address without contex.' },
  NO_ADDRESS_FOUND_FOR_TRANSACTION_404: { statusCode: 404, message: 'No address found for transaction.' },
  FAILED_TO_UPSERT_TRANSACTION_500: { statusCode: 500, message: 'Failed to upsert transaction.' },
  BROADCAST_EMPTY_TX_400: { statusCode: 400, message: 'Could not broadcast empty transaction list.' },
  UNAUTHORIZED_403: { statusCode: 403, message: 'Unauthorized.' },
  COULD_NOT_BROADCAST_TX_TO_WS_SERVER_500: { statusCode: 500, message: 'Could not broadcast upcoming transaction to WS server.' },
  INVALID_PASSWORD_FORM_400: { statusCode: 400, message: 'Password form is invalid.' },
  WEAK_NEW_PASSWORD_400: { statusCode: 400, message: 'The new password must contain at least 8 characters, including a letter and a number.' },
  WRONG_PASSWORD_400: { statusCode: 400, message: 'Wrong password.' },
  INVALID_URL_400: { statusCode: 400, message: 'Invalid URL.' },
  INVALID_WEBSITE_URL_400: { statusCode: 400, message: 'Invalid website URL.' },
  POST_URL_AND_DATA_MUST_BE_SET_TOGETHER_400: { statusCode: 400, message: 'URL and post data must both be set.' },
  LIMIT_TRIGGERS_PER_BUTTON_400: { statusCode: 400, message: 'This paybutton already has a trigger.' },
  LIMIT_TRIGGERS_PER_BUTTON_ADDRESSES_400: { statusCode: 400, message: 'This paybutton addresses already have a trigger from another paybutton.' },
  COULD_NOT_EXECUTE_TRIGGER_500: { statusCode: 500, message: 'Failed to execute trigger for paybutton address.' },
  COULD_NOT_DOWNLOAD_FILE_500: { statusCode: 500, message: 'Failed to download file.' },
  INVALID_DATA_JSON_WITH_VARIABLES_400: (variables: string[]) => { return { statusCode: 400, message: `Data is not valid. Make sure that ${variables.join(', ')} are not inside quotes.` } },
  PAGE_SIZE_LIMIT_EXCEEDED_400: { statusCode: 400, message: `Page size limit should be at most ${TX_PAGE_SIZE_LIMIT}.` },
  PAGE_SIZE_AND_PAGE_SHOULD_BE_NUMBERS_400: { statusCode: 400, message: 'pageSize and page parameters should be valid integers.' },
  INVALID_OUTPUT_SCRIPT_LENGTH_500: (l: number) => { return { statusCode: 500, message: `Invalid outputScript length ${l}` } },
  FAILED_TO_PARSE_TX_OP_RETURN_500: { statusCode: 500, message: 'Failed to parse OP_RETURN data in Tx.' },
  METHOD_NOT_ALLOWED: { statusCode: 500, message: 'Method not allowed.' }
}

export const SOCKET_MESSAGES = {
  INCOMING_TXS: 'incoming-txs',
  TXS_BROADCAST: 'txs-broadcast',
  GET_ALTPAYMENT_RATE: 'get-altpayment-rate',
  SEND_ALTPAYMENT_RATE: 'send-altpayment-rate',
  SEND_ALTPAYMENT_COINS_INFO: 'send-altpayment-coins-info',
  CREATE_ALTPAYMENT_QUOTE: 'create-altpayment-quote',
  SHIFT_CREATED: 'shift-created',
  ERROR_WHEN_CREATING_QUOTE: 'quote-creation-error',
  ERROR_WHEN_CREATING_SHIFT: 'shift-creation-error'
}

export type KeyValueT<T> = Record<string, T>

export const NETWORK_SLUGS: KeyValueT<string> = {
  ecash: 'ecash',
  bitcoincash: 'bitcoincash',
  ectest: 'ectest',
  bchtest: 'bchtest',
  bchreg: 'bchreg'
}
export const NETWORK_IDS_FROM_SLUGS: KeyValueT<number> = {
  ecash: 1,
  bitcoincash: 2
}

// When fetching some address transactions, number of transactions to fetch at a time.
// On chronik, the max allowed is 200
export const FETCH_N = 200

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

export const HUMAN_READABLE_DATE_FORMAT = 'YYYY-MM-DD'

export const PRICE_API_DATE_FORMAT = 'YYYY-MM-DD'
export const PRICE_API_TIMEOUT = 40 * 1000 // 40 seconds
export const PRICE_API_MAX_RETRIES = 3

export const SYNC_TXS_JOBS_MAX_RETRIES = 3
export const SYNC_TXS_JOBS_RETRY_DELAY = 2000

export const BCH_TIMESTAMP_THRESHOLD = 1501588800 // 2017 Aug 1, 12PM
export const XEC_TIMESTAMP_THRESHOLD = 1605398400 // 2020 Nov 15, 12AM

export const DEFAULT_WORKER_LOCK_DURATION = 120000
// Wait time (in ms) between sync of current prices
export const CURRENT_PRICE_REPEAT_DELAY = 60000

export const NETWORK_TICKERS: KeyValueT<string> = {
  ecash: 'XEC',
  bitcoincash: 'BCH'
}

export const NETWORK_TICKERS_FROM_ID: KeyValueT<string> = {
  1: 'XEC',
  2: 'BCH'
}

export const NETWORK_IDS: KeyValueT<number> = { XEC: 1, BCH: 2 }
export const QUOTE_IDS: KeyValueT<number> = { USD: 1, CAD: 2 }

export type BLOCKCHAIN_CLIENT_OPTIONS = 'grpc' | 'chronik'
export const NETWORK_BLOCKCHAIN_CLIENTS: KeyValueT<BLOCKCHAIN_CLIENT_OPTIONS> = {
  ecash: 'chronik',
  bitcoincash: 'grpc'
}

export const UPSERT_TRANSACTION_PRICES_ON_DB_TIMEOUT = 45000
export const DEFAULT_TX_PAGE_SIZE = 100

export const PAYMENT_WEEK_KEY_FORMAT = 'YYYY:WW'

export const PRIMARY_XEC_COLOR = '#0074C2'
export const SECONDARY_XEC_COLOR = '#FFFFFF'
export const TERTIARY_XEC_COLOR = '#231f20'
export const PRIMARY_BCH_COLOR = '#4bc846'
export const SECONDARY_BCH_COLOR = '#FFFFFF'
export const TERTIARY_BCH_COLOR = '#231f20'

export const BLOCKED_ADDRESSES: string[] = []

export const NO_LAYOUT_ROUTES = [
  '/'
]

export const COOKIE_NAMES = {
  DASHBOARD_FILTER: 'dashboardFilter'
}

export const DEFAULT_EMPTY_TABLE_MESSAGE = 'No rows to show.'

export const CHRONIK_MESSAGE_CACHE_DELAY = 3000

export const TRIGGER_POST_VARIABLES = [
  '<address>',
  '<amount>',
  '<buttonName>',
  '<currency>',
  '<opReturn>',
  '<signature>',
  '<timestamp>',
  '<txId>'
]

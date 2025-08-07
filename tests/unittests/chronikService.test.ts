import { EMPTY_OP_RETURN } from 'utils/validators'
import { 
  getNullDataScriptData,
  fromHash160,
  toHash160,
  outputScriptToAddress,
  ChronikBlockchainClient,
  multiBlockchainClient
} from '../../services/chronikService'

// Set up environment variables before any imports
process.env.WS_AUTH_KEY = 'test-auth-key'

// Mock the heavy dependencies to avoid network calls in tests
jest.mock('chronik-client-cashtokens', () => ({
  ChronikClient: {
    useStrategy: jest.fn().mockResolvedValue({
      ws: jest.fn().mockReturnValue({
        waitForOpen: jest.fn(),
        subscribeToBlocks: jest.fn(),
        subs: { scripts: [] }
      })
    })
  },
  ConnectionStrategy: {
    ClosestFirst: 'ClosestFirst'
  }
}))

jest.mock('socket.io-client', () => {
  return jest.fn(() => ({
    emit: jest.fn()
  }))
})

jest.mock('config', () => ({
  networkBlockchainURLs: {
    ecash: ['https://xec.paybutton.org'],
    bitcoincash: ['https://bch.paybutton.org']
  },
  wsBaseURL: 'localhost:5000'
}))

// Mock all the services that might be called during initialization
jest.mock('../../services/addressService', () => ({
  fetchAllAddressesForNetworkId: jest.fn().mockResolvedValue([]),
  fetchAddressBySubstring: jest.fn(),
  fetchAddressesArray: jest.fn(),
  getEarliestUnconfirmedTxTimestampForAddress: jest.fn(),
  getLatestConfirmedTxTimestampForAddress: jest.fn(),
  setSyncing: jest.fn(),
  updateLastSynced: jest.fn()
}))

jest.mock('../../services/transactionService', () => ({
  createManyTransactions: jest.fn(),
  deleteTransactions: jest.fn(),
  fetchUnconfirmedTransactions: jest.fn(),
  upsertTransaction: jest.fn(),
  getSimplifiedTransactions: jest.fn(),
  getSimplifiedTrasaction: jest.fn(),
  connectAllTransactionsToPrices: jest.fn()
}))

jest.mock('../../services/priceService', () => ({
  syncPastDaysNewerPrices: jest.fn()
}))

jest.mock('../../services/triggerService', () => ({
  executeAddressTriggers: jest.fn()
}))

jest.mock('../../prisma/seeds/transactions', () => ({
  appendTxsToFile: jest.fn()
}))

jest.mock('../../prisma/seeds/addresses', () => ({
  productionAddresses: []
}))

describe('getNullDataScriptData tests', () => {
  it('Null for empty OP_RETURN', async () => {
    const script = '6a' + ''
    const data = getNullDataScriptData(script)
    expect(data).toBe(null)
  })
  it('Null for protocol only', async () => {
    const script = '6a' + '04' + '50415900' + ''
    const data = getNullDataScriptData(script)
    expect(data).toBe(null)
  })
  it('Null for protocol and version only', async () => {
    const script = '6a' + '04' + '50415900' + '00' + ''
    const data = getNullDataScriptData(script)
    expect(data).toBe(null)
  })
  it('Null for protocol, version, pushdata but no data', async () => {
    const script = '6a' + '04' + '50415900' + '00' + '08'
    const data = getNullDataScriptData(script)
    expect(data).toBe(null)
  })
  it('Null for protocol, version, pushdata but truncated data', async () => {
    const script = '6a' + '04' + '50415900' + '00' + '08' + '00010203040506'
    const data = getNullDataScriptData(script)
    expect(data).toBe(null)
  })
  it('Empty if data explicitly empty', async () => {
    const script = '6a' + '04' + '50415900' + '00' + '00'
    const data = getNullDataScriptData(script)
    expect(data).toStrictEqual(EMPTY_OP_RETURN)
  })
  it('Empty if data explicitly empty and paymentId too', async () => {
    const script = '6a' + '04' + '50415900' + '00' + '00' + '00'
    const data = getNullDataScriptData(script)
    expect(data).toStrictEqual(EMPTY_OP_RETURN)
  })
  it('Null if wrong protocol', async () => {
    const script = '6a' + '04' + '50415901' + '00' + '02' + 'aabb'
    const data = getNullDataScriptData(script)
    expect(data).toStrictEqual(null)
  })
  it('String data', async () => {
    const script = '6a' + '04' + '50415900' + '00' + '08' + '5051525354555657'
    const data = getNullDataScriptData(script)
    expect(data).toStrictEqual({
      paymentId: '',
      message: 'PQRSTUVW',
      rawMessage: 'PQRSTUVW'
    })
  })
  it('Array data', async () => {
    const script = '6a' + '04' + '50415900' + '00' + '0b' + '6974656d317c6974656d32'
    const data = getNullDataScriptData(script)
    expect(data).toStrictEqual({
      paymentId: '',
      message: ['item1', 'item2'],
      rawMessage: 'item1|item2'
    })
  })
  it('Dict data', async () => {
    const script = '6a' + '04' + '50415900' + '00' + '14' + '6b65793d76616c756520736f6d653d6f74686572'
    const data = getNullDataScriptData(script)
    expect(data).toStrictEqual({
      paymentId: '',
      message: {
        key: 'value',
        some: 'other'
      },
      rawMessage: 'key=value some=other'
    })
  })
  it('Dict with array', async () => {
    const script = '6a' + '04' + '50415900' + '00' + '1c' + '6b65793d76616c756520736f6d653d76616c7565317c76616c756532'
    const data = getNullDataScriptData(script)
    expect(data).toStrictEqual({
      paymentId: '',
      message: {
        key: 'value',
        some: ['value1', 'value2']
      },
      rawMessage: 'key=value some=value1|value2'
    })
  })
  it('Non-ASCII data', async () => {
    const script = (
      '6a' + '04' + '50415900' + '00' + '3e' +
      'f09f9882f09f918dc2a9c4b8c3b0d09cd0b6d0aad18b2520c58bc3a650c39fc491c4b8c582e2809ec2bbe2809cc3a67dc2b9e28693c2a3c2b3e28692c2b2'
    )
    const data = getNullDataScriptData(script)
    expect(data).toStrictEqual({
      paymentId: '',
      message: '😂👍©ĸðМжЪы% ŋæPßđĸł„»“æ}¹↓£³→²',
      rawMessage: '😂👍©ĸðМжЪы% ŋæPßđĸł„»“æ}¹↓£³→²'
    })
  })
  it('Non-ASCII data with paymentId', async () => {
    const script = ('6a' + '04' + '50415900' + '00' + '3e' +
      'f09f9882f09f918dc2a9c4b8c3b0d09cd0b6d0aad18b2520c58bc3a650c39fc491c4b8c582e2809ec2bbe2809cc3a67dc2b9e28693c2a3c2b3e28692c2b2' +
      '08' + 'ab192bcafd745acd'
    )
    const data = getNullDataScriptData(script)
    expect(data).toStrictEqual({
      paymentId: 'ab192bcafd745acd',
      message: '😂👍©ĸðМжЪы% ŋæPßđĸł„»“æ}¹↓£³→²',
      rawMessage: '😂👍©ĸðМжЪы% ŋæPßđĸł„»“æ}¹↓£³→²'
    })
  })
  it('String data with paymentId', async () => {
    const script = '6a' + '04' + '50415900' + '00' + '08' + '5051525354555657' + '03' + '010203'
    const data = getNullDataScriptData(script)
    expect(data).toStrictEqual({
      paymentId: '010203',
      message: 'PQRSTUVW',
      rawMessage: 'PQRSTUVW'
    })
  })
  it('String data with explicitly empty paymentId', async () => {
    const script = '6a' + '04' + '50415900' + '00' + '08' + '5051525354555657' + '00'
    const data = getNullDataScriptData(script)
    expect(data).toStrictEqual({
      paymentId: '',
      message: 'PQRSTUVW',
      rawMessage: 'PQRSTUVW'
    })
  })
  it('Ignore incomplete paymentId', async () => {
    const script = '6a' + '04' + '50415900' + '00' + '08' + '5051525354555657' + '03' + 'aabb'
    const data = getNullDataScriptData(script)
    expect(data).toStrictEqual({
      paymentId: '',
      message: 'PQRSTUVW',
      rawMessage: 'PQRSTUVW'
    })
  })
})

describe('fromHash160 tests', () => {
  it('Should convert XEC hash160 to address', () => {
    // Valid 20-byte hash160 (40 hex chars)
    const result = fromHash160('ecash', 'p2pkh', 'c5d2460186f7233c927e7db2dcc703c0e500b653')
    expect(result).toMatch(/^ecash:/)
  })

  it('Should convert BCH hash160 to address', () => {
    // Valid 20-byte hash160 (40 hex chars)
    const result = fromHash160('bitcoincash', 'p2pkh', 'c5d2460186f7233c927e7db2dcc703c0e500b653')
    expect(result).toMatch(/^bitcoincash:/)
  })

  it('Should handle p2sh addresses', () => {
    // Valid 20-byte hash160 (40 hex chars)
    const result = fromHash160('ecash', 'p2sh', 'c5d2460186f7233c927e7db2dcc703c0e500b653')
    expect(result).toMatch(/^ecash:/)
  })
})

describe('toHash160 tests', () => {
  it('Should convert XEC address to hash160', () => {
    // Generate a valid XEC address first, then convert it back
    const testHash160 = 'c5d2460186f7233c927e7db2dcc703c0e500b653' // 40 chars
    const address = fromHash160('ecash', 'p2pkh', testHash160)
    const result = toHash160(address)
    expect(result).toHaveProperty('type', 'p2pkh')
    expect(result).toHaveProperty('hash160')
    expect(result.hash160).toHaveLength(40) // Should be 40 hex chars (20 bytes)
    expect(result.hash160).toMatch(/^[0-9a-f]+$/) // Should be valid hex
  })

  it('Should convert BCH address to hash160', () => {
    // Generate a valid BCH address first, then convert it back
    const testHash160 = 'c5d2460186f7233c927e7db2dcc703c0e500b653' // 40 chars
    const address = fromHash160('bitcoincash', 'p2pkh', testHash160)
    const result = toHash160(address)
    expect(result).toHaveProperty('type', 'p2pkh')
    expect(result).toHaveProperty('hash160')
    expect(result.hash160).toHaveLength(40) // Should be 40 hex chars (20 bytes)
    expect(result.hash160).toMatch(/^[0-9a-f]+$/) // Should be valid hex
  })

  it('Should maintain round-trip consistency', () => {
    // Test that fromHash160 -> toHash160 maintains consistency
    const originalHash160 = 'c5d2460186f7233c927e7db2dcc703c0e500b653' // 40 chars
    const address = fromHash160('ecash', 'p2pkh', originalHash160)
    const result = toHash160(address)
    
    // The hash160 should convert back to the same address
    const addressAgain = fromHash160('ecash', result.type, result.hash160)
    expect(addressAgain).toBe(address)
  })

  it('Should throw error for invalid address', () => {
    expect(() => {
      toHash160('invalid-address')
    }).toThrow()
  })
})

describe('outputScriptToAddress tests', () => {
  it('Should convert P2PKH output script to address', () => {
    // Create a valid P2PKH output script: OP_DUP OP_HASH160 <20-byte hash> OP_EQUALVERIFY OP_CHECKSIG
    // 76a914 + 40-char hash160 + 88ac
    const hash160 = 'c5d2460186f7233c927e7db2dcc703c0e500b653' // 40 chars
    const outputScript = '76a914' + hash160 + '88ac'
    const result = outputScriptToAddress('ecash', outputScript)
    expect(result).toBeDefined()
    expect(result).toMatch(/^ecash:/)
  })

  it('Should convert P2SH output script to address', () => {
    // Create a valid P2SH output script: OP_HASH160 <20-byte hash> OP_EQUAL
    // a914 + 40-char hash160 + 87
    const hash160 = 'c5d2460186f7233c927e7db2dcc703c0e500b653' // 40 chars
    const outputScript = 'a914' + hash160 + '87'
    const result = outputScriptToAddress('ecash', outputScript)
    expect(result).toMatch(/^ecash:/)
  })

  it('Should return undefined for invalid output script', () => {
    const result = outputScriptToAddress('ecash', '1234invalid')
    expect(result).toBeUndefined()
  })

  it('Should return undefined for undefined output script', () => {
    const result = outputScriptToAddress('ecash', undefined)
    expect(result).toBeUndefined()
  })

  it('Should return undefined for wrong hash160 length', () => {
    // Hash160 too long (42 chars instead of 40)
    const outputScript = '76a914c5d2460186f7233c927e7db2dcc703c0e500b653d2088ac'
    const result = outputScriptToAddress('ecash', outputScript)
    expect(result).toBeUndefined()
  })

  it('Should handle BCH network', () => {
    // Create a valid P2PKH output script for BCH
    const hash160 = 'c5d2460186f7233c927e7db2dcc703c0e500b653' // 40 chars
    const outputScript = '76a914' + hash160 + '88ac'
    const result = outputScriptToAddress('bitcoincash', outputScript)
    expect(result).toMatch(/^bitcoincash:/)
  })
})

// Mock environment variables for ChronikBlockchainClient tests
const originalEnv = process.env

describe('ChronikBlockchainClient tests', () => {
  beforeEach(() => {
    jest.resetModules()
    process.env = { ...originalEnv }
    process.env.WS_AUTH_KEY = 'test-auth-key'
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('Should create instance when WS_AUTH_KEY is present', () => {
    process.env.WS_AUTH_KEY = 'test-auth-key'
    const client = new ChronikBlockchainClient('ecash')
    expect(client).toBeDefined()
  })

  it('Should create instance for bitcoincash network', () => {
    process.env.WS_AUTH_KEY = 'test-auth-key'
    const client = new ChronikBlockchainClient('bitcoincash')
    expect(client).toBeDefined()
  })

  it('Should handle async initialization', async () => {
    process.env.WS_AUTH_KEY = 'test-auth-key'
    const client = new ChronikBlockchainClient('ecash')
    expect(client).toBeDefined()
    // The async initialization happens in the background
    // We can't easily test the async error without mocking more deeply
  })
})

describe('getNullDataScriptData edge cases', () => {
  it('Should throw error for invalid output script length (odd length)', () => {
    expect(() => {
      getNullDataScriptData('6a0')
    }).toThrow('Invalid outputScript length 3')
  })

  it('Should throw error for too short output script', () => {
    expect(() => {
      getNullDataScriptData('6')
    }).toThrow('Invalid outputScript length 1')
  })

  it('Should handle 4c push data prefix', () => {
    // Test with 4c prefix for larger data pushes
    const script = '6a' + '04' + '50415900' + '00' + '4c' + '08' + '5051525354555657'
    const data = getNullDataScriptData(script)
    expect(data).toStrictEqual({
      paymentId: '',
      message: 'PQRSTUVW',
      rawMessage: 'PQRSTUVW'
    })
  })
})

describe('MultiBlockchainClient tests', () => {
  it('Should have multiBlockchainClient instance', () => {
    expect(multiBlockchainClient).toBeDefined()
  })

  it('Should have waitForStart method', () => {
    expect(multiBlockchainClient.waitForStart).toBeDefined()
    expect(typeof multiBlockchainClient.waitForStart).toBe('function')
  })

  it('Should have getUrls method', () => {
    expect(multiBlockchainClient.getUrls).toBeDefined()
    expect(typeof multiBlockchainClient.getUrls).toBe('function')
  })

  it('Should have getAllSubscribedAddresses method', () => {
    expect(multiBlockchainClient.getAllSubscribedAddresses).toBeDefined()
    expect(typeof multiBlockchainClient.getAllSubscribedAddresses).toBe('function')
  })

  it('Should have subscribeAddresses method', () => {
    expect(multiBlockchainClient.subscribeAddresses).toBeDefined()
    expect(typeof multiBlockchainClient.subscribeAddresses).toBe('function')
  })

  it('Should have syncAddresses method', () => {
    expect(multiBlockchainClient.syncAddresses).toBeDefined()
    expect(typeof multiBlockchainClient.syncAddresses).toBe('function')
  })

  it('Should have getTransactionDetails method', () => {
    expect(multiBlockchainClient.getTransactionDetails).toBeDefined()
    expect(typeof multiBlockchainClient.getTransactionDetails).toBe('function')
  })

  it('Should have getLastBlockTimestamp method', () => {
    expect(multiBlockchainClient.getLastBlockTimestamp).toBeDefined()
    expect(typeof multiBlockchainClient.getLastBlockTimestamp).toBe('function')
  })

  it('Should have getBalance method', () => {
    expect(multiBlockchainClient.getBalance).toBeDefined()
    expect(typeof multiBlockchainClient.getBalance).toBe('function')
  })

  it('Should have syncAndSubscribeAddresses method', () => {
    expect(multiBlockchainClient.syncAndSubscribeAddresses).toBeDefined()
    expect(typeof multiBlockchainClient.syncAndSubscribeAddresses).toBe('function')
  })
})

describe('Additional edge cases and error conditions', () => {
  it('Should handle empty string in getNullDataScriptData', () => {
    expect(() => {
      getNullDataScriptData('')
    }).toThrow('Invalid outputScript length 0')
  })

  it('Should return null for non-PAY protocol in getNullDataScriptData', () => {
    // Using different protocol identifier
    const script = '6a' + '04' + '50415901' + '00' + '08' + '5051525354555657'
    const data = getNullDataScriptData(script)
    expect(data).toBe(null)
  })

  it('Should handle outputScriptToAddress with empty string', () => {
    const result = outputScriptToAddress('ecash', '')
    expect(result).toBeUndefined()
  })

  it('Should handle outputScriptToAddress with non-standard script types', () => {
    // Script that doesn't start with 76a9 or a914
    const result = outputScriptToAddress('ecash', '1234567890abcdef')
    expect(result).toBeUndefined()
  })

  it('Should handle fromHash160 with invalid network slug', () => {
    expect(() => {
      fromHash160('invalid-network', 'p2pkh', 'c5d2460186f7233c927e7db2dcc703c0e500b653d2')
    }).toThrow()
  })

  it('Should handle toHash160 with legacy address format', () => {
    // Test with a legacy Bitcoin address format (should fail)
    expect(() => {
      toHash160('1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2')
    }).toThrow()
  })

  it('Should handle outputScriptToAddress with malformed P2PKH script', () => {
    // Missing 88ac at the end
    const outputScript = '76a914c5d2460186f7233c927e7db2dcc703c0e500b653d2'
    const result = outputScriptToAddress('ecash', outputScript)
    expect(result).toBeUndefined()
  })

  it('Should handle outputScriptToAddress with malformed P2SH script', () => {
    // Missing 87 at the end
    const outputScript = 'a914c5d2460186f7233c927e7db2dcc703c0e500b653d2'
    const result = outputScriptToAddress('ecash', outputScript)
    expect(result).toBeUndefined()
  })

  it('Should handle getNullDataScriptData with truncated script after protocol', () => {
    // Script ends abruptly after protocol
    const script = '6a' + '04' + '50415900'
    const data = getNullDataScriptData(script)
    expect(data).toBe(null)
  })

  it('Should handle getNullDataScriptData with case insensitive protocol matching', () => {
    // Test with uppercase hex
    const script = '6A' + '04' + '50415900' + '00' + '08' + '5051525354555657'
    const data = getNullDataScriptData(script)
    expect(data).toStrictEqual({
      paymentId: '',
      message: 'PQRSTUVW',
      rawMessage: 'PQRSTUVW'
    })
  })

  it('Should handle outputScriptToAddress with wrong hash length in P2PKH', () => {
    // Hash160 should be 40 chars (20 bytes), this is 42 chars (21 bytes)
    const outputScript = '76a914c5d2460186f7233c927e7db2dcc703c0e500b653d2088ac'
    const result = outputScriptToAddress('ecash', outputScript)
    expect(result).toBeUndefined()
  })

  it('Should handle outputScriptToAddress with wrong hash length in P2SH', () => {
    // Hash160 should be 40 chars (20 bytes), this is 38 chars (19 bytes)
    const outputScript = 'a914c5d2460186f7233c927e7db2dcc703c0e500b6587'
    const result = outputScriptToAddress('ecash', outputScript)
    expect(result).toBeUndefined()
  })
})

describe('Additional coverage tests', () => {
  it('Should handle getNullDataScriptData with version byte variations', () => {
    // Test with different version byte (not 00)
    const script = '6a' + '04' + '50415900' + '01' + '08' + '5051525354555657'
    const data = getNullDataScriptData(script)
    expect(data).toStrictEqual({
      paymentId: '',
      message: 'PQRSTUVW',
      rawMessage: 'PQRSTUVW'
    })
  })

  it('Should handle very short hash160 in outputScriptToAddress', () => {
    // Hash160 too short (less than 40 chars) - 38 chars
    const outputScript = '76a914c5d2460186f7233c927e7db2dcc703c0e500b653d88ac'
    const result = outputScriptToAddress('ecash', outputScript)
    expect(result).toBeUndefined()
  })

  it('Should handle P2SH script with wrong suffix', () => {
    // P2SH script ending with wrong byte (not 87) - valid length but wrong suffix
    const outputScript = 'a914c5d2460186f7233c927e7db2dcc703c0e500b653d88'
    const result = outputScriptToAddress('ecash', outputScript)
    expect(result).toBeUndefined()
  })

  it('Should handle getNullDataScriptData with zero-length payment ID', () => {
    // Explicit zero-length payment ID
    const script = '6a' + '04' + '50415900' + '00' + '08' + '5051525354555657' + '00'
    const data = getNullDataScriptData(script)
    expect(data).toStrictEqual({
      paymentId: '',
      message: 'PQRSTUVW',
      rawMessage: 'PQRSTUVW'
    })
  })

  it('Should handle getNullDataScriptData with maximum valid hex values', () => {
    // Test with all F's in hex data
    const script = '6a' + '04' + '50415900' + '00' + '04' + 'FFFFFFFF'
    const data = getNullDataScriptData(script)
    expect(data).toHaveProperty('message')
    expect(data).toHaveProperty('rawMessage')
    expect(data).toHaveProperty('paymentId', '')
  })

  it('Should handle toHash160 error logging', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
    
    expect(() => {
      toHash160('definitely-invalid-address-format')
    }).toThrow()
    
    expect(consoleSpy).toHaveBeenCalledWith('[CHRONIK]: Error converting address to hash160')
    consoleSpy.mockRestore()
  })
})

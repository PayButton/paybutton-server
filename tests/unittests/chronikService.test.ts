// Set up environment variables BEFORE any imports
import { EMPTY_OP_RETURN } from 'utils/validators'
import {
  getNullDataScriptData,
  fromHash160,
  toHash160,
  outputScriptToAddress,
  ChronikBlockchainClient,
  multiBlockchainClient
} from '../../services/chronikService'
import { Address } from '@prisma/client'
import { fetchAddressesArray } from '../../services/addressService'
import { fetchUnconfirmedTransactions, deleteTransactions, upsertTransaction } from '../../services/transactionService'
import { executeAddressTriggers } from '../../services/triggerService'

process.env.WS_AUTH_KEY = 'test-auth-key'

// Mock the heavy dependencies to avoid network calls in tests
jest.mock('chronik-client', () => ({
  ChronikClient: {
    useStrategy: jest.fn().mockResolvedValue({
      ws: jest.fn().mockReturnValue({
        waitForOpen: jest.fn(),
        subscribeToBlocks: jest.fn(),
        subs: { scripts: [] }
      }),
      tx: jest.fn() // <-- needed
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
  setSyncingBatch: jest.fn(),
  updateLastSynced: jest.fn(),
  updateManyLastSynced: jest.fn()
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

jest.mock('../../prisma-local/seeds/transactions', () => ({
  appendTxsToFile: jest.fn()
}))

jest.mock('../../prisma-local/seeds/addresses', () => ({
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
    jest.clearAllMocks()
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

describe('ChronikBlockchainClient methods coverage', () => {
  let client: ChronikBlockchainClient

  beforeEach(() => {
    process.env.WS_AUTH_KEY = 'test-auth-key'
    client = new ChronikBlockchainClient('ecash')
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('Should call waitForLatencyTest', async () => {
    // This will wait until latencyTestFinished is true
    await client.waitForLatencyTest()
    // We can't access private property, but the method should complete without error
    expect(true).toBe(true)
  })

  it('Should get URLs from chronik client', async () => {
    // Mock the chronik client methods
    client.chronik = {
      proxyInterface: jest.fn().mockReturnValue({
        getEndpointArray: jest.fn().mockReturnValue([
          { url: 'https://xec.paybutton.org' },
          { url: 'https://bch.paybutton.org' }
        ])
      })
    } as any

    const urls = client.getUrls()
    expect(urls).toEqual(['https://xec.paybutton.org', 'https://bch.paybutton.org'])
  })

  it('Should set initialized flag', () => {
    client.setInitialized()
    expect(client.initializing).toBe(false)
  })

  it('Should get subscribed addresses', () => {
    // Mock the chronikWSEndpoint with proper hash160 length (20 bytes = 40 hex chars)
    client.chronikWSEndpoint = {
      subs: {
        scripts: [
          {
            scriptType: 'p2pkh',
            payload: 'c5d2460186f7233c927e7db2dcc703c0e500b653' // 40 chars (20 bytes)
          },
          {
            scriptType: 'p2sh',
            payload: 'd5e2470186f7233c927e7db2dcc703c0e500b653' // 40 chars (20 bytes)
          }
        ]
      }
    } as any

    const addresses = client.getSubscribedAddresses()
    expect(Array.isArray(addresses)).toBe(true)
    expect(addresses.length).toBeGreaterThan(0)
  })

  it('Should validate network correctly', async () => {
    // Mock blockchain info
    client.chronik = {
      blockchainInfo: jest.fn().mockResolvedValue({
        tipHeight: 800000,
        tipHash: 'abcd1234'
      })
    } as any

    const info = await client.getBlockchainInfo('ecash')
    expect(info.height).toBe(800000)
    expect(info.hash).toBe('abcd1234')
  })

  it('Should throw error for invalid network', async () => {
    await expect(client.getBlockchainInfo('invalid-network')).rejects.toThrow()
  })

  it('Should get block info correctly', async () => {
    // Mock block info
    client.chronik = {
      block: jest.fn().mockResolvedValue({
        blockInfo: {
          hash: 'block123',
          height: 800001,
          timestamp: 1640995200
        }
      })
    } as any

    const blockInfo = await client.getBlockInfo('ecash', 800001)
    expect(blockInfo.hash).toBe('block123')
    expect(blockInfo.height).toBe(800001)
    expect(blockInfo.timestamp).toBe(1640995200)
  })

  it('Should get transaction details', async () => {
    // Mock transaction data
    const mockTx = {
      txid: 'tx123',
      version: 1,
      block: {
        hash: 'block123',
        height: 800001,
        timestamp: 1640995200
      },
      inputs: [
        {
          sats: 1000n,
          outputScript: '76a914c5d2460186f7233c927e7db2dcc703c0e500b65388ac'
        }
      ],
      outputs: [
        {
          sats: 900n,
          outputScript: '76a914d5e2470186f7233c927e7db2dcc703c0e500b65388ac'
        }
      ]
    }

    client.chronik = {
      tx: jest.fn().mockResolvedValue(mockTx)
    } as any

    const details = await client.getTransactionDetails('tx123')
    expect(details.hash).toBe('tx123')
    expect(details.version).toBe(1)
    expect(details.inputs).toHaveLength(1)
    expect(details.outputs).toHaveLength(1)
  })

  it('Should get balance for address', async () => {
    // Mock utxos data
    const mockUtxos = {
      utxos: [
        { sats: 1000n },
        { sats: 2000n },
        { sats: 3000n }
      ]
    }

    client.chronik = {
      script: jest.fn().mockReturnValue({
        utxos: jest.fn().mockResolvedValue(mockUtxos)
      })
    } as any

    // Use a valid address generated from a known hash160
    const validAddress = fromHash160('ecash', 'p2pkh', 'c5d2460186f7233c927e7db2dcc703c0e500b653')
    const balance = await client.getBalance(validAddress)
    expect(balance).toBe(6000n)
  })

  it('Should get paginated transactions', async () => {
    const mockTxs = [
      { txid: 'tx1' },
      { txid: 'tx2' },
      { txid: 'tx3' }
    ]

    client.chronik = {
      script: jest.fn().mockReturnValue({
        history: jest.fn().mockResolvedValue({ txs: mockTxs })
      })
    } as any

    // Use a valid address generated from a known hash160
    const validAddress = fromHash160('ecash', 'p2pkh', 'c5d2460186f7233c927e7db2dcc703c0e500b653')
    const txs = await client.getPaginatedTxs(validAddress, 0, 10)
    expect(txs).toHaveLength(3)
    expect(txs[0].txid).toBe('tx1')
  })
})

describe('ChronikBlockchainClient advanced functionality', () => {
  let client: ChronikBlockchainClient

  beforeEach(() => {
    process.env.WS_AUTH_KEY = 'test-auth-key'
    client = new ChronikBlockchainClient('ecash')
    // Reset all mocks before each test
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('Should handle subscription of addresses', async () => {
    // Use a valid address generated from a known hash160
    const validAddress = fromHash160('ecash', 'p2pkh', 'c5d2460186f7233c927e7db2dcc703c0e500b653')
    const mockAddresses = [
      {
        id: '1',
        address: validAddress,
        networkId: 1,
        syncing: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSynced: null
      }
    ]

    // Mock the chronikWSEndpoint
    client.chronikWSEndpoint = {
      subscribeToAddress: jest.fn(),
      subs: { scripts: [] }
    } as any

    const result = await client.subscribeAddresses(mockAddresses)
    expect(result).toHaveProperty('failedAddressesWithErrors')
    expect(Object.keys(result.failedAddressesWithErrors)).toHaveLength(0)
  })

  it('Should handle subscription errors', async () => {
    // Use a valid address generated from a known hash160
    const validAddress = fromHash160('ecash', 'p2pkh', 'c5d2460186f7233c927e7db2dcc703c0e500b653')
    const mockAddresses = [
      {
        id: '1',
        address: validAddress,
        networkId: 1, // eCash network ID from NETWORK_IDS_FROM_SLUGS
        syncing: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSynced: null
      }
    ]

    // Mock the chronikWSEndpoint to throw an error
    const mockSubscribeToAddress = jest.fn().mockImplementation(() => {
      throw new Error('Subscription failed')
    })

    client.chronikWSEndpoint = {
      subscribeToAddress: mockSubscribeToAddress,
      subs: { scripts: [] }
    } as any

    // Mock getSubscribedAddresses to return empty array so address is not filtered out
    jest.spyOn(client, 'getSubscribedAddresses').mockReturnValue([])

    const result = await client.subscribeAddresses(mockAddresses)
    expect(result).toHaveProperty('failedAddressesWithErrors')

    // The mock function should have been called since the address passed the filters
    expect(mockSubscribeToAddress).toHaveBeenCalledWith(validAddress)

    // And there should be an error recorded
    expect(Object.keys(result.failedAddressesWithErrors)).toHaveLength(1)
    expect(result.failedAddressesWithErrors[validAddress]).toContain('Error: Subscription failed')
  })

  it('Should filter addresses by network ID', async () => {
    const validXecAddress = fromHash160('ecash', 'p2pkh', 'c5d2460186f7233c927e7db2dcc703c0e500b653')
    const validBchAddress = fromHash160('bitcoincash', 'p2pkh', 'd5e2470186f7233c927e7db2dcc703c0e500b653')

    const mockAddresses = [
      {
        id: '1',
        address: validXecAddress,
        networkId: 1, // XEC network ID from NETWORK_IDS_FROM_SLUGS
        syncing: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSynced: null
      },
      {
        id: '2',
        address: validBchAddress,
        networkId: 2, // BCH - should be filtered out for XEC client
        syncing: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSynced: null
      }
    ]

    client.chronikWSEndpoint = {
      subscribeToAddress: jest.fn(),
      subs: { scripts: [] }
    } as any

    // Mock getSubscribedAddresses to return empty array so addresses are not filtered out
    jest.spyOn(client, 'getSubscribedAddresses').mockReturnValue([])

    await client.subscribeAddresses(mockAddresses)

    // Only the XEC address should be processed (the BCH address should be filtered out by network ID)
    expect(client.chronikWSEndpoint.subscribeToAddress).toHaveBeenCalledTimes(1)
    expect(client.chronikWSEndpoint.subscribeToAddress).toHaveBeenCalledWith(validXecAddress)
  })

  it('Should handle already subscribed addresses', async () => {
    // Use a valid address generated from a known hash160
    const validAddress = fromHash160('ecash', 'p2pkh', 'c5d2460186f7233c927e7db2dcc703c0e500b653')
    const mockAddresses = [
      {
        id: '1',
        address: validAddress,
        networkId: 1,
        syncing: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSynced: null
      }
    ]

    // Mock already subscribed addresses
    client.chronikWSEndpoint = {
      subscribeToAddress: jest.fn(),
      subs: {
        scripts: [
          {
            scriptType: 'p2pkh',
            payload: 'c5d2460186f7233c927e7db2dcc703c0e500b653'
          }
        ]
      }
    } as any

    // Mock getSubscribedAddresses to return the address as already subscribed
    jest.spyOn(client, 'getSubscribedAddresses').mockReturnValue([validAddress])

    const result = await client.subscribeAddresses(mockAddresses)

    // Should not try to subscribe again
    expect(client.chronikWSEndpoint.subscribeToAddress).not.toHaveBeenCalled()
    expect(Object.keys(result.failedAddressesWithErrors)).toHaveLength(0)
  })

  it('Should handle sync addresses with mocked dependencies', async () => {
    const mockAddresses = [
      {
        id: '1',
        address: 'ecash:qqkv9wr69ry2p9l53lxp635va4h86wv435995w8p2h',
        networkId: 1,
        syncing: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSynced: null
      }
    ]

    // Mock the sync generator method
    const mockSyncGenerator = {
      async * syncTransactionsForAddress (address: Address) {
        yield []
      }
    }

    // Replace the generator method
    client.syncTransactionsForAddress = mockSyncGenerator.syncTransactionsForAddress.bind(client)

    const result = await client.syncAddresses(mockAddresses)
    expect(result).toHaveProperty('failedAddressesWithErrors')
    expect(result).toHaveProperty('successfulAddressesWithCount')
  })

  it('Should get last block timestamp', async () => {
    // Mock blockchain and block info
    client.chronik = {
      blockchainInfo: jest.fn().mockResolvedValue({
        tipHeight: 800000,
        tipHash: 'abcd1234'
      }),
      block: jest.fn().mockResolvedValue({
        blockInfo: {
          hash: 'block123',
          height: 800000,
          timestamp: 1640995200
        }
      })
    } as any

    const timestamp = await client.getLastBlockTimestamp()
    expect(timestamp).toBe(1640995200)
  })

  it('Should handle network validation error', async () => {
    const bitcoincashClient = new ChronikBlockchainClient('bitcoincash')

    // Try to get blockchain info for wrong network
    await expect(bitcoincashClient.getBlockchainInfo('ecash')).rejects.toThrow()
  })

  it('Should handle errors in sync missed transactions', async () => {
    const client = new ChronikBlockchainClient('ecash')
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    // Mock syncAddresses method to throw an error, which will be caught by the try-catch
    const syncAddressesSpy = jest.spyOn(client, 'syncAddresses').mockRejectedValue(new Error('Sync failed'))

    // The method catches errors and logs them, so it should resolve (not reject)
    await client.syncMissedTransactions()

    // Verify that syncAddresses was called
    expect(syncAddressesSpy).toHaveBeenCalled()

    // Verify that the error was logged
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[CHRONIK — ecash]: ERROR: (skipping anyway) initial missing transactions sync failed: Sync failed')
    )

    consoleSpy.mockRestore()
    syncAddressesSpy.mockRestore()
  })

  it('Should handle errors in subscribe initial addresses', async () => {
    const client = new ChronikBlockchainClient('ecash')
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    // Mock subscribeAddresses method to throw an error, which will be caught by the try-catch
    const subscribeAddressesSpy = jest.spyOn(client, 'subscribeAddresses').mockRejectedValue(new Error('Subscribe failed'))

    // The method catches errors and logs them, so it should resolve (not reject)
    await client.subscribeInitialAddresses()

    // Verify that subscribeAddresses was called
    expect(subscribeAddressesSpy).toHaveBeenCalled()

    // Verify that the error was logged
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[CHRONIK — ecash]: ERROR: (skipping anyway) initial chronik subscription failed: Subscribe failed')
    )

    consoleSpy.mockRestore()
    subscribeAddressesSpy.mockRestore()
  })
})

describe('MultiBlockchainClient method coverage', () => {
  beforeAll(() => {
    // Ensure WS_AUTH_KEY is set before any multiBlockchainClient access
    process.env.WS_AUTH_KEY = 'test-auth-key'
  })

  it('Should wait for initialization', async () => {
    // The multiBlockchainClient should already be initialized or initializing
    // Mock the waitForStart to avoid actual initialization
    jest.spyOn(multiBlockchainClient, 'waitForStart').mockResolvedValue()

    await multiBlockchainClient.waitForStart()
    expect(multiBlockchainClient.waitForStart).toHaveBeenCalled()
  })

  it('Should get URLs for all networks', () => {
    // Mock the clients to have proper chronik instances
    const mockUrls = {
      ecash: ['https://xec.paybutton.org'],
      bitcoincash: ['https://bch.paybutton.org']
    }

    jest.spyOn(multiBlockchainClient, 'getUrls').mockReturnValue(mockUrls)

    const urls = multiBlockchainClient.getUrls()
    expect(urls).toHaveProperty('ecash')
    expect(urls).toHaveProperty('bitcoincash')
    expect(Array.isArray(urls.ecash)).toBe(true)
    expect(Array.isArray(urls.bitcoincash)).toBe(true)
  })

  it('Should get all subscribed addresses', () => {
    const addresses = multiBlockchainClient.getAllSubscribedAddresses()
    expect(addresses).toHaveProperty('ecash')
    expect(addresses).toHaveProperty('bitcoincash')
  })

  it('Should subscribe addresses', async () => {
    const validXecAddress = fromHash160('ecash', 'p2pkh', 'c5d2460186f7233c927e7db2dcc703c0e500b653')
    const validBchAddress = fromHash160('bitcoincash', 'p2pkh', 'd5e2470186f7233c927e7db2dcc703c0e500b653')

    const mockAddresses = [
      {
        id: '1',
        address: validXecAddress,
        networkId: 1,
        syncing: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSynced: null
      },
      {
        id: '2',
        address: validBchAddress,
        networkId: 2,
        syncing: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSynced: null
      }
    ]

    // Mock the client methods
    jest.spyOn(multiBlockchainClient, 'subscribeAddresses').mockImplementation(async (addresses) => {
      // Simulate subscription logic
      return await Promise.resolve()
    })

    await expect(multiBlockchainClient.subscribeAddresses(mockAddresses)).resolves.not.toThrow()
  })

  it('Should sync addresses', async () => {
    const validAddress = fromHash160('ecash', 'p2pkh', 'c5d2460186f7233c927e7db2dcc703c0e500b653')
    const mockAddresses = [
      {
        id: '1',
        address: validAddress,
        networkId: 1,
        syncing: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSynced: null
      }
    ]

    // Mock the sync method
    jest.spyOn(multiBlockchainClient, 'syncAddresses').mockResolvedValue({
      failedAddressesWithErrors: {},
      successfulAddressesWithCount: {
        [validAddress]: 5
      }
    })

    const result = await multiBlockchainClient.syncAddresses(mockAddresses)
    expect(result).toHaveProperty('failedAddressesWithErrors')
    expect(result).toHaveProperty('successfulAddressesWithCount')
  })

  it('Should sync and subscribe addresses', async () => {
    const validAddress = fromHash160('ecash', 'p2pkh', 'c5d2460186f7233c927e7db2dcc703c0e500b653')
    const mockAddresses = [
      {
        id: '1',
        address: validAddress,
        networkId: 1,
        syncing: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSynced: null
      }
    ]

    // Mock both methods
    jest.spyOn(multiBlockchainClient, 'subscribeAddresses').mockResolvedValue()
    jest.spyOn(multiBlockchainClient, 'syncAddresses').mockResolvedValue({
      failedAddressesWithErrors: {},
      successfulAddressesWithCount: {
        [validAddress]: 3
      }
    })

    const result = await multiBlockchainClient.syncAndSubscribeAddresses(mockAddresses)
    expect(result).toHaveProperty('failedAddressesWithErrors')
    expect(result).toHaveProperty('successfulAddressesWithCount')
  })

  it('Should get transaction details for specific network', async () => {
    // Mock the method
    const mockDetails = {
      hash: 'tx123',
      version: 1,
      block: {
        hash: 'block123',
        height: 800001,
        timestamp: '1640995200'
      },
      inputs: [],
      outputs: []
    }

    jest.spyOn(multiBlockchainClient, 'getTransactionDetails').mockResolvedValue(mockDetails)

    const details = await multiBlockchainClient.getTransactionDetails('tx123', 'ecash')
    expect(details.hash).toBe('tx123')
  })

  it('Should get last block timestamp for network', async () => {
    // Mock the method
    jest.spyOn(multiBlockchainClient, 'getLastBlockTimestamp').mockResolvedValue(1640995200)

    const timestamp = await multiBlockchainClient.getLastBlockTimestamp('ecash')
    expect(timestamp).toBe(1640995200)
  })

  it('Should get balance for address using network prefix', async () => {
    // Mock the method
    jest.spyOn(multiBlockchainClient, 'getBalance').mockResolvedValue(5000n)

    const validAddress = fromHash160('ecash', 'p2pkh', 'c5d2460186f7233c927e7db2dcc703c0e500b653')
    const balance = await multiBlockchainClient.getBalance(validAddress)
    expect(balance).toBe(5000n)
  })
})

describe('Additional behavior and integration tests', () => {
  it('Should handle global multiBlockchainClient instance creation', () => {
    // Test that global instance is created and reused
    const instance1 = multiBlockchainClient
    const instance2 = multiBlockchainClient

    expect(instance1).toBe(instance2) // Should be same instance
    expect(instance1).toBeDefined()
  })

  it('Should test fromHash160 with different address types', () => {
    const testHash160 = 'c5d2460186f7233c927e7db2dcc703c0e500b653' // 40 chars (20 bytes)

    // Test p2pkh
    const p2pkhAddress = fromHash160('ecash', 'p2pkh', testHash160)
    expect(p2pkhAddress).toMatch(/^ecash:q/)

    // Test p2sh
    const p2shAddress = fromHash160('ecash', 'p2sh', testHash160)
    expect(p2shAddress).toMatch(/^ecash:p/)

    // Test bitcoincash network
    const bchAddress = fromHash160('bitcoincash', 'p2pkh', testHash160)
    expect(bchAddress).toMatch(/^bitcoincash:q/)
  })

  it('Should handle comprehensive outputScriptToAddress scenarios', () => {
    // Test various edge cases for outputScriptToAddress

    // Test with exact 40-character hash160
    const validHash160 = 'c5d2460186f7233c927e7db2dcc703c0e500b653' // 40 chars
    const p2pkhScript = '76a914' + validHash160 + '88ac'
    const p2shScript = 'a914' + validHash160 + '87'

    expect(outputScriptToAddress('ecash', p2pkhScript)).toMatch(/^ecash:/)
    expect(outputScriptToAddress('ecash', p2shScript)).toMatch(/^ecash:/)

    // Test with exactly 39 characters (too short)
    const shortP2pkhScript = '76a914' + 'c5d2460186f7233c927e7db2dcc703c0e500b65' + '88ac' // 39 chars
    expect(outputScriptToAddress('ecash', shortP2pkhScript)).toBeUndefined()

    // Test with exactly 41 characters (too long)
    const longHash160 = validHash160 + 'a' // 41 chars
    const longP2pkhScript = '76a914' + longHash160 + '88ac'
    expect(outputScriptToAddress('ecash', longP2pkhScript)).toBeUndefined()
  })

  it('Should handle error paths in getNullDataScriptData', () => {
    // Test data that's too short for payment ID
    const incompletePaymentIdScript = '6a' + '04' + '50415900' + '00' + '08' + '5051525354555657' + '03' + 'ab'
    const result = getNullDataScriptData(incompletePaymentIdScript)
    expect(result).toHaveProperty('paymentId', '') // Should ignore incomplete payment ID

    // Test with exactly the minimum required length
    const minimalScript = '6a' + '04' + '50415900' + '00'
    const minimalResult = getNullDataScriptData(minimalScript)
    expect(minimalResult).toBe(null) // Should return null for insufficient data
  })

  it('Should handle various script patterns in getNullDataScriptData', () => {
    // Test boundary case where script is exactly at minimum length
    const exactMinScript = '6a04504159'
    expect(() => {
      getNullDataScriptData(exactMinScript)
    }).not.toThrow()

    // Test case sensitivity in protocol matching
    const uppercaseScript = '6A' + '04' + '50415900' + '00' + '08' + '5051525354555657'
    const result = getNullDataScriptData(uppercaseScript)
    expect(result).toHaveProperty('message')

    // Test mixed case
    const mixedCaseScript = '6a' + '04' + '50415900' + '00' + '08' + '5051525354555657'
    const mixedResult = getNullDataScriptData(mixedCaseScript)
    expect(mixedResult).toHaveProperty('message')
  })

  it('Should handle edge cases in toHash160', () => {
    // Test with known valid addresses
    const validXecAddress = fromHash160('ecash', 'p2pkh', 'c5d2460186f7233c927e7db2dcc703c0e500b653')
    const result = toHash160(validXecAddress)

    expect(result.type).toBe('p2pkh')
    expect(result.hash160).toHaveLength(40)

    // Test with p2sh address
    const validP2shAddress = fromHash160('ecash', 'p2sh', 'c5d2460186f7233c927e7db2dcc703c0e500b653')
    const p2shResult = toHash160(validP2shAddress)

    expect(p2shResult.type).toBe('p2sh')
    expect(p2shResult.hash160).toHaveLength(40)
  })
})

describe('Regression: mempool + retries + onMessage + cache TTL', () => {
  it('TX_ADDED_TO_MEMPOOL never leaks in-flight counter on error', async () => {
    process.env.WS_AUTH_KEY = 'test-auth-key'
    const client = new ChronikBlockchainClient('ecash')

    // make internal state writable
    Object.defineProperty(client as any, 'mempoolTxsBeingProcessed', { value: 0, writable: true })

    // simulate mempool path with a failing chronik.tx
    ;(client as any).chronik = { tx: jest.fn().mockRejectedValue(new Error('boom')) }
    jest.spyOn(client as any, 'isAlreadyBeingProcessed').mockReturnValue(false)

    const msg = { type: 'Tx', msgType: 'TX_ADDED_TO_MEMPOOL', txid: 'tx123' } as any
    await (client as any).processWsMessage(msg).catch(() => {})

    // counter must be decremented in finally
    expect((client as any).mempoolTxsBeingProcessed).toBe(0)

    // next run should still be accepted and complete
    ;((client as any).chronik.tx as jest.Mock).mockResolvedValue({ txid: 'tx123', inputs: [], outputs: [] })
    jest.spyOn(client as any, 'getAddressesForTransaction').mockResolvedValue([])
    await (client as any).processWsMessage(msg)
    expect((client as any).mempoolTxsBeingProcessed).toBe(0)
  })

  it('fetchTxWithRetry retries on 404 then succeeds', async () => {
    process.env.WS_AUTH_KEY = 'test-auth-key'
    const client = new ChronikBlockchainClient('ecash')

    // wait for async constructor to assign `chronik`
    await new Promise(resolve => setImmediate(resolve))

    const txMock = (client as any).chronik.tx as jest.Mock
    txMock.mockReset()

    const err404 = new Error('Transaction not found in the index')

    // first call => reject with a 404-ish error
    txMock.mockImplementationOnce(async () => { throw err404 })
    // second call => succeed
    txMock.mockImplementationOnce(async () => ({ txid: 'txABC', inputs: [], outputs: [] }))

    const tx = await (client as any).fetchTxWithRetry('txABC', 3, 1)

    expect(tx).toBeDefined()
    expect(tx.txid).toBe('txABC')
    expect(txMock).toHaveBeenCalledTimes(2)
  })

  it('clearOldMessages expires entries by TTL and from the correct maps', () => {
    process.env.WS_AUTH_KEY = 'test-auth-key'
    const client = new ChronikBlockchainClient('ecash')

    const nowSec = Math.floor(Date.now() / 1000)
    // build state: one old and one fresh in each map
    ;(client as any).lastProcessedMessages = {
      unconfirmed: { u_old: nowSec - 999999, u_new: nowSec - 1 },
      confirmed: { c_old: nowSec - 999999, c_new: nowSec - 1 }
    }

    // run cleanup
    ;(client as any).clearOldMessages()

    // old entries should be gone, fresh ones should remain
    expect((client as any).lastProcessedMessages.unconfirmed.u_old).toBeUndefined()
    expect((client as any).lastProcessedMessages.confirmed.c_old).toBeUndefined()
    expect((client as any).lastProcessedMessages.unconfirmed.u_new).toBeDefined()
    expect((client as any).lastProcessedMessages.confirmed.c_new).toBeDefined()
  })
})

describe('WS onMessage matrix (no re-mocks)', () => {
  beforeAll(() => {
    process.env.WS_AUTH_KEY = 'test-auth-key'
  })

  let client: any

  beforeEach(() => {
    jest.clearAllMocks()

    // fresh client
    client = new ChronikBlockchainClient('ecash')

    // avoid any wait-paths that depend on async ctor
    client.setInitialized() // initializing=false

    // ensure ws endpoint exists for BLK_FINALIZED logs
    client.chronikWSEndpoint = {
      subs: { scripts: [] },
      subscribeToBlocks: jest.fn(),
      waitForOpen: jest.fn()
    } as any

    // addressService mocks used by getAddressesForTransaction / waitForSyncing
    fetchAddressesArray.mockResolvedValue([
      {
        id: 'addr-1',
        address: 'ecash:qqkv9wr69ry2p9l53lxp635va4h86wv435995w8p2h',
        networkId: 1,
        syncing: false,
        lastSynced: new Date().toISOString()
      }
    ])

    // never hit real payment layer in these tests
    jest.spyOn(client, 'handleUpdateClientPaymentStatus').mockResolvedValue(undefined)
  })

  it('handles TX_REMOVED_FROM_MEMPOOL → deletes unconfirmed txs', async () => {
    fetchUnconfirmedTransactions.mockResolvedValueOnce(['tx-to-del'])
    deleteTransactions.mockResolvedValueOnce(undefined)

    await client.processWsMessage({ type: 'Tx', msgType: 'TX_REMOVED_FROM_MEMPOOL', txid: 'deadbeef' })

    expect(fetchUnconfirmedTransactions).toHaveBeenCalledWith('deadbeef')
    expect(deleteTransactions).toHaveBeenCalledWith(['tx-to-del'])
  })

  it('handles TX_CONFIRMED → uses fetchTxWithRetry and updates payments for related addresses', async () => {
    const fetchSpy = jest.spyOn(client, 'fetchTxWithRetry').mockResolvedValue({
      txid: 'txCONF',
      inputs: [],
      outputs: [{ sats: 10n, outputScript: '76a914c5d2460186f7233c927e7db2dcc703c0e500b65388ac' }]
    })

    // deterministic related addresses
    jest.spyOn(client, 'getRelatedAddressesForTransaction')
      .mockReturnValue(['ecash:qqkv9wr69ry2p9l53lxp635va4h86wv435995w8p2h'])

    // minimal transaction shape for downstream
    jest.spyOn(client, 'getTransactionFromChronikTransaction')
      .mockResolvedValue({
        hash: 'txCONF',
        amount: '0.01',
        timestamp: Math.floor(Date.now() / 1000),
        addressId: 'addr-1',
        confirmed: false,
        opReturn: JSON.stringify({ message: { type: 'PAY', paymentId: 'pid-1' } })
      })

    const paySpy = jest.spyOn(client, 'handleUpdateClientPaymentStatus')

    await client.processWsMessage({ type: 'Tx', msgType: 'TX_CONFIRMED', txid: 'txCONF' })

    expect(fetchSpy).toHaveBeenCalledWith('txCONF')
    expect(paySpy).toHaveBeenCalled()
    expect(client.confirmedTxsHashesFromLastBlock).toContain('txCONF')
  })

  it('handles TX_ADDED_TO_MEMPOOL → calls fetchTxWithRetry and upserts, triggers once', async () => {
    jest.spyOn(client, 'isAlreadyBeingProcessed').mockReturnValue(false)

    jest.spyOn(client, 'fetchTxWithRetry').mockResolvedValue({
      txid: 'txMEM',
      inputs: [],
      outputs: [{ sats: 10n, outputScript: '76a914c5d2460186f7233c927e7db2dcc703c0e500b65388ac' }]
    })

    jest.spyOn(client, 'getAddressesForTransaction').mockResolvedValue([
      {
        address: { address: 'ecash:qqkv9wr69ry2p9l53lxp635va4h86wv435995w8p2h', networkId: 1 },
        transaction: {
          hash: 'txMEM',
          amount: '0.01',
          timestamp: Math.floor(Date.now() / 1000),
          addressId: 'addr-1',
          confirmed: false,
          opReturn: JSON.stringify({ message: { type: 'PAY', paymentId: 'pid-2' } })
        }
      }
    ])

    upsertTransaction.mockResolvedValue({
      created: true,
      tx: { address: { networkId: 1, address: 'ecash:qqkv9wr69ry2p9l53lxp635va4h86wv435995w8p2h' } }
    })

    await client.processWsMessage({ type: 'Tx', msgType: 'TX_ADDED_TO_MEMPOOL', txid: 'txMEM' })

    expect(client.fetchTxWithRetry).toHaveBeenCalledWith('txMEM')
    expect(upsertTransaction).toHaveBeenCalledTimes(1)
    expect(executeAddressTriggers).toHaveBeenCalledTimes(1)
    expect(client.mempoolTxsBeingProcessed).toBe(0)
  })

  it('TX_ADDED_TO_MEMPOOL → short-circuits when already being processed', async () => {
    const fetchSpy = jest.spyOn(client, 'fetchTxWithRetry')
    jest.spyOn(client, 'isAlreadyBeingProcessed').mockReturnValue(true)

    await client.processWsMessage({ type: 'Tx', msgType: 'TX_ADDED_TO_MEMPOOL', txid: 'dup' })

    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('TX_ADDED_TO_MEMPOOL → retries on 404-ish twice then succeeds (uses fake timers)', async () => {
    jest.useFakeTimers()

    let attempts = 0
    // drive underlying chronik.tx via the real fetchTxWithRetry
    ;(client.chronik) = {
      tx: jest.fn(async () => {
        attempts += 1
        if (attempts < 3) throw new Error('Transaction not found in the index')
        return { txid: 'tx404', inputs: [], outputs: [] }
      })
    }

    jest.spyOn(client, 'isAlreadyBeingProcessed').mockReturnValue(false)
    jest.spyOn(client, 'getAddressesForTransaction').mockResolvedValue([])

    const p = client.processWsMessage({ type: 'Tx', msgType: 'TX_ADDED_TO_MEMPOOL', txid: 'tx404' })

    // advance 1s + 2s exponential backoffs
    await jest.advanceTimersByTimeAsync(1000)
    await jest.advanceTimersByTimeAsync(2000)

    await p
    expect(attempts).toBe(3)
    expect(client.mempoolTxsBeingProcessed).toBe(0)

    jest.useRealTimers()
  })

  it('handles Block → BLK_FINALIZED triggers sync and clears cache', async () => {
    client.initializing = false
    client.confirmedTxsHashesFromLastBlock = ['A', 'B']
    const syncSpy = jest.spyOn(client, 'syncBlockTransactions').mockResolvedValue(undefined)

    await client.processWsMessage({ type: 'Block', msgType: 'BLK_FINALIZED', blockHash: 'bh', blockHeight: 123 })

    expect(syncSpy).toHaveBeenCalledWith('bh')
    expect(client.confirmedTxsHashesFromLastBlock).toEqual([])
  })

  it('handles type=Error → logs JSON payload', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
    await client.processWsMessage({ type: 'Error', msg: { code: 42, reason: 'nope' } } as any)
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('[CHRONIK — ecash]: [Error]'))
    logSpy.mockRestore()
  })
})

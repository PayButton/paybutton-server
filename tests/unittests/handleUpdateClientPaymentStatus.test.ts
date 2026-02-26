// Set up environment variables BEFORE any imports
import { Prisma, ClientPaymentStatus } from '@prisma/client'
import { ChronikBlockchainClient } from '../../services/chronikService'

process.env.WS_AUTH_KEY = 'test-auth-key'

// Mock the clientPayment functions
jest.mock('../../services/clientPaymentService', () => ({
  getClientPayment: jest.fn(),
  updateClientPaymentStatus: jest.fn()
}))

// Mock other heavy dependencies
jest.mock('chronik-client', () => ({
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

jest.mock('../../services/addressService', () => ({
  fetchAddressesToSync: jest.fn().mockResolvedValue([])
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

describe('handleUpdateClientPaymentStatus tests', () => {
  let client: ChronikBlockchainClient
  let mockGetClientPayment: jest.MockedFunction<any>
  let mockUpdateClientPaymentStatus: jest.MockedFunction<any>

  beforeEach(() => {
    process.env.WS_AUTH_KEY = 'test-auth-key'
    client = new ChronikBlockchainClient('ecash')

    // Get the mocked functions
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const clientPaymentService = require('../../services/clientPaymentService')
    mockGetClientPayment = clientPaymentService.getClientPayment
    mockUpdateClientPaymentStatus = clientPaymentService.updateClientPaymentStatus

    // Clear all mocks before each test
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('Should update payment status when paymentId exists and amounts match', async () => {
    // Mock parseOpReturnData to return a paymentId
    const mockOpReturn = JSON.stringify({
      paymentId: 'test-payment-id-123',
      message: 'test message'
    })

    const mockClientPayment = {
      paymentId: 'test-payment-id-123',
      amount: new Prisma.Decimal('100.00'),
      status: 'PENDING' as ClientPaymentStatus,
      addressString: 'test-address',
      createdAt: new Date(),
      updatedAt: new Date(),
      address: {
        id: '1',
        address: 'test-address',
        networkId: 1,
        syncing: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSynced: null
      }
    }

    mockGetClientPayment.mockResolvedValue(mockClientPayment)
    mockUpdateClientPaymentStatus.mockResolvedValue(undefined)

    // Access the private method using bracket notation
    await (client as any).handleUpdateClientPaymentStatus(
      new Prisma.Decimal('100.00'),
      mockOpReturn,
      'CONFIRMED' as ClientPaymentStatus,
      'test-address'
    )

    expect(mockGetClientPayment).toHaveBeenCalledWith('test-payment-id-123')
    expect(mockUpdateClientPaymentStatus).toHaveBeenCalledWith('test-payment-id-123', 'CONFIRMED')
  })

  it('Should update payment status when paymentId exists and client payment amount is null', async () => {
    const mockOpReturn = JSON.stringify({
      paymentId: 'test-payment-id-456',
      message: 'test message'
    })

    const mockClientPayment = {
      paymentId: 'test-payment-id-456',
      amount: null, // null amount should trigger update regardless of txAmount
      status: 'PENDING' as ClientPaymentStatus,
      addressString: 'test-address-2',
      createdAt: new Date(),
      updatedAt: new Date(),
      address: {
        id: '2',
        address: 'test-address-2',
        networkId: 1,
        syncing: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSynced: null
      }
    }

    mockGetClientPayment.mockResolvedValue(mockClientPayment)
    mockUpdateClientPaymentStatus.mockResolvedValue(undefined)

    await (client as any).handleUpdateClientPaymentStatus(
      new Prisma.Decimal('200.00'),
      mockOpReturn,
      'ADDED_TO_MEMPOOL' as ClientPaymentStatus,
      'test-address-2'
    )

    expect(mockGetClientPayment).toHaveBeenCalledWith('test-payment-id-456')
    expect(mockUpdateClientPaymentStatus).toHaveBeenCalledWith('test-payment-id-456', 'ADDED_TO_MEMPOOL')
  })

  it('Should not update payment status when amounts do not match', async () => {
    const mockOpReturn = JSON.stringify({
      paymentId: 'test-payment-id-789',
      message: 'test message'
    })

    const mockClientPayment = {
      paymentId: 'test-payment-id-789',
      amount: new Prisma.Decimal('100.00'), // Different from txAmount
      status: 'PENDING' as ClientPaymentStatus,
      addressString: 'test-address-3',
      createdAt: new Date(),
      updatedAt: new Date(),
      address: {
        id: '3',
        address: 'test-address-3',
        networkId: 1,
        syncing: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSynced: null
      }
    }

    mockGetClientPayment.mockResolvedValue(mockClientPayment)
    mockUpdateClientPaymentStatus.mockResolvedValue(undefined)

    await (client as any).handleUpdateClientPaymentStatus(
      new Prisma.Decimal('150.00'), // Different amount
      mockOpReturn,
      'CONFIRMED' as ClientPaymentStatus,
      'test-address-3'
    )

    expect(mockGetClientPayment).toHaveBeenCalledWith('test-payment-id-789')
    expect(mockUpdateClientPaymentStatus).not.toHaveBeenCalled()
  })

  it('Should not update when client payment is not found', async () => {
    const mockOpReturn = JSON.stringify({
      paymentId: 'non-existent-payment-id',
      message: 'test message'
    })

    mockGetClientPayment.mockResolvedValue(null) // Payment not found
    mockUpdateClientPaymentStatus.mockResolvedValue(undefined)

    await (client as any).handleUpdateClientPaymentStatus(
      new Prisma.Decimal('100.00'),
      mockOpReturn,
      'CONFIRMED' as ClientPaymentStatus,
      'non-existent-address'
    )

    expect(mockGetClientPayment).toHaveBeenCalledWith('non-existent-payment-id')
    expect(mockUpdateClientPaymentStatus).not.toHaveBeenCalled()
  })

  it('Should not update when paymentId is undefined', async () => {
    const mockOpReturn = JSON.stringify({
      message: 'test message without paymentId'
    })

    await (client as any).handleUpdateClientPaymentStatus(
      new Prisma.Decimal('100.00'),
      mockOpReturn,
      'CONFIRMED' as ClientPaymentStatus,
      'test-address-no-payment-id'
    )

    expect(mockGetClientPayment).not.toHaveBeenCalled()
    expect(mockUpdateClientPaymentStatus).not.toHaveBeenCalled()
  })

  it('Should not update when paymentId is empty string', async () => {
    const mockOpReturn = JSON.stringify({
      paymentId: '',
      message: 'test message with empty paymentId'
    })

    await (client as any).handleUpdateClientPaymentStatus(
      new Prisma.Decimal('100.00'),
      mockOpReturn,
      'CONFIRMED' as ClientPaymentStatus,
      'test-address-empty-payment-id'
    )

    expect(mockGetClientPayment).not.toHaveBeenCalled()
    expect(mockUpdateClientPaymentStatus).not.toHaveBeenCalled()
  })

  it('Should not update when opReturn is undefined', async () => {
    await (client as any).handleUpdateClientPaymentStatus(
      new Prisma.Decimal('100.00'),
      undefined,
      'CONFIRMED' as ClientPaymentStatus,
      'test-address-undefined-opreturn'
    )

    expect(mockGetClientPayment).not.toHaveBeenCalled()
    expect(mockUpdateClientPaymentStatus).not.toHaveBeenCalled()
  })

  it('Should handle different txAmount types correctly', async () => {
    const mockOpReturn = JSON.stringify({
      paymentId: 'test-payment-id-types',
      message: 'test message'
    })

    const mockClientPayment = {
      paymentId: 'test-payment-id-types',
      amount: new Prisma.Decimal('100.00'),
      status: 'PENDING' as ClientPaymentStatus,
      addressString: 'test-address-4',
      createdAt: new Date(),
      updatedAt: new Date(),
      address: {
        id: '4',
        address: 'test-address-4',
        networkId: 1,
        syncing: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSynced: null
      }
    }

    mockGetClientPayment.mockResolvedValue(mockClientPayment)
    mockUpdateClientPaymentStatus.mockResolvedValue(undefined)

    // Test with string amount
    await (client as any).handleUpdateClientPaymentStatus(
      '100.00',
      mockOpReturn,
      'CONFIRMED' as ClientPaymentStatus,
      'test-address-4'
    )

    expect(mockUpdateClientPaymentStatus).toHaveBeenCalledWith('test-payment-id-types', 'CONFIRMED')

    mockUpdateClientPaymentStatus.mockClear()

    // Test with number amount
    await (client as any).handleUpdateClientPaymentStatus(
      100,
      mockOpReturn,
      'CONFIRMED' as ClientPaymentStatus,
      'test-address-4'
    )

    expect(mockUpdateClientPaymentStatus).toHaveBeenCalledWith('test-payment-id-types', 'CONFIRMED')
  })

  it('Should handle parseOpReturnData returning non-object values', async () => {
    // Test with string opReturn that parseOpReturnData returns as string
    const stringOpReturn = 'simple string message'

    await (client as any).handleUpdateClientPaymentStatus(
      new Prisma.Decimal('100.00'),
      stringOpReturn,
      'CONFIRMED' as ClientPaymentStatus,
      'test-address-non-object'
    )

    // When parseOpReturnData returns a string, there's no paymentId property
    expect(mockGetClientPayment).not.toHaveBeenCalled()
    expect(mockUpdateClientPaymentStatus).not.toHaveBeenCalled()
  })

  it('Should handle complex opReturn data with paymentId', async () => {
    const complexOpReturn = JSON.stringify({
      paymentId: 'complex-payment-id',
      message: {
        type: 'payment',
        details: 'complex payment details'
      },
      metadata: ['tag1', 'tag2']
    })

    const mockClientPayment = {
      paymentId: 'complex-payment-id',
      amount: new Prisma.Decimal('500.00'),
      status: 'PENDING' as ClientPaymentStatus,
      addressString: 'test-address-5',
      createdAt: new Date(),
      updatedAt: new Date(),
      address: {
        id: '5',
        address: 'test-address-5',
        networkId: 1,
        syncing: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSynced: null
      }
    }

    mockGetClientPayment.mockResolvedValue(mockClientPayment)
    mockUpdateClientPaymentStatus.mockResolvedValue(undefined)

    await (client as any).handleUpdateClientPaymentStatus(
      new Prisma.Decimal('500.00'),
      complexOpReturn,
      'CONFIRMED' as ClientPaymentStatus,
      'test-address-5'
    )

    expect(mockGetClientPayment).toHaveBeenCalledWith('complex-payment-id')
    expect(mockUpdateClientPaymentStatus).toHaveBeenCalledWith('complex-payment-id', 'CONFIRMED')
  })

  it('Should handle amount comparison with different precision', async () => {
    const mockOpReturn = JSON.stringify({
      paymentId: 'precision-test-id',
      message: 'precision test'
    })

    const mockClientPayment = {
      paymentId: 'precision-test-id',
      amount: new Prisma.Decimal('100.000000'),
      status: 'PENDING' as ClientPaymentStatus,
      addressString: 'test-address-6',
      createdAt: new Date(),
      updatedAt: new Date(),
      address: {
        id: '6',
        address: 'test-address-6',
        networkId: 1,
        syncing: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSynced: null
      }
    }

    mockGetClientPayment.mockResolvedValue(mockClientPayment)
    mockUpdateClientPaymentStatus.mockResolvedValue(undefined)

    // Should match even with different precision
    await (client as any).handleUpdateClientPaymentStatus(
      new Prisma.Decimal('100.00'),
      mockOpReturn,
      'CONFIRMED' as ClientPaymentStatus,
      'test-address-6'
    )

    expect(mockGetClientPayment).toHaveBeenCalledWith('precision-test-id')
    expect(mockUpdateClientPaymentStatus).toHaveBeenCalledWith('precision-test-id', 'CONFIRMED')
  })

  it('Should handle all possible ClientPaymentStatus values', async () => {
    const mockOpReturn = JSON.stringify({
      paymentId: 'status-test-id',
      message: 'status test'
    })

    const mockClientPayment = {
      paymentId: 'status-test-id',
      amount: new Prisma.Decimal('100.00'),
      status: 'PENDING' as ClientPaymentStatus,
      addressString: 'test-address-7',
      createdAt: new Date(),
      updatedAt: new Date(),
      address: {
        id: '7',
        address: 'test-address-7',
        networkId: 1,
        syncing: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSynced: null
      }
    }

    mockGetClientPayment.mockResolvedValue(mockClientPayment)
    mockUpdateClientPaymentStatus.mockResolvedValue(undefined)

    // Test different status values
    const statusValues: ClientPaymentStatus[] = ['PENDING', 'ADDED_TO_MEMPOOL', 'CONFIRMED']

    for (const status of statusValues) {
      mockUpdateClientPaymentStatus.mockClear()

      await (client as any).handleUpdateClientPaymentStatus(
        new Prisma.Decimal('100.00'),
        mockOpReturn,
        status,
        'test-address-7'
      )

      expect(mockUpdateClientPaymentStatus).toHaveBeenCalledWith('status-test-id', status)
    }
  })

  it('Should handle edge case with zero amounts', async () => {
    const mockOpReturn = JSON.stringify({
      paymentId: 'zero-amount-test',
      message: 'zero amount test'
    })

    const mockClientPayment = {
      paymentId: 'zero-amount-test',
      amount: new Prisma.Decimal('0.00'),
      status: 'PENDING' as ClientPaymentStatus,
      addressString: 'test-address-8',
      createdAt: new Date(),
      updatedAt: new Date(),
      address: {
        id: '8',
        address: 'test-address-8',
        networkId: 1,
        syncing: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSynced: null
      }
    }

    mockGetClientPayment.mockResolvedValue(mockClientPayment)
    mockUpdateClientPaymentStatus.mockResolvedValue(undefined)

    // Should match with zero amounts
    await (client as any).handleUpdateClientPaymentStatus(
      new Prisma.Decimal('0.00'),
      mockOpReturn,
      'CONFIRMED' as ClientPaymentStatus,
      'test-address-8'
    )

    expect(mockGetClientPayment).toHaveBeenCalledWith('zero-amount-test')
    expect(mockUpdateClientPaymentStatus).toHaveBeenCalledWith('zero-amount-test', 'CONFIRMED')
  })

  it('Should not update when addresses do not match', async () => {
    const mockOpReturn = JSON.stringify({
      paymentId: 'address-mismatch-test',
      message: 'address mismatch test'
    })

    const mockClientPayment = {
      paymentId: 'address-mismatch-test',
      amount: new Prisma.Decimal('100.00'),
      status: 'PENDING' as ClientPaymentStatus,
      addressString: 'expected-address',
      createdAt: new Date(),
      updatedAt: new Date(),
      address: {
        id: '9',
        address: 'expected-address',
        networkId: 1,
        syncing: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSynced: null
      }
    }

    mockGetClientPayment.mockResolvedValue(mockClientPayment)
    mockUpdateClientPaymentStatus.mockResolvedValue(undefined)

    // Should not update when transaction address differs from client payment address
    await (client as any).handleUpdateClientPaymentStatus(
      new Prisma.Decimal('100.00'),
      mockOpReturn,
      'CONFIRMED' as ClientPaymentStatus,
      'different-address'
    )

    expect(mockGetClientPayment).toHaveBeenCalledWith('address-mismatch-test')
    expect(mockUpdateClientPaymentStatus).not.toHaveBeenCalled()
  })

  it('Should update when addresses match and amount is null', async () => {
    const mockOpReturn = JSON.stringify({
      paymentId: 'address-match-null-amount-test',
      message: 'address match null amount test'
    })

    const mockClientPayment = {
      paymentId: 'address-match-null-amount-test',
      amount: null,
      status: 'PENDING' as ClientPaymentStatus,
      addressString: 'matching-address',
      createdAt: new Date(),
      updatedAt: new Date(),
      address: {
        id: '10',
        address: 'matching-address',
        networkId: 1,
        syncing: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSynced: null
      }
    }

    mockGetClientPayment.mockResolvedValue(mockClientPayment)
    mockUpdateClientPaymentStatus.mockResolvedValue(undefined)

    // Should update when addresses match, even if amount is null
    await (client as any).handleUpdateClientPaymentStatus(
      new Prisma.Decimal('200.00'),
      mockOpReturn,
      'CONFIRMED' as ClientPaymentStatus,
      'matching-address'
    )

    expect(mockGetClientPayment).toHaveBeenCalledWith('address-match-null-amount-test')
    expect(mockUpdateClientPaymentStatus).toHaveBeenCalledWith('address-match-null-amount-test', 'CONFIRMED')
  })

  it('Should not update when addresses do not match even with null amount', async () => {
    const mockOpReturn = JSON.stringify({
      paymentId: 'address-mismatch-null-amount-test',
      message: 'address mismatch null amount test'
    })

    const mockClientPayment = {
      paymentId: 'address-mismatch-null-amount-test',
      amount: null,
      status: 'PENDING' as ClientPaymentStatus,
      addressString: 'expected-address',
      createdAt: new Date(),
      updatedAt: new Date(),
      address: {
        id: '11',
        address: 'expected-address',
        networkId: 1,
        syncing: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSynced: null
      }
    }

    mockGetClientPayment.mockResolvedValue(mockClientPayment)
    mockUpdateClientPaymentStatus.mockResolvedValue(undefined)

    // Should not update when addresses don't match, even if amount is null
    await (client as any).handleUpdateClientPaymentStatus(
      new Prisma.Decimal('200.00'),
      mockOpReturn,
      'CONFIRMED' as ClientPaymentStatus,
      'different-address'
    )

    expect(mockGetClientPayment).toHaveBeenCalledWith('address-mismatch-null-amount-test')
    expect(mockUpdateClientPaymentStatus).not.toHaveBeenCalled()
  })
})

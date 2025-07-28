import { Prisma } from '@prisma/client'
import * as triggerService from 'services/triggerService'
import { prismaMock } from 'prisma/mockedClient'
import prisma from 'prisma/clientInstance'
import axios from 'axios'
import config from 'config'
import { RESPONSE_MESSAGES } from 'constants/index'

// Mock axios
jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

// Mock config
jest.mock('config', () => ({
  triggerPOSTTimeout: 3000
}))

// Mock utils/validators
jest.mock('utils/validators', () => {
  const originalModule = jest.requireActual('utils/validators')
  return {
    ...originalModule,
    parseTriggerPostData: jest.fn()
  }
})

// Mock other dependencies
jest.mock('services/paybuttonService')
jest.mock('services/transactionService')
jest.mock('constants/mail')

import { parseTriggerPostData } from 'utils/validators'
const mockedParseTriggerPostData = parseTriggerPostData as jest.MockedFunction<typeof parseTriggerPostData>

// Import and mock transaction service
import * as transactionService from 'services/transactionService'
const mockedGetTransactionValue = jest.spyOn(transactionService, 'getTransactionValue')

describe('TriggerService - JSON Validation Tests', () => {
  const mockBroadcastTxData = {
    address: 'ecash:test123',
    messageType: 'NewTx' as const,
    txs: [{
      amount: new Prisma.Decimal(100),
      hash: 'tx123',
      timestamp: 1640995200,
      paymentId: '',
      message: '',
      rawMessage: '',
      inputAddresses: [],
      address: 'ecash:test123',
      confirmed: true,
      prices: []
    }]
  }

  const mockTrigger = {
    id: 'trigger-123',
    postData: '{"amount": <amount>, "currency": <currency>, "txId": <txId>}',
    postURL: 'https://example.com/webhook',
    emails: '',
    isEmailTrigger: false,
    paybutton: {
      id: 'paybutton-123',
      name: 'Test Button',
      providerUserId: 'user-123'
    }
  }

  const mockUserProfile = {
    id: 'user-123',
    preferredCurrencyId: 1,
    emailCredits: 5
  }

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock Prisma methods
    prismaMock.triggerLog.create.mockResolvedValue({
      id: 123,
      triggerId: 'trigger-123',
      isError: false,
      actionType: 'PostData',
      data: '{}',
      createdAt: new Date(),
      updatedAt: new Date()
    })
    prisma.triggerLog.create = prismaMock.triggerLog.create

    // Mock user profile fetch
    prismaMock.paybutton.findFirstOrThrow.mockResolvedValue({
      providerUserId: 'user-123'
    } as any)
    prisma.paybutton.findFirstOrThrow = prismaMock.paybutton.findFirstOrThrow

    prismaMock.userProfile.findUniqueOrThrow.mockResolvedValue(mockUserProfile as any)
    prisma.userProfile.findUniqueOrThrow = prismaMock.userProfile.findUniqueOrThrow

    // Mock transaction value
    mockedGetTransactionValue.mockReturnValue({ 
      usd: new Prisma.Decimal(1.0), 
      cad: new Prisma.Decimal(1.5) 
    })

    // Mock trigger fetch
    prismaMock.paybuttonTrigger.findMany.mockResolvedValue([mockTrigger] as any)
    prisma.paybuttonTrigger.findMany = prismaMock.paybuttonTrigger.findMany
  })

  describe('executeAddressTriggers - JSON Validation Flow', () => {
    it('should execute trigger successfully when JSON is valid', async () => {
      // Setup: Mock successful JSON parsing
      const parsedData = { amount: 100, currency: 'XEC', txId: 'tx123' }
      mockedParseTriggerPostData.mockReturnValue(parsedData)
      
      // Setup: Mock successful axios response
      mockedAxios.post.mockResolvedValue({
        data: { success: true },
        status: 200
      })

      // Act: Execute the triggers
      await triggerService.executeAddressTriggers(mockBroadcastTxData, 1)

      // Assert: Verify JSON parsing was called
      expect(mockedParseTriggerPostData).toHaveBeenCalledWith({
        userId: 'user-123',
        postData: mockTrigger.postData,
        postDataParameters: expect.objectContaining({
          amount: new Prisma.Decimal(100),
          currency: 'XEC',
          txId: 'tx123',
          buttonName: 'Test Button',
          address: 'ecash:test123'
        })
      })

      // Assert: Verify network request was made
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://example.com/webhook',
        parsedData,
        { timeout: 3000 }
      )

      // Assert: Verify success log was created
      expect(prismaMock.triggerLog.create).toHaveBeenCalledWith({
        data: {
          triggerId: 'trigger-123',
          isError: false,
          actionType: 'PostData',
          data: expect.stringContaining('"responseData"')
        }
      })
    })

    it('should NOT make network request when JSON parsing fails', async () => {
      // Setup: Mock JSON parsing failure
      const jsonError = new SyntaxError('Unexpected end of JSON input')
      jsonError.name = 'SyntaxError'
      mockedParseTriggerPostData.mockImplementation(() => {
        throw jsonError
      })

      // Act: Execute the triggers
      await triggerService.executeAddressTriggers(mockBroadcastTxData, 1)

      // Assert: Verify JSON parsing was attempted
      expect(mockedParseTriggerPostData).toHaveBeenCalled()

      // Assert: Verify NO network request was made
      expect(mockedAxios.post).not.toHaveBeenCalled()

      // Assert: Verify error log was created
      expect(prismaMock.triggerLog.create).toHaveBeenCalledWith({
        data: {
          triggerId: 'trigger-123',
          isError: true,
          actionType: 'PostData',
          data: expect.stringContaining('"errorName":"SyntaxError"')
        }
      })

      // Verify the log contains the expected error details
      const logCall = prismaMock.triggerLog.create.mock.calls[0][0]
      const logData = JSON.parse(logCall.data.data)
      expect(logData.errorMessage).toBe('Unexpected end of JSON input')
      expect(logData.triggerPostData).toBe(mockTrigger.postData)
      expect(logData.triggerPostURL).toBe(mockTrigger.postURL)
    })

    it('should use fallback error values when error properties are missing', async () => {
      // Setup: Mock JSON parsing failure with minimal error
      const minimalError = {}
      mockedParseTriggerPostData.mockImplementation(() => {
        throw minimalError
      })

      // Act: Execute the triggers
      await triggerService.executeAddressTriggers(mockBroadcastTxData, 1)

      // Assert: Verify NO network request was made
      expect(mockedAxios.post).not.toHaveBeenCalled()

      // Assert: Verify error log with fallback values
      const logCall = prismaMock.triggerLog.create.mock.calls[0][0]
      const logData = JSON.parse(logCall.data.data)
      expect(logData.errorName).toBe('JSON_VALIDATION_ERROR')
      expect(logData.errorMessage).toBe('Invalid JSON in trigger post data')
      expect(logData.errorStack).toBe('')
    })

    it('should handle network errors after successful JSON validation', async () => {
      // Setup: Mock successful JSON parsing
      const parsedData = { amount: 100, currency: 'XEC', txId: 'tx123' }
      mockedParseTriggerPostData.mockReturnValue(parsedData)
      
      // Setup: Mock network failure
      const networkError = new Error('ECONNREFUSED')
      networkError.name = 'NetworkError'
      mockedAxios.post.mockRejectedValue(networkError)

      // Act: Execute the triggers
      await triggerService.executeAddressTriggers(mockBroadcastTxData, 1)

      // Assert: Verify JSON parsing succeeded
      expect(mockedParseTriggerPostData).toHaveBeenCalled()

      // Assert: Verify network request was attempted
      expect(mockedAxios.post).toHaveBeenCalled()

      // Assert: Verify network error log (not JSON error)
      const logCall = prismaMock.triggerLog.create.mock.calls[0][0]
      const logData = JSON.parse(logCall.data.data)
      expect(logData.errorName).toBe('NetworkError')
      expect(logData.errorMessage).toBe('ECONNREFUSED')
    })

    it('should handle triggers with malformed JSON containing variables', async () => {
      // Setup: Mock trigger with malformed JSON
      const malformedTrigger = {
        ...mockTrigger,
        postData: '{"amount": <amount>, "currency": <currency>' // Missing closing brace
      }
      
      prismaMock.paybuttonTrigger.findMany.mockResolvedValue([malformedTrigger] as any)

      // Setup: Mock JSON parsing to fail on malformed syntax
      const syntaxError = new SyntaxError("Expected ',' or '}' after property value")
      mockedParseTriggerPostData.mockImplementation(() => {
        throw syntaxError
      })

      // Act: Execute the triggers
      await triggerService.executeAddressTriggers(mockBroadcastTxData, 1)

      // Assert: Verify the original malformed JSON is preserved in logs
      const logCall = prismaMock.triggerLog.create.mock.calls[0][0]
      const logData = JSON.parse(logCall.data.data)
      expect(logData.triggerPostData).toBe(malformedTrigger.postData)
      expect(logData.errorMessage).toContain("Expected ',' or '}'")
    })

    it('should skip triggers when DONT_EXECUTE_TRIGGERS is true', async () => {
      // Setup: Set environment variable to skip triggers
      process.env.DONT_EXECUTE_TRIGGERS = 'true'

      // Act: Execute the triggers
      await triggerService.executeAddressTriggers(mockBroadcastTxData, 1)

      // Assert: Verify no processing occurred
      expect(mockedParseTriggerPostData).not.toHaveBeenCalled()
      expect(mockedAxios.post).not.toHaveBeenCalled()
      expect(prismaMock.triggerLog.create).not.toHaveBeenCalled()

      // Cleanup
      delete process.env.DONT_EXECUTE_TRIGGERS
    })

    it('should handle empty trigger list gracefully', async () => {
      // Setup: Mock empty trigger list
      prismaMock.paybuttonTrigger.findMany.mockResolvedValue([])

      // Act: Execute the triggers
      await triggerService.executeAddressTriggers(mockBroadcastTxData, 1)

      // Assert: Verify no processing occurred for empty list
      expect(mockedParseTriggerPostData).not.toHaveBeenCalled()
      expect(mockedAxios.post).not.toHaveBeenCalled()
      expect(prismaMock.triggerLog.create).not.toHaveBeenCalled()
    })
  })

  describe('JSON Validation Error Scenarios', () => {
    const testCases = [
      {
        name: 'missing closing brace',
        postData: '{"amount": <amount>, "currency": <currency>',
        expectedError: 'Unexpected end of JSON input'
      },
      {
        name: 'invalid property syntax',
        postData: '{amount: <amount>, "currency": <currency>}',
        expectedError: "Expected property name or '}'"
      },
      {
        name: 'missing comma',
        postData: '{"amount": <amount> "currency": <currency>}',
        expectedError: "Expected ',' or '}'"
      }
    ]

    testCases.forEach(({ name, postData, expectedError }) => {
      it(`should handle JSON with ${name}`, async () => {
        // Setup: Mock trigger with specific malformed JSON
        const testTrigger = { ...mockTrigger, postData }
        prismaMock.paybuttonTrigger.findMany.mockResolvedValue([testTrigger] as any)

        // Setup: Mock parsing to fail with specific error
        const error = new SyntaxError(expectedError)
        mockedParseTriggerPostData.mockImplementation(() => {
          throw error
        })

        // Act: Execute the triggers
        await triggerService.executeAddressTriggers(mockBroadcastTxData, 1)

        // Assert: Verify no network request and proper error logging
        expect(mockedAxios.post).not.toHaveBeenCalled()
        
        const logCall = prismaMock.triggerLog.create.mock.calls[0][0]
        const logData = JSON.parse(logCall.data.data)
        expect(logData.errorMessage).toContain(expectedError)
        expect(logData.triggerPostData).toBe(postData)
      })
    })
  })
})

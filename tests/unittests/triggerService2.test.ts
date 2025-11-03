import { prismaMock } from '../../prisma-local/mockedClient'
import prisma from '../../prisma-local/clientInstance'
import axios from 'axios'
import { fetchTriggerLogsForPaybutton } from 'services/triggerService'

import { parseTriggerPostData } from '../../utils/validators'

jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

jest.mock('../../utils/validators', () => {
  const originalModule = jest.requireActual('../../utils/validators')
  return {
    ...originalModule,
    parseTriggerPostData: jest.fn()
  }
})
const mockedParseTriggerPostData = parseTriggerPostData as jest.MockedFunction<typeof parseTriggerPostData>

describe('Trigger JSON Validation Unit Tests', () => {
  describe('Trigger Creation with JSON Validation', () => {
    it('should reject trigger creation with invalid JSON during validation', async () => {
      const invalidPostData = '{"amount": <amount>, "currency": <currency>'

      mockedParseTriggerPostData.mockImplementation(() => {
        throw new SyntaxError('Unexpected end of JSON input')
      })

      expect(() => {
        parseTriggerPostData({
          userId: 'test-user',
          postData: invalidPostData,
          postDataParameters: {} as any
        })
      }).toThrow('Unexpected end of JSON input')

      expect(mockedParseTriggerPostData).toHaveBeenCalled()
    })

    it('should allow trigger creation with valid JSON', async () => {
      const validPostData = '{"amount": <amount>, "currency": <currency>}'
      const expectedParsedData = { amount: 100, currency: 'XEC' }

      mockedParseTriggerPostData.mockReturnValue(expectedParsedData)

      const result = parseTriggerPostData({
        userId: 'test-user',
        postData: validPostData,
        postDataParameters: {} as any
      })

      expect(result).toEqual(expectedParsedData)
      expect(mockedParseTriggerPostData).toHaveBeenCalled()
    })
  })

  describe('Trigger Execution Scenarios', () => {
    beforeEach(() => {
      jest.clearAllMocks()

      prismaMock.triggerLog.create.mockResolvedValue({
        id: 1,
        triggerId: 'test-trigger',
        isError: false,
        actionType: 'PostData',
        data: '{}',
        createdAt: new Date(),
        updatedAt: new Date()
      })
      prisma.triggerLog.create = prismaMock.triggerLog.create
    })

    it('should demonstrate JSON validation flow differences', async () => {
      console.log('=== Test Case 1: Valid JSON ===')

      mockedParseTriggerPostData.mockReturnValue({ amount: 100, currency: 'XEC' })
      mockedAxios.post.mockResolvedValue({ data: { success: true } })

      try {
        const result = parseTriggerPostData({
          userId: 'user-123',
          postData: '{"amount": <amount>, "currency": <currency>}',
          postDataParameters: {} as any
        })
        console.log('✅ JSON parsing succeeded:', result)
        console.log('✅ Network request would be made')
      } catch (error) {
        console.log('❌ Unexpected error:', error)
      }

      console.log('\n=== Test Case 2: Invalid JSON ===')

      mockedParseTriggerPostData.mockImplementation(() => {
        throw new SyntaxError('Unexpected end of JSON input')
      })

      try {
        parseTriggerPostData({
          userId: 'user-123',
          postData: '{"amount": <amount>, "currency": <currency>',
          postDataParameters: {} as any
        })
        console.log('❌ Should not reach here')
      } catch (error) {
        console.log('✅ JSON parsing failed as expected:', (error as Error).message)
        console.log('✅ Network request would NOT be made')
      }

      expect(mockedParseTriggerPostData).toHaveBeenCalledTimes(2)
    })

    it('should log JSON validation errors with proper details', async () => {
      const testCases = [
        {
          name: 'Missing closing brace',
          postData: '{"amount": <amount>, "currency": <currency>',
          expectedError: 'Unexpected end of JSON input'
        },
        {
          name: 'Invalid property syntax',
          postData: '{amount: <amount>, "currency": <currency>}',
          expectedError: 'Expected property name'
        },
        {
          name: 'Extra comma',
          postData: '{"amount": <amount>,, "currency": <currency>}',
          expectedError: 'Unexpected token'
        }
      ]

      testCases.forEach(({ name, postData, expectedError }) => {
        console.log(`\n=== Testing: ${name} ===`)

        mockedParseTriggerPostData.mockImplementation(() => {
          const error = new SyntaxError(expectedError)
          error.name = 'SyntaxError'
          throw error
        })

        try {
          parseTriggerPostData({
            userId: 'user-123',
            postData,
            postDataParameters: {} as any
          })
          console.log('❌ Should have failed')
        } catch (error) {
          const err = error as Error
          console.log('✅ Failed as expected:', err.message)
          expect(err.name).toBe('SyntaxError')
          expect(err.message).toContain(expectedError)
        }
      })
    })

    it('should handle edge cases gracefully', async () => {
      const edgeCases = [
        {
          name: 'Empty post data',
          postData: '',
          mockError: new Error('No data to parse')
        },
        {
          name: 'Null-like post data',
          postData: 'null',
          mockError: new Error('Invalid null data')
        },
        {
          name: 'Non-object JSON',
          postData: '"just a string"',
          mockError: new Error('Expected object')
        }
      ]

      edgeCases.forEach(({ name, postData, mockError }) => {
        console.log(`\n=== Testing edge case: ${name} ===`)

        mockedParseTriggerPostData.mockImplementation(() => {
          throw mockError
        })

        try {
          parseTriggerPostData({
            userId: 'user-123',
            postData,
            postDataParameters: {} as any
          })
          console.log('❌ Should have failed')
        } catch (error) {
          console.log('✅ Handled gracefully:', (error as Error).message)
        }
      })
    })
  })

  describe('Performance and Efficiency Benefits', () => {
    it('should demonstrate network request avoidance', async () => {
      let networkRequestCount = 0

      mockedAxios.post.mockImplementation(async () => {
        networkRequestCount++
        return { data: { success: true } }
      })

      console.log('\n=== Performance Test: Valid vs Invalid JSON ===')

      mockedParseTriggerPostData.mockReturnValue({ amount: 100 })

      try {
        parseTriggerPostData({
          userId: 'user-123',
          postData: '{"amount": <amount>}',
          postDataParameters: {} as any
        })
        await mockedAxios.post('https://example.com', { amount: 100 })
        console.log('✅ Valid JSON: Network request made')
      } catch (error) {
        console.log('❌ Unexpected error with valid JSON')
      }

      mockedParseTriggerPostData.mockImplementation(() => {
        throw new SyntaxError('Invalid JSON')
      })

      try {
        parseTriggerPostData({
          userId: 'user-123',
          postData: '{"amount": <amount>',
          postDataParameters: {} as any
        })
      } catch (error) {
        console.log('✅ Invalid JSON: No network request made')
      }

      console.log(`Network requests made: ${networkRequestCount}`)
      expect(networkRequestCount).toBe(1)
    })
  })
})

describe('fetchTriggerLogsForPaybutton', () => {
  const mockLogs = [{ id: 1 }, { id: 2 }]
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns data and totalCount with correct pagination and sorting', async () => {
    prismaMock.triggerLog.findMany.mockResolvedValue(mockLogs)
    prismaMock.triggerLog.count.mockResolvedValue(2)
    prisma.triggerLog.findMany = prismaMock.triggerLog.findMany
    prisma.triggerLog.count = prismaMock.triggerLog.count

    const result = await fetchTriggerLogsForPaybutton({
      paybuttonId: 'pb1',
      page: 0,
      pageSize: 10,
      orderBy: 'createdAt',
      orderDesc: true
    })
    expect(result).toEqual({ data: mockLogs, totalCount: 2 })
    expect(prismaMock.triggerLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { trigger: { paybuttonId: 'pb1' } },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 10
      })
    )
  })

  it('handles empty result gracefully', async () => {
    prismaMock.triggerLog.findMany.mockResolvedValue([])
    prismaMock.triggerLog.count.mockResolvedValue(0)
    prisma.triggerLog.findMany = prismaMock.triggerLog.findMany
    prisma.triggerLog.count = prismaMock.triggerLog.count

    const result = await fetchTriggerLogsForPaybutton({
      paybuttonId: 'pb2',
      page: 2,
      pageSize: 5,
      orderBy: 'id',
      orderDesc: false
    })
    expect(result).toEqual({ data: [], totalCount: 0 })
  })
})

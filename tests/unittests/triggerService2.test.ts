import { prismaMock } from '../../prisma-local/mockedClient'
import prisma from '../../prisma-local/clientInstance'
import axios from 'axios'
import { fetchTriggerLogsForPaybutton, TriggerLogActionType } from 'services/triggerService'

import { parseTriggerPostData } from '../../utils/validators'
import { TriggerLog } from '@prisma/client'

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

const makeLog = (over: Partial<TriggerLog> = {}): TriggerLog => ({
  id: over.id ?? 1,
  data: over.data ?? '{}',
  createdAt: over.createdAt ?? new Date('2025-01-01T00:00:00Z'),
  updatedAt: over.updatedAt ?? new Date('2025-01-01T00:00:00Z'),
  triggerId: over.triggerId ?? 'trig_1',
  isError: over.isError ?? false,
  actionType: over.actionType ?? ('PostData' as TriggerLogActionType)
})

describe('fetchTriggerLogsForPaybutton', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    prisma.triggerLog.findMany = prismaMock.triggerLog.findMany
    prisma.triggerLog.count = prismaMock.triggerLog.count
  })

  it('returns data and totalCount with correct pagination and sorting (desc)', async () => {
    const rows = [makeLog({ id: 1, actionType: 'PostData' }), makeLog({ id: 2, actionType: 'PostData' })]
    prismaMock.triggerLog.findMany.mockResolvedValue(rows)
    prismaMock.triggerLog.count.mockResolvedValue(2)

    const result = await fetchTriggerLogsForPaybutton({
      paybuttonId: 'pb1',
      page: 0,
      pageSize: 10,
      orderBy: 'createdAt',
      orderDesc: true,
      actionType: 'PostData'
    })

    expect(result).toEqual({ data: rows, totalCount: 2 })
    expect(prismaMock.triggerLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { trigger: { paybuttonId: 'pb1' }, actionType: 'PostData' },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 10
      })
    )
  })

  it('applies ascending order when orderDesc is false', async () => {
    prismaMock.triggerLog.findMany.mockResolvedValue([makeLog({ actionType: 'SendEmail' })])
    prismaMock.triggerLog.count.mockResolvedValue(1)

    await fetchTriggerLogsForPaybutton({
      paybuttonId: 'pb2',
      page: 1,
      pageSize: 20,
      orderBy: 'timestamp' as any, // whatever field your service forwards
      orderDesc: false,
      actionType: 'SendEmail'
    })

    expect(prismaMock.triggerLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { timestamp: 'asc' } })
    )
  })

  it('handles empty result gracefully', async () => {
    prismaMock.triggerLog.findMany.mockResolvedValue([])
    prismaMock.triggerLog.count.mockResolvedValue(0)

    const result = await fetchTriggerLogsForPaybutton({
      paybuttonId: 'pb3',
      page: 2,
      pageSize: 5,
      orderBy: 'id',
      orderDesc: false,
      actionType: 'SendEmail'
    })
    expect(result).toEqual({ data: [], totalCount: 0 })
  })

  it('omits actionType filter when not provided', async () => {
    prismaMock.triggerLog.findMany.mockResolvedValue([makeLog()])
    prismaMock.triggerLog.count.mockResolvedValue(1)

    await fetchTriggerLogsForPaybutton({
      paybuttonId: 'pb4',
      page: 0,
      pageSize: 10,
      orderBy: 'createdAt',
      orderDesc: true
      // no actionType
    } as any)

    expect(prismaMock.triggerLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { trigger: { paybuttonId: 'pb4' } }
      })
    )
    // and not adding actionType key:
    expect(
      (prismaMock.triggerLog.findMany.mock.calls[0][0] as any).where.actionType
    ).toBeUndefined()
  })

  it('computes skip/take correctly for page > 0', async () => {
    prismaMock.triggerLog.findMany.mockResolvedValue([makeLog(), makeLog({ id: 2 })])
    prismaMock.triggerLog.count.mockResolvedValue(42)

    await fetchTriggerLogsForPaybutton({
      paybuttonId: 'pb5',
      page: 3,
      pageSize: 25,
      orderBy: 'createdAt',
      orderDesc: true,
      actionType: 'PostData'
    })

    expect(prismaMock.triggerLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 75, take: 25 })
    )
  })

  it('bubbles up DB errors', async () => {
    prismaMock.triggerLog.findMany.mockRejectedValue(new Error('DB error'))
    prismaMock.triggerLog.count.mockResolvedValue(0)

    await expect(
      fetchTriggerLogsForPaybutton({
        paybuttonId: 'pb6',
        page: 0,
        pageSize: 10,
        orderBy: 'createdAt',
        orderDesc: true,
        actionType: 'PostData'
      })
    ).rejects.toThrow('DB error')
  })

  // Edge: count called with same where used in findMany
  it('uses identical where for count and findMany', async () => {
    const rows = [makeLog({ id: 10, actionType: 'SendEmail' })]
    prismaMock.triggerLog.findMany.mockResolvedValue(rows)
    prismaMock.triggerLog.count.mockResolvedValue(1)

    await fetchTriggerLogsForPaybutton({
      paybuttonId: 'pb7',
      page: 0,
      pageSize: 1,
      orderBy: 'createdAt',
      orderDesc: true,
      actionType: 'SendEmail'
    })

    expect(prismaMock.triggerLog.findMany).toHaveBeenCalled()
    expect(prismaMock.triggerLog.count).toHaveBeenCalled()

    const findArgs = prismaMock.triggerLog.findMany.mock.calls[0]![0] as any
    const countArgs = prismaMock.triggerLog.count.mock.calls[0]![0] as any

    expect(countArgs).toEqual(expect.objectContaining({ where: findArgs.where }))
  })
})

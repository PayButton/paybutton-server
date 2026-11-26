import * as fs from 'fs'
import moment from 'moment'
import * as priceService from 'services/priceService'
import { getMissingDays, syncPricesFile, PriceFileData, PATH_PRICE_CSV_FILE } from 'prisma-local/seeds/prices'

const row = (ticker: string, date: string, value = '1'): PriceFileData => ({ ticker, date, priceInCAD: value, priceInUSD: value })
const apiDay = (day: string, value = '2'): any => ({ day, Price_in_CAD: value, Price_in_USD: value })
const csv = (rows: PriceFileData[]): string =>
  ['ticker,date,priceInCAD,priceInUSD', ...rows.map(r => [r.ticker, r.date, r.priceInCAD, r.priceInUSD].join(','))].join('\n')

describe('getMissingDays', () => {
  const today = moment.utc('2026-01-05')

  it('returns null when there are no prices', () => {
    expect(getMissingDays([], today)).toBeNull()
  })

  it('returns nothing when prices are consecutive up to today', () => {
    const prices = ['2026-01-03', '2026-01-04', '2026-01-05'].map(d => row('XEC', d))
    expect(getMissingDays(prices, today)).toEqual([])
  })

  it('returns gaps and days after the newest price, regardless of order', () => {
    const prices = ['2026-01-03', '2026-01-01'].map(d => row('XEC', d))
    expect(getMissingDays(prices, today)).toEqual(['2026-01-02', '2026-01-04', '2026-01-05'])
  })
})

describe('syncPricesFile', () => {
  const today = moment.utc('2026-01-03')
  let writeSpy: jest.SpyInstance
  let fetchSpy: jest.SpyInstance

  const mockFile = (content: string | null): void => {
    jest.spyOn(fs.promises, 'stat').mockImplementation(async () => {
      if (content === null) throw new Error('ENOENT')
      return {} as any
    })
    jest.spyOn(fs.promises, 'readFile').mockResolvedValue(content ?? '' as any)
  }

  beforeEach(() => {
    writeSpy = jest.spyOn(fs.promises, 'writeFile').mockResolvedValue()
    fetchSpy = jest.spyOn(priceService, 'getAllPricesByNetworkTicker')
    jest.spyOn(console, 'log').mockImplementation(() => {})
    jest.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('does not fetch or write when the file is complete', async () => {
    const rows = ['BCH', 'XEC'].flatMap(t => ['2026-01-01', '2026-01-02', '2026-01-03'].map(d => row(t, d)))
    mockFile(csv(rows) + '\n')

    const res = await syncPricesFile(today)

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(writeSpy).not.toHaveBeenCalled()
    expect(res).toHaveLength(6)
  })

  it('fills gaps and appends newer days only for incomplete tickers, keeping existing values', async () => {
    const rows = [
      ...['2026-01-01', '2026-01-02', '2026-01-03'].map(d => row('BCH', d)),
      ...['2026-01-01'].map(d => row('XEC', d))
    ]
    mockFile(csv(rows).replace(/\n/g, '\r\n'))
    fetchSpy.mockResolvedValue(['2026-01-01', '2026-01-02', '2026-01-03'].map(d => apiDay(d)))

    const res = await syncPricesFile(today)

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(fetchSpy).toHaveBeenCalledWith('XEC', true)
    expect(res.filter(p => p.ticker === 'XEC')).toEqual([
      row('XEC', '2026-01-01', '1'),
      row('XEC', '2026-01-02', '2'),
      row('XEC', '2026-01-03', '2')
    ])
    expect(writeSpy).toHaveBeenCalledTimes(1)
    const [writtenPath, written] = writeSpy.mock.calls[0]
    expect(writtenPath).toBe(PATH_PRICE_CSV_FILE)
    expect(written).toBe(csv([...rows.filter(r => r.ticker === 'BCH'), ...res.filter(p => p.ticker === 'XEC')]) + '\n')
  })

  it('fetches the full history when the file does not exist', async () => {
    mockFile(null)
    fetchSpy.mockResolvedValue(['2026-01-02', '2026-01-03'].map(d => apiDay(d)))

    const res = await syncPricesFile(today)

    expect(fetchSpy).toHaveBeenCalledTimes(2)
    expect(res).toHaveLength(4)
    expect(writeSpy).toHaveBeenCalledTimes(1)
  })

  it('does not rewrite the file when the API has nothing new', async () => {
    mockFile(csv([row('BCH', '2026-01-03'), row('XEC', '2026-01-01')]))
    fetchSpy.mockResolvedValue([apiDay('2026-01-01')])

    await syncPricesFile(today)

    expect(writeSpy).not.toHaveBeenCalled()
  })
})

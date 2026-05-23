import { flattenTimestamp } from '../services/priceService'
import prisma from 'prisma-local/clientInstance'
import { connectTransactionsListToPrices, TransactionWithNetwork } from 'services/transactionService'
import { N_OF_QUOTES, USD_QUOTE_ID, CAD_QUOTE_ID } from 'constants/index'
import moment from 'moment'
import { exit } from 'process'

const PAGE_SIZE = 5000
const FIX_BATCH_SIZE = 1000

async function misconnectTxs (txsIds: string[]): Promise<void> {
  if (process.env.ENVIRONMENT === 'production') {
    return
  }
  if (txsIds.length === 0) {
    return
  }
  console.log('Misconnecting', txsIds.length, 'for testing purposes')

  const txsWithNetwork: TransactionWithNetwork[] = await prisma.transaction.findMany({
    where: { id: { in: txsIds } },
    include: { address: { select: { networkId: true } } }
  })
  console.log('Connecting txs to prices before misaligning...')
  await connectTransactionsListToPrices(txsWithNetwork)

  for (let i = 0; i < txsIds.length; i++) {
    const txId = txsIds[i]

    if (i % 2 === 0) {
      // Even: shift timestamp to misalign existing price connections
      const priceCount = await prisma.pricesOnTransactions.count({ where: { transactionId: txId } })
      if (priceCount === 0) {
        console.log(`Warning: tx ${txId} has no price connections to misalign, skipping`)
        continue
      }
      const tx = await prisma.transaction.findUniqueOrThrow({ where: { id: txId } })
      const txDayTimestamp = flattenTimestamp(tx.timestamp)
      let signal = 1
      if (txDayTimestamp === flattenTimestamp(moment.utc().unix())) {
        signal = -1
      }
      await prisma.transaction.update({
        where: { id: txId },
        data: { timestamp: tx.timestamp + (signal * 86400) }
      })
    } else {
      // Odd: delete price connections entirely
      await prisma.pricesOnTransactions.deleteMany({ where: { transactionId: txId } })
    }
  }
  console.log('Finished misconnecting txs')
}

function txNeedsFix (tx: { timestamp: number, prices: Array<{ price: { timestamp: number } }> }): boolean {
  if (tx.prices.length < N_OF_QUOTES) return true
  const expected = flattenTimestamp(tx.timestamp)
  return tx.prices.some(p => p.price.timestamp !== expected)
}

async function filterWithAvailablePrices (txs: TransactionWithNetwork[]): Promise<TransactionWithNetwork[]> {
  const networkIdToTimestamps = new Map<number, Set<number>>()
  for (const t of txs) {
    const networkId = t.address.networkId
    const ts = flattenTimestamp(t.timestamp)
    const set = networkIdToTimestamps.get(networkId) ?? new Set<number>()
    set.add(ts)
    networkIdToTimestamps.set(networkId, set)
  }

  const availablePairs = new Set<string>()
  for (const [networkId, timestamps] of networkIdToTimestamps.entries()) {
    const tsArray = [...timestamps]
    const prices = await prisma.price.findMany({
      where: {
        networkId,
        timestamp: { in: tsArray },
        quoteId: { in: [CAD_QUOTE_ID, USD_QUOTE_ID] }
      },
      select: { timestamp: true, quoteId: true }
    })

    const grouped = new Map<number, Set<number>>()
    for (const p of prices) {
      const s = grouped.get(p.timestamp) ?? new Set<number>()
      s.add(p.quoteId)
      grouped.set(p.timestamp, s)
    }

    for (const ts of tsArray) {
      const quotes = grouped.get(ts)
      if (quotes?.has(CAD_QUOTE_ID) === true && quotes?.has(USD_QUOTE_ID)) {
        availablePairs.add(`${networkId}:${ts}`)
      }
    }
  }

  const fixable: TransactionWithNetwork[] = []
  const skipped: TransactionWithNetwork[] = []
  for (const t of txs) {
    const key = `${t.address.networkId}:${flattenTimestamp(t.timestamp)}`
    if (availablePairs.has(key)) {
      fixable.push(t)
    } else {
      skipped.push(t)
    }
  }

  if (skipped.length > 0) {
    const missingDates = [...new Set(skipped.map(t => {
      const ts = flattenTimestamp(t.timestamp)
      return `networkId=${t.address.networkId} at ${moment.unix(ts).format('YYYY-MM-DD')}`
    }))]
    console.log(`Warning: skipping ${skipped.length} txs with no available price data:`)
    missingDates.forEach(d => console.log(`  - ${d}`))
  }

  return fixable
}

async function fixMisconnectedTxs (): Promise<void> {
  await misconnectTxs([
    // ADD TXS IDS HERE TO TEST IT
  ])

  const total = await prisma.transaction.count()
  console.log(`Scanning ${total} txs for misaligned or missing prices...`)

  let cursor: string | undefined
  let scanned = 0
  let totalFixed = 0
  let totalSkipped = 0

  while (true) {
    const txs = await prisma.transaction.findMany({
      take: PAGE_SIZE,
      ...(cursor != null ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: 'asc' },
      include: {
        prices: { select: { price: { select: { timestamp: true } } } },
        address: { select: { networkId: true } }
      }
    })

    if (txs.length === 0) break

    cursor = txs[txs.length - 1].id
    scanned += txs.length

    const broken = txs.filter(txNeedsFix)

    if (broken.length === 0) {
      console.log(`[${scanned}/${total}] all OK`)
      continue
    }

    const fixable = await filterWithAvailablePrices(broken)
    totalSkipped += broken.length - fixable.length

    for (let i = 0; i < fixable.length; i += FIX_BATCH_SIZE) {
      const batch = fixable.slice(i, i + FIX_BATCH_SIZE)
      await connectTransactionsListToPrices(batch)
      totalFixed += batch.length
    }

    console.log(`[${scanned}/${total}] fixed ${fixable.length} txs`)
  }

  console.log(`FINISHED. Fixed: ${totalFixed}, Skipped (no price data): ${totalSkipped}`)
  exit()
}

async function run (): Promise<void> {
  await fixMisconnectedTxs()
}

void run()

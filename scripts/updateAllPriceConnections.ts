import { flattenTimestamp } from '../services/priceService'
import prisma from 'prisma-local/clientInstance'
import { connectTransactionsListToPrices, TransactionWithNetwork } from 'services/transactionService'
import { N_OF_QUOTES, USD_QUOTE_ID, CAD_QUOTE_ID } from 'constants/index'
import moment from 'moment'
import { exit } from 'process'

const BATCH_SIZE = 5000

async function misconnectTxs (txsIds: string[]): Promise<void> {
  if (process.env.ENVIRONMENT === 'production') {
    return
  }
  if (txsIds.length === 0) {
    return
  }
  console.log('Misconnecting', txsIds.length, 'for testing purposes')

  // Ensure txs have price connections first
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

async function findTxIdsToFix (): Promise<string[]> {
  const rows = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT DISTINCT t.id
    FROM Transaction t
    JOIN PricesOnTransactions pot ON pot.transactionId = t.id
    JOIN Price p ON pot.priceId = p.id
    WHERE p.timestamp != (t.timestamp - MOD(t.timestamp, 86400))

    UNION

    SELECT t.id
    FROM Transaction t
    LEFT JOIN PricesOnTransactions pot ON pot.transactionId = t.id
    GROUP BY t.id
    HAVING COUNT(pot.priceId) < ${N_OF_QUOTES}
  `
  return rows.map(r => r.id)
}

async function filterTxsWithAvailablePrices (txs: TransactionWithNetwork[]): Promise<TransactionWithNetwork[]> {
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

  console.log('Finding txs with misaligned or missing prices...')
  const txIdsToFix = await findTxIdsToFix()
  console.log(`Found ${txIdsToFix.length} txs to fix.`)

  if (txIdsToFix.length === 0) {
    console.log('Nothing to fix.')
    exit()
  }

  for (let i = 0; i < txIdsToFix.length; i += BATCH_SIZE) {
    const batchIds = txIdsToFix.slice(i, i + BATCH_SIZE)
    const txs: TransactionWithNetwork[] = await prisma.transaction.findMany({
      where: { id: { in: batchIds } },
      include: {
        address: {
          select: {
            networkId: true
          }
        }
      }
    })

    const fixableTxs = await filterTxsWithAvailablePrices(txs)
    if (fixableTxs.length === 0) {
      console.log(`[${i + txs.length}/${txIdsToFix.length}] No fixable txs in batch, skipping.`)
      continue
    }

    console.log(`[${i + txs.length}/${txIdsToFix.length}] Fixing ${fixableTxs.length} txs...`)
    await connectTransactionsListToPrices(fixableTxs)
    console.log(`[${i + txs.length}/${txIdsToFix.length}] Done.`)
  }

  console.log('FINISHED')
  exit()
}

async function run (): Promise<void> {
  await fixMisconnectedTxs()
}

void run()

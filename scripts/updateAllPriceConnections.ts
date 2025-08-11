import { flattenTimestamp } from '../services/priceService'
import prisma from 'prisma-local/clientInstance'
import { connectTransactionsListToPrices } from 'services/transactionService'
import { Transaction } from '@prisma/client'
import moment from 'moment'
import { exit } from 'process'

async function misconnectTxs (txsIds: string[]): Promise<void> {
  if (process.env.ENVIRONMENT === 'production') {
    return
  }
  if (txsIds.length === 0) {
    return
  }
  console.log('Misconnecting', txsIds.length, 'for testing purposes')
  for (const txId of txsIds) {
    const tx = await prisma.transaction.findUniqueOrThrow({
      where: {
        id: txId
      }
    })
    const txDayTimestamp = flattenTimestamp(tx.timestamp)
    let signal = 1
    if (txDayTimestamp === flattenTimestamp(moment.utc().unix())) {
      signal = -1
    }
    await prisma.transaction.update({
      where: {
        id: txId
      },
      data: {
        timestamp: tx.timestamp + (signal * 86400)
      }
    })
  }
  console.log('Finished misconnecting txs')
}

async function fixMisconnectedTxs (): Promise<void> {
  const total = await prisma.transaction.count()
  const pageSize = 1000
  let page = 0

  await misconnectTxs([
    // ADD TXS IDS HERE TO TEST IT
  ])

  console.log('Fixing misconnected txs...')
  while (true) {
    const txsToFix: Transaction[] = []
    // Get txs page
    const txs = await prisma.transaction.findMany({
      orderBy: {
        timestamp: 'asc'
      },
      include: {
        prices: {
          select: {
            price: {
              select: {
                timestamp: true
              }
            }
          }
        }
      },
      skip: page * pageSize,
      take: pageSize
    })

    const viewedCount = page * pageSize + txs.length

    // Finish if empty
    if (txs.length === 0) {
      break
    }

    // Find txs with misaligned timestamps
    txs.forEach(tx => {
      const txFlattenedTimestamp = flattenTimestamp(tx.timestamp)
      const txPriceTimestamps = tx.prices.map(p => p.price.timestamp)
      if (txPriceTimestamps.filter(t => t !== txFlattenedTimestamp).length > 0) {
        txsToFix.push(tx)
      }
    })
    if (txsToFix.length !== 0) {
      console.log(`[${viewedCount}/${total}] Fixing ${txsToFix.length} txs...`)
      console.log('Tx ids:\n', txsToFix.map(t => t.id).join('\n'))
      await connectTransactionsListToPrices(txsToFix)
      console.log(`[${viewedCount}/${total}] Finished fixing ${txsToFix.length} txs.`)
    }
    console.log(`[${viewedCount}/${total}]`)
    page++
  }
  console.log('FINISHED')
  exit()
}

async function run (): Promise<void> {
  await fixMisconnectedTxs()
}

void run()

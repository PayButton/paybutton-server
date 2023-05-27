import { Prisma } from '@prisma/client'
import { syncAllTransactionsForAddress } from 'services/transactionService'
import { readCsv, fileExists } from 'utils/index'
import moment from 'moment'
import * as fs from 'fs'
import * as path from 'path'
import { promisify } from 'util'
import { productionAddresses } from './addresses'

const writeFile = promisify(fs.writeFile)

export const PATH_TXS_CSV_FILE = path.join('prisma', 'seeds', 'productionTxs.csv')

async function writeTxsToFile (content: Prisma.TransactionCreateManyInput[]): Promise<void> {
  const headers = ['hash', 'amount', 'timestamp', 'addressId', 'confirmed']
  const rows = content.map(({ hash, amount, timestamp, addressId, confirmed }) => [hash, amount, timestamp, addressId, confirmed])
  const csv = [headers, ...rows].map(row => row.join(',')).join('\n')

  await writeFile(PATH_TXS_CSV_FILE, csv, 'utf8')
}

export async function createTxsFile (): Promise<void> {
  console.log('Production transactions file creation started')
  const start = moment()
  let txs: Prisma.TransactionCreateManyInput[] = []
  const addressStrings = productionAddresses.map(a => a.address)

  addressStrings.map(async (addr) => {
    const addressTxs = await syncAllTransactionsForAddress(addr, Infinity)

    txs = txs.concat(
      addressTxs.map(tx => {
        return {
          hash: tx.hash,
          amount: tx.amount,
          timestamp: tx.timestamp,
          addressId: tx.addressId,
          confirmed: tx.confirmed
        }
      })
    )
  })

  await writeTxsToFile(txs)

  const finish = moment()
  console.log(`\n\nstart: ${start.format('HH:mm:ss')}\nfinish: ${finish.format('HH:mm:ss')}\nduration: ${(finish.diff(start) / 1000).toFixed(2)} seconds`)
}

export async function getTxs (): Promise<Prisma.TransactionCreateManyInput[]> {
  if (await fileExists(fs, PATH_TXS_CSV_FILE)) {
    const csvContent = await readCsv(fs, PATH_TXS_CSV_FILE)
    const res: Prisma.TransactionCreateManyInput[] = []

    const headers = csvContent[0]
    const data = csvContent.slice(1)

    for (const line of data) {
      const newTx: any = {}
      for (const header of headers) {
        newTx[header] = line[headers.indexOf(header)]
      }
      res.push(newTx as Prisma.TransactionCreateManyInput)
    }

    return res
  } else {
    await createTxsFile()
    return await getTxs()
  }
}

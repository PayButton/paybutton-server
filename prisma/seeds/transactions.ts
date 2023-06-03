import { Prisma } from '@prisma/client'
import { readCsv, fileExists } from 'utils/index'
import * as fs from 'fs'
import * as path from 'path'
import { promisify } from 'util'

const writeFile = promisify(fs.writeFile)
const appendFile = promisify(fs.appendFile)

export const PATH_TXS_CSV_FILE = path.join('prisma', 'seeds', 'productionTxs.csv')

export async function addTxsToFile (content: Prisma.TransactionCreateManyInput[]): Promise<void> {
  if (!await fileExists(fs, PATH_TXS_CSV_FILE)) {
    const headers = ['hash', 'amount', 'timestamp', 'addressId', 'confirmed'].join(',') + '\n'
    await writeFile(PATH_TXS_CSV_FILE, headers, 'utf8')
  }
  const rows = content.map(({ hash, amount, timestamp, addressId, confirmed }) => [hash, amount, timestamp, addressId, confirmed])
  const lines = rows.map(row => row.join(',')).join('\n')
  await appendFile(PATH_TXS_CSV_FILE, lines, 'utf8')
}

export async function getTxsFromFile (): Promise<Prisma.TransactionCreateManyInput[] | undefined> {
  if (await fileExists(fs, PATH_TXS_CSV_FILE)) {
    const csvContent = await readCsv(fs, PATH_TXS_CSV_FILE)
    const res: Prisma.TransactionCreateManyInput[] = []

    const data = csvContent.slice(1)

    for (const line of data) {
      const newTx: Prisma.TransactionCreateManyInput = {
        hash: line[0],
        amount: new Prisma.Decimal(line[1]),
        timestamp: Number(line[2]),
        addressId: line[3],
        confirmed: Boolean(line[4])
      }
      res.push(newTx)
    }

    return res
  }
}

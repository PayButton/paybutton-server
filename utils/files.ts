import { MAX_RECORDS_PER_FILE, RESPONSE_MESSAGES } from '../constants/index'
import { NextApiResponse } from 'next'
import { Transform } from 'stream'

export function valuesToCsvLine (values: string[], delimiter: string): string {
  return values.join(delimiter) + '\n'
}

export function getDataFromValues (data: Record<string, any>, headers: string[]): Record<string, any> {
  const result: Record<string, any> = {}
  headers.forEach(header => {
    result[header] = data[header]
  })

  return result
}

export const getTransform = (headers: string[], delimiter: string): Transform => new Transform({
  objectMode: true,
  transform (chunk: any, encoding: BufferEncoding, callback: () => void) {
    const csvLine = valuesToCsvLine(headers.map(header => chunk[header]), delimiter)
    this.push(csvLine)
    callback()
  }
})

export function streamToCSV (
  values: object[],
  headers: string[],
  delimiter: string,
  res: NextApiResponse,
  formattedHeaders?: string[]): void {
  const maxRecords = MAX_RECORDS_PER_FILE
  const csvLineHeaders = valuesToCsvLine(formattedHeaders ?? headers, delimiter)
  const transform = getTransform(headers, delimiter)

  try {
    res.write(csvLineHeaders)
    values.slice(0, maxRecords).forEach((data: object) => {
      const formattedData = getDataFromValues(data, headers)
      transform.write(formattedData)
    })

    transform.end()
    transform.pipe(res)
  } catch (error: any) {
    console.error(error.message)
    throw new Error(RESPONSE_MESSAGES.COULD_NOT_DOWNLOAD_FILE_500.message)
  }
}

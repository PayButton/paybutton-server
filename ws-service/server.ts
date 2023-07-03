import express, { Request, Response } from 'express'
import config from '../config/index'
import cors from 'cors'
import { BroadcastTxData } from './client'
import { parseWSEventRequest } from '../utils/validators'

const app = express()
app.use(cors())
app.use(express.json({ limit: '1mb' }))
app.options('/events', cors())

let clients: Response[] = []

app.get('/events', (req: Request, res: Response) => {
  try {
    res.locals = parseWSEventRequest(req.query)
  } catch (err: any) {
    res.json(err.message)
    return
  }

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Content-Encoding', 'none')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.flushHeaders()

  clients.push(res)
  console.log('client', clients.length, 'connected with ', res.locals)

  req.on('close', () => {
    clients = clients.filter(client => client !== res)
    console.log('client disconnected: ', clients.length, 'clients connected.')
  })
})

app.post('/broadcast-new-tx', express.json(), (req: Request, res: Response) => {
  const authKey = req.headers['x-auth-key']
  if (authKey !== config.wsAuthKey) {
    return res.status(403).json({ error: 'Unauthorized' })
  }

  const insertedTxs: BroadcastTxData = req.body.insertedTxs
  if (insertedTxs?.txs?.length === 0) {
    return res.status(400).json({ error: 'Could not broadcast empty tx list' })
  }

  clients.forEach(client => {
    const addresses = client.locals as string[]
    if (addresses.includes(insertedTxs.address)) {
      client.write('event: message\n')
      client.write(`data: ${JSON.stringify(insertedTxs)}\n\n`)
    }
  })

  res.json({ statusCode: 200, message: `Message broadcasted to ${clients.length}` })
})

app.listen(5000, () => {
  console.log('WS service listening')
})

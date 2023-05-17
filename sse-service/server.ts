import express, { Request, Response } from 'express'
import { Server } from 'http'
import cors from 'cors'

const app = express()
app.use(cors())
app.options('/events', cors())
const server = new Server(app)

let clients: Response[] = []

app.get('/events', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Content-Encoding', 'none')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()

  clients.push(res)
  console.log('client connected', clients.length)

  req.on('close', () => {
    clients = clients.filter(client => client !== res)
    console.log('client disconnected', 'now have', clients.length)
  })
})

app.post('/broadcast-new-tx', express.json(), (req: Request, res: Response) => {
  const authKey = req.headers['x-auth-key']
  if (authKey !== process.env.SSE_AUTH_KEY) {
    return res.status(403).json({ error: 'Unauthorized' })
  }

  const addressList: string[] = req.body.addressList
  if (addressList === undefined || addressList.length === 0) {
    return res.status(400).json({ error: 'Could not broadcast empty addressList' })
  }

  clients.forEach(client => {
    client.write('event: new-tx\n')
    client.write(`data: ${JSON.stringify(addressList)}\n\n`)
  })

  res.json({ statusCode: 200, message: `Message broadcasted to ${clients.length}` })
})

server.listen(5000, () => {
  console.log('SSE service listening on http://localhost:5000')
})

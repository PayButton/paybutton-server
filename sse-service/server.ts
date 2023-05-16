import express, { Request, Response } from 'express'
import { Server } from 'http'

const app = express()
const server = new Server(app)

let clients: Response[] = []

app.get('/events', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()

  clients.push(res)

  req.on('close', () => {
    clients = clients.filter(client => client !== res)
  })
})

app.post('/broadcast', express.json(), (req: Request, res: Response) => {
  const authKey = req.headers['x-auth-key']

  if (authKey !== process.env.AUTH_KEY) {
    return res.status(403).json({ error: 'Unauthorized' })
  }

  const message = req.body.message
  if (message === undefined || message === '') {
    return res.status(400).json({ error: 'Could not broadcast empty message' })
  }

  clients.forEach(client =>
    client.write(`data: ${JSON.stringify(message)}\n\n`)
  )

  res.json({ status: 'Message broadcasted' })
})

server.listen(5000, () => {
  console.log('SSE service listening on http://localhost:5000')
})

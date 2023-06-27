import { Request, Response } from 'express'
import { superTokensNextWrapper } from 'supertokens-node/nextjs'
import supertokens from 'supertokens-node'
import { middleware } from 'supertokens-node/framework/express'
import * as SuperTokensConfig from '../../../config/backendConfig'

supertokens.init(SuperTokensConfig.backendConfig())

export default async function superTokens (req: Request, res: Response): Promise<void> {
  console.log('entrou no auth verify com', req.query)
  await superTokensNextWrapper(
    async (next) => {
      console.log('entrou no auth verify mid com', req.query)
      await middleware()(req, res, next)
    },
    req,
    res
  )
  if (!res.writableEnded) {
    res.status(404).send('Not found')
  }
}

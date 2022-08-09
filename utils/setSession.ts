import { Response } from 'express'
import { superTokensNextWrapper } from 'supertokens-node/nextjs'
import { verifySession } from 'supertokens-node/recipe/session/framework/express'
import { SessionRequest } from 'supertokens-node/framework/express'
import supertokens from 'supertokens-node'
import * as SuperTokensConfig from 'config/backendConfig'

supertokens.init(SuperTokensConfig.backendConfig())

/* Uses supertokens middleware to create `session` property in the request. */
export async function setSession (req: SessionRequest, res: Response): Promise<void> {
  await superTokensNextWrapper(
    async (next) => {
      return await verifySession()(req, res, next)
    },
    req,
    res
  )
}

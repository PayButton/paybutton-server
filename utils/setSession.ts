import { Response } from 'express'
import { superTokensNextWrapper } from 'supertokens-node/nextjs'
import { verifySession } from 'supertokens-node/recipe/session/framework/express'
import { SessionRequest } from 'supertokens-node/framework/express'
import { VerifySessionOptions } from 'supertokens-node/recipe/session'
import { EmailVerificationClaim } from 'supertokens-node/recipe/emailverification'
import supertokens from 'supertokens-node'
import * as SuperTokensConfig from 'config/backendConfig'

// API routes can be the first thing a fresh server process loads, before the
// /api/auth route or any page has called init, so make sure it has run here.
// init is a no-op once SuperTokens is already initialised.
supertokens.init(SuperTokensConfig.backendConfig())

/* Uses supertokens middleware to create `session` property in the request. */
export async function setSession (req: SessionRequest, res: Response, allowUnverified = false): Promise<void> {
  let options: VerifySessionOptions
  if (allowUnverified) {
    options =
      {
        overrideGlobalClaimValidators: async (globalValidators) => globalValidators.filter(v => v.id !== EmailVerificationClaim.key)
      }
  }
  await superTokensNextWrapper(
    async (next) => {
      return await verifySession(options)(req, res, next)
    },
    req,
    res
  )
}

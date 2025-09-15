import { Response } from 'express'
import { superTokensNextWrapper } from 'supertokens-node/nextjs'
import { verifySession } from 'supertokens-node/recipe/session/framework/express'
import { SessionRequest } from 'supertokens-node/framework/express'
import Session, { SessionContainer, VerifySessionOptions } from 'supertokens-node/recipe/session'
import { EmailVerificationClaim } from 'supertokens-node/recipe/emailverification'
import { GetServerSidePropsContext, GetServerSidePropsResult, PreviewData } from 'next'
import { ParsedUrlQuery } from 'querystring'
import SessionError from 'supertokens-node/lib/build/recipe/session/error'
import { ClaimValidationError } from 'supertokens-web-js/recipe/session'

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
export interface FrontEndFailedSessionInfo {
  errorType: SessionError
  payload: GetServerSidePropsResult<any>
}

export type FrontEndSessionAttempt =
  | { success: true, session: Session.SessionContainer }
  | { success: false, failedResult: FrontEndFailedSessionInfo }

export async function frontEndGetSession (context: GetServerSidePropsContext<ParsedUrlQuery, PreviewData>): Promise<FrontEndSessionAttempt> {
  let session: SessionContainer
  try {
    session = await Session.getSession(context.req, context.res)
  } catch (err: any) {
    let payload: GetServerSidePropsResult<any>
    if (err.type === Session.Error.TRY_REFRESH_TOKEN) {
      payload = { props: { fromSupertokens: 'needs-refresh' } }
    } else if (err.type === Session.Error.UNAUTHORISED) {
      payload = { props: {} }
    } else if (err.type === Session.Error.INVALID_CLAIMS) {
      payload = { props: {} }
      if (err.payload.filter((p: ClaimValidationError) => p.id === 'st-ev').length >= 1) {
        // Email not verified
        payload = {
          redirect: {
            destination: '/verify',
            permanent: false
          }
        }
      }
    } else {
      throw err
    }
    return {
      success: false,
      failedResult: {
        errorType: err.type as SessionError,
        payload
      }
    }
  }
  return {
    success: true,
    session
  }
}

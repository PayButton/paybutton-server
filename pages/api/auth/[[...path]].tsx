import { superTokensNextWrapper } from 'supertokens-node/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'
import supertokens from 'supertokens-node'
import * as SuperTokensConfig from '../../../config/supertokensConfig'
import NextCors from "nextjs-cors";

supertokens.init(SuperTokensConfig.backendConfig())

export default async function superTokens(
  req: NextApiRequest,
  res: NextApiResponse
) {

  // NOTE: We need CORS only if we are querying the APIs from a different origin
  await NextCors(req, res, {
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE"],
    origin: "TODO",
    credentials: true,
    allowedHeaders: ["content-type", ...supertokens.getAllCORSHeaders()],
  });

  await superTokensNextWrapper(
    async (next) => {
      await supertokens.middleware()(req, res, next)
    },
    req,
    res
  )
  if (!res.writableEnded) {
    res.status(404).send('Not found')
  }
}
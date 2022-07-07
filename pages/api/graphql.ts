import Cors from 'micro-cors'
import { ApolloServer } from 'apollo-server-micro'
import { typeDefs } from './schemas'
import { PageConfig } from 'next'
import { resolvers } from './resolvers'
import { websiteDomain } from 'config/appInfo'
const FEATURE_ADD_PAYBUTTON = websiteDomain.includes('feat-add-button') ||
                              websiteDomain.includes('localhost')
const ENABLE_PLAYGROUND_INTROSPECTION: boolean = FEATURE_ADD_PAYBUTTON

export const config: PageConfig = {
  api: {
    bodyParser: false
  }
}

const cors = Cors()

const server = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: ENABLE_PLAYGROUND_INTROSPECTION
})

const startServer = server.start()

export default cors(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.end()
    return false
  }

  await startServer
  await server.createHandler({ path: '/api/graphql' })(req, res)
})

import axios from 'axios'
import { Paybutton } from '@prisma/client'
import { websiteDomain } from 'config/appInfo'
export const resolvers = {
  Query: {
    getPaybuttons: async (): Promise<Paybutton[]> => {
      const response = await axios.get<Paybutton[]>(`${websiteDomain}/api/paybutton`)
      return response.data.map(({ userId, id, addresses }) => ({
        userId,
        id,
        addresses
      }))
    },
    getPaybutton: async (_, args): Promise<Paybutton> => {
      const response = await axios.get<Paybutton>(`${websiteDomain}/api/paybutton/1`)
      const paybutton = response.data
      return {
        id: paybutton.id,
        userId: paybutton.userId,
        addresses: paybutton.addresses
      }
    }
  }
}

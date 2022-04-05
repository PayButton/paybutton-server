import axios from "axios";
import { PayButton } from "types/index"
import { websiteDomain } from 'config/appInfo'
export const resolvers = {
  Query: {
    getPayButtons: async (): Promise<PayButton[]> => {
      try {
        const response = await axios.get<PayButton[]>(`${websiteDomain}/api/paybutton`)
        return response.data.map(({ userId, id, addresses }) => ({
          userId,
          id,
          addresses
        }));
      } catch (error) {
	//console.log(error)
        throw error;
      }
    },
    getPayButton: async (_, args): Promise<PayButton> => {
      try {
        const response = await axios.get<PayButton>(`${websiteDomain}/api/paybutton/1`)
	const payButton = response.data
        return {
          id: payButton.id,
          userId: payButton.userId,
          addresses: payButton.addresses
        };
      } catch (error) {
        throw error;
      }
    }
  }
};

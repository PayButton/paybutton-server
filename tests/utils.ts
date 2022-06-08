import * as httpMocks from 'node-mocks-http'
import prisma from 'prisma/clientInstance'

export const testEndpoint = async (requestJSON: object, endpoint: Function): Promise<httpMocks.MockResponse<any>> => {
  const req = httpMocks.createRequest(requestJSON)
  const res = httpMocks.createResponse()
  await endpoint(req, res)
  return res
}

export const clearPaybuttonAddresses = async (): Promise<void> => {
  void prisma.paybuttonAddress.deleteMany({})
}

export const clearPaybuttons = async (): Promise<void> => {
  void prisma.paybutton.deleteMany({})
}

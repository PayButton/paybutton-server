const httpMocks = require('node-mocks-http');
import models from 'db/models/index'


export const testEndpoint = async (requestJSON: object, endpoint: Function) => {
  const req  = httpMocks.createRequest(requestJSON);
  const res = httpMocks.createResponse();
  await endpoint(req, res)
  return res
}

export const clearPaybuttonAddresses = async () => {
  models.paybutton_addresses.destroy({ where: {} })
}

export const clearPaybuttons = async () => {
  models.paybuttons.destroy({ where: {} })
}

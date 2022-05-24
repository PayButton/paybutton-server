const httpMocks = require('node-mocks-http');


export const testEndpoint = async (requestJSON: object, endpoint: Function) => {
  const req  = httpMocks.createRequest(requestJSON);
  const res = httpMocks.createResponse();
  await endpoint(req, res)
  return res
}

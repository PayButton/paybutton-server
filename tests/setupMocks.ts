import MockGrpcClient from './mockGrpcClient'

jest.mock('grpc-bchrpc-node', () => ({
  ...jest.requireActual('grpc-bchrpc-node'),
  _HAS_NETWORK_INTEGRITY: false,
  GrpcClient: jest.fn(() => new MockGrpcClient())
}))

import MockChronikClient from './mockChronikClient'
import MockGrpcClient from './mockGrpcClient'

jest.mock('chronik-client', () => ({
  ...jest.requireActual('chronik-client'),
  _HAS_NETWORK_INTEGRITY: false,
  ChronikClient: jest.fn(() => new MockChronikClient())
}))

jest.mock('grpc-bchrpc-node', () => ({
  ...jest.requireActual('grpc-bchrpc-node'),
  _HAS_NETWORK_INTEGRITY: false,
  GrpcClient: jest.fn(() => new MockGrpcClient())
}))

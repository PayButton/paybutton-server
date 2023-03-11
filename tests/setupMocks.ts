import MockChronikClient from './mockBlockchainClient'

jest.mock('chronik-client', () => ({
  ...jest.requireActual('chronik-client'),
  _HAS_NETWORK_INTEGRITY: false,
  ChronikClient: jest.fn(() => new MockChronikClient())
}))

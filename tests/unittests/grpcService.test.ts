import { mockedBCHAddress } from '../mockedObjects'
import { getBalance, getTransactionDetails } from '../../services/blockchainService'
import { NETWORK_SLUGS } from 'constants/index'

describe('Test service returned objects consistency', () => {
  // WIP
  /*
  it('test getAddress for real address', async () => {
    const res = await getAddressTransactions({ address: mockedBCHAddress.address })
    expect(res).toEqual(expect.objectContaining({
      confirmedTransactionsList: [
        mockedGrpc.transaction1.toObject(),
        mockedGrpc.transaction2.toObject()
      ]
    }))
  })
  */
  it('test getBalance', async () => {
    const res = await getBalance(mockedBCHAddress.address)
    expect(res).toBe(1780)
  })
  it('test getTransactionDetails', async () => {
    const res = await getTransactionDetails(mockedBCHAddress.address, NETWORK_SLUGS.bitcoincash)
    expect(res).toEqual(expect.objectContaining({
      transaction: {
        hash: 'hu9m3BZg/zlxis7ehc0x/+9qELXC8dkbimOtc5v598s=',
        version: 2,
        inputsList: [],
        outputsList: [],
        lockTime: 0,
        size: 518,
        timestamp: 1653653100,
        confirmations: 0,
        blockHeight: 0,
        blockHash: ''
      }
    }))
  })
})

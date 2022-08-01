import rewire from 'rewire'
import { mockedGrpc } from '../mockedObjects'
const bchdService = rewire('../../services/bchdService')

bchdService.__set__('grpc', mockedGrpc)

describe('Test service returned objects consistency', () => {
  it('test getAddress', async () => {
    const res = await bchdService.getAddress('mockaddress')
    expect(res).toEqual(expect.objectContaining({
      confirmedTransactionsList: [
        mockedGrpc.transaction1.toObject(),
        mockedGrpc.transaction2.toObject()
      ]
    }))
  })
  it('test getUtxos', async () => {
    const res = await bchdService.getUtxos('mockaddress')
    expect(res).toEqual(expect.objectContaining({
      outputsList: expect.arrayContaining([
        {
          outpoint: undefined,
          pubkeyScript: 'dqkUYF1GSq6KqSQSKPbQtcOJWRBPEFaIrA==',
          value: 547,
          isCoinbase: false,
          blockHeight: 684161
        },
        {
          pubkeyScript: 'dqkUYF1GSq6KqSQSKPbQtcOJWRBPEFaIrA==',
          value: 122,
          isCoinbase: false,
          blockHeight: 657711
        },
        expect.objectContaining({
          pubkeyScript: 'dqkUYF1GSq6KqSQSKPbQtcOJWRBPEFaIrA==',
          value: 1111,
          isCoinbase: false,
          blockHeight: 596627
        })
      ])
    }))
  })
  it('test getBCHBalance', async () => {
    const res = await bchdService.getBCHBalance('mockaddress')
    expect(res).toBe(1780)
  })
  it('test getTransactionDetails', async () => {
    const res = await bchdService.getTransactionDetails('mockaddress')
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

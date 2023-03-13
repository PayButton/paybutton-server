// import { mockedBlockchainTransactions, mockedBCHAddress, mockedXECAddress } from '../mockedObjects'
// import { getAddressTransactions, getUtxos, getBalance, getTransactionDetails } from '../../services/blockchainService'
// import { NETWORK_SLUGS } from 'constants/index'

// describe('Test service returned objects consistency', () => {
//   it('test getAddress for real address', async () => {
//     const res = await getAddressTransactions(mockedBCHAddress.address)
//     expect(res).toEqual(expect.objectContaining(mockedBlockchainTransactions))
//   })
//   it('test getUtxos', async () => {
//     const res = await getUtxos(mockedXECAddress.address)
//     expect(res).toEqual(expect.objectContaining({
//       outputsList: expect.arrayContaining([
//         {
//           outpoint: undefined,
//           pubkeyScript: 'dqkUYF1GSq6KqSQSKPbQtcOJWRBPEFaIrA==',
//           value: 547,
//           isCoinbase: false,
//           blockHeight: 684161
//         },
//         {
//           pubkeyScript: 'dqkUYF1GSq6KqSQSKPbQtcOJWRBPEFaIrA==',
//           value: 122,
//           isCoinbase: false,
//           blockHeight: 657711
//         },
//         expect.objectContaining({
//           pubkeyScript: 'dqkUYF1GSq6KqSQSKPbQtcOJWRBPEFaIrA==',
//           value: 1111,
//           isCoinbase: false,
//           blockHeight: 596627
//         })
//       ])
//     }))
//   })
//   it('test getBalance', async () => {
//     const res = await getBalance(mockedBCHAddress.address)
//     expect(res).toBe(1780)
//   })
//   it('test getTransactionDetails', async () => {
//     const res = await getTransactionDetails(mockedBCHAddress.address, NETWORK_SLUGS.bitcoincash)
//     expect(res).toEqual(expect.objectContaining({
//       transaction: {
//         hash: 'hu9m3BZg/zlxis7ehc0x/+9qELXC8dkbimOtc5v598s=',
//         version: 2,
//         inputsList: [],
//         outputsList: [],
//         lockTime: 0,
//         size: 518,
//         timestamp: 1653653100,
//         confirmations: 0,
//         blockHeight: 0,
//         blockHash: ''
//       }
//     }))
//   })
// })

export {}

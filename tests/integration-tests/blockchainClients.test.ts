import { getLastBlockTimestamp } from 'services/blockchainService'

describe('blockchain clients connect', () => {
  it('bitcoincash chronik connects', async () => {
    const x = await getLastBlockTimestamp('bitcoincash')
    expect(x).toBeGreaterThan(1723630000)
  })
  it('eCash chronik connects', async () => {
    const x = await getLastBlockTimestamp('ecash')
    expect(x).toBeGreaterThan(1723630000)
  })
})

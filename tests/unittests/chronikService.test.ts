import { EMPTY_OP_RETURN } from 'utils/validators'
import { getNullDataScriptData } from '../../services/chronikService'

describe('getNullDataScriptData tests', () => {
  it('Null for empty OP_RETURN', async () => {
    const script = '6a' + ''
    const data = getNullDataScriptData(script)
    expect(data).toBe(null)
  })
  it('Null for protocol only', async () => {
    const script = '6a' + '04' + '50415900' + ''
    const data = getNullDataScriptData(script)
    expect(data).toBe(null)
  })
  it('Null for protocol and version only', async () => {
    const script = '6a' + '04' + '50415900' + '00' + ''
    const data = getNullDataScriptData(script)
    expect(data).toBe(null)
  })
  it('Null for protocol, version, pushdata but no data', async () => {
    const script = '6a' + '04' + '50415900' + '00' + '08'
    const data = getNullDataScriptData(script)
    expect(data).toBe(null)
  })
  it('Null for protocol, version, pushdata but truncated data', async () => {
    const script = '6a' + '04' + '50415900' + '00' + '08' + '00010203040506'
    const data = getNullDataScriptData(script)
    expect(data).toBe(null)
  })
  it('Empty if data explicitly empty', async () => {
    const script = '6a' + '04' + '50415900' + '00' + '00'
    const data = getNullDataScriptData(script)
    expect(data).toStrictEqual(EMPTY_OP_RETURN)
  })
  it('Empty if data explicitly empty and nonce too', async () => {
    const script = '6a' + '04' + '50415900' + '00' + '00' + '00'
    const data = getNullDataScriptData(script)
    expect(data).toStrictEqual(EMPTY_OP_RETURN)
  })
  it('Null if wrong protocol', async () => {
    const script = '6a' + '04' + '50415901' + '00' + '02' + 'aabb'
    const data = getNullDataScriptData(script)
    expect(data).toStrictEqual(null)
  })
  it('Simple string data', async () => {
    const script = '6a' + '04' + '50415900' + '00' + '08' + '5051525354555657'
    const data = getNullDataScriptData(script)
    expect(data).toStrictEqual({
      paymentId: '',
      data: 'PQRSTUVW'
    })
  })
  it('Simple array data', async () => {
    const script = '6a' + '04' + '50415900' + '00' + '0b' + '6974656d317c6974656d32'
    const data = getNullDataScriptData(script)
    expect(data).toStrictEqual({
      paymentId: '',
      data: ['item1', 'item2']
    })
  })
  it('Simple dict data', async () => {
    const script = '6a' + '04' + '50415900' + '00' + '14' + '6b65793d76616c756520736f6d653d6f74686572'
    const data = getNullDataScriptData(script)
    expect(data).toStrictEqual({
      paymentId: '',
      data: {
        key: 'value',
        some: 'other'
      }
    })
  })
  it('Simple dict with array', async () => {
    const script = '6a' + '04' + '50415900' + '00' + '1c' + '6b65793d76616c756520736f6d653d76616c7565317c76616c756532'
    const data = getNullDataScriptData(script)
    expect(data).toStrictEqual({
      paymentId: '',
      data: {
        key: 'value',
        some: ['value1', 'value2']
      }
    })
  })
  it('Simple string data with nonce', async () => {
    const script = '6a' + '04' + '50415900' + '00' + '08' + '505152535455565703010203'
    const data = getNullDataScriptData(script)
    expect(data).toStrictEqual({
      paymentId: '010203',
      data: 'PQRSTUVW'
    })
  })
  it('Simple string data with explicitly empty nonce', async () => {
    const script = '6a' + '04' + '50415900' + '00' + '08' + '5051525354555657' + '00'
    const data = getNullDataScriptData(script)
    expect(data).toStrictEqual({
      paymentId: '',
      data: 'PQRSTUVW'
    })
  })
  it('Ignore incomplete nonce', async () => {
    const script = '6a' + '04' + '50415900' + '00' + '08' + '5051525354555657' + '03' + 'aabb'
    const data = getNullDataScriptData(script)
    expect(data).toStrictEqual({
      paymentId: '',
      data: 'PQRSTUVW'
    })
  })
})

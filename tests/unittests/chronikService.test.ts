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
  it('Empty if data explicitly empty and paymentId too', async () => {
    const script = '6a' + '04' + '50415900' + '00' + '00' + '00'
    const data = getNullDataScriptData(script)
    expect(data).toStrictEqual(EMPTY_OP_RETURN)
  })
  it('Null if wrong protocol', async () => {
    const script = '6a' + '04' + '50415901' + '00' + '02' + 'aabb'
    const data = getNullDataScriptData(script)
    expect(data).toStrictEqual(null)
  })
  it('String data', async () => {
    const script = '6a' + '04' + '50415900' + '00' + '08' + '5051525354555657'
    const data = getNullDataScriptData(script)
    expect(data).toStrictEqual({
      paymentId: '',
      message: 'PQRSTUVW',
      rawMessage: 'PQRSTUVW'
    })
  })
  it('Array data', async () => {
    const script = '6a' + '04' + '50415900' + '00' + '0b' + '6974656d317c6974656d32'
    const data = getNullDataScriptData(script)
    expect(data).toStrictEqual({
      paymentId: '',
      message: ['item1', 'item2'],
      rawMessage: 'item1|item2'
    })
  })
  it('Dict data', async () => {
    const script = '6a' + '04' + '50415900' + '00' + '14' + '6b65793d76616c756520736f6d653d6f74686572'
    const data = getNullDataScriptData(script)
    expect(data).toStrictEqual({
      paymentId: '',
      message: {
        key: 'value',
        some: 'other'
      },
      rawMessage: 'key=value some=other'
    })
  })
  it('Dict with array', async () => {
    const script = '6a' + '04' + '50415900' + '00' + '1c' + '6b65793d76616c756520736f6d653d76616c7565317c76616c756532'
    const data = getNullDataScriptData(script)
    expect(data).toStrictEqual({
      paymentId: '',
      message: {
        key: 'value',
        some: ['value1', 'value2']
      },
      rawMessage: 'key=value some=value1|value2'
    })
  })
  it('Non-ASCII data', async () => {
    const script = (
      '6a' + '04' + '50415900' + '00' + '3e' +
      'f09f9882f09f918dc2a9c4b8c3b0d09cd0b6d0aad18b2520c58bc3a650c39fc491c4b8c582e2809ec2bbe2809cc3a67dc2b9e28693c2a3c2b3e28692c2b2'
    )
    const data = getNullDataScriptData(script)
    expect(data).toStrictEqual({
      paymentId: '',
      message: '😂👍©ĸðМжЪы% ŋæPßđĸł„»“æ}¹↓£³→²',
      rawMessage: '😂👍©ĸðМжЪы% ŋæPßđĸł„»“æ}¹↓£³→²'
    })
  })
  it('Non-ASCII data with paymentId', async () => {
    const script = ('6a' + '04' + '50415900' + '00' + '3e' +
      'f09f9882f09f918dc2a9c4b8c3b0d09cd0b6d0aad18b2520c58bc3a650c39fc491c4b8c582e2809ec2bbe2809cc3a67dc2b9e28693c2a3c2b3e28692c2b2' +
      '08' + 'ab192bcafd745acd'
    )
    const data = getNullDataScriptData(script)
    expect(data).toStrictEqual({
      paymentId: 'ab192bcafd745acd',
      message: '😂👍©ĸðМжЪы% ŋæPßđĸł„»“æ}¹↓£³→²',
      rawMessage: '😂👍©ĸðМжЪы% ŋæPßđĸł„»“æ}¹↓£³→²'
    })
  })
  it('String data with paymentId', async () => {
    const script = '6a' + '04' + '50415900' + '00' + '08' + '5051525354555657' + '03' + '010203'
    const data = getNullDataScriptData(script)
    expect(data).toStrictEqual({
      paymentId: '010203',
      message: 'PQRSTUVW',
      rawMessage: 'PQRSTUVW'
    })
  })
  it('String data with explicitly empty paymentId', async () => {
    const script = '6a' + '04' + '50415900' + '00' + '08' + '5051525354555657' + '00'
    const data = getNullDataScriptData(script)
    expect(data).toStrictEqual({
      paymentId: '',
      message: 'PQRSTUVW',
      rawMessage: 'PQRSTUVW'
    })
  })
  it('Ignore incomplete paymentId', async () => {
    const script = '6a' + '04' + '50415900' + '00' + '08' + '5051525354555657' + '03' + 'aabb'
    const data = getNullDataScriptData(script)
    expect(data).toStrictEqual({
      paymentId: '',
      message: 'PQRSTUVW',
      rawMessage: 'PQRSTUVW'
    })
  })
})

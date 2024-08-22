import * as v from 'utils/validators'
import { RESPONSE_MESSAGES } from 'constants/index'
import { Prisma } from '@prisma/client'
import { exampleAddresses } from 'tests/utils'
import { PostDataParameters } from 'services/triggerService'

describe('parseAddress', () => {
  it('Accept example addresses without prefix', () => {
    for (const [key, value] of Object.entries(exampleAddresses)) {
      expect(v.parseAddress(value)).toStrictEqual(key + ':' + value)
    }
  })
  it('Accept example addresses with prefix', () => {
    for (const [key, value] of Object.entries(exampleAddresses)) {
      expect(v.parseAddress(key + ':' + value)).toStrictEqual(key + ':' + value)
    }
  })

  it('Accept example address uppercase', () => {
    expect(
      v.parseAddress(exampleAddresses.ecash.toUpperCase())
    ).toStrictEqual('ecash:' + exampleAddresses.ecash)
  })

  it('Accept example address with uppercase characters in network', () => {
    expect(
      v.parseAddress('eCaSh:' + exampleAddresses.ecash)
    ).toStrictEqual('ecash:' + exampleAddresses.ecash)
    expect(
      v.parseAddress('BITCOINCASH:' + exampleAddresses.bitcoincash)
    ).toStrictEqual('bitcoincash:' + exampleAddresses.bitcoincash)
  })

  it('Reject address with disallowed characters', () => {
    expect(() => {
      v.parseAddress((
        'ecash:qpz274aaj98xxnnkus8hzv367za28j900c7tv5v8pc\n' + // this is valid
        'bitcoincash:qz0dqjf6w6dp0lcs8cc68s720q9dv5zv8cs1fc0lt4' // this has '1' in it
      ))
    }).toThrow(RESPONSE_MESSAGES.INVALID_ADDRESS_400.message)
    expect(() => {
      v.parseAddress((
        'ecash:qpz274aaj98xxnnkus8hzv367za28j900c7tv5v8pc\n' + // this is valid
        'bitcoincash:qz0dqjf6w6dp0lcs8cc68s720q9dv5zv8csbfc0lt4' // this has 'b' in it
      ))
    }).toThrow(RESPONSE_MESSAGES.INVALID_ADDRESS_400.message)
    expect(() => {
      v.parseAddress((
        'ecash:qpz274aaj98xxnnkus8hzv367za28j900c7tv5v8pc\n' + // this is valid
        'bitcoincash:qz0dqjf6w6dp0lcs8cc68s720q9dv5zv8csifc0lt4' // this has 'i' in it
      ))
    }).toThrow(RESPONSE_MESSAGES.INVALID_ADDRESS_400.message)
    expect(() => {
      v.parseAddress((
        'ecash:qpz274aaj98xxnnkus8hzv367za28j900c7tv5v8pc\n' + // this is valid
        'bitcoincash:qz0dqjf6w6dp0lcs8cc68s720q9dv5zv8csofc0lt4' // this has 'o' in it
      ))
    }).toThrow(RESPONSE_MESSAGES.INVALID_ADDRESS_400.message)
  })

  it('Reject address with wrong network prefix', () => {
    expect(() => {
      v.parseAddress('bitcoincash:' + exampleAddresses.ecash)
    }).toThrow(RESPONSE_MESSAGES.INVALID_ADDRESS_400.message)
    expect(() => {
      v.parseAddress('bitcoincash:' + exampleAddresses.bchtest)
    }).toThrow(RESPONSE_MESSAGES.INVALID_ADDRESS_400.message)
    expect(() => {
      v.parseAddress('ecash:' + exampleAddresses.bitcoincash)
    }).toThrow(RESPONSE_MESSAGES.INVALID_ADDRESS_400.message)
    expect(() => {
      v.parseAddress('ecash:' + exampleAddresses.ectest)
    }).toThrow(RESPONSE_MESSAGES.INVALID_ADDRESS_400.message)
    expect(() => {
      v.parseAddress('bchtest:' + exampleAddresses.bitcoincash)
    }).toThrow(RESPONSE_MESSAGES.INVALID_ADDRESS_400.message)
    expect(() => {
      v.parseAddress('ectest:' + exampleAddresses.ecash)
    }).toThrow(RESPONSE_MESSAGES.INVALID_ADDRESS_400.message)
  })

  it('Reject mixed case address', () => {
    expect(v.parseAddress(exampleAddresses.ecash.toUpperCase())).toStrictEqual('ecash:' + exampleAddresses.ecash)
    expect(() => {
      v.parseAddress((
        'bitcoincash:Qrju9PGZn3m84q57ldjvxph30zrm8q7dlc8r8a3eyp'
      ))
    }).toThrow(RESPONSE_MESSAGES.INVALID_ADDRESS_400.message)
  })

  it('Reject legacy address', () => {
    expect(() => {
      v.parseAddress((
        'ecash:1Nkmzb49MCUJThkpNWaVX9xCPmZvMKeu7Q'
      ))
    }).toThrow(RESPONSE_MESSAGES.INVALID_ADDRESS_400.message)
  })

  it('Reject non-supported network', () => {
    expect(() => {
      v.parseAddress((
        'bitcoin:qrju9pgzn3m84q57ldjvxph30zrm8q7dlc8r8a3eyp'
      ))
    }).toThrow(RESPONSE_MESSAGES.INVALID_ADDRESS_400.message)
  })

  it('Reject empty string', () => {
    expect(() => {
      v.parseAddress('')
    }).toThrow(RESPONSE_MESSAGES.ADDRESS_NOT_PROVIDED_400.message)
  })
})

describe('parseError', () => {
  it('Prisma unique name constraint violation turns into custom error', () => {
    const error = new Prisma.PrismaClientKnownRequestError(
      'Error message: Paybutton_name_providerUserId_unique_constraint',
      { code: 'P2002', clientVersion: 'foo' }
    )
    expect(v.parseError(error)).toStrictEqual(new Error(RESPONSE_MESSAGES.PAYBUTTON_NAME_ALREADY_EXISTS_400.message))
  })
})

describe('parseButtonData', () => {
  it('Empty values give empty JSON string', () => {
    expect(v.parseButtonData(undefined)).toBe('{}')
    expect(v.parseButtonData('')).toBe('{}')
    expect(v.parseButtonData('{}')).toBe('{}')
  })
  it('Invalid JSON string throws error', () => {
    expect(() => {
      v.parseButtonData('bla')
    }).toThrow(RESPONSE_MESSAGES.INVALID_BUTTON_DATA_400.message)
    expect(() => {
      v.parseButtonData('{bla:2}')
    }).toThrow(RESPONSE_MESSAGES.INVALID_BUTTON_DATA_400.message)
    expect(() => {
      v.parseButtonData('{"bla": 2')
    }).toThrow(RESPONSE_MESSAGES.INVALID_BUTTON_DATA_400.message)
  })
  it('Valid JSON string returns itself minimized', () => {
    const expectedJSONString = '{"bla":3,"foo":"bar"}'
    expect(v.parseButtonData(expectedJSONString)).toBe(expectedJSONString)
    expect(v.parseButtonData('{"bla": 3, "foo": "bar"}')).toBe(expectedJSONString)
    expect(v.parseButtonData('{"bla":\n3,      "foo"\n: "bar"  } ')).toBe(expectedJSONString)
  })
})

describe('parsePaybuttonPOSTRequest', () => {
  const data: v.PaybuttonPOSTParameters = {
    userId: undefined,
    name: 'somename',
    buttonData: undefined,
    addresses: 'ecash:qz0dqjf6w6dp0lcs8cc68s720q9dv5zv8cs8fc0lt4'
  }
  it('Missing userId throws errors', () => {
    expect(() => {
      v.parsePaybuttonPOSTRequest(data)
    }).toThrow(RESPONSE_MESSAGES.USER_ID_NOT_PROVIDED_400.message)
    expect(() => {
      data.userId = ''
      v.parsePaybuttonPOSTRequest(data)
    }).toThrow(RESPONSE_MESSAGES.USER_ID_NOT_PROVIDED_400.message)
  })
  it('Missing name throws errors', () => {
    expect(() => {
      data.userId = 'some user'
      data.name = undefined
      v.parsePaybuttonPOSTRequest(data)
    }).toThrow(RESPONSE_MESSAGES.NAME_NOT_PROVIDED_400.message)
    expect(() => {
      data.name = ''
      v.parsePaybuttonPOSTRequest(data)
    }).toThrow(RESPONSE_MESSAGES.NAME_NOT_PROVIDED_400.message)
  })
  it('Missing address throws errors', () => {
    expect(() => {
      data.name = 'some name'
      data.addresses = ''
      v.parsePaybuttonPOSTRequest(data)
    }).toThrow(RESPONSE_MESSAGES.ADDRESSES_NOT_PROVIDED_400.message)
  })
})

describe('parsePaybuttonPATCHRequest', () => {
  const data: v.PaybuttonPOSTParameters = {
    name: 'somename',
    addresses: undefined,
    userId: 'mocked-uid'
  }
  it('Invalid addresses throws error', () => {
    expect(() => {
      data.addresses = 'ecash:lkajsdl\nll'
      v.parsePaybuttonPATCHRequest(data, 'mocked-paybuton-uuid')
    }).toThrow(RESPONSE_MESSAGES.INVALID_ADDRESS_400.message)
  })
  it('Addresses text is split', () => {
    data.addresses = `ecash:${exampleAddresses.ecash}\nbitcoincash:${exampleAddresses.bitcoincash}`
    const res = v.parsePaybuttonPATCHRequest(data, 'mocked-paybuton-uuid')
    expect(res.prefixedAddressList).toStrictEqual([
      `ecash:${exampleAddresses.ecash}`,
      `bitcoincash:${exampleAddresses.bitcoincash}`
    ])
  })
})

export interface PaybuttonTriggerPOSTParameters {
  userId?: string
  sendEmail?: boolean
  postURL?: string
  postData?: string
}

describe('parsePaybuttonTriggerPOSTRequest', () => {
  const data: PaybuttonTriggerPOSTParameters = {
    userId: '12345',
    sendEmail: true
  }

  it('Invalid postData JSON throws error', () => {
    expect(() => {
      v.parsePaybuttonTriggerPOSTRequest({ ...data, postData: 'invalid_json' })
    }).toThrow(RESPONSE_MESSAGES.INVALID_DATA_JSON_400.message)
  })

  it('Invalid if URL with protocol other than http', () => {
    expect(() => {
      v.parsePaybuttonTriggerPOSTRequest({ ...data, postURL: 'ftp://example.com' })
    }).toThrow(RESPONSE_MESSAGES.INVALID_URL_400.message)
  })

  it('Invalid URL throws error', () => {
    expect(() => {
      v.parsePaybuttonTriggerPOSTRequest({ ...data, postURL: 'invalid_url' })
    }).toThrow(RESPONSE_MESSAGES.INVALID_URL_400.message)
  })

  it('Invalid if postData but no postURL', () => {
    expect(() => {
      v.parsePaybuttonTriggerPOSTRequest({ ...data, postData: '{"key": "value"}' })
    }).toThrow(RESPONSE_MESSAGES.POST_URL_AND_DATA_MUST_BE_SET_TOGETHER_400.message)
  })

  it('Invalid if postURL but no postData', () => {
    expect(() => {
      v.parsePaybuttonTriggerPOSTRequest({ ...data, postURL: 'http://example.com' })
    }).toThrow(RESPONSE_MESSAGES.POST_URL_AND_DATA_MUST_BE_SET_TOGETHER_400.message)
  })

  it('Invalid if no postURL and no postData', () => {
    expect(() => {
      v.parsePaybuttonTriggerPOSTRequest({ ...data })
    }).toThrow(RESPONSE_MESSAGES.POST_URL_AND_DATA_MUST_BE_SET_TOGETHER_400.message)
  })
})

describe('parseStringToArray', () => {
  it('Divides simple three items', () => {
    const str = 'one|two|three'
    expect(v.parseStringToArray(str)).toEqual(['one', 'two', 'three'])
  })
  it('Returns string if backslashed', () => {
    const str = 'one\\|two'
    expect(v.parseStringToArray(str)).toEqual('one|two')
  })
  it('Returns Array with backslashed string at beginning', () => {
    const str = 'one\\|two|three|four'
    expect(v.parseStringToArray(str)).toEqual(['one|two', 'three', 'four'])
  })
  it('Returns Array with backslashed string at end', () => {
    const str = 'one|two|three\\|four'
    expect(v.parseStringToArray(str)).toEqual(['one', 'two', 'three|four'])
  })
  it('Returns Array with backslashed string at middle', () => {
    const str = 'one|two\\|three|four'
    expect(v.parseStringToArray(str)).toEqual(['one', 'two|three', 'four'])
  })
})

describe('parseOpReturn', () => {
  it('Cant parse equal sign at end', () => {
    const opReturnData = 'key=value something='
    expect(v.parseOpReturnData(opReturnData)).toEqual('key=value something=')
  })
  it('Cant parse equal sign at end and beginning', () => {
    const opReturnData = '=something key=value='
    expect(v.parseOpReturnData(opReturnData)).toEqual('=something key=value=')
  })
  it('Cant parse equal sign at beginning', () => {
    const opReturnData = '=something key=value'
    expect(v.parseOpReturnData(opReturnData)).toEqual('=something key=value')
  })
  it('Can parse equal sign as value', () => {
    const opReturnData = 'key=value something=='
    expect(v.parseOpReturnData(opReturnData)).toEqual({
      key: 'value',
      something: '='
    })
  })
  it('Cant parse equal sign as key', () => {
    const opReturnData = '==something key=value'
    expect(v.parseOpReturnData(opReturnData)).toEqual('==something key=value')
  })
  it('Cant parse if not ALL parsable', () => {
    const opReturnData = 'so=far so=good but=then notparsable'
    expect(v.parseOpReturnData(opReturnData)).toEqual('so=far so=good but=then notparsable')
  })
  it('Simple parse', () => {
    const opReturnData = 'sofar=sogood'
    expect(v.parseOpReturnData(opReturnData)).toEqual(
      {
        sofar: 'sogood'
      }
    )
  })
  it('Parses case sensitively', () => {
    const opReturnData = 'soFar=soGood'
    expect(v.parseOpReturnData(opReturnData)).toEqual(
      {
        soFar: 'soGood'
      }
    )
  })
  it('Parses key=value and array', () => {
    const opReturnData = 'sofar=sogood many=item1|item2|item3'
    expect(v.parseOpReturnData(opReturnData)).toEqual(
      {
        sofar: 'sogood',
        many: ['item1', 'item2', 'item3']
      }
    )
  })
  it('Parses array with backslash', () => {
    const opReturnData = 'sofar=sogood many=item1|item2\\|item3'
    expect(v.parseOpReturnData(opReturnData)).toEqual(
      {
        sofar: 'sogood',
        many: ['item1', 'item2|item3']
      }
    )
  })
  it('Parses array', () => {
    const opReturnData = 'item1|item2|item3'
    expect(v.parseOpReturnData(opReturnData)).toEqual(
      ['item1', 'item2', 'item3']
    )
  })
  it('Consider only first equal sign on key=value', () => {
    const opReturnData = 'key=value=othervalue'
    expect(v.parseOpReturnData(opReturnData)).toEqual({
      key: 'value=othervalue'
    })
  })
  it('Parses simple JSON', () => {
    const opReturnData = '{"foo": "bar"}'
    expect(v.parseOpReturnData(opReturnData)).toEqual({
      foo: 'bar'
    })
  })
  it('Parses nested JSON', () => {
    const opReturnData = '{"foo": {"bar": {"baz": {"qux": "qix"}}}}'
    const result = v.parseOpReturnData(opReturnData)
    expect(result).toEqual({
      foo: {
        bar: {
          baz: {
            qux: 'qix'
          }
        }
      }
    })
  })
  it('Parses number string into string', () => {
    // This large number, if interpreted as a number and not as a string,
    // will come out as 9007199254740996 due to floating point approximation
    const opReturnData = '9007199254740995'
    const result = v.parseOpReturnData(opReturnData)
    expect(result).toStrictEqual('9007199254740995')
  })
  it('Parses number string into string', () => {
    // JSON.parse would consider this as `0`
    const opReturnData = '-0'
    const result = v.parseOpReturnData(opReturnData)
    expect(result).toStrictEqual('-0')
  })
  it('Parses exponential number string into string', () => {
    // JSON.parse would consider this as `100000`
    const opReturnData = '10e5'
    const result = v.parseOpReturnData(opReturnData)
    expect(result).toStrictEqual('10e5')
  })
  it('Parses empty string into empty string', () => {
    const opReturnData = ''
    const result = v.parseOpReturnData(opReturnData)
    expect(result).toStrictEqual('')
  })
})

describe('Signature payload', () => {
  const params: PostDataParameters = {
    amount: new Prisma.Decimal(12),
    currency: 'XEC',
    timestamp: 123456789,
    txId: 'mocked-txid',
    buttonName: 'Button Name',
    address: 'ecash:mockedhexaddr',
    opReturn: {
      message: 'my custom opReturn data',
      paymentId: '123paymentId',
      rawMessage: 'my custom opReturn data'
    }
  }
  it('Gets payload for single variable', () => {
    const postData = '{"myVar": 3, "amount": <amount>}'
    const result = v.exportedForTesting.getSignaturePayload(postData, params)
    expect(result).toEqual('12')
  })
  it('Gets payload for two variables', () => {
    const postData = '{"myVar": 3, "amount": <amount>, "ts": <timestamp>}'
    const result = v.exportedForTesting.getSignaturePayload(postData, params)
    expect(result).toEqual('12+123456789')
  })
  it('Gets payload for three variables', () => {
    const postData = '{"id": <txId>, "myVar": 3, "amount": <amount>, "ts": <timestamp>}'
    const result = v.exportedForTesting.getSignaturePayload(postData, params)
    expect(result).toEqual('12+123456789+mocked-txid')
  })
  it('Gets payload for four variables', () => {
    const postData = '{"id": <txId>, "myVar": 3, "OP_RETURN": <opReturn>, "amount": <amount>, "ts": <timestamp>}'
    const result = v.exportedForTesting.getSignaturePayload(postData, params)
    expect(result).toEqual('12+my custom opReturn data+123paymentId+123456789+mocked-txid')
  })
  it('Gets payload for five variables', () => {
    const postData = '{"id": <txId>, "myVar": 3, "OP_RETURN": <opReturn>, "name": <buttonName>, "amount": <amount>, "ts": <timestamp>}'
    const result = v.exportedForTesting.getSignaturePayload(postData, params)
    expect(result).toEqual('12+Button Name+my custom opReturn data+123paymentId+123456789+mocked-txid')
  })
  it('Gets payload for six variables', () => {
    const postData = '{"id": <txId>, "coin": <currency>, "myVar": 3, "OP_RETURN": <opReturn>, "name": <buttonName>, "amount": <amount>, "ts": <timestamp>}'
    const result = v.exportedForTesting.getSignaturePayload(postData, params)
    expect(result).toEqual('12+Button Name+XEC+my custom opReturn data+123paymentId+123456789+mocked-txid')
  })
  it('Gets payload for six variables with empty opReturn', () => {
    const params: PostDataParameters = {
      amount: new Prisma.Decimal(12),
      currency: 'XEC',
      timestamp: 123456789,
      txId: 'mocked-txid',
      buttonName: 'Button Name',
      address: 'ecash:mockedhexaddr',
      opReturn: {
        message: '',
        paymentId: '',
        rawMessage: ''
      }
    }
    const postData = '{"id": <txId>, "coin": <currency>, "myVar": 3, "OP_RETURN": <opReturn>, "name": <buttonName>, "amount": <amount>, "ts": <timestamp>}'
    const result = v.exportedForTesting.getSignaturePayload(postData, params)
    expect(result).toEqual('12+Button Name+XEC+++123456789+mocked-txid')
  })
  it('Gets payload for all seven variables', () => {
    const postData = '{"id": <txId>, "coin": <currency>, "myVar": 3, "OP_RETURN": <opReturn>, "to": <address>, "name": <buttonName>, "amount": <amount>, "ts": <timestamp>}'
    const result = v.exportedForTesting.getSignaturePayload(postData, params)
    expect(result).toEqual('ecash:mockedhexaddr+12+Button Name+XEC+my custom opReturn data+123paymentId+123456789+mocked-txid')
  })
})

describe('Sign post data', () => {
  const params: PostDataParameters = {
    amount: new Prisma.Decimal(12),
    currency: 'XEC',
    timestamp: 123456789,
    txId: 'mocked-txid',
    buttonName: 'Button Name',
    address: 'ecash:mockedhexaddr',
    opReturn: {
      message: 'my custom opReturn data',
      paymentId: '123paymentId',
      rawMessage: 'my custom opReturn data'
    }
  }
  it('Sign full payload', () => {
    const postData = '{"id": <txId>, "coin": <currency>, "myVar": 3, "OP_RETURN": <opReturn>, "to": <address>, "name": <buttonName>, "amount": <amount>, "ts": <timestamp>}'
    const result = v.signPostData({
      userId: 'test-uid',
      postData,
      postDataParameters: params
    })
    expect(result).toStrictEqual({
      signature: '23459a7946ecec218cbc9417d5e9b7614db94602bff650aa22be0ee056347cfd62669105487e893c4148f6b7eedee89d521ddb56611b36728e50d074d832fb04',
      payload: 'ecash:mockedhexaddr+12+Button Name+XEC+my custom opReturn data+123paymentId+123456789+mocked-txid'
    })
  })
})

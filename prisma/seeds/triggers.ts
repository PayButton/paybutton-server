export const paybuttonTriggers = [
  {
    id: '78f98695-b887-11ee-a146-0242c0a88003',
    paybuttonId: '688e9bfa-b887-11ee-a146-0242c0a88003',
    sendEmail: false,
    postData: `{
      "env": "dev",
      "opReturn": <opReturn>,
      "name": <buttonName>,
      "address": <address>,
      "amount": <amount>,
      "timestamp": <timestamp>,
      "currency": <currency>,
      "secret":  "06d1b75746d5be25f9ebb345a887c08698ebe0fe605b51c22c0c04fe57150f24"
    }`,
    postURL: 'http://192.168.128.1:3003/paymentReceived'
  }
]
// "secret" is to be used by staking; of course this value shouldn't be used in prod

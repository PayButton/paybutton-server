import { Tx } from 'chronik-client'

export const mockedChronikTransactions: Tx[] = [
  {
    txid: '0d5a7564e2a9772620603c1b185343a3772577b66c037f388df42427c516af93',
    version: 2,
    inputs: [
      {
        prevOut: {
          txid: 'ee19a9b6736be645330364ec4e04d5f2220344a8cec9ef7f7edc1cf59e6378d0',
          outIdx: 1
        },
        inputScript: '473044022004e8fddb7df4832b935ac7b9b92e146b6e79eefc15c78230be2f5ff09de132ff02207d2e0e578b9eec8b805d81d18f0a4332211b2136c1915e35652e5d9f9e97614141210309ff271f1b185911a34b5dc184af39a9ff8b513f9689d9d1d541c9274df72e41',
        outputScript: '76a914568be1580596a355f1ae5c4dfaa317fae204920588ac',
        value: '3321349',
        sequenceNo: 4294967295,
        slpBurn: undefined,
        slpToken: undefined
      }
    ],
    outputs: [
      {
        value: '2468',
        outputScript: '76a914f7bf65aee4ab24f973611122096423faf0199ff088ac',
        slpToken: undefined,
        spentBy: undefined
      },
      {
        value: '3318604',
        outputScript: '76a914b175a25dda930d1d7c9a11243125bf9852718f6888ac',
        spentBy: {
          txid: '126480c2029c6fd7ade179751ab5e21b41190848710c527fbd8b9f279079b26e',
          outIdx: 0
        },
        slpToken: undefined
      }
    ],
    lockTime: 0,
    block: {
      height: 679416,
      hash: '0000000000000000540035c8cdc5e88bd771209c24e6b5161348952893b50dda',
      timestamp: '1616902919'
    },
    timeFirstSeen: '0',
    size: 225,
    isCoinbase: false,
    network: 'XEC',
    slpErrorMsg: undefined,
    slpTxData: undefined
  }, {
    txid: 'bd56e6aaa8aa71e5239ec89fef8ddb7b91e9cf5a321102232967046f94ee0be9',
    version: 2,
    inputs: [
      {
        prevOut: {
          txid: '7e7ea1252c734a3045961279262b68d12efba6f2a8c569cb798789728992f0c7',
          outIdx: 1
        },
        inputScript: '483045022100895e389c4ce9322fa4b203bf6e90e23604ff58c125625d02b7ecd8b79524796702204eed994ba836befec6dbe81f5aa874ffa5b8e5d0f30ea7c767b3a5ae0ecb624d412102fa58bffe6400c7fb67b73e8ba1816e679dc92fbfe620eb3ce52fc2cef20b54a3',
        outputScript: '76a914f78b43e81de78912d1ef639f459495179798f06588ac',
        value: '3339802',
        sequenceNo: 4294967295,
        slpBurn: undefined,
        slpToken: undefined
      }
    ],
    outputs: [
      {
        value: '2168',
        outputScript: '76a914f7bf65aee4ab24f973611122096423faf0199ff088ac',
        slpToken: undefined,
        spentBy: undefined
      },
      {
        value: '3337357',
        outputScript: '76a914a411c0874257abd92b4966b258a2507c21a4dcb288ac',
        spentBy: {
          txid: '39975eaab8d7142a68c5d34e8a97262fc2746490dc31b104a3f9dccb1e338ce5',
          outIdx: 0
        },
        slpToken: undefined
      }
    ],
    lockTime: 0,
    block: {
      height: 675308,
      hash: '0000000000000000656d5ce75f625d823b9a0c7840a0c353b47d742ff0935876',
      timestamp: '1614551234'
    },
    timeFirstSeen: '0',
    size: 226,
    isCoinbase: false,
    network: 'XEC',
    slpErrorMsg: undefined,
    slpTxData: undefined
  }
]

import React, { FunctionComponent, useState } from 'react'
import { Transaction } from '@prisma/client'
import style from './transaction.module.css'
import moment from 'moment'
import { copyText } from 'utils/general'
import CopyIcon from 'assets/copy.png'
import Image from 'next/image'

interface IProps {
  transaction: Transaction
  address: String
  isBreakpoint: Boolean
}

export default ({ transaction, address, isBreakpoint }: IProps): FunctionComponent => {
  const ecashAddress = address.slice(0, 5) === 'ecash'
  const url = ecashAddress ? 'https://explorer.e.cash/tx/' : 'https://blockchair.com/bitcoin-cash/transaction/'
  const [copied, setCopied] = useState(false)

  const changeText = () => {
    setCopied(true)
    setTimeout(function () {
      setCopied(false)
    }, 1000)
  }

  return (
    <div className={style.transaction_row}>
      <div>{moment(transaction.timestamp * 1000).format('lll')}</div>
      <div className={style.hash_cell}>
        <a id={transaction.hash.slice(0, 10)} href={url + transaction.hash} target="_blank" rel="noopener noreferrer" className={style.explorer_link}>
        {isBreakpoint ? transaction.hash.slice(0, 4) + '...' + transaction.hash.slice(58, 64) : transaction.hash}
        </a>
        <div className={style.copy_btn} onClick={() => { copyText(transaction.hash.slice(0, 10)); changeText() }}>
          <Image src={CopyIcon} alt='copy' width={15} height={18} />
          <span className={style.tooltiptext2}>{copied ? 'Copied!' : 'Copy to clipboard'}</span>
        </div>
      </div>
      <div>{parseFloat(transaction.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })} {ecashAddress ? 'XEC' : 'BCH'}</div>
    </div>
  )
}

import React, { FunctionComponent } from 'react'
import { Transaction } from '@prisma/client'
import style from './transaction.module.css'

interface IProps {
  transaction: Transaction
  address: String
}
export default ({ transaction, address }: IProps): FunctionComponent => {
  const ecashAddress = address.slice(0, 5) === 'ecash'
  const url = ecashAddress ? 'https://explorer.e.cash/tx/' : 'https://blockchair.com/bitcoin-cash/transaction/'
  return (
    <div className={style.transaction_row}>
      <div>{transaction.timestamp}</div>
      <div>
        <a href={url + transaction.hash} target="_blank" rel="noopener noreferrer" className={style.explorer_link}>
        {transaction.hash.slice(0,10) + '...' + transaction.hash.slice(54,64)}
        </a>
      </div>
      <div>{parseFloat(transaction.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })} {ecashAddress ? 'XEC' : 'BCH'}</div>
    </div>
  )
}

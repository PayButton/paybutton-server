import React, { FunctionComponent } from 'react'
import { Transaction } from '@prisma/client'
import { TransactionDetail } from 'components/Transaction'
import style from './transaction.module.css'

interface IProps {
  transactions: Transaction[]
  address: String
}

export default ({ transactions, address }: IProps): FunctionComponent => { 
  return (
    <div>
      <div className={style.transactiontable_header}>
        { transactions.length === 0 ? "No transactions yet" :
        <>
          <div>Timestamp</div>
          <div>Hash</div>
          <div>Amount</div>
        </>
        }
      </div>
      {transactions.map(transaction => (
        <TransactionDetail key={transaction.hash} transaction={transaction} address={address} />
      ))}
    </div>
  )
}

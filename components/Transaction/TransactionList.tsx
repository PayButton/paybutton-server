import React, { FunctionComponent } from 'react'
import { Transaction } from '@prisma/client'
import { TransactionDetail } from 'components/Transaction'
import style from './transaction.module.css'

interface IProps {
  transactions: Transaction[]
}

export default ({ transactions }: IProps): FunctionComponent => {
  return (
    <div>
      <div className={style.transactiontable_header}>
        <div>Timestamp</div>
        <div>ID</div>
        <div>Amount</div>
      </div>
      {transactions.map(transaction => (
        <TransactionDetail key={transaction.hash} transaction={transaction} />
      ))}
    </div>
  )
}

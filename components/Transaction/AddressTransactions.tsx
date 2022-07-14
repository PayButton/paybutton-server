import React, { FunctionComponent } from 'react'
import { Transaction } from '@prisma/client'
import { TransactionList } from 'components/Transaction'

interface IProps {
  addressTransactions: {
    [address: string]: Transaction
  }
}
export default ({ addressTransactions }: IProps): FunctionComponent => {
  return (
    <section>
      {Object.keys(addressTransactions).map(transactionAddress => (
        <li key={transactionAddress}>
          <TransactionList transactions={addressTransactions[transactionAddress]} />
        </li>
      ))}
    </section>
  )
}

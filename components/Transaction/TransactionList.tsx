import React, { FunctionComponent } from 'react'
import { Transaction } from '@prisma/client'
import { TransactionDetail } from 'components/Transaction'

interface IProps {
  transactions: Transaction[]
}
export default ({ transactions }: IProps): FunctionComponent => {
  return (
    <section>
      {transactions.map(transaction => (
        <TransactionDetail key={transaction.hash} transaction={transaction} />
      ))}
    </section>
  )
}

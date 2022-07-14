import React, { FunctionComponent } from 'react'
import { Transaction } from '@prisma/client'

interface IProps {
  transaction: Transaction
}
export default ({ transaction }: IProps): FunctionComponent => {
  return (
    <section>
      <h3>hash: {transaction.hash}</h3>
      <li>
        id: {transaction.id}
      </li>
      <li>
        amount: {transaction.amount}
      </li>
      <li>
        ts: {transaction.timestamp}
      </li>
    </section>
  )
}

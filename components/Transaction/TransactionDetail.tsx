import React, { FunctionComponent } from 'react'
import { Transaction } from '@prisma/client'

interface IProps {
  transaction: Transaction
}
export default ({ transaction }: IProps): FunctionComponent => {
  return (
    <section>
      <h3> {transaction.hash}</h3>
      <li>
        {transaction.id}
      </li>
      <li>
        {transaction.amount}
      </li>
      <li>
        {transaction.timestamp}
      </li>
    </section>
  )
}

import React, { FunctionComponent } from 'react'
import { Transaction } from '@prisma/client'
import style from './transaction.module.css'

interface IProps {
  transaction: Transaction
}
export default ({ transaction }: IProps): FunctionComponent => {
  return (
    <div className={style.transaction_row}>
      <div>{transaction.timestamp}</div>
      <div>{transaction.id}</div>
      <div>{transaction.amount}</div>
    </div>
  )
}

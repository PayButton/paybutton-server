import React, { FunctionComponent } from 'react'
import { Transaction } from '@prisma/client'
import { TransactionList } from 'components/Transaction'
import style from './transaction.module.css'

interface IProps {
  addressTransactions: {
    [address: string]: Transaction
  }
}
export default ({ addressTransactions }: IProps): FunctionComponent => {
  return (
    <>
      {Object.keys(addressTransactions).map(transactionAddress => (
        <div key={transactionAddress} className={style.transaction_ctn}>
          <TransactionList transactions={addressTransactions[transactionAddress]} />
        </div>
      ))}
    </>
  )
}

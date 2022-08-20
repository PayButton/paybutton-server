import React, { FunctionComponent, useEffect, useState, useCallback } from 'react'
import { Transaction } from '@prisma/client'
import { TransactionDetail } from 'components/Transaction'
import style from './transaction.module.css'

interface IProps {
  transactions: Transaction[]
  address: String
}

export default ({ transactions, address }: IProps): FunctionComponent => {
  const useMediaQuery = (width) => {
    const [targetReached, setTargetReached] = useState(false)
    const updateTarget = useCallback((e) => {
      if (e.matches) {
        setTargetReached(true)
      } else {
        setTargetReached(false)
      }
    }, [])

    useEffect(() => {
      const media = window.matchMedia(`(max-width: ${width}px)`)
      media.addEventListener('change', e => updateTarget(e))
      if (media.matches) {
        setTargetReached(true)
      }
      return () => media.removeEventListener('change', e => updateTarget(e))
    }, [])
    return targetReached
  }

  const isBreakpoint = useMediaQuery(1200)

  return (
    <div>
      <div className={style.transactiontable_header}>
        { transactions.length === 0
          ? 'No transactions yet'
          : <>
          <div>Date <span>(Local time)</span></div>
          <div>Hash</div>
          <div>Amount</div>
        </>
        }
      </div>
      {transactions.map(transaction => (
        <TransactionDetail key={transaction.hash} transaction={transaction} address={address} isBreakpoint={isBreakpoint} />
      ))}
    </div>
  )
}

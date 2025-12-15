import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react'
import Image from 'next/image'
import XECIcon from 'assets/xec-logo.png'
import BCHIcon from 'assets/bch-logo.png'
import EyeIcon from 'assets/eye-icon.png'
import CheckIcon from 'assets/check-icon.png'
import XIcon from 'assets/x-icon.png'
import CopyIcon from 'assets/copy-black.png'

import TableContainerGetter, { DataGetterReturn } from '../TableContainer/TableContainerGetter'
import { compareNumericString, formatAddressWithEllipsis } from 'utils/index'
import moment from 'moment-timezone'
import { XEC_TX_EXPLORER_URL, BCH_TX_EXPLORER_URL } from 'constants/index'
import style from './transaction.module.css'

interface IProps {
  addressSyncing: {
    [address: string]: boolean
  }
  paybuttonId: string
  tableRefreshCount: number
  timezone: string
}

function fetchTransactionsByPaybuttonId (paybuttonId: string): (page: number, pageSize: number, orderBy: string, orderDesc: boolean) => Promise<DataGetterReturn> {
  return async (page: number, pageSize: number, orderBy: string, orderDesc: boolean) => {
    const response = await fetch(`/api/paybutton/transactions/${paybuttonId}?page=${page}&pageSize=${pageSize}&orderBy=${orderBy}&orderDesc=${String(orderDesc)}`, {
      headers: {
        Timezone: moment.tz.guess()
      }
    })
    const responseCount = await fetch(`/api/paybutton/transactions/count/${paybuttonId}`)
    const transactions = await response.json()
    const count = await responseCount.json()
    return {
      data: transactions.transactions,
      totalCount: count
    }
  }
}

export default ({ paybuttonId, addressSyncing, tableRefreshCount, timezone = moment.tz.guess() }: IProps): JSX.Element => {
  const [localRefreshCount] = useState(tableRefreshCount)
  const [copiedRowId, setCopiedRowId] = useState('')
  const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleCopyClick = useCallback(async (address: string, rowId: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(address)
      setCopiedRowId(rowId)
      if (copyTimeoutRef.current != null) {
        clearTimeout(copyTimeoutRef.current)
      }
      copyTimeoutRef.current = setTimeout(() => {
        setCopiedRowId('')
        copyTimeoutRef.current = null
      }, 1200)
    } catch (error) {
      console.error('Copy failed:', error)
    }
  }, [])

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current != null) {
        clearTimeout(copyTimeoutRef.current)
      }
    }
  }, [])

  const columns = useMemo(
    () => [
      {
        Header: 'Confirmed',
        accessor: 'confirmed',
        Cell: (cellProps) => {
          return <div className='table-conf-icon'>{cellProps.cell.value === true ? <Image src={CheckIcon} alt='confirmed' /> : <Image src={XIcon} alt='unconfirmed' />}</div>
        }
      },
      {
        Header: 'Date',
        accessor: 'timestamp',
        Cell: (cellProps) => {
          return <div className='table-date'>{moment(cellProps.cell.value * 1000).tz(timezone).format('lll')}</div>
        }
      },
      {
        Header: () => (<div style={{ textAlign: 'right' }}>Amount</div>),
        accessor: 'amount',
        sortType: compareNumericString,
        Cell: (cellProps) => {
          return <div style={{ textAlign: 'right', fontWeight: '600' }}>{parseFloat(cellProps.cell.value).toLocaleString(
            undefined,
            {
              minimumFractionDigits: cellProps.row.values['address.networkId'] === 1 ? 2 : 8,
              maximumFractionDigits: cellProps.row.values['address.networkId'] === 1 ? 2 : 8
            }
          )
            } {cellProps.row.values['address.networkId'] === 1 ? 'XEC' : 'BCH' }</div>
        }
      },
      {
        Header: () => (<div style={{ textAlign: 'center' }}>Network</div>),
        accessor: 'address.networkId',
        Cell: (cellProps) => {
          return (
            <div className='table-icon-ctn'>
              <div className='table-icon'>
              {cellProps.cell.value === 1 ? <Image src={XECIcon} alt='XEC' /> : <Image src={BCHIcon} alt='BCH' />}
              </div>
            </div>
          )
        }
      },
      {
        Header: () => (<div style={{ textAlign: 'center' }}>TX</div>),
        accessor: 'hash',
        disableSortBy: true,
        Cell: (cellProps) => {
          const url = cellProps.cell.row.values['address.networkId'] === 1 ? XEC_TX_EXPLORER_URL : BCH_TX_EXPLORER_URL
          return (
            <div className="table-eye-ctn">
              <a href={url.concat(cellProps.cell.value)} target="_blank" rel="noopener noreferrer">
                <div className="table-eye">
                  <Image src={EyeIcon} alt='View on explorer' />
                </div>
              </a>
            </div>
          )
        }
      },
      {
        Header: () => (<div style={{ marginRight: '1px' }}>Address</div>),
        accessor: 'address.address',
        shrinkable: true,
        Cell: (cellProps) => {
          const address = cellProps.cell.value
          const rowId = cellProps.row.id
          return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
              <span style={{ textAlign: 'right' }}>{formatAddressWithEllipsis(address)}</span>
              <div
                className={style.copy_btn}
                onClick={(e) => {
                  e.stopPropagation()
                  e.preventDefault()
                  void handleCopyClick(address, rowId)
                }}
              >
                <Image src={CopyIcon} alt='copy address' width={14} height={14} />
                <span className={`${style.tooltiptext2} ${copiedRowId === rowId ? style.tooltiptext2Visible : ''}`}>
                  Copied!
                </span>
              </div>
            </div>
          )
        }
      }
    ],
    [copiedRowId, handleCopyClick]
  )
  return (
    <div className={style.transactionsTable}>
      <TableContainerGetter columns={columns} dataGetter={fetchTransactionsByPaybuttonId(paybuttonId)} tableRefreshCount={localRefreshCount} emptyMessage={'No transactions.'}/>
    </div>
  )
}

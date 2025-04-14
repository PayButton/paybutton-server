import React, { useMemo } from 'react'
import Image from 'next/image'
import XECIcon from 'assets/xec-logo.png'
import BCHIcon from 'assets/bch-logo.png'
import EyeIcon from 'assets/eye-icon.png'
import CheckIcon from 'assets/check-icon.png'
import XIcon from 'assets/x-icon.png'
import TableContainerGetter from '../../components/TableContainer/TableContainerGetter'
import { compareNumericString } from 'utils/index'
import moment from 'moment-timezone'
import { XEC_TX_EXPLORER_URL, BCH_TX_EXPLORER_URL } from 'constants/index'

interface IProps {
  addressSyncing: {
    [address: string]: boolean
  }
  paybuttonId: string
  tableRefreshCount: number
  timezone: string
}

function fetchTransactionsByPaybuttonId (paybuttonId: string): Function {
  return async (page: number, pageSize: number, orderBy: string, orderDesc: boolean) => {
    const response = await fetch(`/api/paybutton/transactions/${paybuttonId}?page=${page}&pageSize=${pageSize}&orderBy=${orderBy}&orderDesc=${String(orderDesc)}`, {
      headers: {
        Timezone: moment.tz.guess()
      }
    })
    const responseCount = await fetch(`/api/paybutton/transactions/count/${paybuttonId}`)
    const transactions = await response.json();
    const count = await responseCount.json();
    return {
      data: transactions.transactions,
      totalCount: count
    }
  }
}

export default ({ paybuttonId, addressSyncing, tableRefreshCount, timezone = moment.tz.guess() }: IProps): JSX.Element => {
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
        Header: 'TX',
        accessor: 'hash',
        disableSortBy: true,
        Cell: (cellProps) => {
          const url = cellProps.cell.row.values['address.networkId'] === 1 ? XEC_TX_EXPLORER_URL : BCH_TX_EXPLORER_URL
          return (
            <a href={url.concat(cellProps.cell.value)} target="_blank" rel="noopener noreferrer" className="table-eye-ctn">
              <div className="table-eye">
                <Image src={EyeIcon} alt='View on explorer' />
              </div>
            </a>
          )
        }
      },
      {
        Header: () => (<div>Address</div>),
        accessor: 'address.address',
        shrinkable: true,
        Cell: (cellProps) => {
          return (
            <div>
              {cellProps.cell.value}
            </div>
          )
        }
      },
    ],
    []
  )
  return (
    <>
      <TableContainerGetter columns={columns} dataGetter={fetchTransactionsByPaybuttonId(paybuttonId)} tableRefreshCount={tableRefreshCount} emptyMessage={'No transactions.'}/>
    </>
  )
}

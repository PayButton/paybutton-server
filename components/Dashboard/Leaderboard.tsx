import TableContainer from 'components/TableContainer'
import Image from 'next/image'
import { useMemo } from 'react'
import { PaymentDataByButton } from 'redis/dashboardCache'
import style from '../Transaction/transaction.module.css'
import XECIcon from 'assets/xec-logo.png'
import BCHIcon from 'assets/bch-logo.png'
import moment from 'moment'
import { USD_QUOTE_ID } from 'constants/index'
import { formatQuoteValue } from 'utils'

interface IProps {
  buttons: PaymentDataByButton
}

export default ({ buttons }: IProps): JSX.Element => {
  const columns = useMemo(
    () => [
      {
        Header: 'Active Networks',
        accessor: 'displayData',
        Cell: (cellProps) => {
          return <div style={{ textAlign: 'left', fontWeight: '600' }} className='table-icon'>
            {cellProps.cell.value.isXec === true && <div><Image src={XECIcon} alt='XEC' /></div>}
            {cellProps.cell.value.isBch === true && <div><Image src={BCHIcon} alt='BCH' /></div>}
            </div>
        }
      },
      {
        Header: 'Name',
        id: 'name',
        accessor: 'displayData',
        Cell: (cellProps) => {
          return <div >
            <a href={`/button/${cellProps.cell.value.id as string}`}>{cellProps.cell.value.name}</a>
            </div>
        }
      },
      {
        Header: 'Last Payment Received',
        accessor: 'displayData.lastPayment',
        Cell: (cellProps) => {
          return <div >{moment(cellProps.cell.value * 1000).fromNow()}</div>
        }
      },
      {
        Header: () => (<div style={{ textAlign: 'right' }}>Total Revenue</div>),
        accessor: 'total.revenue',
        id: 'revenue',
        Cell: (cellProps) => {
          return <div style={{ textAlign: 'right', fontWeight: '600' }}>
            {'$'.concat(formatQuoteValue(cellProps.cell.value, USD_QUOTE_ID))}
          </div>
        }
      },
      {
        Header: () => (<div style={{ textAlign: 'right' }}>Total Payments</div>),
        accessor: 'total.payments',
        Cell: (cellProps) => {
          return <div style={{ textAlign: 'right', fontWeight: '600' }}>{cellProps.cell.value}</div>
        }
      }
    ],
    []
  )
  const buttonList = Object.keys(buttons).map(k => buttons[k])
  return (
      <div>
        { buttons.length === 0
          ? <div className={style.transaction_ctn}>No buttons yet</div>
          : <TableContainer columns={columns} data={buttonList} opts={{ sortColumn: 'revenue' }}/>
        }
      </div>
  )
}

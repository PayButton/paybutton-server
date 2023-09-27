import TableContainer from 'components/TableContainer'
import Image from 'next/image'
import { useMemo } from 'react'
import { PaymentDataByButton } from 'redis/dashboardCache'
import style from '../Transaction/transaction.module.css'
import XECIcon from 'assets/xec-logo.png'
import BCHIcon from 'assets/bch-logo.png'

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
        accessor: 'displayData.name',
        Cell: (cellProps) => {
          return <div >{cellProps.cell.value}</div>
        }
      },
      {
        Header: () => (<div style={{ textAlign: 'right' }}>Total Payments</div>),
        accessor: 'total.payments',
        Cell: (cellProps) => {
          return <div style={{ textAlign: 'right', fontWeight: '600' }}>{cellProps.cell.value}</div>
        }
      },
      {
        Header: 'Total Revenue',
        accessor: 'total.revenue',
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
          : <TableContainer columns={columns} data={buttonList} />
        }
      </div>
  )
}

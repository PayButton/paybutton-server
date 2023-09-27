import TableContainer from 'components/TableContainer'
import { useMemo } from 'react'
import { ButtonData } from 'redis/dashboardCache'
import style from '../Transaction/transaction.module.css'

interface IProps {
  buttons: ButtonData[]
}

export default ({ buttons }: IProps): JSX.Element => {
  const columns = useMemo(
    () => [
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
  return (
      <div>
        { buttons.length === 0
          ? <div className={style.transaction_ctn}>No buttons yet</div>
          : <TableContainer columns={columns} data={buttons} />
        }
      </div>
  )
}

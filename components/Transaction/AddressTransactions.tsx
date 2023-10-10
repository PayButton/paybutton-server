import React, { FunctionComponent, useMemo } from 'react'
import { Transaction } from '@prisma/client'
import style from './transaction.module.css'
import Image from 'next/image'
import XECIcon from 'assets/xec-logo.png'
import BCHIcon from 'assets/bch-logo.png'
import EyeIcon from 'assets/eye-icon.png'
import CheckIcon from 'assets/check-icon.png'
import XIcon from 'assets/x-icon.png'
import { formatQuoteValue } from 'utils/index'
import TableContainer from '../../components/TableContainer'
import moment from 'moment'

interface IProps {
  addressTransactions: {
    [address: string]: Transaction
  }
  addressSynced: {
    [address: string]: boolean
  }
}

export default ({ addressTransactions, addressSynced }: IProps): FunctionComponent => {
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
          return <div className='table-date'>{moment(cellProps.cell.value * 1000).format('lll')}</div>
        }
      },
      {
        Header: () => (<div style={{ textAlign: 'right' }}>Amount</div>),
        accessor: 'amount',
        Cell: (cellProps) => {
          return <div style={{ textAlign: 'right', fontWeight: '600' }}>{formatQuoteValue(cellProps.cell.value)} {cellProps.row.values.address.networkId === 1 ? 'XEC' : 'BCH' }</div>
        }
      },
      {
        Header: () => (<div style={{ textAlign: 'center' }}>Network</div>),
        accessor: 'address',
        Cell: (cellProps) => {
          return (
            <div className='table-icon-ctn'>
              <div className='table-icon'>
              {cellProps.cell.value.networkId === 1 ? <Image src={XECIcon} alt='XEC' /> : <Image src={BCHIcon} alt='BCH' />}
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
          const url = cellProps.cell.row.values.address.networkId === 1 ? 'https://explorer.e.cash/tx/' : 'https://blockchair.com/bitcoin-cash/transaction/'
          return (
            <a href={url.concat(cellProps.cell.value)} target="_blank" rel="noopener noreferrer" className="table-eye-ctn">
              <div className="table-eye">
                <Image src={EyeIcon} alt='View on explorer' />
              </div>
            </a>
          )
        }
      }
    ],
    []
  )
  return (
    <>
      {Object.keys(addressTransactions).map(transactionAddress => (
        <div key={transactionAddress} className='address-transactions-ctn'>
          <div className={style.tablelabel}>
            <div>{transactionAddress}</div>
            <a href={transactionAddress.slice(0, 5) === 'ecash' ? `https://explorer.e.cash/address/${transactionAddress}` : `https://blockchair.com/bitcoin-cash/address/${transactionAddress}`} target="_blank" rel="noopener noreferrer" className="table-eye-ctn">
              <div className="table-eye">
                <Image src={EyeIcon} alt='View on explorer' />
              </div>
            </a>
          </div>
          { addressTransactions[transactionAddress].length === 0
            ? <div className={style.transaction_ctn}> {
              addressSynced[transactionAddress] ? 'No transactions yet' : 'Syncing address...'
              }
            </div>
            : <TableContainer columns={columns} data={addressTransactions[transactionAddress]} />
        }
        </div>

      ))}
    </>
  )
}

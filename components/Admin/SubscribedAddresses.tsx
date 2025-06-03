import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import EyeIcon from 'assets/eye-icon.png'
import TableContainer from 'components/TableContainer/TableContainer'

export default function SubscribedAddresses (): JSX.Element {
  const [ecashSubscribedAddresses, setEcashSubscribedAddresses] = useState<string[]>([])
  const [bitcoincashSubscribedAddresses, setBitcoincashSubscribedAddresses] = useState<string[]>([])

  useEffect(() => {
    void (async () => {
      const ok = await (await fetch('chronikStatus')).json()
      const subscribedEcashAddresses = ok.ecash?.map((value: string) => ({ address: value }))
      const subscribedBitcoincashAddresses = ok.bitcoincash?.map((value: string) => ({ address: value }))
      setEcashSubscribedAddresses(subscribedEcashAddresses)
      setBitcoincashSubscribedAddresses(subscribedBitcoincashAddresses)
    })()
  }, [])

  const columns = useMemo(
    () => [
      {
        Header: 'Subscribed addresses',
        accessor: 'address',
        Cell: (cellProps: any) => {
          return <div className="table-date">{cellProps.cell.value}</div>
        }
      },
      {
        Header: 'View',
        accessor: 'view',
        Cell: (cellProps: any) => {
          return <a href={`https://explorer.e.cash/address/${cellProps.cell.row.values.address as string}`} target="_blank" rel="noopener noreferrer" className="table-eye-ctn">
          <div className="table-eye">
            <Image src={EyeIcon} alt='View on explorer' />
          </div>
        </a>
        }
      }
    ],
    []
  )

  return <>
    <h2>Subscribed Addresses</h2>
        <h3> eCash</h3>
      <TableContainer columns={columns} data={ecashSubscribedAddresses ?? []} ssr/>
        <h3> Bitcoin Cash</h3>
      <TableContainer columns={columns} data={bitcoincashSubscribedAddresses ?? []} ssr/>
  </>
}

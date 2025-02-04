import React, { useState, useRef } from 'react'
import Link from 'next/link'
import { PaybuttonWithAddresses } from 'services/paybuttonService'
import style from './paybutton-detail.module.css'
import EditButtonForm from './EditButtonForm'
import XECIcon from 'assets/xec-logo.png'
import BCHIcon from 'assets/bch-logo.png'
import { XEC_NETWORK_ID, BCH_NETWORK_ID } from 'constants/index'
import Image from 'next/image'
import CopyIcon from '../../assets/copy-black.png'
import Arrow from 'assets/right-arrow.png'

export const paybuttonHasAddressOnNetwork = (paybutton: PaybuttonWithAddresses, networkId: number): boolean =>
  paybutton.addresses.some(addr => addr.address.networkId === networkId)

interface IProps {
  paybutton: PaybuttonWithAddresses
  refreshPaybutton: Function
  listView: boolean
}
export default ({ paybutton, refreshPaybutton, listView }: IProps): JSX.Element => {
  const [isCopied, setIsCopied] = useState('')
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleCopyClick = async (text: string): Promise<void> => {
    const textToCopy = text
    try {
      await navigator.clipboard.writeText(textToCopy)
      setIsCopied(text)
      if (timeoutRef.current != null) {
        clearTimeout(timeoutRef.current)
      }

      timeoutRef.current = setTimeout(() => {
        setIsCopied('')
        timeoutRef.current = null
      }, 1000)
    } catch (error) {
      console.error('Copy failed:', error)
    }
  }

  const CardContent = (): JSX.Element => {
    return (
      <>
        <label>Button Name</label>
        <div className={style.name_ctn}>
          <h3>{paybutton.name}</h3>
          {paybuttonHasAddressOnNetwork(paybutton, XEC_NETWORK_ID) && (
            <Image src={XECIcon} alt="XEC" width={25} height={25} />
          )}
          {paybuttonHasAddressOnNetwork(paybutton, BCH_NETWORK_ID) && (
            <Image src={BCHIcon} alt="BCH" width={25} height={25} />
          )}
        </div>
        <label className={style.label_margin}>
          Address{paybutton.addresses.length > 1 ? 'es' : ''}
        </label>
        {paybutton.addresses.map((item) => (
          <div className={style.address_ctn} key={item.address.address}>
            <div className={style.address}>
              {isCopied === item.address.address && (
                <div className={style.copied}>Copied!</div>
              )}
              {item.address.address.slice(
                0,
                item.address.address.startsWith('bitcoin') ? 16 : 10
              )}
              ...{item.address.address.slice(-5)}
            </div>
            <div
              className={style.copy_btn}
              onClick={(e) => {
                e.stopPropagation()
                e.preventDefault()
                void handleCopyClick(item.address.address)
              }}
            >
              <Image src={CopyIcon} alt="copy" width={15} height={15} />
            </div>
          </div>
        ))}

        {paybutton.url !== '' && (
          <>
            <label className={style.label_margin}>Website</label>
            <a
              href={paybutton.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(event) => event.stopPropagation()}
            >
              {paybutton.url}
            </a>
          </>
        )}
        {paybutton.description !== '' && (
          <>
            <label className={style.label_margin}>Description:</label>
            <div>{paybutton.description}</div>
          </>
        )}

        {!listView && (
          <EditButtonForm
            paybutton={paybutton}
            refreshPaybutton={refreshPaybutton}
          />
        )}

        {listView && (
          <Image
            src={Arrow}
            alt="arrow"
            width={15}
            height={26}
            className={style.arrow}
          />
        )}
      </>
    )
  }
  return listView
    ? (
    <Link className={style.paybutton_card} href={'button/' + paybutton.id}>
      <CardContent />
    </Link>
      )
    : (
    <div className={`${style.paybutton_card} ${style.paybutton_card_no_hover}`}>
      <CardContent />
    </div>
      )
}

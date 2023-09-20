import React from 'react'
import { PaybuttonWithAddresses } from 'services/paybuttonService'
import style from './paybutton.module.css'
import EditButtonForm from './EditButtonForm'
import XECIcon from 'assets/xec-logo.png'
import BCHIcon from 'assets/bch-logo.png'
import { XEC_NETWORK_ID, BCH_NETWORK_ID } from 'constants/index'
import Image from 'next/image'
import { checkNetwork } from './PaybuttonList'

interface IProps {
  paybutton: PaybuttonWithAddresses
  refreshPaybutton: Function
}
export default ({ paybutton, refreshPaybutton }: IProps): JSX.Element => {
  return (
    <div className={style.paybutton_list_ctn}>
      <div className={`${style.paybutton_card} ${style.paybutton_card_no_hover}`}>
        <div className={style.button_detail_header}>
        <div className={style.title}>
          <h5>{paybutton.name}</h5>
          <div className={style.walletcard_icons}>
            {checkNetwork(paybutton, XEC_NETWORK_ID) && <div><Image src={XECIcon} alt='XEC' /></div>}
            {checkNetwork(paybutton, BCH_NETWORK_ID) && <div><Image src={BCHIcon} alt='BCH' /></div>}
          </div>
        </div>
          <div>
            <EditButtonForm paybutton={paybutton} refreshPaybutton={refreshPaybutton}/>
          </div>
        </div>
          <div>
            {paybutton.addresses.map(item => (
              <div className={style.address} key={item.address.address}>
                {item.address.address}
              </div>
            ))}
          </div>
          {paybutton.url &&
          <div className={style.optional_label}>
            Website: <a href={paybutton.url} target="_blank"
            rel="noopener noreferrer">{paybutton.url}</a>
          </div>
          }
          {paybutton.description &&
          <div className={style.optional_label}>
            Description: {paybutton.description}
          </div>
          }
      </div>
    </div>
  )
}

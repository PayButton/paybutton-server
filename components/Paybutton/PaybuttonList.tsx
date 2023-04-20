import React, { FunctionComponent } from 'react'
import { PaybuttonWithAddresses } from 'services/paybuttonService'
import Image from 'next/image'
import style from './paybutton.module.css'
import Arrow from 'assets/right-arrow.png'
import XECIcon from 'assets/xec-logo.png'
import BCHIcon from 'assets/bch-logo.png'
import { XEC_NETWORK_ID, BCH_NETWORK_ID } from 'constants/index'

export const checkNetwork = (paybutton: any, ID: number): boolean => {
  if (paybutton.addresses.some(addr => addr.address.networkId === ID)) {
    return true
  } return false
}

interface IProps { paybuttons: PaybuttonWithAddresses[] }
export default ({ paybuttons }: IProps): FunctionComponent<IProps> => {
  return (
  <div className={style.paybutton_list_ctn}>
    {paybuttons.length === 0 && <div className={style.paybutton_nocard}>No buttons yet! Use the button below to create one</div>}
    {paybuttons.map(paybutton => (
      <a key={paybutton.id} href={'button/' + (paybutton.id as string)} className={style.paybutton_card}>
        <div className={style.title}>
          <h5>{paybutton.name}</h5>   
          <div className={style.walletcard_icons}>
            {checkNetwork(paybutton, XEC_NETWORK_ID) && <div><Image src={XECIcon} alt='XEC' /></div>}
            {checkNetwork(paybutton, BCH_NETWORK_ID) && <div><Image src={BCHIcon} alt='BCH' /></div>}
          </div>
        </div>
        <div>
          {paybutton.addresses.map(item => (
            <div className={style.address} key={item.address.address}>
              {item.address.address}
            </div>
          ))}
        </div>
        <div className={style.arrow}>
          <Image src={Arrow} alt='arrow' width={15} height={26} />
        </div>
      </a>
    ))}
  </div>)
}

import React, { FunctionComponent } from 'react'
import { PaybuttonWithAddresses } from 'services/paybuttonService'
import style from './paybutton.module.css'
import PaybuttonDetail from './PaybuttonDetail'

export const checkNetwork = (paybutton: any, ID: number): boolean => {
  if ((paybutton.addresses as []).some((addr: any) => addr.address.networkId === ID)) {
    return true
  } return false
}

interface IProps { paybuttons: PaybuttonWithAddresses[] }
export default ({ paybuttons }: IProps): FunctionComponent<IProps> => {
  return (
    <div className={style.paybutton_list_ctn}>
    {paybuttons.length === 0 && (
      <div className={style.paybutton_nocard}>
        No buttons yet! Use the button below to create one
      </div>
    )}
    {paybuttons.map((paybutton) => (
      <PaybuttonDetail paybutton={paybutton} listView={true} />
    ))}
  </div>
  )
}

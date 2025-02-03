import React, { FunctionComponent } from 'react'
import { PaybuttonWithAddresses } from 'services/paybuttonService'
import style from './paybutton.module.css'
import PaybuttonDetail from './PaybuttonDetail'

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
      <PaybuttonDetail paybutton={paybutton} listView={true} refreshPaybutton={() => {}} />
    ))}
  </div>
  )
}

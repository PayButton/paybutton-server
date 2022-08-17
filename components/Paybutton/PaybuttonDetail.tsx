import React, { FunctionComponent } from 'react'
import { Paybutton } from '@prisma/client'
import style from './paybutton.module.css'

interface IProps {
  paybutton: Paybutton
}
export default ({ paybutton }: IProps): FunctionComponent => {
  return (
    <div className={style.paybutton_list_ctn}>
      <div className={`${style.paybutton_card} ${style.paybutton_card_no_hover}`}>
          <h5>{paybutton.name}</h5>
          <div>
            {paybutton.addresses.map(item => (
              <div className={style.address} key={item.address.address}>
                {item.address.address}
              </div>
            ))}
          </div>
      </div>
    </div>
  )
}

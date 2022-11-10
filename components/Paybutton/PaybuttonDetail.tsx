import React, { FunctionComponent } from 'react'
import  { PaybuttonWithAddresses } from 'services/paybuttonService'
import style from './paybutton.module.css'
import EditButtonForm from './EditButtonForm'

interface IProps {
  paybutton: PaybuttonWithAddresses
  onDelete: Function
}
export default ({ paybutton, onDelete }: IProps): FunctionComponent => {
  return (
    <div className={style.paybutton_list_ctn}>
      <div className={`${style.paybutton_card} ${style.paybutton_card_no_hover}`}>
        <div className={style.button_detail_header}>
          <h5>{paybutton.name}</h5>
          <div>
            <EditButtonForm paybutton={paybutton} onDelete={onDelete} />
          </div>
        </div>
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

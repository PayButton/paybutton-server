import React, { FunctionComponent } from 'react'
import { PaybuttonWithAddresses } from 'services/paybuttonService'
import Image from 'next/image'
import style from './paybutton.module.css'
import Arrow from 'assets/right-arrow.png'

interface IProps {
  paybuttons: PaybuttonWithAddresses[]
  onDelete: Function
}

export default ({ paybuttons, onDelete }: IProps): FunctionComponent<IProps> =>
  <div className={style.paybutton_list_ctn}>
    {paybuttons.length === 0 && <div className={style.paybutton_nocard}>No buttons yet! Use the button below to create one</div>}
    {paybuttons.map(paybutton => (
      <div>
      <button onClick={() => { onDelete(paybutton.id) }}>delete button</button>
      <a key={paybutton.id} href={'button/' + (paybutton.id as string)} className={style.paybutton_card}>
        <h5>{paybutton.name}</h5>
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
      </div>
    ))}
  </div>

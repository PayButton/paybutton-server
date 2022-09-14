import React, { FunctionComponent } from 'react'
import style from './wallet.module.css'
import Link from 'next/link'
import Image from 'next/image'
import EditIcon from 'assets/edit-icon.png'
import XECIcon from 'assets/xec-logo.png'
import BCHIcon from 'assets/bch-logo.png'

interface IProps {
  walletInfo: {}
}
export default ({ walletInfo }: IProps): FunctionComponent => {
  return (
    <div className={style.wallet_card}>
      <div className={style.wallet_card_header_ctn}>
        <div className={style.wallet_card_header}>
          <h4>{walletInfo.name}</h4>
          <div className={style.walletcard_icons}>
            {walletInfo.xec_balance > 0 && <div><Image src={XECIcon} alt='XEC' /></div>}
            {walletInfo.bch_balance > 0 && <div><Image src={BCHIcon} alt='BCH' /></div>}
          </div>
        </div>
        <div className={style.edit_button}>
          <Image src={EditIcon} alt='edit' />
        </div>
      </div>

      <div className={style.info_ctn}>
      {walletInfo.xec_balance > 0 &&
        <div className={style.info_item}>
          <h6>XEC Balance</h6>
          <h5>{Number(walletInfo.xec_balance).toLocaleString()} XEC</h5>
        </div>
      }
      {walletInfo.bch_balance > 0 &&
        <div className={style.info_item}>
          <h6>BCH Balance</h6>
          <h5>{Number(walletInfo.bch_balance).toLocaleString()} BCH</h5>
        </div>
      }
        <div className={style.info_item}>
          <h6>Payments</h6>
          <h5>{walletInfo.payments}</h5>
        </div>

        <div className={style.info_item}>
          <h6>Buttons</h6>
          <div className={style.buttons_list_ctn}>
            {walletInfo.paybuttons.map(button =>
                <Link href={`/button/` + button.id}>{button.name}</Link>
            )}
          </div>
        </div>

      </div>

    </div>
  )
}

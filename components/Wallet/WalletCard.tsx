import React, { FunctionComponent } from 'react'
import style from './wallet.module.css'
import Link from 'next/link'
import Image from 'next/image'
import XECIcon from 'assets/xec-logo.png'
import BCHIcon from 'assets/bch-logo.png'
import EditWalletForm from './EditWalletForm'
import { WalletWithAddressesAndPaybuttons, WalletPaymentInfo } from 'services/walletService'

interface IProps {
  wallet: WalletWithAddressesAndPaybuttons
  paymentInfo: WalletPaymentInfo
}

export default ({ wallet, paymentInfo }: IProps): FunctionComponent => {
  const networks = wallet.addresses.map((addr) => addr.networkId)
  return (
    <div className={style.wallet_card}>
      <div className={style.wallet_card_header_ctn}>
        <div className={style.wallet_card_header}>
          <h4>{wallet.name}</h4>
          <div className={style.walletcard_icons}>
            {networks.includes(1) && <div><Image src={XECIcon} alt='XEC' /></div>}
            {networks.includes(2) && <div><Image src={BCHIcon} alt='BCH' /></div>}
          </div>
        </div>
        <div className={style.edit_button_ctn}>
          {wallet.default_wallet === true && <div className={style.default_wallet}>Default Wallet</div>}
          <EditWalletForm wallet={wallet} />
        </div>
      </div>

      <div className={style.info_ctn}>
      {paymentInfo.XECBalance > 0 &&
        <div className={style.info_item}>
          <h6>XEC Balance</h6>
          <h5>{Number(paymentInfo.XECBalance).toLocaleString()} XEC</h5>
        </div>
      }
      {paymentInfo.BCHBalance > 0 &&
        <div className={style.info_item}>
          <h6>BCH Balance</h6>
          <h5>{Number(paymentInfo.BCHBalance).toLocaleString()} BCH</h5>
        </div>
      }
        <div className={style.info_item}>
          <h6>Payments</h6>
          <h5>{paymentInfo.paymentCount}</h5>
        </div>

        <div className={style.info_item}>
          <h6>Buttons</h6>
          <div className={style.buttons_list_ctn}>
            {wallet.paybuttons.map(button =>
                <Link href={`/button/${button.id}`}>{button.name}</Link>
            )}
          </div>
        </div>

      </div>

    </div>
  )
}

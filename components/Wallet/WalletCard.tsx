import React, { FunctionComponent } from 'react'
import { Prisma } from '@prisma/client'
import style from './wallet.module.css'
import Link from 'next/link'
import Image from 'next/image'
import XECIcon from 'assets/xec-logo.png'
import BCHIcon from 'assets/bch-logo.png'
import EditWalletForm from './EditWalletForm'
import { WalletWithAddressesWithPaybuttons, WalletPaymentInfo } from 'services/walletService'
import { AddressWithPaybuttons } from 'services/addressService'
import { XEC_NETWORK_ID, BCH_NETWORK_ID } from 'constants/index'
import { UserNetworksInfo } from 'services/networkService'

interface IProps {
  wallet: WalletWithAddressesWithPaybuttons
  paymentInfo: WalletPaymentInfo
  userAddresses: AddressWithPaybuttons[]
  refreshWalletList: Function
  usedNetworks: UserNetworksInfo[]
}

const component: FunctionComponent<IProps> = ({ wallet, paymentInfo, userAddresses, refreshWalletList, usedNetworks }: IProps) => {
  const networks = wallet.userAddresses.map((addr) => addr.address.networkId)
  const differentPaybuttons = wallet.userAddresses.map(addr =>
    addr.address.paybuttons.map(conn => conn.paybutton)
  ).reduce(
    (accumulator, pbList) => accumulator.concat(pbList),
    []
  ).filter(
    (pb, index, self) => index === self.findIndex(p => p.id === pb.id)
  )
  const isSyncing = wallet.userAddresses.map(c => c.address.syncing).some((v) => v)
  return (
    <div className={style.wallet_card}>
      <div className={style.wallet_card_header_ctn}>
        <div className={style.wallet_card_header}>
          <h4>{wallet.name}</h4>
          <div className={style.walletcard_icons}>
            {networks.includes(XEC_NETWORK_ID) && <div><Image src={XECIcon} alt='XEC' /></div>}
            {networks.includes(BCH_NETWORK_ID) && <div><Image src={BCHIcon} alt='BCH' /></div>}
          </div>
        </div>
        <div className={style.edit_button_ctn}>
          {wallet.userProfile?.isXECDefault === true && usedNetworks.some(network => network.ticker === 'xec') && <div className={style.default_wallet}>Default XEC Wallet</div>}
          {wallet.userProfile?.isBCHDefault === true && usedNetworks.some(network => network.ticker === 'bch') && <div className={style.default_wallet}>Default BCH Wallet</div>}
          <EditWalletForm
            wallet={wallet}
            userAddresses={userAddresses}
            refreshWalletList={refreshWalletList}
            usedNetworks={usedNetworks}
          />
        </div>
      </div>

      <div className={style.info_ctn}>
        {
          isSyncing
            ? <p>Syncing transactions...</p>
            : <>
              { paymentInfo.XECBalance > new Prisma.Decimal(0) &&
              <div className={style.info_item}>
                <h6>XEC Balance</h6>
                <h5>{Number(paymentInfo.XECBalance).toLocaleString(navigator.language, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} XEC</h5>
              </div>
              }
              { paymentInfo.BCHBalance > new Prisma.Decimal(0) &&
              <div className={style.info_item}>
                <h6>BCH Balance</h6>
                <h5>{Number(paymentInfo.BCHBalance).toLocaleString(navigator.language, { minimumFractionDigits: 4, maximumFractionDigits: 4 })} BCH</h5>
              </div>
              }
            </>
        }
        <div className={style.info_item}>
          <h6>Payments</h6>
          <h5>{paymentInfo.paymentCount}</h5>
        </div>

        <div className={style.info_item}>
          <h6>Buttons</h6>
          <div className={style.buttons_list_ctn}>
            {differentPaybuttons.map(pb =>
            <Link href={`/button/${pb.id}`} key={pb.id}>{pb.name}</Link>
            )}
          </div>
        </div>

      </div>

    </div>
  )
}

export default component

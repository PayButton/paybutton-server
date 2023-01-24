import React, { ReactElement, useState, useEffect } from 'react'
import { PaybuttonWithAddresses } from 'services/paybuttonService'
import { useForm } from 'react-hook-form'
import { WalletPATCHParameters } from 'utils/validators'
import Image from 'next/image'
import style from '../Wallet/wallet.module.css'
import style_pb from '../Paybutton/paybutton.module.css'
import EditIcon from 'assets/edit-icon.png'
import { WalletWithAddressesAndPaybuttons } from 'services/walletService'
import { XEC_NETWORK_ID, BCH_NETWORK_ID } from 'constants/index'
import axios from 'axios'
import { appInfo } from 'config/appInfo'

interface IProps {
  wallet: WalletWithAddressesAndPaybuttons
  userPaybuttons: PaybuttonWithAddresses[]
  refreshWalletList: Function
}

export default function EditWalletForm ({ wallet, userPaybuttons, refreshWalletList }: IProps): ReactElement {
  const { register, handleSubmit, reset } = useForm<WalletPATCHParameters>()
  const [modal, setModal] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setModal(false)
    reset()
  }, [wallet, userPaybuttons])

  async function onSubmit (params: WalletPATCHParameters): Promise<void> {
    if (params.name === '' || params.name === undefined) {
      params.name = wallet.name
    }
    try {
      void await axios.patch(`${appInfo.websiteDomain}/api/wallet/${wallet.id}`, params)
      refreshWalletList()
      setError('')
    } catch (err: any) {
      setError(err.response.data.message)
    }
  }

  return (
    <>
      <div className={style.edit_button} onClick={() => setModal(true)}>
        <Image src={EditIcon} alt='edit' />
      </div>

      {modal
        ? (
          <div className={style_pb.form_ctn_outer}>
            <div className={style_pb.form_ctn_inner}>
              <h4>Edit {wallet.name}</h4>
              <div className={style_pb.form_ctn}>
                <form onSubmit={(e) => { void handleSubmit(onSubmit)(e) }} method='post'>
                  <label htmlFor='name'>Wallet Name</label>
                  <input
                    {...register('name')}
                    type='text'
                    id='name'
                    name='name'
                    placeholder={wallet.name}
                  />
                  <h4>Paybuttons</h4>
                  <div className={style.buttonlist_ctn}>
                    {userPaybuttons.map((pb, index) => (
                      <div className={style.input_field} key={`edit-pb-${pb.id}`}>
                        <input {...register('paybuttonIdList')}
                          type='checkbox'
                          value={pb.id}
                          id={`paybuttonIdList.${index}`}
                          defaultChecked={pb.walletId === wallet.id}
                        />
                        <label htmlFor={`paybuttonIdList.${index}`}>{pb.name}</label>
                      </div>
                    ))}
                  </div>
                  <div className={style.makedefault_ctn} key={`edit-wallet-${wallet.id}`}>
                    <div className={style.input_field}>
                      <input
                        {...register('isXECDefault')}
                        defaultChecked={wallet.userProfile?.isXECDefault === true}
                        type="checkbox"
                        name='isXECDefault'
                        disabled={
                          wallet.addresses.every((addr) => addr.networkId !== XEC_NETWORK_ID) ||
                          wallet.userProfile?.isXECDefault === true
                        }
                      />
                      <label htmlFor='xec-default' className={style.makedefault_margin}>Make Default XEC Wallet</label>
                    </div>
                    <div className={style.input_field}>
                      <input
                        {...register('isBCHDefault')}
                        defaultChecked={wallet.userProfile?.isBCHDefault === true}
                        type="checkbox"
                        name='isBCHDefault'
                        disabled={
                          wallet.addresses.every((addr) => addr.networkId !== BCH_NETWORK_ID) ||
                          wallet.userProfile?.isBCHDefault === true
                        }
                      />
                      <label htmlFor='bch-default' className={style.makedefault_margin}>Make Default BCH Wallet</label>
                    </div>
                  </div>
                  <div className={style_pb.btn_row}>
                    {error !== '' && <div className={style_pb.error_message}>{error}</div>}
                    <button type='submit'>Submit</button>
                    <button onClick={() => { setModal(false); reset() }} className={style_pb.cancel_btn}>Cancel</button>
                  </div>
                </form>
              </div>
            </div>
          </div>)
        : null}
    </>
  )
}

import React, { ReactElement, useState, useEffect } from 'react'
import { Paybutton } from '@prisma/client'
import { useForm } from 'react-hook-form'
import { WalletPATCHParameters } from 'utils/validators'
import Image from 'next/image'
import style from '../Paybutton/paybutton.module.css'
import s from '../Wallet/wallet.module.css'
import EditIcon from 'assets/edit-icon.png'
import { WalletWithAddressesAndPaybuttons } from 'services/walletService'
import { XEC_NETWORK_ID, BCH_NETWORK_ID } from 'constants/index'

interface IProps {
  wallet: WalletWithAddressesAndPaybuttons
  userPaybuttons: Paybutton[]
  refreshWalletList: Function
}

export default function EditWalletForm ({ wallet, userPaybuttons, refreshWalletList }: IProps): ReactElement {
  const { register, handleSubmit, reset } = useForm<WalletPATCHParameters>()
  const [modal, setModal] = useState(false)

  useEffect(() => {
    setModal(false)
    reset()
  }, [wallet, userPaybuttons])

  async function onSubmit (params: WalletPATCHParameters): Promise<void> {
    if (params.name === '' || params.name === undefined) {
      params.name = wallet.name
    }
    void await fetch(`/api/wallet/${wallet.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    })
    refreshWalletList()
  }

  return (
    <>
      <div className={s.edit_button} onClick={() => setModal(true)}>
        <Image src={EditIcon} alt='edit' />
      </div>

  {modal
    ? (
        <div className={style.form_ctn_outer}>
          <div className={style.form_ctn_inner}>
            <h4>Edit {wallet.name}</h4>
            <div className={style.form_ctn}>
              <form onSubmit={(e) => { void handleSubmit(onSubmit)(e) }} method='post'>
                <label htmlFor='name'>Wallet Name</label>
                <input
                    {...register('name')}
                    type='text'
                    id='name'
                    name='name'
                    placeholder={wallet.name}
                />
                <div className={s.makedefault_ctn} key={wallet.id}>
                  <div className={s.input_field}>
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
                    <label htmlFor='xec-default' className={s.makedefault_margin}>Make Default XEC Wallet</label>
                  </div>
                  <div className={s.input_field}>
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
                    <label htmlFor='bch-default' className={s.makedefault_margin}>Make Default BCH Wallet</label>
                  </div>
                </div>

      <h4>Paybuttons</h4>
      <div className={s.buttonlist_ctn}>
      {userPaybuttons.map((pb, index) => (
        <div className={s.input_field} key={`pb-${pb.id}`}>
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

                <div className={style.btn_row}>
                  <button type='submit'>Submit</button>
                  <button onClick={() => { setModal(false); reset() }} className={style.cancel_btn}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        </div>)
    : null}
    </>
  )
}

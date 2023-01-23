import React, { ReactElement, useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { WalletPOSTParameters } from 'utils/validators'
import { PaybuttonWithAddresses } from 'services/paybuttonService'
import { XEC_NETWORK_ID, BCH_NETWORK_ID } from 'constants/index'
import Image from 'next/image'
import style from '../Wallet/wallet.module.css'
import style_pb from 'components/Paybutton/paybutton.module.css'
import Plus from 'assets/plus.png'
import axios from 'axios'
import { appInfo } from 'config/appInfo'

interface IProps {
  userPaybuttons: PaybuttonWithAddresses[]
  refreshWalletList: Function
  userId: string
}

export default function WalletForm ({ userPaybuttons, refreshWalletList, userId }: IProps): ReactElement {
  const { register, handleSubmit, reset } = useForm<WalletPOSTParameters>()
  const [modal, setModal] = useState(false)
  const [isXECDefaultDisabled, setIsXECDefaultDisabled] = useState(true)
  const [isBCHDefaultDisabled, setIsBCHDefaultDisabled] = useState(true)
  const [error, setError] = useState('')
  const [selectedPaybuttonIdList, setSelectedPaybuttonIdList] = useState([] as string[])

  async function onSubmit (params: WalletPOSTParameters): Promise<void> {
    params.userId = userId
    try {
      void await axios.post(`${appInfo.websiteDomain}/api/wallet`, params)
      refreshWalletList()
      setError('')
    } catch (err: any) {
      setError(err.response.data.message)
    }
  }

  function handleSelectedPaybuttonsChange(checked: boolean, paybuttonId: string): void {
    if (selectedPaybuttonIdList.includes(paybuttonId) && checked === false) {
      setSelectedPaybuttonIdList(
        selectedPaybuttonIdList.filter(id => id !== paybuttonId)
      )
    }
    if (!selectedPaybuttonIdList.includes(paybuttonId) && checked === true) {
      setSelectedPaybuttonIdList(
        [...selectedPaybuttonIdList, paybuttonId]
      )
    }
  }

  function hasAddressForNetworkId(networkId: number): boolean {
    let ret = false
    if (selectedPaybuttonIdList === undefined) return false
    for (const selectedPaybuttonId of selectedPaybuttonIdList) {
      let paybutton = userPaybuttons.find((pb) => pb.id === Number(selectedPaybuttonId))
      if (
        paybutton !== undefined
        && paybutton.addresses.some((addr) => addr.address.networkId === networkId)
      ) {
        ret = true
        break
      }
    }
    return ret
  }

  function disableDefaultInputFields(): void {
    if (hasAddressForNetworkId(XEC_NETWORK_ID)) {
      setIsXECDefaultDisabled(false);
    } else {
      setIsXECDefaultDisabled(true);
      let el = document.getElementById("isXECDefault") as HTMLInputElement
      if (el === null) return
      el.checked = false
    }
    if (hasAddressForNetworkId(BCH_NETWORK_ID)) {
      setIsBCHDefaultDisabled(false);
    } else {
      setIsBCHDefaultDisabled(true);
      let el = document.getElementById("isBCHDefault") as HTMLInputElement
      if (el === null) return
      el.checked = false
    }
  }
  useEffect(() => {
    disableDefaultInputFields()
  }, [selectedPaybuttonIdList])

  useEffect(() => {
    setModal(false)
    reset()
  }, [userPaybuttons])

  return (
    <>
      <div className={style_pb.create_button_ctn}>
        <div className={style_pb.create_button} onClick={() => setModal(true)}>
          <Image src={Plus} alt='arrow' width={30} height={30} />
          <div className={style_pb.tooltiptext}>New Wallet</div>
        </div>
      </div>

      {modal
        ? (
          <div className={style_pb.form_ctn_outer}>
            <div className={style_pb.form_ctn_inner}>
              <h4>Create New Wallet</h4>
              <div className={style_pb.form_ctn}>
                <form onSubmit={handleSubmit(onSubmit)} method='post'>
                  <label htmlFor='name'>Wallet Name</label>
                  <input
                    {...register('name')}
                    type='text'
                    id='name'
                    name='name'
                  />

                  <h4>Paybuttons</h4>
                  <div className={style.buttonlist_ctn}>
                    {userPaybuttons.map((pb, index) => (
                      <div className={style.input_field} key={`create-pb-${pb.id}`}>
                        <input {...register('paybuttonIdList')}
                          type='checkbox'
                          value={pb.id}
                          id={`paybuttonIdList.${index}`}
                          disabled={
                            pb.walletId !== null
                            || pb.addresses.map((addr) => addr.address.walletId).some((id) => id !== null)
                          }
                         onChange={ (e) => handleSelectedPaybuttonsChange(e.target.checked, pb.id) }
                        />
                        <label htmlFor={`paybuttonIdList.${index}`}>{pb.name}</label>
                      </div>
                    ))}
                  </div>
                  <hr/>
                  <div className={style.makedefault_ctn} key={'wallet-create'}>
                    <div className={style.input_field}>
                      <input
                        {...register('isXECDefault')}
                        type="checkbox"
                        id='isXECDefault'
                        disabled={ isXECDefaultDisabled }
                      />
                      <label htmlFor='xec-default' className={style.makedefault_margin}>Make Default XEC Wallet</label>
                    </div>
                    <div className={style.input_field}>
                      <input
                        {...register('isBCHDefault')}
                        type="checkbox"
                        id='isBCHDefault'
                        disabled={ isBCHDefaultDisabled }
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

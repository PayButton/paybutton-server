import React, { ReactElement, useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { WalletPATCHParameters } from 'utils/validators'
import { PaybuttonWithAddresses } from 'services/paybuttonService'
import { XEC_NETWORK_ID, BCH_NETWORK_ID } from 'constants/index'
import Image from 'next/image'
import style from '../Wallet/wallet.module.css'
import style_pb from '../Paybutton/paybutton.module.css'
import EditIcon from 'assets/edit-icon.png'
import { WalletWithAddressesAndPaybuttons } from 'services/walletService'
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
  const [isXECDefaultDisabled, setIsXECDefaultDisabled] = useState(true)
  const [isBCHDefaultDisabled, setIsBCHDefaultDisabled] = useState(true)
  const [error, setError] = useState('')
  const thisWalletPaybuttonsIdList = userPaybuttons.filter(pb => pb.walletId === wallet.id).map(pb => pb.id)

  const [selectedPaybuttonIdList, setSelectedPaybuttonIdList] = useState(
    thisWalletPaybuttonsIdList
  )
  const [disabledPaybuttonList, setDisabledPaybuttonList] = useState([] as PaybuttonWithAddresses[])

  async function onSubmit (params: WalletPATCHParameters): Promise<void> {
    params.paybuttonIdList = selectedPaybuttonIdList
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

  function handleSelectedPaybuttonsChange (checked: boolean, paybuttonId: number): void {
    if (selectedPaybuttonIdList.includes(paybuttonId) && !checked) {
      setSelectedPaybuttonIdList(
        selectedPaybuttonIdList.filter(id => id !== paybuttonId)
      )
    }
    if (!selectedPaybuttonIdList.includes(paybuttonId) && checked) {
      setSelectedPaybuttonIdList(
        [...selectedPaybuttonIdList, paybuttonId]
      )
    }
  }

  function hasAddressForNetworkId (networkId: number): boolean {
    let ret = false
    if (selectedPaybuttonIdList === undefined) return false
    for (const selectedPaybuttonId of selectedPaybuttonIdList) {
      const paybutton = userPaybuttons.find((pb) => pb.id === selectedPaybuttonId)
      if (paybutton === undefined) {
        continue
      }
      if (paybutton.addresses.some((addr) => addr.address.networkId === networkId)) {
        ret = true
        break
      }
    }
    return ret
  }

  function disableDefaultInputFields (): void {
    if (hasAddressForNetworkId(XEC_NETWORK_ID)) {
      setIsXECDefaultDisabled(false)
    } else {
      setIsXECDefaultDisabled(true)
      const el = document.getElementById('isXECDefault') as HTMLInputElement
      if (el === null) return
      el.checked = false
    }
    if (hasAddressForNetworkId(BCH_NETWORK_ID)) {
      setIsBCHDefaultDisabled(false)
    } else {
      setIsBCHDefaultDisabled(true)
      const el = document.getElementById('isBCHDefault') as HTMLInputElement
      if (el === null) return
      el.checked = false
    }
  }

  const disableLastWalletPaybuttons = (): void => {
    const disabledPaybuttons = [] as PaybuttonWithAddresses[]
    for (const paybutton of userPaybuttons) {
      const paybuttonHasWallet = paybutton.walletId !== undefined && paybutton.walletId !== null
      if (paybuttonHasWallet) {
        const paybuttonIsSelected = selectedPaybuttonIdList.includes(paybutton.id)

        if (!paybuttonIsSelected) {
          const otherPaybuttonsOfSameWalletRemaining = userPaybuttons.filter(otherPb => {
            const otherPaybuttonIsSelected = selectedPaybuttonIdList.includes(otherPb.id)
            return (
              otherPb.walletId === paybutton.walletId &&
              otherPb.id !== paybutton.id &&
              !otherPaybuttonIsSelected
            )
          })
          if (otherPaybuttonsOfSameWalletRemaining.length === 0) {
            disabledPaybuttons.push(paybutton)
          }
        } else if (selectedPaybuttonIdList.length <= 1) {
          disabledPaybuttons.push(paybutton)
        }
      }
    }
    setDisabledPaybuttonList(
      disabledPaybuttons
    )
  }

  useEffect(() => {
    setModal(false)
    reset()
  }, [wallet, userPaybuttons])

  useEffect(() => {
    disableDefaultInputFields()
    disableLastWalletPaybuttons()
  }, [selectedPaybuttonIdList])

  useEffect(() => {
    setSelectedPaybuttonIdList(thisWalletPaybuttonsIdList)
    disableLastWalletPaybuttons()
  }, [modal])

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
                        <input
                          type='checkbox'
                          value={pb.id}
                          id={`paybuttonIdList.${index}`}
                          defaultChecked={pb.walletId === wallet.id}
                          disabled={
                            disabledPaybuttonList.map(pb => pb.id).includes(pb.id)
                          }
                          onChange={ (e) => handleSelectedPaybuttonsChange(e.target.checked, pb.id) }
                        />
                        <label htmlFor={`paybuttonIdList.${index}`}>{pb.name}</label>
                      </div>
                    ))}
                  </div>
                  <hr/>
                  <div className={style.makedefault_ctn} key={`edit-wallet-${wallet.id}`}>
                    <div className={style.input_field}>
                      <input
                        {...register('isXECDefault')}
                        defaultChecked={wallet.userProfile?.isXECDefault === true}
                        type="checkbox"
                        id='isXECDefault'
                        disabled={ isXECDefaultDisabled }
                      />
                      <label htmlFor='xec-default' className={style.makedefault_margin}>Make Default XEC Wallet</label>
                    </div>
                    <div className={style.input_field}>
                      <input
                        {...register('isBCHDefault')}
                        defaultChecked={wallet.userProfile?.isBCHDefault === true}
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

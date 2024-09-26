import { Organization } from '@prisma/client'
import { useState } from 'react'
import { UserWithSupertokens } from 'services/userService'
import style from './organization.module.css'

interface IProps {
  user: UserWithSupertokens
  setError: Function
  setOrg: Function
  org: Omit<Organization, 'createdAt' | 'updatedAt'>
}

const LeaveOrganization = ({ setError, setOrg, org }: IProps): JSX.Element => {
  const [isModalOpen, setModalOpen] = useState(false)

  const onLeave = async (): Promise<void> => {
    if (org !== null) {
      const res = await fetch('/api/organization/leave', {
        method: 'POST'
      })

      if (res.status === 200) {
        setOrg(null)
        setModalOpen(false)
        setError('')
      } else {
        const json = await res.json()
        setError(json.message)
      }
    }
  }

  const openModal = (): void => setModalOpen(true)
  const closeModal = (): void => setModalOpen(false)

  return (<>
    <div className={style.btn_ctn}>
      <button className={style.delete_btn} onClick={openModal}>
        Leave Organization
      </button>
    </div>
    {isModalOpen && (
      <div className={style.modal_overlay}>
        <div className={style.modal}>
          <h4>Confirm Exit</h4>
          <p>Are you sure you want to leave your organization? This action cannot be undone.</p>
          <div className={style.modal_buttons}>
            <button className={style.cancel_btn} onClick={closeModal}>
              Cancel
            </button>
            <button className={style.confirm_btn} onClick={() => { void onLeave() }}>
              Confirm
            </button>
          </div>
        </div>
      </div>
    )}
  </>
  )
}

export default LeaveOrganization

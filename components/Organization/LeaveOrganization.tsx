import { Organization } from '@prisma/client'
import { UserWithSupertokens } from 'services/userService'
import style from './organization.module.css'

interface IProps {
  user: UserWithSupertokens
  setError: Function
  setOrg: Function
  org: Omit<Organization, 'createdAt' | 'updatedAt'>
  setOrgEdit: Function
}

const LeaveOrganization = ({ setError, setOrg, org, setOrgEdit }: IProps): JSX.Element => {
  const onLeave = async (): Promise<void> => {
    if (org !== null) {
      const res = await fetch('/api/organization/leave', {
        method: 'POST'
      })

      if (res.status === 200) {
        setOrg(null)
        setError('')
        setOrgEdit('')
      } else {
        const json = await res.json()
        setError(json.message)
      }
    }
  }

  return (<>
    <div className={style.confirm_delete_ctn} style={{ marginTop: '40px' }}>
      <p>Are you sure you want to leave your organization?<br />This action cannot be undone.</p>
      <div className={style.confirm_delete_btn_ctn}>
      <button className={style.delete_btn} onClick={() => { void onLeave() }}>
          Yes, Leave Organization
        </button>
        <button className={style.cancel_btn} onClick={() => setOrgEdit('')}>
          Cancel
        </button>
        </div>
      </div>
  </>
  )
}

export default LeaveOrganization

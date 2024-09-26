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

const DeleteOrganization = ({ user, setError, setOrg, org, setOrgEdit }: IProps): JSX.Element => {
  const onDelete = async (): Promise<void> => {
    if (org !== null) {
      const res = await fetch(`/api/organization?organizationId=${org.id}`, {
        method: 'DELETE'
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
  <div className={style.confirm_delete_ctn}>
      <p>Are you sure you want to delete your organization?<br />This action cannot be undone.</p>
      <div className={style.confirm_delete_btn_ctn}>
      <button className={style.delete_btn} onClick={() => { void onDelete() }}>
          Yes, Delete Organization
        </button>
        <button className={style.cancel_btn} onClick={() => setOrgEdit('')}>
          Cancel
        </button>
        </div>
      </div>
    </>
  )
}

export default DeleteOrganization

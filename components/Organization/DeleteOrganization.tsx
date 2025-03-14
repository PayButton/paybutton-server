import { Organization } from '@prisma/client'
import { UserWithSupertokens } from 'services/userService'
import style from './organization.module.css'
import Button from 'components/Button'

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
      <p>Are you sure you want to delete your organization? This action cannot be undone.</p>
      <div className={style.confirm_delete_btn_ctn}>
        <Button variant='xs' onClick={() => setOrgEdit('')}>
          Cancel
        </Button>
        <Button variant='xs' onClick={() => { void onDelete() }} className='small_delete'>
          Yes, Delete Organization
        </Button>
        </div>
      </div>
    </>
  )
}

export default DeleteOrganization

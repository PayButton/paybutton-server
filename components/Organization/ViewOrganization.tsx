import { useState } from 'react'
import { UserWithSupertokens } from 'services/userService'
import CreateOrganization from './CreateOrganization'
import UpdateOrganization from './UpdateOrganization'
import DeleteOrganization from './DeleteOrganization'
import style from './organization.module.css'
import InviteLink from './InviteLink'
import LeaveOrganization from './LeaveOrganization'
import { Organization, UserProfile } from '@prisma/client'

interface IProps {
  user: UserWithSupertokens
  organization: Organization
  orgMembers: UserProfile[]
  setOrgMembers: Function
}

const ViewOrganization = ({ user, orgMembers, setOrgMembers, organization }: IProps): JSX.Element => {
  const [org, setOrg] = useState(organization)
  const [error, setError] = useState('')
  const [orgEdit, setOrgEdit] = useState('')

  return (
    <div className={style.org_ctn}>
      {org !== null && org.creatorId === user.userProfile.id
        ? (
        <>
          <div className={style.row_ctn}>
            <div>Organization Name</div>
            <div><b>{org.name}</b></div>
          </div>
          <div className={style.row_ctn}>
            <div>Role</div>
            <div><b>Manager</b></div>
          </div>
          <div className={style.row_ctn}>
            <div>Members</div>
            <div><b>{orgMembers.length}</b></div>
          </div>
          <div className={style.row_ctn}>
            <div>
              <b>Invite Link</b>
              <span>(expires in 24h)</span>
            </div>
            <InviteLink/>
          </div>
          <div className={style.sub_header}>Manage</div>
           {orgEdit === ''
             ? (
            <>
              <div className={style.row_ctn}>
                <div>Organization Name</div>
                <div
                  className={style.edit_btn}
                  onClick={() => setOrgEdit('name')}
                >
                  Edit Name
                </div>
              </div>
              <div className={style.row_ctn}>
                <div>Delete Organization</div>
                <div
                  className={style.delete_btn}
                  onClick={() => setOrgEdit('delete')}
                >
                  Delete Organization
                </div>
              </div>
            </>
               )
             : orgEdit === 'delete'
               ? (
            <DeleteOrganization
              user={user}
              setError={setError}
              org={org}
              setOrg={setOrg}
              setOrgEdit={setOrgEdit}
            />
                 )
               : (
            <UpdateOrganization
              user={user}
              setError={setError}
              setOrg={setOrg}
              setOrgEdit={setOrgEdit}
            />
                 )}
        </>
          )
        : org !== null
          ? (
        <>
           <div className={style.row_ctn}>
            <div>Organization Name</div>
            <div><b>{org.name}</b></div>
          </div>
          <div className={style.row_ctn}>
            <div>Role</div>
            <div><b>Member</b></div>
          </div>
           {orgEdit === ''
             ? (
            <div className={style.leave_btn_ctn}>
                <div
                  className={style.edit_btn}
                  onClick={() => setOrgEdit('leave')}
                >
                  Leave Organization
                </div>
            </div>
               )
             : (
            <LeaveOrganization user={user} setError={setError} org={org} setOrg={setOrg} setOrgEdit={setOrgEdit} />
               )}
        </>
            )
          : (
          <>
            <p>To join an organization, <b>ask the owner for an invite link.</b>
            <br />
            <br />
            Or create your own:
            </p>
            <CreateOrganization user={user} setError={setError} setOrg={setOrg} setOrgMembers={setOrgMembers}/>
          </>
            )}
      {error !== '' && <div className={style.error_message}>{error}</div>}
    </div>
  )
}

export default ViewOrganization

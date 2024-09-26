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

  return (
    <>
      {org !== null && org.creatorId === user.userProfile.id
        ? (
        <>
          You are the manager of <b>{org.name}</b> ({orgMembers.length} member{orgMembers.length === 1 ? '' : 's'}).

          <h5> Invite Link </h5>
          <InviteLink/>

          <h5> Manage </h5>
          <UpdateOrganization user={user} setError={setError} setOrg={setOrg} />
          <DeleteOrganization user={user} setError={setError} org={org} setOrg={setOrg} />
        </>
          )
        : org !== null
          ? (
        <>
          You are part of {org.name}.

        <br/>
          <LeaveOrganization user={user} setError={setError} org={org} setOrg={setOrg} />
        </>
            )
          : (
        <>
          <p>To join an organization, <b>ask the owner for an invite link.</b></p>
          <p>Or create your own:</p>
          <CreateOrganization user={user} setError={setError} setOrg={setOrg} setOrgMembers={setOrgMembers}/>
        </>
            )}
      {error !== '' && <div className={style.error_message}>{error}</div>}
    </>
  )
}

export default ViewOrganization

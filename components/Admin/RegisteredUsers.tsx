import { UserWithSupertokens } from 'services/userService'
import style from './admin.module.css'
import moment from 'moment'

interface IProps {
  users: UserWithSupertokens[]
}

export default ({ users }: IProps): JSX.Element => {
  if (users === undefined) return <></>
  return <table style={{ width: 500 }}>
      <thead>
        <tr>
          <th>Registered</th>
          <th>Email</th>
          <th>Admin</th>
        </tr>
      </thead>
      <tbody>
        {users.map(u => {
          if (u.stUser === undefined) {
            return <tr key={u.userProfile?.id}>
              <td>
                <span>NO ST USER FOUND</span>
              </td>
              <td>
                <span>{u.userProfile?.id}</span>
              </td>
              <td>
                {u.userProfile?.isAdmin === true ? <span className={style.admin}>Yes</span> : 'No'}
              </td>

            </tr>
          } else {
            return <tr key={u.stUser.id}>
            <td>
              <span> {moment(u.stUser.timeJoined).fromNow()} </span>
            </td>
            <td>
              <a href={`/api/auth/dashboard/?userid=${u.stUser.id}&recipeId=emailpassword`} target="_blank"><span className={style.userEmail}>{u.stUser.email}</span></a>
            </td>
            <td>
              {u.userProfile.isAdmin === true ? <span className={style.admin}>Yes</span> : 'No'}
            </td>
          </tr>
          }
        })}
    </tbody>
  </table>
}

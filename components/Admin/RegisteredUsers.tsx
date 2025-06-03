import { UserWithSupertokens } from 'services/userService'
import style from './admin.module.css'
import moment from 'moment'
import TableContainer from '../../components/TableContainer/TableContainer'
import { Cell, CellProps } from 'react-table'

interface IProps {
  users: UserWithSupertokens[]
}

export default function RegisteredUsers ({ users }: IProps): JSX.Element {
  if (users === undefined) return <></>

  const columns = [
    {
      Header: 'Registered',
      accessor: 'registered',
      Cell: ({ cell }: CellProps<UserWithSupertokens>) => <span>{cell.value}</span>
    },
    {
      Header: 'Email',
      accessor: 'email',
      Cell: ({ cell }: Cell<UserWithSupertokens>) => (
        <a
          href={`/api/auth/dashboard/?userid=${cell.row.original.id as string}&recipeId=emailpassword`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <span className={style.userEmail}>{cell.value}</span>
        </a>
      )
    },
    {
      Header: 'Admin',
      accessor: 'isAdmin',
      Cell: ({ cell }: CellProps<UserWithSupertokens>) => (
        cell.value === true ? <span className={style.admin}>Yes</span> : 'No'
      )
    }
  ]
  console.log({ users })
  const data = users.map(user => ({
    id: (user.stUser?.id === undefined || user.stUser?.id === '') ? user.userProfile?.id : user.stUser?.id,
    registered: (user.stUser != null) ? moment(user.stUser.timeJoined).fromNow() : 'NO ST USER FOUND',
    email: (user.stUser?.email === undefined || user.stUser?.email === '') ? user.userProfile?.id : user.stUser?.email,
    isAdmin: user.userProfile?.isAdmin
  }))

  return <>
    <h2>Registered Users</h2>
    <TableContainer columns={columns} data={data} ssr />
  </>
}

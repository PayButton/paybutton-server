import { useForm } from 'react-hook-form'
import { UserWithSupertokens } from 'services/userService'
import style from './organization.module.css'

interface IProps {
  user: UserWithSupertokens
  setError: Function
  setOrg: Function
  setOrgEdit: Function
}

interface UpdateOrganizationForm {
  name: string
}

const UpdateOrganization = ({ user, setError, setOrg, setOrgEdit }: IProps): JSX.Element => {
  const { register, handleSubmit, reset } = useForm<UpdateOrganizationForm>({})

  const onSubmit = async (params: any): Promise<void> => {
    const res = await fetch('/api/organization', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: params.name,
        userId: user.userProfile.id
      })
    })
    if (res.status === 200) {
      const data = await res.json()
      setOrg(data.organization)
      reset()
      setOrgEdit('')
    } else {
      const json = await res.json()
      setError(json.message)
    }
  }

  return (
    <form
      onSubmit={(e) => {
        void handleSubmit(onSubmit)(e)
      }}
      method="post"
    >
      <label className={style.label}>Change name</label>
      <div className={style.create_input_ctn}>
      <input
        {...register('name')}
        type="text"
        placeholder="Enter the new name for your organization."
        required
        className={style.text_input}
        autoFocus
      />
        <button className={style.add_btn} onClick={() => (false)}>
          Update
        </button>
      </div>
      <button className={style.cancel_btn} onClick={() => setOrgEdit('')}>
          Cancel
      </button>
    </form>
  )
}

export default UpdateOrganization

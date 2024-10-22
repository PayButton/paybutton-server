import { useForm } from 'react-hook-form'
import { UserWithSupertokens } from 'services/userService'
import style from './organization.module.css'

interface IProps {
  user: UserWithSupertokens
  setError: Function
  setOrg: Function
  setOrgMembers: Function
}

interface CreateOrganizationForm {
  name: string
  userId: string
}

const CreateOrganization = ({ user, setError, setOrg, setOrgMembers }: IProps): JSX.Element => {
  const { register, handleSubmit } = useForm<CreateOrganizationForm>({
  })

  const onSubmit = async (params: any): Promise<void> => {
    const res = await fetch('/api/organization', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: params.name,
        creatorId: user.userProfile.id
      })
    })
    if (res.status === 200) {
      const data = await res.json()
      setOrg(data.organization)
      setOrgMembers([user.userProfile])
    } else {
      const json = await res.json()
      setError(json.message)
    }
  }

  return <form
    onSubmit={(e) => {
      void handleSubmit(onSubmit)(e)
    }}
    method="post"
  >
    <div className={style.create_input_ctn}>
    <input
      {...register('name')}
      type="text"
      placeholder="Enter the name for your organization."
      required
      className={style.text_input}
    />
      <button className={style.add_btn} onClick={() => (false)}>
        Create
      </button>
    </div>
  </form>
}

export default CreateOrganization
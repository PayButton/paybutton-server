import { useForm } from 'react-hook-form'
import { UserWithSupertokens } from 'services/userService'
import style from './organization.module.css'
import Button from 'components/Button'

interface IProps {
  user: UserWithSupertokens
  setError: Function
  setOrg: Function
  setOrgEdit: Function
  editType: 'name' | 'address'
}

interface UpdateOrganizationForm {
  name?: string
  address?: string
}

const UpdateOrganization = ({ user, setError, setOrg, setOrgEdit, editType }: IProps): JSX.Element => {
  const { register, handleSubmit, reset } = useForm<UpdateOrganizationForm>({})

  const onSubmit = async (params: UpdateOrganizationForm): Promise<void> => {
    const res = await fetch('/api/organization', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId: user.userProfile.id,
        ...(editType === 'name' ? { name: params.name } : {}),
        ...(editType === 'address' ? { address: params.address } : {})
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
      <label className={style.label}>
        {editType === 'name' ? 'Change name' : 'Change address'}
      </label>
      <div className={style.create_input_ctn}>
        <input
          {...register(editType)}
          type="text"
          placeholder={`Enter the new ${editType} for your organization.`}
          required
          className={style.text_input}
          autoFocus
        />
        <Button className="ml" type="submit">
          Update
        </Button>
      </div>
      <button className={style.cancel_btn} onClick={() => setOrgEdit('')}>
        Cancel
      </button>
    </form>
  )
}

export default UpdateOrganization

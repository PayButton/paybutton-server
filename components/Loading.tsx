import React, { FunctionComponent } from 'react'
interface IProps { text?: string }
export default ({ text }: IProps): FunctionComponent<IProps> => {
  return (
    <div>
      { text ?? 'Loading...' }
    </div>
  )
}

import style from './paybutton.module.css'

export default (): JSX.Element => {
  return (
    <div className={style.loading_spinner_ctn}>
    <div className={style.loading_spinner} />
    </div>
  )
}

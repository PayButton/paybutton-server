import { MainNetworkSlugsType } from 'constants/index'

interface IProps {
  chronikUrls: Record<MainNetworkSlugsType, string[]>
}
export default function ChronikURLs ({ chronikUrls }: IProps): JSX.Element {
  return <>
  <h2>Chronik URLs</h2>
  <div className="paybutton-table-ctn columns">
    <div>
      <h4>eCash</h4>
      <ol>
        {chronikUrls.ecash.map((url, idx) => <li key={idx}>{url}</li>)}
      </ol>
    </div>
    <div>
      <h4>Bitcoin Cash</h4>
      <ol>
        {chronikUrls.bitcoincash.map((url, idx) => <li key={idx}>{url}</li>)}
      </ol>
    </div>
  </div>
</>
}

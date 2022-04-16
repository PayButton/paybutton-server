import React from 'react'
import Head from 'next/head'
import ThirdPartyEmailPassword from 'supertokens-auth-react/recipe/thirdpartyemailpassword'
import dynamic from 'next/dynamic'
import supertokensNode from 'supertokens-node'
import * as SuperTokensConfig from '../config/backendConfig'
import Session from 'supertokens-node/recipe/session'
import { Divider, Drawer, 
				 List, ListItem, ListItemText, 
				 IconButton, Box, Button, Typography }  from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu';
import { websiteDomain } from 'config/appInfo'
import AddPayButtonForm from 'components/AddPayButtonForm'
import { PayButtonsList } from 'components/PayButton'
import { PayButton } from 'types'

const FEATURE_ADD_PAYBUTTON = websiteDomain.includes('feat-add-button')
                              || websiteDomain.includes('localhost')

const ThirdPartyEmailPasswordAuthNoSSR = dynamic(
  new Promise((res) =>
    res(ThirdPartyEmailPassword.ThirdPartyEmailPasswordAuth)
  ),
  { ssr: false }
)

export async function getServerSideProps(context) {
  // this runs on the backend, so we must call init on supertokens-node SDK
  supertokensNode.init(SuperTokensConfig.backendConfig())
  let session
  try {
    session = await Session.getSession(context.req, context.res)
  } catch (err) {
    if (err.type === Session.Error.TRY_REFRESH_TOKEN) {
      return { props: { fromSupertokens: 'needs-refresh' } }
    } else if (err.type === Session.Error.UNAUTHORISED) {
      return { props: {} }
    } else {
      throw err
    }
  }

  return {
    props: { userId: session.getUserId() },
  }
}

export default function Home(props) {
  return (
    <ThirdPartyEmailPasswordAuthNoSSR>
      <ProtectedPage userId={props.userId} />
    </ThirdPartyEmailPasswordAuthNoSSR>
  )
}

function ProtectedPage({ userId }) {
  const [payButtons, setPayButtons] = React.useState([])

  async function logoutClicked() {
    await ThirdPartyEmailPassword.signOut()
    ThirdPartyEmailPassword.redirectToAuth()
  }

  async function fetchPayButtons() {
    const res = await fetch(`/api/paybutton/user/${userId}`)
    if (res.status === 200) {
      const json = await res.json()
      console.log('Fetched PayButtons: ', json)
      return json
    }
  }

  async function addPayButton() {
    const res = await fetch('/api/paybutton', {
      method: 'POST',
      body: JSON.stringify({
      userId: userId,
      addresses: ['ecash:qpz274aaj98xxnnkus8hzv367za28j900c7tv5v8pc',
                  'bitcoincash:qrw5fzqlxzf639m8s7fq7wn33as7nfw9wg9zphxlxe']
      })
    })
    if (res.status === 201) {
      const json = await res.json()
      setPayButtons([...payButtons, json])
    }
  }
  const [open, setOpen] = React.useState(false);

  const handleDrawerOpen = () => {
    setOpen(true);
  };

  const handleDrawerClose = () => {
    setOpen(false);
  };

  React.useEffect(() => {
    if (FEATURE_ADD_PAYBUTTON) {
      (async () => {
        //const fetchedPayButtons: PayButton[] = await fetchPayButtons()
        //setPayButtons([...payButtons, ...fetchedPayButtons])
      })()
    }
  }, [])
  return (
   <Box sx={{ display: 'flex' }}>
			<Drawer
				sx={{
					width: 240,
						flexShrink: 0,
						'& .MuiDrawer-paper': {
							width: 240,
								boxSizing: 'border-box',
						},
				}}
        variant="permanent"
        anchor="left"
        open={open}
      >
 			<IconButton onClick={handleDrawerClose} />
        <List>
          {['Dashboard', 'Payments', 'Buttons', 'Wallets'].map((text, index) => (
            <ListItem button key={text}>
              <ListItemText primary={text} />
            </ListItem>
          ))}
        </List>
      </Drawer>
 			<Box
        component="main"
        sx={{ flexGrow: 1, bgcolor: 'background.default', p: 3 }}
      >
        {FEATURE_ADD_PAYBUTTON && <PayButtonsList payButtons={payButtons} />}
        <div
          style={{
            display: 'flex',
            height: '70px',
            alignItems: 'center',
            justifyContent: 'flex-end',
            paddingLeft: '75px',
            paddingRight: '75px',
          }}
        >
          <Button
						variant="outlined"
            onClick={logoutClicked}
          >
            SIGN OUT
          </Button>
        </div>
        <div
          style={{
            display: 'flex',
            height: '70px',
            alignItems: 'center',
            justifyContent: 'flex-end',
            paddingLeft: '75px',
            paddingRight: '75px',
          }}
        >
          <Button
						variant="contained"
            onClick={addPayButton}
          >
            Add a PayButton
          </Button>
        </div>
          {FEATURE_ADD_PAYBUTTON && <AddPayButtonForm />}
			</Box>
    </Box>
  )
}

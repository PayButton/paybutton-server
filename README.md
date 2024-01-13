# paybutton-server
[![master status](https://github.com/paybutton/paybutton-server/actions/workflows/on-push-master.yml/badge.svg)](https://github.com/paybutton/paybutton-server/actions/workflows/on-push-master.yml)

https://paybutton.org

## Developing
### Installing and running PayButton locally
- [Install and configure Docker](https://docs.docker.com/get-docker/)
- Clone the repo and go to the repo directory
- Copy `config/example-config.json` to `paybutton-config.json`
- Create a `.env.local` file with the environment variables:
  + `PRICE_API_TOKEN="<COINDANCE_API_KEY>"`
  + `WS_AUTH_KEY="<RANDOMLY_GENERATED_UUID>"`
  + `MASTER_SECRET_KEY="<RANDOMLY_GENERATED_UUID>"`

- Run the following make command* to build/pull the relevant docker images and run the server locally:


    ```
    make dev
    ```
	_*If you run docker as root, run the command above with `sudo`_

- App will be available at http://localhost:3000.
- Local changes on source code should trigger a reload immediately.


### Optional configuration

PayButton Server is configured with a `paybutton-config.json` file in the root of the repository. An example file can be find at [config/example-config.json](https://github.com/PayButton/paybutton-server/blob/master/config/example-config.json). The values it takes are:

---

#### **apiDomain**
```
type: string
default: "http://localhost:3000/api",
```
> Base path for the API.


#### apiBasePath
```
type: string
default: "/api/auth"
```
> Base API endpoint for authentication.


#### websiteDomain
```
type: string
default: "http://localhost:3000"
```
> Base path for the website.


#### wsBaseURL
```
type: string
default: "http://localhost:5000"
```
> Base path for the websocket server.


#### showTestNetworks
```
type: boolean
default: false,
```
> If the connection of test networks for eCash and Bitcoin Cash should appear in the Networks tab.


#### grpcBCHNodeURL
```
type: string
default: "bchd.greyh.at:8335"
```
> GRPC URL to connect to for BCH (unsupported at the moment).


#### grpcXECNodeURL
```
type: string
default: "grpc.fabien.cash:8335"
```
> GRPC URL to connect to for XEC (unsupported at the moment).


#### chronikClientURL
```
type: string
default: "https://chronik.fabien.cash"
```
> URL for the Chronik client to connect to. Providing an array of URLs is supported.


#### priceAPIURL
```
type: string
default: "https://coin.dance/api/"
```
> API to get prices from. Only coin.dance currently supported.

#### redisURL
```
type: string
default: "redis://paybutton-cache:6379"
```
> URL for the Redis server.


#### networkBlockchainClients
```
type: {
    "ecash": "chronik" | "grpc"
    "bitcoincash": "grpc"
}
default: {
    "ecash": "chronik",
    "bitcoincash": "grpc"
}
```
> Which client to use to get the blockchain information for each network. Currently, only "chronik" is supported for eCash 
and Bitcoin Cash is not supported.


#### networksUnderMaintenance
```
type: {
   "ecash": boolean
   "bitcoincash": boolean
}

default: {
 "bitcoincash": true
}
```
> What networks are currently under maintenance.


#### triggerPOSTTimeout
```
type: number
default: 3000
```
> How long a POST request triggered from a button payment will wait for an answer to be marked as successful.


---

- For production, set `ENVIRONMENT=production` in `.env.local.` This optimizes the build for performance and skips the setup of various dev tools (like LiveReload).
<!--
- Enable _social login_ by filling up `.env` or `.env.local` file with your social provider credentials. You can get testing credentials and more detailed instructions [here](https://supertokens.com/docs/thirdpartyemailpassword/quick-setup/backend#2-initialise-supertokens).
-->

## Want to join the team?

Send us an email and we'll get in touch: contact@paybutton.org


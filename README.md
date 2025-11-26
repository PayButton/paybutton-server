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
  + `SIDESHIFT_SECRET_KEY="<SIDESHIFT_SECRET_KEY>"` (necessary only when working with the paybutton client for SideShift integration)

- Run the following make command* to build/pull the relevant docker images and run the server locally:


    ```
    make dev
    ```
	_*If you run docker as root, run the command above with `sudo`_

- App will be available at http://localhost:3000.
- Local changes on source code should trigger a reload immediately.

### Yarn docker commands
When developing, there are some commands are meant to be run inside the docker container. To make this process easier, many of them can be run in the host machine with `yarn docker [command]`. Running `yarn docker` will show all of them:

```
Available commands:
  shortcut, command name      [container_name]    command description
 --- 
  nr, nextrestart             [paybutton-dev]     restart the nextJS server
  nl, nextlogs                [paybutton-dev]     see the logs for the nextJS server
  db, database                [paybutton-db]      enter the mariadb command-line using the main db
  dbr, databaseroot           [paybutton-db]      enter the mariadb command-line as root
  dbd, databasedump           [paybutton-db]      dump all db tables as root
  dbs, databaseshell          [paybutton-db]      enter the shell of the mariadb container
  dbt, databasetest           [paybutton-db]      enter the mariadb command-line using the test db
  dbu, databaseuser           [paybutton-db]      enter the mariadb command-line using the users db
  t, test                     [paybutton-dev]     run tests
  tf, testfull                [paybutton-dev]     run tests, show full output
  tw, testwatch               [paybutton-dev]     run tests watching it
  tc, testcoverage            [paybutton-dev]     test coverage
  ns, nodeshell               [paybutton-dev]     enter the node container
  rns, rootnodeshell          [paybutton-dev]     enter the node container as root
  y, yarn                     [paybutton-dev]     run `yarn` on the node container
  ya, yarnadd                 [paybutton-dev]     run `yarn add ARGS` on the node container
  yad, yarnadddev             [paybutton-dev]     run `yarn add -D ARGS` on the node container
  yr, yarnremove              [paybutton-dev]     run `yarn remove ARGS` on the node container
  m, migrate                  [paybutton-dev]     run migrations
  mm, makemigration           [paybutton-dev]     create a migration with name ARGS
  mr, migratereset            [paybutton-dev]     recreate the database
  pd, prismadb                [paybutton-dev]     run `prisma db ARGS`
  pg, prismagenerate          [paybutton-dev]     run `prisma generate` to generate client from scheme
  c, cache                    [paybutton-cache]   enter the redis command-line interface
  cs, cacheshell              [paybutton-dev]     enter the redis container
  cr, cachereset              [paybutton-dev]     clear the whole redis cache
  cmr, cachemainreset         [paybutton-dev]     clear the main redis cache
  cbr, cachebullmqreset       [paybutton-dev]     clear the bullMQ redis database
  jl, jobslogs                [paybutton-dev]     watch jobs logs
  js, jobsstop                [paybutton-dev]     stop jobs
  jr, jobsrestart             [paybutton-dev]     restart jobs
  sl, serverlogs              [paybutton-dev]     watch WS server logs
  ss, serverstop              [paybutton-dev]     stop WS server
  sr, serverrestart           [paybutton-dev]     restart WS server
```

**WARNING**: Notice this means that many commands are **not supposed** to work by running then purely on the host machine.

For example, `yarn test` runs the `test` script, but this won't work properly when executed from the host machine, so the proper way to execute tests are to run them with `yarn docker test` (or manually entering the `paybutton-dev` container and running `yarn test` there, which is exactly what `yarn docker test` does).

### Make commands
The project includes several Make commands to manage Docker containers and development workflow:

#### Docker management
- `make dev` - Start development environment with Docker Compose
- `make stop-dev` - Stop development containers
- `make reset-dev` - Stop and restart development environment
- `make reset-dev-keep-db` - Restart only the paybutton-dev container (keeps database)
- `make dev-from-dump` - Start development environment using database dump

#### Production
- `make prod` - Start production environment
- `make stop-prod` - Stop production containers  
- `make reset-prod` - Stop and restart production environment
- `make deploy` - Pull latest code and reset production environment

#### Logs
- `make logs-dev` - Follow logs for the development container
- `make logs-db` - Follow logs for the database container
- `make logs-cache` - Follow logs for the Redis cache container
- `make logs-users` - Follow logs for the users service container

#### Testing and linting
- `make lint` - Run ESLint on the codebase
- `make lint-master` - Run ESLint on files changed from master branch
- `make no-isolated-tests` - Check for isolated tests (describe.only/it.only)
- `make github-test-unit` - Run unit tests (GitHub CI only)
- `make github-test-integration` - Run integration tests (GitHub CI only)

### Optional configuration

PayButton Server is configured with a `paybutton-config.json` file in the root of the repository. An example file with the default values can be find at [config/example-config.json](https://github.com/PayButton/paybutton-server/blob/master/config/example-config.json). The values it takes are:

---

#### **apiDomain**
```
type: string
```
> Base path for the API.


#### apiBasePath
```
type: string
```
> Base API endpoint for authentication.


#### websiteBasePath
```
type: string
```
> Base API endpoint for authentication through SuperTokens.

#### websiteDomain
```
type: string
```
> Base path for the website.


#### wsBaseURL
```
type: string
```
> Base path for the websocket server.


#### showTestNetworks
```
type: boolean
```
> If the connection of test networks for eCash and Bitcoin Cash should appear in the Networks tab.


#### networkBlockchainURLs
```
type: {
   "ecash": ["https://xec.paybutton.org", "https://chronik.fabien.cash"],
   "bitcoincash": ["https://chronik.pay2stay.com/bch"]
}

```
> What URLs to connect each network chosen client to (from networkBlockchainClients)


#### priceAPIURL
```
type: string
```
> API to get prices from. Only coin.dance currently supported.

#### redisURL
```
type: string
```
> URL for the Redis server.


#### networkBlockchainClients
```
type: {
    "ecash": "chronik",
    "bitcoincash": "chronik"
}
```
> Which client to use to get the blockchain information for each network. Currently, only "chronik" is supported for eCash and Bitcoin Cash.


#### networksUnderMaintenance
```
type: {
   "ecash": boolean
   "bitcoincash": boolean
}
```
> What networks are currently under maintenance.


#### triggerPOSTTimeout
```
type: number
```
> How long a POST request triggered from a button payment will wait for an answer to be marked as successful.

#### smtpHost
```
type: string
```
> Host name for the server from which payment trigger emails will be sent. Not setting this up will result in email triggers not working.


#### smtpPort
```
type: number
```
> Port for the SMTP server from which payment trigger emails will be sent. Not setting this up will result in email triggers not working.


#### sideshiftAffiliateId
```
type: string
```
> Necessary only for paybutton client to interact with sideshift through the server.

#### proSettings
```
type: object
```
> General configuration for PayButton Pro. Each parameter is described below.

##### proSettings.enabled
```
type: boolean
```
> If the Pro feature should be enabled or hidden.

##### proSettings.monthsCost
```
type: {
[key: string]: number
}
```
> The pricing model for PayButton Pro subscription — [value] USD for [key] months.

##### proSettings.payoutAddress
```
type: string
```
> The payout address for PayButton Pro subscriptions.

##### proSettings.standardDailyEmailLimit
```
type: number | "Inf"
```
> How many emails can a standard user send daily.

##### proSettings.proDailyEmailLimit
```
type: number | "Inf"
```
> How many emails can a PayButton Pro user send daily.

##### proSettings.standardDailyPostLimit
```
type: number | "Inf"
```
> How many POST requests can a standard user send daily.

##### proSettings.proDailyPostLimit
```
type: number | "Inf"
```
> How many POST requests can a PayButton Pro user send daily.

##### proSettings.standardAddressesPerButtonLimit
```
type: number | "Inf"
```
> How many addresses can a standard Pro user add for a single button.

##### proSettings.proAddressesPerButtonLimit
```
type: number | "Inf"
```
> How many addresses can a PayButton Pro user add for a single button.

---

- For production, set `ENVIRONMENT=production` in `.env.local.` This optimizes the build for performance and skips the setup of various dev tools (like LiveReload).
<!--
- Enable _social login_ by filling up `.env` or `.env.local` file with your social provider credentials. You can get testing credentials and more detailed instructions [here](https://supertokens.com/docs/thirdpartyemailpassword/quick-setup/backend#2-initialise-supertokens).
-->

## Want to join the team?

Send us an email and we'll get in touch: contact@paybutton.org


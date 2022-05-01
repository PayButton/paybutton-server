# paybutton-server

https://paybutton.org

## Developing
- [Install and configure Docker](https://docs.docker.com/get-docker/)
- [Install docker-compose](https://docs.docker.com/compose/install/)
- Fill up .env or .env.local file with all social provider credentials. You can get testing credentials from [here](https://supertokens.com/docs/thirdpartyemailpassword/quick-setup/backend#2-initialise-supertokens).
Your .env or .env.local file should look like this:
````
APPLE_CLIENT_ID=<insert credentials here>
APPLE_KEY_ID=<insert credentials here>
APPLE_PRIVATE_KEY=<insert credentials here>
APPLE_TEAM_ID=<insert credentials here>
FACEBOOK_CLIENT_ID=<insert credentials here>
FACEBOOK_CLIENT_SECRET=<insert credentials here>
GITHUB_CLIENT_ID=<insert credentials here>
GITHUB_CLIENT_SECRET=<insert credentials here>
GOOGLE_CLIENT_SECRET=<insert credentials here>
SUPERTOKENS_API_KEY=<insert credentials here>
SUPERTOKENS_CONNECTION_URI=<insert credentials here>
```
- **If you run docker as root user, run the following commands with `sudo`** 
- Run the following make command to build/pull the relevant docker images and run the server locally:
    ```
    make dev
    ```
- App will be available at http://localhost:3000.
- Local changes on source code should trigger a reload immediately.

````
You can change gRPC node by modifying GRPC_NODE_URL variable in the .env file.
````

## Want to join the team?

Send us an email and we'll get in touch: contact@paybutton.org

[![Netlify Status](https://api.netlify.com/api/v1/badges/fc93e6dd-5767-41e1-882b-5d7eea06554e/deploy-status)](https://app.netlify.com/sites/paybutton-dev/deploys)


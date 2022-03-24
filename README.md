# paybutton-server

https://paybutton.org

## Developing
- [Install and configure Docker](https://docs.docker.com/get-docker/)
- Run the following make command to build the docker image and run the server locally:
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


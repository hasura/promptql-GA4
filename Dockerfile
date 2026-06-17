FROM us-docker.pkg.dev/hasura-container-images/external-images/docker.io/library/node:20-alpine-stable

RUN apk add --no-cache bash

RUN npm update -g npm

COPY ./ /app/
WORKDIR /app

RUN --mount=type=cache,target=/root/.npm npm ci
RUN npm run install-bin

RUN mkdir /etc/connector
WORKDIR /etc/connector

CMD ["ga4-connector", "serve", "--configuration", "configuration.json"]

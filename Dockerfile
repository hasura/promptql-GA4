FROM node:20-alpine

RUN apk add --no-cache bash

RUN npm update -g npm

COPY ./ /app/
WORKDIR /app

RUN npm ci
RUN npm run install-bin

RUN mkdir /etc/connector
WORKDIR /etc/connector

CMD ["ga4-connector", "serve", "--configuration", "configuration.json"]

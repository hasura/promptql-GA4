#!/usr/bin/env node

import { start } from "@hasura/ndc-sdk-typescript";
import { GA4Connector } from "./connector";

const connector = new GA4Connector();

start(connector);

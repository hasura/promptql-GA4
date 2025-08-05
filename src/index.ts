import { start } from '@hasura/ndc-sdk-typescript';
import { GA4Connector } from './connector';
import { getSchema } from './schema';

const connector = new GA4Connector();

// Override schema handler to use state
connector.getSchema = async (configuration) => {
  const state = await connector.tryInitState(configuration, {});
  return getSchema(state.analyticsDataClient, configuration);
};

start(connector);

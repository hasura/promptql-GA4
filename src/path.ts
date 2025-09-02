const DEFAULT_CONFIGURATION_DIRECTORY = "/etc/connector/";
/**
 * Use this function to get filepaths for user files relating to the connector
 * The DDN CLI is responsible for setting the correct env vars
 * The reason we need this correction is because the filepaths can change on whether the connector is being run via the CLI or via the Docker image
 */
export function getUserMountedFilePath(): string {
  // Check for HASURA_PLUGIN_CONNECTOR_CONTEXT_PATH environment variable
  if (process.env.HASURA_PLUGIN_CONNECTOR_CONTEXT_PATH) {
    return process.env.HASURA_PLUGIN_CONNECTOR_CONTEXT_PATH;
  }

  // Check for HASURA_CONFIGURATION_DIRECTORY environment variable
  if (process.env.HASURA_CONFIGURATION_DIRECTORY) {
    return process.env.HASURA_CONFIGURATION_DIRECTORY;
  }

  // If neither variable is present, log warning and return default path
  console.log(
    `WARNING: Neither HASURA_PLUGIN_CONNECTOR_CONTEXT_PATH nor HASURA_CONFIGURATION_DIRECTORY environment variables are set. Using default path (${DEFAULT_CONFIGURATION_DIRECTORY}).`,
  );
  return DEFAULT_CONFIGURATION_DIRECTORY;
}

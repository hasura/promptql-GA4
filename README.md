# Google Analytics (GA4) Connector for PromptQL

A powerful data connector that enables natural language queries against Google Analytics data through PromptQL. Query your GA4 analytics data using plain English and get structured results.

## Features

- 🔍 **Natural Language Queries**: Query GA4 data using plain English through PromptQL
- 📊 **Rich Analytics Data**: Access dimensions, metrics, and custom reports from GA4
- 🔒 **Secure Authentication**: Service account-based authentication with Google Analytics
- 🐳 **Docker Ready**: Pre-built Docker images for easy deployment
- ⚡ **High Performance**: Built with TypeScript and optimized for speed
- 🔧 **PromptQL Integration**: Seamless integration with PromptQL for natural language analytics

## Prerequisites

Before using this connector, you'll need:

1. **Google Analytics 4 Property**: A GA4 property with data
2. **Google Cloud Service Account**: With Analytics Reporting API access
3. **PromptQL**: For natural language query capabilities (optional for standalone use)

## Quick Start

### 1. Configure the Connector

Create a `google_auth_config.json` file in your project directory:

```json
{
    "property_id": "123456789",
    "domain": "example.com",
    "credentials": {
        "type": "service_account",
        "project_id": "your-project-id",
        "private_key_id": "your-private-key-id",
        "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
        "client_email": "your-service-account@your-project.iam.gserviceaccount.com",
        "client_id": "your-client-id",
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
        "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
        "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/..."
    }
}
```

> ⚠️ **Security Note**: Never commit `google_auth_config.json` to version control. It's already included in `.gitignore`.

### 2. Installation and Setup

#### Option A: Using Docker

```bash
# Pull the pre-built image
docker pull ghcr.io/hasura/ndc-promptql-ga4:main

# Generate configuration
docker run -v $(pwd):/etc/connector \
  ghcr.io/hasura/ndc-promptql-ga4:main \
  ga4-connector-cli update --outfile /etc/connector/configuration.json

# Run the connector
docker run -p 8200:8200 \
  -v $(pwd)/google_auth_config.json:/etc/connector/google_auth_config.json \
  -v $(pwd)/configuration.json:/etc/connector/configuration.json \
  ghcr.io/hasura/ndc-promptql-ga4:main
```

#### Option B: From Source

```bash
# Clone the repository
git clone https://github.com/hasura/promptql-GA4.git
cd promptql-GA4

# Install dependencies
npm install

# Build the project
npm run build

# Generate configuration
npm run generate-config

# Start the connector
npm run start
```

## Usage

### Generating Configuration

Before starting the connector, generate the configuration file:

```bash
npm run generate-config
```

This creates a `configuration.json` file with your GA4 metadata.

### Starting the Connector

```bash
npm run start
```

The connector will start on port 8200 by default.

### Environment Variables

- `GOOGLE_AUTH_CONFIG_FILEPATH`: Path to your Google Auth config file (default: `google_auth_config.json`)

## API Endpoints

Once running, the connector exposes these endpoints:

- `GET /capabilities` - Get connector capabilities
- `GET /schema` - Get the data schema
- `POST /query` - Execute queries

## Available Dimensions and Metrics

The connector automatically discovers and exposes all available GA4 dimensions and metrics from your property. For a complete reference of available dimensions and metrics, see the [GA4 Dimensions & Metrics Explorer](https://ga-dev-tools.google/ga4/dimensions-metrics-explorer/).

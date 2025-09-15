# promptql-GA4

Requires `google_auth_config.json` to be added in the root directory

```json
{
    "property_id": "123456789",
    "domain": "example.com",
    "credentials": { <service account json credentials> }
}
```

### To compile:

`npm run build`

### To generate `configuration.json`:

`npm run generate-config`

### To start connector:

`npm run start`

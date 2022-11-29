# BGD <> Aave Token List :clipboard:

This repository contains an up-to-date [tokenlist.json](/tokenlist.json) containing all underlying assets and aTokens used in any aave v2 and v3 pool.
The list will be updated once a day by an automatic [cronjob](.github/workflows/cron.yaml) to keep ahead of new token listings.

The list will automatically keep updated via a cronjob for listed pools.
If you want to add a new pool simply add it to `pools` [config](./index.ts).

## Development

### Setup

```sh
yarn install
```

### Regenerate the list

```sh
yarn generate
```

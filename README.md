### Installation steps

Create following file under `.git/workflows/jsonsniffer.yml` directory of your repository.

```
name: "JSON Sniffer checks"

on:
  pull_request:
    paths:
      - "**.json"
      - ".github/workflows/jsonsniffer.yml"

jobs:
  jsonsniffer:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
        with:
          fetch-depth: 0

      - uses: nowakowskir/github-phpcs@v6
```
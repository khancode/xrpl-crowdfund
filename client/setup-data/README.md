Create an accounts.json with `{}` contents within this directory before running index.ts otherwise it will error with:

```
client/setup-data/index.ts:71:40 - error TS2307: Cannot find module './accounts.json' or its corresponding type declarations.

71     const accountsData = (await import('./accounts.json')) as any
                                          ~~~~~~~~~~~~~~~~~
```

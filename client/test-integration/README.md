# Running integration tests

All integration tests are set to be skipped (`describe.skip(...)`) due to these conditions:
- 10 second wait time for funding a single wallet
- A test module can take awhile to resolve (greater than 1 minute)

Therefore, in order to test a single jest module, remove `.skip` from `describe.skip(...)`
- To run a single test within single jest module, add `.only` to `it.only(...)`
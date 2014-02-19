test:
	@echo "MtGox HTTP Client - Launching tests."
	@ NODE_ENV="test" node_modules/.bin/mocha --reporter spec -t 10000
	@echo "Tests finished"

.PHONY: test

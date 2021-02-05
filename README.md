# Stub Package for Launching a New EMP

The purpose of this repository/package is to make it easy to customize your EMP deployment. Feel free to use this
repository in place or fork and customize it.

## Install system dependencies

You will need to install nodejs v12 (we recommend `nvm` to manage node versions) and yarn.

Note: these additional dependencies are required -- you may or may not have them on your system already:

- `libudev`
- `libusb`

Example ubuntu installation command for additional deps:

```bash
sudo apt-get update && sudo apt-get install -y libudev-dev libusb-1.0-0-dev
```

## Install packages

```bash
yarn
```

## Run the deployment script on a mainnet fork

It's a good idea to try out your deployment on a fork before running it on mainnet. This will allow you to run the
deployment in a forked environment and interact with it to ensure it works as expected.

Start ganache.

```bash
yarn ganache-fork your.node.url.io
```

In a separate terminal, run the deployment script (it defaults to using localhost:8545 as the ETH node, which is
desired in this case). Note: mnemonic is optional here -- without it, ganache will use its default pre-loaded account.

```bash
node index.js --gasprice 50 --mnemonic "your mnemonic (12 word seed phrase)"
```

Now you should be able to use `localhost:8545` to interact with a forked version of mainnet (or kovan) where your
contract is deployed.

## Run the deployment script on mainnet or kovan

```bash
node index.js --gasprice 50 --url your.node.url.io --mnemonic "your mnemonic (12 word seed phrase)"
```

## Customize the script

The script should be fairly easy to read and understand. The primary use case for customization is modifying the empParams
struct to customize the construction parameters for the EMP. See [the script](./index.js) for more details.

We encourage you to fork this repo and customize the script as you see fit!

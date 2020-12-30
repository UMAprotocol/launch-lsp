# Stub Package for Launching a new EMP

The purpose of this repository/package is to make it easy to customize your EMP Deployment. Feel free to use this
repository in place or fork and customize it.

## System Dependencies

You will need to install nodejs v12 (we reccomend `nvm` to manage node versions) and yarn.

Note: these additional dependencies are required -- you may or may not have them on your system already:

- `libudev`
- `libusb`

Example ubuntu installation command for additional deps:

```bash
sudo apt-get update && sudo apt-get install -y libudev-dev libusb-1.0-0-dev
```

## Install Packages

```bash
yarn
```

## Run the deployment script

```bash
node index.js --gasprice 50 --url your.node.url.io --mnemonic "your mnemonic"
```

Note: this deployment script should work on mainnet and kovan. It should technically work on ganache forks of these
networks as well, but in our testing, ganache has often returned false reverts during the deployment process.

## Customize the script

The script should be fairly easy to read and understand. The primary use case for customization is modifying the empParams
struct to customize the construction parameters for the EMP. See [the script](./index.js) for more details.

We encourage you to fork this repo and customize the script as you see fit!

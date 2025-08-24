This project uses Bun as its JavaScript runtime and package manager. Do not use npm or yarn commands. 

There is a `nix-shell` file for development setup. To use shell, make sure you invoke the console with `nix-shell` command.

one-liner to start dev server: 
```bash
nix-shell --command "bun run dev"
```

In general, you can assume that dev server is running at http://localhost:3000 unless otherwise specified, so you can access the application in your browser at that address. If not, then it can be started as described above.

Please refer to the project's README for more detailed instructions on setup and usage. However, assume environment is already set up and you can run the project with the provided command herein and in the README.

When refactoring code, or generating, avoid focusing on TypeScript issues unless they are directly relevant to the code changes, could affect functionality, or help facilitate understanding of the code structure and readability. Only pay ateention when i prompt you to do so. Just focus on the code changes and improvements.

# Wallet vs Account
A wallet is a browser extension that allows users to interact with blockchain networks. It provides a user interface for managing accounts, signing transactions, and interacting with decentralized applications (dApps). In this context, the wallet is used to connect to the Polkadot network and manage user accounts.

On the other hand, an account is a specific user address within the blockchain network. It is associated with a public key and can hold assets and sign transactions via the wallet. The account is managed by the wallet, which provides the necessary tools for the user to interact with their account.

Please ensure that any code changes or refactoring maintain the distinction between wallets and accounts, and that the code clearly reflects this separation.

# Type conventions
When working with TypeScript, please follow these conventions:
- Use `PascalCase` for type names and interfaces.
- Use `camelCase` for variable and function names.
- Use `UPPER_CASE` for constants.

For actual types, if a type is unknown or not defined, don't add 'any' explicitly, so the LSP can infer the type correctly. 

Use `import type` for importing types to avoid unnecessary code bloat in the final bundle.

Remember that it's not important to focus on type errors, but rather on improving the code structure, readability, and functionality. If you encounter type errors that are relevant to the code changes, address them as needed, but do not focus solely on fixing type issues unless they are directly related to the code changes or improvements being made. Otherwise, just focus on the code changes and improvements, unless specifically prompted to address TypeScript issues.

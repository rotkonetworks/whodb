This project uses Bun as its JavaScript runtime and package manager. Do not use npm or yarn commands. 

There is a `nix-shell` file for development setup. To use shell, make sure you invoke the console with `nix-shell` command.

one-liner to start dev server: 
```bash
nix-shell --command "bun run dev"
```

Please refer to the project's README for more detailed instructions on setup and usage. However, assume environment is already set up and you can run the project with the provided command herein and in the README.

When refactoring code, or generating, avoid focusing on TypeScript issues unless they are directly relevant to the code changes, could affect functionality, or help facilitate understanding of the code structure and readability. Only pay ateention when i prompt you to do so. Just focus on the code changes and improvements.

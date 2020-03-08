# tsassert

**Check TypeScript types against assertion comments**

[![CircleCI](https://circleci.com/gh/JakeSidSmith/tsassert.svg?style=svg)](https://circleci.com/gh/JakeSidSmith/tsassert)

## About

This library provides an easy way for library publishers (and anyone else that wants) to assert the output types of their APIs, and ensure that these do not regress over time.

I would recommend adding a tsassert command to your tests and or continuous integration pipeline.

## Requirements

You must be using a reasonably recent version of node. Guaranteed to work with node 12. May work with older versions.

You must be using TypeScript 3 (this is a peer dependency).

## The syntax

Simply add a comment with the following structure to the end of the line, or on the line above:

```ts
// @tsassert: ExpectedTypeHere
```

Basic examples:

```ts
// Assert variable types
const myNumber = 1; // @tsassert: number

// @tsassert: number
const myOtherNumber = 2;

// Assert return type of function
sendMessage('Hello'); // @tsassert: Promise<string>

// @tsassert: Promise<string>
sendMessage('Hello again');

// Assert type of class instance
new MyClass(abc); // @tsassert: MyClass<ABC>

// @tsassert: MyClass<ABC>
new MyClass(abc);
```

Example in tests:

```ts
describe('my getter', () => {
  it('should return undefined if any values in the path are nullable', () => {
    // @tsassert: string | undefined
    const result = get(obj, ['a', 'b', 'c']);

    expect(result).toBe(undefined);
  });
});
```

## Install

```shell
npm i @jakesidsmith/tsassert -D
```

`-D` (`--save-dev`) will automatically add this to your `package.json` and `package-lock.json`.

## Run the checks

```shell
tsassert [options] <glob>
```

Examples:

```shell
# Use root tsconfig and check all files
tsassert

# Specify a tsconfig manually
tsassert --project tsconfig.json

# Specify a pattern to match files against
tsassert --project tsconfig.json 'src/**/*.ts'

# Specify multiple files or patterns
tsassert file-1.ts file-2.ts

# Verbose output (output globs and matched file paths)
tsassert --verbose
```

The `project` option defaults to `./tsconfig.json`.

If you don't specify a file or pattern tsassert will use the `include` and `exclude` from your `tsconfig.json`.

If your `tsconfig.json` has an `exclude` option, these files will not be checked even if your manually provided glob matches them.

If you want to include a file that is excluded by your `tsconfig.json` you should extend the config, override the `exclude` property and provide this `tsconfig.json` as the `--project` argument e.g. `tsassert --project tsconfig.tsassert.json`.

Regardless of your includes or excludes `node_modules` will always be excluded.

Run `tsassert --help` for a full list of options.

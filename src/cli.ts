#! /usr/bin/env node

import { Arg, collect, Flag, Help, KWArg, Program } from 'jargs';

import { assert } from './assert';

collect(
  Help(
    'help',
    {
      alias: 'h',
    },
    Program(
      'tsassert',
      {
        description: 'Check TypeScript types against assertion comments',
        usage: 'tsassert [options] <glob>',
        examples: [
          'tsassert',
          'tsassert --project tsconfig.json',
          "tsassert --project tsconfig.json 'src/**/*.{ts,tsx}'",
          'tsassert --project tsconfig.json pass.ts fail.ts',
        ],
        callback: assert,
      },
      Flag('version', {
        alias: 'v',
        description: 'Output tsassert version',
      }),
      Flag('verbose', {
        description: 'Output verbose logs',
      }),
      KWArg('project', {
        alias: 'p',
        description: 'Path to tsconfig file (defaults to "./tsconfig.json")',
        type: 'string',
      }),
      Arg('glob', {
        description: 'Glob to match files against',
        type: 'string',
        multi: true,
      })
    )
  ),
  process.argv
);

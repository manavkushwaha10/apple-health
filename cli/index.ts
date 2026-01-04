#!/usr/bin/env bun
import { run } from "@stricli/core";
import { app } from "./app";

await run(app, process.argv.slice(2), {
  process,
});

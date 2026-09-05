# Read-only SSH data adapter

`src/remote/adapter.ts` translates already-collected command results into a
`RemoteConsoleSnapshot`. It is deliberately a pure data adapter: it does not
open an SSH connection, execute a command, read a file, poll a process, or
change server state.

## Public API

```ts
type RemoteCommandResult = {
  stdout: string
  stderr?: string
  exitCode?: number | null
  timedOut?: boolean
}

type RemoteConsoleAdapterInput = {
  serverName?: string
  capturedAt?: number | null
  hostname?: RemoteCommandResult
  gpu?: RemoteCommandResult
  run?: RemoteCommandResult
  artifacts?: RemoteCommandResult
}

function parseRemoteConsoleSnapshot(
  input: RemoteConsoleAdapterInput,
): RemoteConsoleSnapshot
```

The caller owns command execution and passes each result into the parser. The
same input produces the same snapshot and does not mutate the input.

## Command output protocol

`hostname` uses the first non-empty line of `stdout`.

`gpu` is the output of a query equivalent to:

```text
nvidia-smi --query-gpu=index,name,memory.used,memory.total,utilization.gpu --format=csv,noheader,nounits
```

Each non-empty line has five comma-separated fields:

```text
0, NVIDIA GeForce RTX 4090, 12288, 24576, 50
1, NVIDIA GeForce RTX 4090, 0, 24576, 0
```

Memory values without a unit are interpreted as MiB. `MiB`, `GiB`, `MB`, and
`GB` suffixes are also accepted. GPU state is derived from the reported
values: at least 90% memory usage is `memory-pressure`, non-zero utilization
or more than 0.5 GiB used is `working`, and otherwise it is `idle`.

`run` uses one `key=value` field per line. Supported keys are:

```text
id=run-1
title=Pilot run
status=running
stage=Pilot validation
progress=42%
current_step=Evaluating validation split
last_update_at=1700000001
blocker=Waiting for the next checkpoint
```

`status` accepts `queued`, `running`, `stalled`, `completed`, `failed`, and
`cancelled`. `progress` accepts either a fraction from `0` to `1` or a
percentage from `0%` to `100%`. A run can contain multiple `blocker` lines.

`artifacts` uses tab-separated rows with this header and field order:

```text
id	kind	size_label	updated_at	retention	path	note
artifact-1	checkpoint	3.2 GB	1700000002	keep for 7 days	/mnt/experiments/run-1	Latest checkpoint
```

The supported artifact kinds are `checkpoint`, `log`, `metric`, `figure`,
`dataset`, `image`, and `package`; an unrecognized kind is retained as
`other`. An empty artifact output is a valid empty list.

## Connection state semantics

The parser keeps uncertainty visible in the snapshot:

- `not-configured`: no command result was supplied.
- `disconnected`: a result timed out, has a non-zero exit code, or reports a
  connection failure in `stderr`.
- `unknown`: commands returned, but one or more non-empty outputs could not be
  parsed.
- `degraded`: commands returned successfully, but the expected set is
  incomplete.
- `connected`: hostname, GPU, run, and artifact outputs were all supplied and
  parsed.

Missing or malformed telemetry becomes explicit `unknown` GPU/run records
where the existing console model requires a record. No zero-filled metric is
treated as a real measurement: unknown GPU records carry a zero value only as
the model's numeric placeholder and are marked with `status: 'unknown'`.

The returned `notes` explain missing commands, parse failures, and failed SSH
results. `completionPolicies` are derived by
`createRemoteConsoleSnapshot`; selecting or displaying a policy still does not
execute it.

## Integration boundary

An SSH service may later run an allow-listed set of read-only commands and
construct `RemoteCommandResult` values. That service belongs outside this
adapter. Shutdown, image saving, artifact deletion, and cleanup require a
separate user-confirmed command path and must not be added to
`parseRemoteConsoleSnapshot`.

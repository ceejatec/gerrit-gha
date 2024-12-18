# Speer Overview

Speer is a service for integrating Gerrit Code Review with various CI
systems, including Jenkins and GitHub Actions. It has several goals:

1. Utilize the Gerrit Checks UI for fully-featured reporting of CI
   status, as well as traditional Gerrit votes for blocking/allowing
   changes to be submitted.
2. Allow flexible mapping of Gerrit changes to CI jobs, including
   methods of consolidating related Gerrit changes into single CI jobs,
   as well as ways of throttling CI throughput where necessary.
3. Minimal dependence on any Gerrit or Jenkins plugins.

The original impetus for Speer is the lack of integration support
between Gerrit and GitHub Actions, as well as the poor support on both
the Gerrit and Jenkins side for the plugins required for integrating
Gerrit with Jenkins. The design philosophy is therefore to be as
agnostic as possible about the specific CI systems, and to depend as
little as possible on existing plugins for Gerrit or any CI system.

A secondary motivation is that the Gerrit Checks API is pretty extensive
and flexible, but there are no general-purpose implementations of that
API. The only publicly supported implementations are unique to
Bitbucket, not counting the "Gerrit Checks Plugin" which is somewhat
generic but deprecated. Speer seeks to provide a mechanism to allow full
use of the featureset of Gerrit Checks for Jenkins and GitHub Actions,
and an extension API for integrating with other CI systems with as
little additional code as possible.

## The Name

Gerrit is a Dutch name meaning "brave with a spear", and "speer" is the
Dutch word for spear. This felt appropriate for a tool Gerrit could use
to make use of remote systems.

# Architecture

Speer comprises three main components, plus a bit of glue.

## SpeerChecks Javascript Gerrit plugin

This is a very thin Javascript plugin which is deployed on the Gerrit
instance. It implements the `ChecksProvider` interface. Its
implementation of the `fetch()` method calls to Speer and returns the
JSON from there unmodified. As such, it effectively delegates the Checks
API implementation to Speer.

## Speer

This is the central part of Speer. It is a Python-based service which:

* Receives notifications of Gerrit patchsets and applies rules to
  determine what CI actions to trigger.
* Invokes CI actions via the necessary extension (Jenkins, GitHub
  Actions, or user-provided).
* Implements the delegated `fetch()` method for SpeerChecks.
* Translates CI statuses into Gerrit votes when necessary.

## Nats

Speer makes use of a persistence layer implemented by Nats Jetstream.
Nats also serves as a message broker for interactions between Gerrit, CI
systems, and Speer.

## Glue

### Gerrit side

There are hook scripts installed on the Gerrit server which write Nats
KV entries for any change, such as a new patchset being posted; a
patchset being Submitted or Abandoned; etc. Speer watches these KV
changes, so this also serves as a message broker between Gerrit and
Speer.

### CI side
Ideally, all supported CI systems would be configured with similar hooks
such that they write back Nats KV entries when CI jobs start and stop.
Again, Speer listens for these KV events, so this serves as a message
broker between the CI systems and Speer.

For Jenkins, this is implemented with a small Groovy script and the
Groovy Events Listener plugin.

For GitHub Actions, Speer provides a webhook which the Organization
can be configured to post to with any job change updates.

# KV Schema

Nats heavily utilizes topic-based messaging. A critical part of the
Speer implementation is ensuring that the KV entries are written both
with a well-defined JSON schema as well as a well-defined hierarchical
key-naming convention.

All key names must be a dot-separated sequence of short strings.
Imporantly, this means that no individual component of a key name may
contain a period character.

## Gerrit

## CI systems

Status updates from all CI systems must be written to a bucket named
`ci`.

### Key name convention

`<CI system>`.`<CI instance>`.`<job name>`.`<unique run identifier>`

* `CI system` will be "`jenkins`", "`github`", or a similar short
  identifier for other CI systems.
* `CI instance` will be a short string identifying a specific instance
  of the CI system. This might be a partial domain name for a Jenkins
  instance; a GitHub Organization for GitHub Actions; etc.
* `job name` is a short identifier of the particular job configuration -
  the Jenkins job name, for instance.
* `unique run identifier` is a short, often numeric, identifier for a
  single run of the job. For Jenkins, this would be the job's build
  number.

### Value schema

    {
        "jobname": "my-cv-job",
        "run": 23,
        "start": 1734407528909,
        "duration": 52,
        "status": "SUCCESS",
        "description": "null",
        "url": ""http://127.0.0.1:8081/job/my-cv-job/34/display/redirect"
    }

# Workflow

## Gerrit -> CI

First a patchset is pushed to Gerrit.

This writes a new entry into the `gerrit` KV bucket (QQQ or overwrites
an existing entry, ie, one entry per change vs. one entry per
patchset?).

Speer is watching that bucket and sees the new entry. It then checks
to see whether it needs to launch any CI jobs for the patchset. This
decision may be complex:

* Mapping from repositories/branches to CI jobs could be configured in
  several places, such as a top-level `.speer` directory on the branch;
  global configuration in Speer itself; others? (QQQ since Speer is
  outside Gerrit, it may need to pull the repository and/or patchset
  from Gerrit to look for eg. the `.speer` directory. It may also want
  to pull `refs/meta/config` for repository-wide job configuration? Or
  even `refs/meta/config` of the parent project or `All-Projects`?)

* Speer may elect to group some changes together (eg. via topics, Gerrit
  relation chain history), in which case it may not launch a job for
  every patchset.

Additionally, Speer may apply throttling rules, so that even if a CI job
needs to be launched, it may not launch immediately (QQQ There is a
"[deliver message
later](https://github.com/nats-io/nats-server/issues/2846#issuecomment-1030729517)"
option in Nats, but it's unclear whether it's applicable to KV watchers
- it's specifically for "consumers". Alternatively, we could set a
"bookmark" on a currently-running job so Speer knows to start a new one
when the currently-running one completes).

Once Speer has decided that it wants to launch some jobs, it looks up
the provider for the CI system type (Jenkins, GHA, ...) and the
configuration for the specific CI instance it needs (Jenkins instance,
GHA Organization, ...). This gives it a CIConfig instance, which knows
things like the URL to call to start the job; credentials to use;
possibly additional arguments to pass (QQQ which may be modified by
things like the git repository/branch, author, ...?).

A CIConfig has a method `trigger()` which accepts standard arguments -
at least, the list of Gerrit patchset(s) to apply. Speer invokes this
for each job it wants.

Ideally this would be fire-and-forget. The CI system should be
configured to write back "run" Nats entries to the `ci` bucket as the
job progresses. If the CI system cannot be configured to immediately
post to Nats upon job scheduling (ie, it will only post when the job
actually starts, or even only when it completes), Speer may need to
create an initial entry for the run in a "SCHEDULED" state.

Speer also watches the `ci` bucket, and at a minimum, when a run is
marked completed (SUCCESS or FAILURE), it will decide whether or not to
post a vote on the corresponding patchset(s). This will be part of the
job configuration mentioned earlier; each job that should be launched
will be associated with a vote axis and voting Gerrit user. (QQQ it will
probably be necessary to allow a single axis+user combination to be used
for multiple jobs, in which case the vote should probably be reserved
until all runs have completed. Or, at least, it should not vote SUCCESS
until all runs have succeeded; it could pre-emptively vote FAILED as
soon as one job fails.)

# Checks UI

Meanwhile, whenver SpeerChecks is invoked, it will call the `fetch()`
method on Speer to get the JSON response to feed to the Checks API.
Speer needs to know how to map from a given change+patchset to a set of
CI runs. Perhaps it could have a separate `checks` bucket, which would
always be kept up-to-date with a complete JSON response ready to go. The
values in this bucket would be updated by Speer as events are posted
into the `ci` and `gerrit` buckets. This is probably the easiest
approach. Otherwise, `fetch()` will need to assemble this from the
current state of the buckets. Not currently clear whether that would be
too slow.

If we do decide to have Speer keep a `checks` bucket up-to-date, we need
to use Nats's [atomic update
operation](https://docs.nats.io/nats-concepts/jetstream/key-value-store/kv_walkthrough#update-with-cas-aka-optimistic-locking)
(aka "compare and swap") operation to avoid race conditions. Indeed, we
should use this everywhere we update a KV entry in-place.

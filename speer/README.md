# Data models

Running `uv task run models` will generate all necessary models for
communication between the Gerrit plugin and Speer.

`models` is a Taskipy task, defined in `pyproject.toml` under
`tool.taskipy.tasks`. `models` just invokes three other tasks. The first
two together convert the Gerrit API datamodel to Pydantic; the third
converts Speer's Pydantic datamodel to Typescript.

## Gerrit API datamodel

The Gerrit API is defined in Typescript as part of the Gerrit source
code.  We care about some of the models defined in `checks.ts`, as well
as the transitive closure of models referenced in there.

We convert all this to Pydantic by first converting the Gerrit API's
typescript API into JSON schema using `npx ts-json-schema-generator`,
and then using Pydantic's `datamodel-codegen` to convert the JSON schema
to a Pydantic file. The resulting `checks_datamodel.py` is added to git
in `src/speer`.

The current implementation depends on the path on my laptop to find the
Gerrit source code; this might be improveable.

## Speer datamodel

Speer's own API is defined as Pydantic models in
`src/speer/speer_datamodel.py`. We convert this to Typescript using the
tool `pydantic2ts`. This in turn makes use of `json2ts`, which we invoke
using `npm json-schema-to-typescript`.

The resulting `speer.ts` is added to git in `../plugin/src`.

Note: I could have just passed Gerrit's `ChangeData` model directly, and
passed that from `fetch()` in the plugin over to Speer. However, this
produced some errors when I tried because the payload didn't quite
exactly match the converted Pydantic model. Moreover, the payload was
enormous; the `changeInfo` field contains a ton of data, most of which
is not interesting to Speer. I assume a lot of that data is only loaded
on demand inside the Javsscript, but when we serialize it over to Speer
it all gets unwound. That would make for a lot of unnecessary network
traffic. Hence I created a simple `SpeerRequest` which contains only the
fields we need (so far).

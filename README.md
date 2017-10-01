# MonoQL

_Pronounced "Monocle" - see what we did there?_

A small client-side library for working with GraphQL.

- Works with plain text GraphQL strings.
- Provides some utilities for generating GraphQL strings dynamically.
- Supports middleware for each request.
- No imposed caching layer.

## Getting Started

Install via `npm`:

```
npm install --save monoql
```

## Usage

### Create a Client

You'll need a `Client` instance to start making requests to your GraphQL endpoint.

```ts
import { Client } from "monoql";

var client = new Client("/graphql");
```

### Your First Query

Once you have a client, you can run a query against your GraphQL endpoint by using the `run()` method.  Calling this method will immediately create an XHR request to the server using the given `query` and `variables` (if any).  It returns a promise for interacting with the response data.

> **Note:** This method supports `mutation {}` queries as well.

```ts
import { Client } from "monoql";

var client = new Client("/graphql");

client.run("query {todos: {id, name, complete}}").then(...);
```

### Now for Some Sugar

The `query()` and `mutate()` methods will generate new functions that build your query using a programmatic approach for describing your schema.

Here's an example repeating the query we used above.  The top level of the schema is an `object`, where the key is what we expect the returned key to be.

```ts
import { Client } from "monoql";

var client = new Client("/graphql");

// query {todos{id,name,complete}}
var getTodos = client.query({
  todos: ["id", "name", "complete"]
});

getTodos().then(...);
```

To understand how each key/value pair is processed, check out the conversion table below.

JavaScript | GraphQL
-----------|--------
`foo: ""` | `foo`
`foo: ":bar"` | `foo:bar`
`foo: ["bar", "baz"]` | `foo{bar,baz}`
`foo: { bar: "", baz: {} }` | `foo{bar,baz}`
`foo: () => ({ bar: "" })` | `foo{bar}`

### Variables and Arguments/Filters

**Variables:** When working with the top level of your schema, you can optionally supply an `$` object containing the name and types of the variables you want to inject.

```ts
import { Client } from "monoql";

var client = new Client("/graphql");

// query ($id:ID!){ ... }
var findTodo = client.query({
  $: { id: "ID!" }
  ...
});

findTodo({ taskId: 1 }).then(...);
```

**Arguments/Filters:** For field arguments, use the provided `from()` function  to not only add arguments, but also the real field name, treating the parent key as the alias.

```ts
import { Client, from } from "monoql";

var client = new Client("/graphql");

// Use plain JS values as fragments
var todoFields = ["id", "name", "complete"];

// query {todosCount(complete:true)}
var getTodo1 = client.query({
  todosCount: from({ complete: true })
});

// query ($id:ID!){todo:findTodo(id:$id){id,name,complete}}
var getTodo = client.query({
  $: { id: "ID!" }
  todo: from("findTodo", ["id"])(todoFields)
});

// mutation ($name:String!){todo:createTodo(name:$name){id,name,complete}}
var createTodo = client.mutate({
  $: { name: "String!" },
  todo: from("createTodo", {name:"_", complete:false})(todoFields)
})
```

### Middleware

Middleware are functions that can alert the outgoing request and incoming response, and can even prevent call to the server entirely.

You can add new middleware using the `.use()` method on the client.  Middleware receive the `req` object along with a `next()` callback that invokes the middleware in the stack.  The `next()` function returns a `Promise` containing the result of the proceeding middleware.  Middleware can perform async operations by returning a `Promise`.

```ts
import { Client } from "monoql";

var client = new Client("/graphql");

client.use(function logger(req, next) {
  console.log(`Request: ${req.query}`);
  return next().then(function (data) {
    console.log(`Response: ${req.query} -> ${data}`);
    return data;
  });
});

client.use(function authenticate(req, next) {
  req.headers.Authorization = localStorage.getItem("token");
  return next();
})
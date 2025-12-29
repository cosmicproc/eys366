# API Docs

## Giraph

Graph view of our app.

### GET

`/api/giraph/get_nodes`

- Description: Get all nodes and their data.
- Auth required
- Request: None
- Response:
  ```json
  {
  "course_contents" : { id: int, name: str, relations: { "node1_id": int, "node2_id": int, "relation_id": int }[] }[],
  "course_outcomes" : { id: int, name: str, relations: { "node1_id": int, "node2_id": int, "relation_id": int }[] }[],
  "program_outcomes" : { id: int, name: str, relations: { "node1_id": int, "node2_id": int, "relation_id": int }[] }[]
  }
  ```

### POST

`/api/giraph/new_node`

- Description: Create new node.
- Auth required
- Request
  ```json
  {
  "name": str, "layer": Category("course_content", "course_outcome", "program_outcome")
  }
  ```
  - Response: Success message

---

`/api/giraph/new_relation`

- Description: Create new edge between 2 nodes.
- Auth required
- Validation: connection between nodes are only available if (cc to co) or (co to cp).
- Request:
  ```json
  {
  "node1_id" : int, "node2_id" : int, "weight" : Category(1,2,3,4,5)
  }
  ```
- Response: Success message

---

`/api/giraph/update_node`

- Description: Update new node.
- Auth required
- Request
  ```json
  {
  "name": str, "node_id" : int)
  }
  ```
  - Response: Successful update message

---

`/api/giraph/update_relation`

- Description: Create new edge between 2 nodes.
- Auth required
- Validation: connection between nodes are only available if (cc to co) or (co to cp).
- Request:
  ```json
  {
  "weight": Category(1,2,3,4,5), "relation_id" : int
  }
  ```
- Response: Success message

### DELETE

`/api/giraph/delete_node`

- **Description:** delete existing node.
- Auth required

```json
{
  "node_id": int
}
```

`/api/giraph/delete_relation`

- **Description:** delete existing relation.
- Auth required

```json
{
  "relation_id": int
}
```

## Configuration: API Base URL

Frontend requests use a configurable base URL for Giraph endpoints.

Priority order:

1. Runtime override via `setApiBase("https://backend.example.com/api/giraph")`
2. Env var `NEXT_PUBLIC_GIRAPH_API_BASE`
3. Fallback `/api/giraph`

Example runtime override (in a setup script):

```ts
import { setApiBase } from "frontend/app/lib/apiClient";
setApiBase("https://backend.example.com/api/giraph");
```

All client functions (`getNodes`, `createRelation`, `updateRelation`, `updateNode`, `deleteRelation`, `deleteNode`, `createNode`) derive the base using `getApiBase()`.

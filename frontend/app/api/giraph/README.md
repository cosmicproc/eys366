# Mock Giraph API

Simple mock API endpoints for testing the graph visualization.

## Available Endpoints

### GET `/api/giraph/get_nodes`

Returns all nodes and their relations.

**Example Response:**

```json
{
  "course_contents": [...],
  "course_outcomes": [...],
  "program_outcomes": [...]
}
```

### POST `/api/giraph/new_relation`

Create a new relation between two nodes.

**Request Body:**

```json
{
    "node1_id": 1,
    "node2_id": 5,
    "weight": 3
}
```

**Validation:**

-   Weight must be between 1-5 (0 is not accepted)
-   Connections only allowed: CC → CO or CO → PO

**Response:**

```json
{
    "message": "Relation created successfully",
    "relation_id": 12345
}
```

### DELETE `/api/giraph/delete_relation`

Delete an existing relation.

**Request Body:**

```json
{
    "relation_id": 12345
}
```

**Response:**

```json
{
    "message": "Relation deleted successfully"
}
```

## Notes

-   This is a mock API - data is not persisted
-   Network delay is simulated (100ms)
-   Authentication is not implemented in the mock
-   To connect to a real backend, update the `API_BASE` in `apiClient.ts`

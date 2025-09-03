# Cloud Native Agents UI

This is the frontend React application for the Cloud Native Agents project.

## Development

```bash
npm install
npm run dev
```

## Building for Production

### Local Build
```bash
npm run build
```

### Container Build

Build the container:
```bash
podman build -t cloud-native-agents-frontend .
```

Run with runtime environment variable:
```bash
podman run -e API_BASE_URL=http://your-api-server:8003 -p 8080:8080 cloud-native-agents-frontend
```

## Environment Variables

The application uses the following environment variables:

- `API_BASE_URL`: The base URL for the API server (defaults to `http://localhost:8003`)

**Note**: This is a runtime configuration, not a build-time variable. The container will read this environment variable when it starts up.

## Deployment

The application is configured to run on OpenShift with the backend service accessible at `http://github-mcp-server:8003`.

## Configuration

- API base URL can be set with the `REACT_APP_API_BASE_URL` environment variable.

## Linting & Formatting

- Run linting:
  ```sh
  npm run lint
  ```
- Prettier is included for code formatting. 

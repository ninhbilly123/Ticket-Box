export const memberAOpenApi = {
  openapi: '3.1.0',
  info: {
    title: 'TicketBox Member A APIs',
    version: '1.0.0',
    description: 'Authentication, RBAC, object authorization, and organizer admin APIs.',
  },
  servers: [{ url: 'http://localhost:3000/api/v1' }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
  tags: [
    { name: 'Auth' },
    { name: 'Public Concerts' },
    { name: 'Orders' },
    { name: 'Admin Concerts' },
    { name: 'Ticket Types' },
    { name: 'Inventory' },
    { name: 'Staff Assignments' },
    { name: 'Whitelist Email Config' },
    { name: 'Revenue' },
  ],
  paths: {
    '/auth/register': { post: { tags: ['Auth'], summary: 'Register audience account' } },
    '/auth/login': { post: { tags: ['Auth'], summary: 'Login and receive access/refresh tokens' } },
    '/auth/logout': { post: { tags: ['Auth'], summary: 'Logout and revoke refresh token' } },
    '/auth/refresh': { post: { tags: ['Auth'], summary: 'Rotate refresh token and return new tokens' } },
    '/auth/me': { get: { tags: ['Auth'], security: [{ bearerAuth: [] }], summary: 'Get current profile' } },
    '/concerts': {
      get: {
        tags: ['Public Concerts'],
        summary: 'List published concerts with Redis cache and Redis-backed rate limit',
        parameters: [
          { name: 'search', in: 'query', required: false, schema: { type: 'string' } },
          { name: 'artist', in: 'query', required: false, schema: { type: 'string' } },
          { name: 'date', in: 'query', required: false, schema: { type: 'string', format: 'date' } },
          { name: 'location', in: 'query', required: false, schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'Concert list returned from cache or PostgreSQL fallback' },
          '429': { description: 'Too many concert listing requests' },
        },
      },
    },
    '/concerts/{id}': {
      get: {
        tags: ['Public Concerts'],
        summary: 'Get public concert detail with Redis cache and short-lived availability composition',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': { description: 'Public concert detail returned from Redis cache or PostgreSQL fallback' },
          '404': { description: 'Concert not found or not public' },
          '429': { description: 'Too many concert detail requests' },
        },
      },
    },
    '/concerts/{id}/availability': {
      get: {
        tags: ['Public Concerts'],
        summary: 'Get short-lived ticket availability for display only',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': { description: 'Ticket availability by ticket type' },
          '404': { description: 'Concert not found or not public' },
          '429': { description: 'Too many availability requests' },
        },
      },
    },
    '/concerts/{concertId}/waiting-room/join': {
      post: {
        tags: ['Public Concerts'],
        security: [{ bearerAuth: [] }],
        summary: 'Join the Redis waiting room for a hot concert',
        parameters: [
          { name: 'concertId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': { description: 'WAITING with queue position, or READY with checkout token' },
          '401': { description: 'Authentication required' },
          '404': { description: 'Concert unavailable or waiting room not enabled' },
        },
      },
    },
    '/concerts/{concertId}/waiting-room/status': {
      get: {
        tags: ['Public Concerts'],
        security: [{ bearerAuth: [] }],
        summary: 'Get waiting room position or checkout token readiness',
        parameters: [
          { name: 'concertId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': { description: 'WAITING with queue position, or READY with checkout token' },
          '401': { description: 'Authentication required' },
          '404': { description: 'Waiting room membership not found' },
        },
      },
    },
    '/orders/hold': {
      post: {
        tags: ['Orders'],
        security: [{ bearerAuth: [] }],
        summary: 'Hold selected tickets and create a pending order with rate limit and optional waiting-room token',
        parameters: [
          { name: 'Idempotency-Key', in: 'header', required: true, schema: { type: 'string' } },
          {
            name: 'Checkout-Token',
            in: 'header',
            required: false,
            schema: { type: 'string' },
            description: 'Required only when the concert is configured as a hot concert in the waiting room.',
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['concertId', 'items'],
                properties: {
                  concertId: { type: 'string', format: 'uuid' },
                  items: {
                    type: 'array',
                    items: {
                      type: 'object',
                      required: ['ticketTypeId', 'quantity'],
                      properties: {
                        ticketTypeId: { type: 'string', format: 'uuid' },
                        quantity: { type: 'integer', minimum: 1 },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Pending order created or idempotent previous order returned' },
          '400': { description: 'Invalid hold request, sale window, sold out, or max-per-account violation' },
          '401': { description: 'Authentication required' },
          '403': { description: 'NOT_YOUR_TURN or CHECKOUT_TOKEN_EXPIRED for hot concerts' },
          '409': { description: 'Idempotency key already used for another hold' },
          '429': { description: 'TOO_MANY_REQUESTS from Redis hold-order rate limit' },
        },
      },
    },
    '/admin/concerts': {
      get: { tags: ['Admin Concerts'], security: [{ bearerAuth: [] }], summary: 'List manageable concerts' },
      post: { tags: ['Admin Concerts'], security: [{ bearerAuth: [] }], summary: 'Create draft concert' },
    },
    '/admin/concerts/{id}': {
      get: { tags: ['Admin Concerts'], security: [{ bearerAuth: [] }], summary: 'Get concert detail' },
      patch: { tags: ['Admin Concerts'], security: [{ bearerAuth: [] }], summary: 'Update concert' },
    },
    '/admin/concerts/{id}/publish': {
      post: { tags: ['Admin Concerts'], security: [{ bearerAuth: [] }], summary: 'Publish concert' },
    },
    '/admin/concerts/{id}/cancel': {
      post: { tags: ['Admin Concerts'], security: [{ bearerAuth: [] }], summary: 'Cancel concert' },
    },
    '/admin/concerts/{concertId}/ticket-types': {
      get: { tags: ['Ticket Types'], security: [{ bearerAuth: [] }], summary: 'List ticket types' },
      post: { tags: ['Ticket Types'], security: [{ bearerAuth: [] }], summary: 'Create ticket type' },
    },
    '/admin/ticket-types/{id}': {
      patch: { tags: ['Ticket Types'], security: [{ bearerAuth: [] }], summary: 'Update ticket type' },
      delete: { tags: ['Ticket Types'], security: [{ bearerAuth: [] }], summary: 'Delete safe ticket type' },
    },
    '/admin/ticket-types/{id}/inventory': {
      get: { tags: ['Inventory'], security: [{ bearerAuth: [] }], summary: 'Get inventory' },
      patch: { tags: ['Inventory'], security: [{ bearerAuth: [] }], summary: 'Update inventory safely' },
    },
    '/admin/concerts/{concertId}/staff-assignments': {
      get: { tags: ['Staff Assignments'], security: [{ bearerAuth: [] }], summary: 'List staff assignments' },
      post: { tags: ['Staff Assignments'], security: [{ bearerAuth: [] }], summary: 'Assign check-in staff' },
    },
    '/admin/staff': {
      get: { tags: ['Staff Assignments'], security: [{ bearerAuth: [] }], summary: 'List check-in staff in organizer organization' },
      post: { tags: ['Staff Assignments'], security: [{ bearerAuth: [] }], summary: 'Create check-in staff account in organizer organization' },
    },
    '/admin/staff-assignments/{id}': {
      delete: { tags: ['Staff Assignments'], security: [{ bearerAuth: [] }], summary: 'Delete staff assignment' },
    },
    '/admin/whitelist-email-configs': {
      get: { tags: ['Whitelist Email Config'], security: [{ bearerAuth: [] }], summary: 'List whitelist configs' },
      post: { tags: ['Whitelist Email Config'], security: [{ bearerAuth: [] }], summary: 'Create whitelist config' },
    },
    '/admin/whitelist-email-configs/{id}': {
      patch: { tags: ['Whitelist Email Config'], security: [{ bearerAuth: [] }], summary: 'Update whitelist config' },
      delete: { tags: ['Whitelist Email Config'], security: [{ bearerAuth: [] }], summary: 'Delete whitelist config' },
    },
    '/internal/whitelist-email-configs/active': {
      get: { tags: ['Whitelist Email Config'], summary: 'List active whitelist configs for CSV worker' },
    },
    '/admin/concerts/{id}/revenue-summary': {
      get: { tags: ['Revenue'], security: [{ bearerAuth: [] }], summary: 'Get revenue summary' },
    },
    '/admin/concerts/{id}/sales-stats': {
      get: { tags: ['Revenue'], security: [{ bearerAuth: [] }], summary: 'Get sales stats' },
    },
  },
};

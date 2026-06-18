export const memberAOpenApi = {
  openapi: '3.1.0',
  info: {
    title: 'TicketBox Member A APIs',
    version: '1.0.0',
    description: 'Authentication, RBAC, object authorization, and admin management APIs.',
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
    { name: 'Admin Concerts' },
    { name: 'Ticket Types' },
    { name: 'Inventory' },
    { name: 'Staff Assignments' },
    { name: 'Whitelist Email Config' },
    { name: 'Revenue' },
    { name: 'Admin Users' },
  ],
  paths: {
    '/auth/register': { post: { tags: ['Auth'], summary: 'Register audience account' } },
    '/auth/login': { post: { tags: ['Auth'], summary: 'Login and receive access/refresh tokens' } },
    '/auth/logout': { post: { tags: ['Auth'], summary: 'Logout and revoke refresh token' } },
    '/auth/refresh': { post: { tags: ['Auth'], summary: 'Rotate refresh token and return new tokens' } },
    '/auth/me': { get: { tags: ['Auth'], security: [{ bearerAuth: [] }], summary: 'Get current profile' } },
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
    '/admin/users': {
      get: { tags: ['Admin Users'], security: [{ bearerAuth: [] }], summary: 'List users' },
    },
    '/admin/users/{id}/role': {
      patch: { tags: ['Admin Users'], security: [{ bearerAuth: [] }], summary: 'Update user role' },
    },
    '/admin/users/{id}/status': {
      patch: { tags: ['Admin Users'], security: [{ bearerAuth: [] }], summary: 'Update user status' },
    },
  },
};


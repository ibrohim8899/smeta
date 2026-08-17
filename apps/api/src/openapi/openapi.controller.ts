import { Controller, Get } from "@nestjs/common";

const jsonResponse = {
  content: {
    "application/json": {
      schema: {
        type: "object"
      }
    }
  },
  description: "JSON response"
};

const noContentBody = {
  content: {
    "application/json": {
      schema: {
        type: "object"
      }
    }
  },
  required: false
};

@Controller()
export class OpenApiController {
  @Get("openapi.json")
  getOpenApi() {
    return {
      openapi: "3.1.0",
      info: {
        title: "Smeta Market V1 API",
        version: "1.0.0",
        description: "V1 contract for Telegram-first material request, store offer, order, finance and admin workflows."
      },
      servers: [
        {
          url: process.env.API_PUBLIC_URL ?? "http://localhost:4000"
        }
      ],
      components: {
        securitySchemes: {
          smetaSession: {
            in: "header",
            name: "x-smeta-session",
            type: "apiKey"
          },
          internalWorkerSecret: {
            in: "header",
            name: "x-internal-worker-secret",
            type: "apiKey"
          }
        }
      },
      security: [
        {
          smetaSession: []
        }
      ],
      paths: {
        "/auth/me": this.path("get", "Read current authenticated session"),
        "/auth/permissions": this.path("get", "Read role permission matrix"),
        "/auth/telegram/exchange": this.path("post", "Exchange Telegram Mini App initData for a session"),
        "/auth/browser-login": this.path("post", "Create a Telegram-confirmed website login nonce"),
        "/auth/browser-login/{nonce}": this.path("get", "Poll Telegram-confirmed website login nonce"),
        "/auth/browser-login/{nonce}/cancel": this.path("post", "Cancel website login nonce"),
        "/auth/telegram/webhook": this.path("post", "Receive Telegram bot updates idempotently"),
        "/auth/logout": this.path("post", "Revoke current session"),
        "/auth/users/{userId}/revoke-sessions": this.path("post", "Revoke all sessions for a user"),
        "/dealers": {
          get: this.operation("List dealers"),
          post: this.operation("Create dealer application")
        },
        "/dealers/referral/{referralCode}": this.path("get", "Read public approved dealer referral"),
        "/dealers/{id}/referral-tools": this.path("get", "Read dealer referral tools"),
        "/dealers/{id}/referral/rotate": this.path("post", "Rotate dealer referral code"),
        "/dealers/{id}/requests": this.path("get", "Read dealer attributed requests"),
        "/dealers/{id}/summary": this.path("get", "Read dealer summary"),
        "/dealers/{id}/status": this.path("patch", "Update dealer status"),
        "/stores": {
          get: this.operation("List stores"),
          post: this.operation("Create admin store")
        },
        "/stores/apply": this.path("post", "Create store application"),
        "/stores/{id}": this.path("get", "Read store"),
        "/stores/{id}/profile": this.path("patch", "Update store profile"),
        "/stores/{id}/status": this.path("patch", "Update store status"),
        "/stores/{id}/inbox": this.path("get", "Read store-scoped inbox"),
        "/material-requests": {
          get: this.operation("List material requests"),
          post: this.operation("Create metadata-only material request")
        },
        "/material-requests/with-files": this.path("post", "Create material request with uploaded files"),
        "/material-requests/{id}": {
          get: this.operation("Read material request"),
          delete: this.operation("Cancel material request")
        },
        "/material-requests/{id}/status": this.path("patch", "Update material request status"),
        "/material-requests/{id}/resolve-dispute": this.path("post", "Resolve material request dispute"),
        "/material-requests/{requestId}/assign-stores": this.path("post", "Assign stores to a request"),
        "/material-requests/{requestId}/recipients": this.path("get", "Read request recipients"),
        "/material-requests/{requestId}/offers": {
          get: this.operation("Read request offers"),
          post: this.operation("Create store offer")
        },
        "/material-requests/{requestId}/stores/{storeId}/decline": this.path("post", "Decline request as store"),
        "/material-requests/{requestId}/offers/{offerId}/withdraw": this.path("post", "Withdraw store offer"),
        "/material-requests/{requestId}/select-offer/{offerId}": this.path("post", "Select one store offer"),
        "/material-requests/{requestId}/order": this.path("get", "Read order by request"),
        "/material-requests/guest/{token}": this.publicPath("get", "Read guest request by secure token"),
        "/material-requests/guest/{token}/contact": this.publicPath("patch", "Update guest contact"),
        "/material-requests/guest/{token}/offers": this.publicPath("get", "Read guest-safe offers"),
        "/material-requests/guest/{token}/select-offer/{offerId}": this.publicPath("post", "Guest selects one offer"),
        "/material-requests/guest/{token}/order": this.publicPath("get", "Read guest order"),
        "/material-requests/guest/{token}/cancel": this.publicPath("post", "Guest cancellation"),
        "/material-requests/guest/{token}/dispute": this.publicPath("post", "Guest dispute"),
        "/material-requests/guest/{token}/orders/{orderId}/confirm-delivery": this.publicPath("post", "Guest delivery confirmation"),
        "/orders": this.path("get", "List orders"),
        "/orders/{orderId}/status": this.path("patch", "Update order fulfilment status"),
        "/orders/{orderId}/confirm-delivery": this.path("post", "Confirm delivery"),
        "/orders/{orderId}/resolve-dispute": this.path("post", "Resolve order dispute"),
        "/finance/ledger": this.path("get", "Read finance ledger"),
        "/finance/summary": this.path("get", "Read finance summary"),
        "/finance/ledger/{ledgerId}/payments": this.path("get", "Read ledger payments"),
        "/finance/ledger/{ledgerId}/payment": this.path("patch", "Record store payment"),
        "/finance/ledger/{ledgerId}/adjustment": this.path("post", "Record finance adjustment"),
        "/finance/statements/store/{storeId}": this.path("get", "Read store statement"),
        "/finance/statements/dealer/{dealerId}": this.path("get", "Read dealer statement"),
        "/finance/payouts": {
          get: this.operation("List dealer payouts"),
          post: this.operation("Create dealer payout")
        },
        "/finance/payouts/{payoutId}/status": this.path("patch", "Update payout status"),
        "/reports/v1-summary": this.path("get", "Read V1 report summary"),
        "/reports/v1-summary.csv": this.path("get", "Download V1 CSV report"),
        "/settings": {
          get: this.operation("Read V1 settings"),
          patch: this.operation("Update V1 settings")
        },
        "/notifications": {
          get: this.operation("List notifications"),
          post: this.operation("Create manual notification")
        },
        "/notifications/due": this.path("get", "Read due notifications"),
        "/notifications/claim-next": this.path("post", "Claim next notification"),
        "/notifications/{id}/status": this.path("patch", "Update notification status"),
        "/notifications/{id}/retry": this.path("post", "Retry notification"),
        "/audit": this.path("get", "Read audit logs"),
        "/health": this.publicPath("get", "Public health check"),
        "/health/integrations": this.path("get", "Read integration health"),
        "/internal/notifications/process": this.internalPath("post", "Process due outbox notifications"),
        "/internal/deadlines/process": this.internalPath("post", "Process request and order deadlines"),
        "/internal/files/cleanup": this.internalPath("post", "Clean unreferenced temporary uploads"),
        "/openapi.json": this.publicPath("get", "Read OpenAPI contract")
      }
    };
  }

  private path(method: "delete" | "get" | "patch" | "post", summary: string) {
    return {
      [method]: this.operation(summary)
    };
  }

  private publicPath(method: "get" | "patch" | "post", summary: string) {
    return {
      [method]: this.operation(summary, true)
    };
  }

  private internalPath(method: "post", summary: string) {
    return {
      [method]: {
        ...this.operation(summary),
        security: [
          {
            internalWorkerSecret: []
          }
        ]
      }
    };
  }

  private operation(summary: string, isPublic = false) {
    return {
      summary,
      requestBody: noContentBody,
      responses: {
        "200": jsonResponse,
        "400": {
          description: "Validation or business rule error"
        },
        "401": {
          description: "Authentication required"
        },
        "403": {
          description: "Permission denied"
        }
      },
      ...(isPublic
        ? {
            security: []
          }
        : {})
    };
  }
}

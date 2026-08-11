"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.STAGE_ONE_CHECKLIST = exports.ORDER_STATUSES = exports.REQUEST_STATUSES = exports.USER_ROLES = exports.APP_CURRENCY = exports.APP_TIMEZONE = void 0;
exports.APP_TIMEZONE = "Asia/Tashkent";
exports.APP_CURRENCY = "UZS";
exports.USER_ROLES = [
    "customer",
    "dealer",
    "store",
    "admin",
    "finance",
    "superadmin"
];
exports.REQUEST_STATUSES = [
    "draft",
    "submitted",
    "under_review",
    "published",
    "collecting_offers",
    "selection_open",
    "selected",
    "completed",
    "expired",
    "canceled",
    "disputed"
];
exports.ORDER_STATUSES = [
    "pending_store_acceptance",
    "accepted",
    "preparing",
    "ready",
    "dispatched",
    "delivered_pending_confirmation",
    "completed",
    "canceled",
    "disputed"
];
exports.STAGE_ONE_CHECKLIST = [
    "Monorepo foundation",
    "NestJS API shell",
    "React web shell",
    "PostgreSQL configuration",
    "Shared roles and statuses",
    "Health check endpoint"
];

/**
 * tc-0014 (31 Oct 2026): one read per page view. The dashboard frame and the
 * page inside it both asked the database for the driver and his Clover money,
 * one after the other, on every click - the main reason the tabs were slow.
 * React's cache() keeps one answer for the length of a single page request
 * (never across requests or people), so each is read once.
 * Server components only (layout and pages) - API routes keep the plain functions.
 */
import { cache } from "react";
import { findDriverById } from "./drivers";
import { getDriverSummary } from "./payments";

export const driverForRequest = cache(findDriverById);
export const summaryForRequest = cache(getDriverSummary);

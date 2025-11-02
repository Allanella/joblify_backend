import express from "express";
import {
  getJobseekerDashboard,
  getCompanies,
  getJobPosts,
  applyToJob,
  subscribeToCompany,
  respondToInvitation,
  getApplicationTracking,
  getJobseekerProfile
} from "../controllers/jobseeker.controller.mjs";

const router = express.Router();

// ==========================================
// JOBSEEKER ROUTES
// ==========================================

// Dashboard
router.get("/dashboard", getJobseekerDashboard);

// Profile
router.get("/profile", getJobseekerProfile);

// Companies
router.get("/companies", getCompanies);

// Job Posts
router.get("/jobs", getJobPosts);
router.post("/jobs/:jobId/apply", applyToJob);

// Subscriptions & Invitations
router.post("/companies/:companyId/subscribe", subscribeToCompany);
router.post("/invitations/:invitationId/respond", respondToInvitation);

// Premium Features
router.get("/applications/tracking", getApplicationTracking);

export default router;
import express from "express";
import {
  registerJobseeker,
  registerCompany,
  createLoginSession,
  getPrivacySettings,
  updatePrivacySettings,
  getLoginActivity,
  signOutAllDevices,
  createJobSeekerProfile,
  createJobPost
} from "../controllers/auth.controller.mjs";

const router = express.Router();

// ===========================================
// AUTH ROUTES
// ===========================================

// Registration
router.post("/register/jobseeker", registerJobseeker);
router.post("/register/company", registerCompany);

// Login
router.post("/login", createLoginSession);

// ===========================================
// PROFILE & JOB ROUTES
// ===========================================

// Job Seeker Profile
router.post("/job-seeker/profile", createJobSeekerProfile);

// Job Posts
router.post("/jobs", createJobPost);

// ===========================================
// PRIVACY & SECURITY ROUTES
// ===========================================

router.get("/privacy-settings", getPrivacySettings);
router.put("/privacy-settings", updatePrivacySettings);
router.get("/login-activity", getLoginActivity);
router.post("/signout-all", signOutAllDevices);

export default router;
import express from "express";
import {
  getCompanyDashboard,
  getJobseekers,
  getJobApplicants,
  updateApplicantStatus,
  updateJobPost,
  deleteJobPost,
  inviteJobseeker,
  shareJobWithJobseeker,
  getChatAreas,
  getChatMessages,
  sendChatMessage
} from "../controllers/company.controller.mjs";

const router = express.Router();

// ==========================================
// COMPANY ROUTES
// ==========================================

// Dashboard
router.get("/dashboard", getCompanyDashboard);

// Jobseekers
router.get("/jobseekers", getJobseekers);
router.post("/jobseekers/:jobseekerId/invite", inviteJobseeker);
router.post("/jobseekers/:jobseekerId/share-job", shareJobWithJobseeker);

// Job Management
router.put("/jobs/:jobId", updateJobPost);
router.delete("/jobs/:jobId", deleteJobPost);

// Applicants
router.get("/jobs/:jobId/applicants", getJobApplicants);
router.put("/applicants/:applicantId/status", updateApplicantStatus);

// Chat
router.get("/chats", getChatAreas);
router.get("/chats/:chatAreaId/messages", getChatMessages);
router.post("/chats/:chatAreaId/messages", sendChatMessage);

export default router;
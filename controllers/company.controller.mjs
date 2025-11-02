import asyncHandler from "express-async-handler";
import prisma from "../lib/prisma.mjs";

// ==========================================
// COMPANY DASHBOARD (JOB_UC_04.0)
// ==========================================

export const getCompanyDashboard = asyncHandler(async (req, res) => {
  const userId = req.session.userId;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Not authenticated"
    });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId, userType: "COMPANY" },
      include: {
        companyProfile: true,
        jobsPosted: {
          where: { isActive: true },
          include: {
            _count: {
              select: {
                applications: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 5
        },
        companySubscriptions: {
          include: {
            jobSeeker: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
                jobSeekerProfile: {
                  select: {
                    profileType: true,
                    skills: true
                  }
                }
              }
            }
          },
          take: 5
        }
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Company not found"
      });
    }

    // Get counts
    const activeJobsCount = await prisma.jobPost.count({
      where: { companyId: userId, isActive: true }
    });

    const totalApplications = await prisma.jobApplication.count({
      where: {
        jobPost: { companyId: userId }
      }
    });

    const subscriptionsCount = await prisma.companySubscription.count({
      where: { companyId: userId }
    });

    const unreadNotifications = await prisma.notification.count({
      where: { userId, isRead: false }
    });

    res.json({
      success: true,
      dashboard: {
        company: {
          id: user.id,
          companyName: user.companyName,
          email: user.email,
          industry: user.industry
        },
        profile: user.companyProfile,
        stats: {
          activeJobs: activeJobsCount,
          totalApplications,
          subscriptions: subscriptionsCount,
          unreadNotifications
        },
        recentJobs: user.jobsPosted,
        recentSubscriptions: user.companySubscriptions
      }
    });

  } catch (error) {
    console.error("Company dashboard error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to load company dashboard",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ==========================================
// VIEW JOBSEEKERS PROFILES (JOB_UC_10.0)
// ==========================================

export const getJobseekers = asyncHandler(async (req, res) => {
  const userId = req.session.userId;
  const { 
    search, 
    profileType, 
    skills, 
    location, 
    page = 1, 
    limit = 10 
  } = req.query;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Not authenticated"
    });
  }

  try {
    const where = {
      userType: "JOB_SEEKER",
      jobSeekerProfile: {
        visibility: "PUBLIC"
      }
    };

    // Add search filters
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { jobSeekerProfile: { 
            bio: { contains: search, mode: 'insensitive' } 
          } 
        }
      ];
    }

    if (profileType) {
      where.jobSeekerProfile = {
        ...where.jobSeekerProfile,
        profileType
      };
    }

    if (skills) {
      const skillsArray = Array.isArray(skills) ? skills : [skills];
      where.jobSeekerProfile = {
        ...where.jobSeekerProfile,
        skills: { hasSome: skillsArray }
      };
    }

    const jobseekers = await prisma.user.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        points: true,
        jobSeekerProfile: {
          select: {
            profileType: true,
            bio: true,
            skills: true,
            education: true,
            experience: true,
            portfolio: true,
            certifications: true
          }
        },
        _count: {
          select: {
            applications: true
          }
        }
      },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' }
    });

    const total = await prisma.user.count({ where });

    res.json({
      success: true,
      jobseekers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error("Jobseekers error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch jobseekers",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ==========================================
// MANAGE JOB APPLICANTS (JOB_UC_12.0)
// ==========================================

export const getJobApplicants = asyncHandler(async (req, res) => {
  const userId = req.session.userId;
  const { jobId } = req.params;
  const { status } = req.query;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Not authenticated"
    });
  }

  try {
    // Verify job belongs to company
    const jobPost = await prisma.jobPost.findFirst({
      where: { id: jobId, companyId: userId }
    });

    if (!jobPost) {
      return res.status(404).json({
        success: false,
        message: "Job post not found"
      });
    }

    const where = {
      jobPostId: jobId
    };

    if (status) {
      where.status = status;
    }

    const applicants = await prisma.jobApplication.findMany({
      where,
      include: {
        jobSeeker: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            jobSeekerProfile: {
              select: {
                profileType: true,
                bio: true,
                skills: true,
                education: true,
                experience: true
              }
            }
          }
        },
        resume: true
      },
      orderBy: { appliedAt: 'desc' }
    });

    res.json({
      success: true,
      applicants,
      jobPost: {
        title: jobPost.title,
        hasChatArea: jobPost.hasChatArea
      }
    });

  } catch (error) {
    console.error("Applicants error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch applicants",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export const updateApplicantStatus = asyncHandler(async (req, res) => {
  const userId = req.session.userId;
  const { applicantId } = req.params;
  const { status, notes } = req.body;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Not authenticated"
    });
  }

  if (!["VIEWED", "SHORTLISTED", "INTERVIEW_SCHEDULED", "REJECTED", "ACCEPTED"].includes(status)) {
    return res.status(400).json({
      success: false,
      message: "Invalid status"
    });
  }

  try {
    // Verify application belongs to company's job
    const application = await prisma.jobApplication.findFirst({
      where: { 
        id: applicantId,
        jobPost: { companyId: userId }
      },
      include: {
        jobPost: true,
        jobSeeker: true
      }
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found"
      });
    }

    // Update application status
    const updatedApplication = await prisma.jobApplication.update({
      where: { id: applicantId },
      data: { status },
      include: {
        jobSeeker: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        },
        jobPost: {
          select: {
            title: true
          }
        }
      }
    });

    // Add to chat area if accepted and job has chat
    if (status === "ACCEPTED" && application.jobPost.hasChatArea) {
      const chatArea = await prisma.chatArea.findFirst({
        where: { jobPostId: application.jobPostId }
      });

      if (chatArea) {
        await prisma.chatParticipant.upsert({
          where: {
            chatAreaId_userId: {
              chatAreaId: chatArea.id,
              userId: application.jobSeekerId
            }
          },
          update: {},
          create: {
            chatAreaId: chatArea.id,
            userId: application.jobSeekerId
          }
        });
      }
    }

    // Create notification for jobseeker
    await prisma.notification.create({
      data: {
        userId: application.jobSeekerId,
        title: "Application Status Updated",
        message: `Your application for ${application.jobPost.title} has been ${status.toLowerCase()}`,
        type: "APPLICATION_STATUS",
        relatedId: application.id
      }
    });

    res.json({
      success: true,
      message: "Application status updated successfully",
      application: updatedApplication
    });

  } catch (error) {
    console.error("Update applicant error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update applicant status",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ==========================================
// EDIT/DELETE JOB POSTS (JOB_UC_11.1)
// ==========================================

export const updateJobPost = asyncHandler(async (req, res) => {
  const userId = req.session.userId;
  const { jobId } = req.params;
  const updateData = req.body;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Not authenticated"
    });
  }

  try {
    // Verify job belongs to company
    const jobPost = await prisma.jobPost.findFirst({
      where: { id: jobId, companyId: userId }
    });

    if (!jobPost) {
      return res.status(404).json({
        success: false,
        message: "Job post not found"
      });
    }

    // Prepare update data
    const dataToUpdate = { ...updateData };
    
    if (dataToUpdate.applicationDeadline) {
      dataToUpdate.applicationDeadline = new Date(dataToUpdate.applicationDeadline);
    }

    if (dataToUpdate.requirements && Array.isArray(dataToUpdate.requirements)) {
      dataToUpdate.requirements = dataToUpdate.requirements;
    }

    if (dataToUpdate.skillsRequired && Array.isArray(dataToUpdate.skillsRequired)) {
      dataToUpdate.skillsRequired = dataToUpdate.skillsRequired;
    }

    const updatedJob = await prisma.jobPost.update({
      where: { id: jobId },
      data: dataToUpdate
    });

    res.json({
      success: true,
      message: "Job post updated successfully",
      jobPost: updatedJob
    });

  } catch (error) {
    console.error("Update job error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update job post",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export const deleteJobPost = asyncHandler(async (req, res) => {
  const userId = req.session.userId;
  const { jobId } = req.params;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Not authenticated"
    });
  }

  try {
    // Verify job belongs to company
    const jobPost = await prisma.jobPost.findFirst({
      where: { id: jobId, companyId: userId }
    });

    if (!jobPost) {
      return res.status(404).json({
        success: false,
        message: "Job post not found"
      });
    }

    // Check if job has applications
    const applicationCount = await prisma.jobApplication.count({
      where: { jobPostId: jobId }
    });

    if (applicationCount > 0) {
      // Soft delete - mark as inactive
      await prisma.jobPost.update({
        where: { id: jobId },
        data: { isActive: false }
      });

      res.json({
        success: true,
        message: "Job post deactivated (has existing applications)"
      });
    } else {
      // Hard delete - no applications
      await prisma.jobPost.delete({
        where: { id: jobId }
      });

      res.json({
        success: true,
        message: "Job post deleted successfully"
      });
    }

  } catch (error) {
    console.error("Delete job error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete job post",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ==========================================
// TAKE ACTION ON JOBSEEKER PROFILE (JOB_UC_14.0)
// ==========================================

export const inviteJobseeker = asyncHandler(async (req, res) => {
  const userId = req.session.userId;
  const { jobseekerId } = req.params;
  const { profileType, message } = req.body;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Not authenticated"
    });
  }

  if (!profileType || !["EMPLOYABLE", "VIRTUAL_INTERN"].includes(profileType)) {
    return res.status(400).json({
      success: false,
      message: "Valid profile type is required"
    });
  }

  try {
    // Check if jobseeker exists
    const jobseeker = await prisma.user.findFirst({
      where: { id: jobseekerId, userType: "JOB_SEEKER" }
    });

    if (!jobseeker) {
      return res.status(404).json({
        success: false,
        message: "Jobseeker not found"
      });
    }

    // Check for existing invitation
    const existingInvitation = await prisma.invitation.findFirst({
      where: {
        companyId: userId,
        jobSeekerId: jobseekerId,
        profileType,
        status: "PENDING"
      }
    });

    if (existingInvitation) {
      return res.status(400).json({
        success: false,
        message: "Invitation already sent and pending"
      });
    }

    // Create invitation
    const invitation = await prisma.invitation.create({
      data: {
        companyId: userId,
        jobSeekerId: jobseekerId,
        profileType,
        message,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      },
      include: {
        company: {
          select: {
            companyName: true
          }
        },
        jobSeeker: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    });

    // Create notification for jobseeker
    await prisma.notification.create({
      data: {
        userId: jobseekerId,
        title: "New Company Invitation",
        message: `${invitation.company.companyName} invited you to subscribe as ${profileType}`,
        type: "INVITATION",
        relatedId: invitation.id
      }
    });

    res.status(201).json({
      success: true,
      message: "Invitation sent successfully",
      invitation
    });

  } catch (error) {
    console.error("Invite error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send invitation",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export const shareJobWithJobseeker = asyncHandler(async (req, res) => {
  const userId = req.session.userId;
  const { jobseekerId } = req.params;
  const { jobId } = req.body;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Not authenticated"
    });
  }

  try {
    // Verify job belongs to company
    const jobPost = await prisma.jobPost.findFirst({
      where: { id: jobId, companyId: userId }
    });

    if (!jobPost) {
      return res.status(404).json({
        success: false,
        message: "Job post not found"
      });
    }

    // Check if jobseeker exists
    const jobseeker = await prisma.user.findFirst({
      where: { id: jobseekerId, userType: "JOB_SEEKER" }
    });

    if (!jobseeker) {
      return res.status(404).json({
        success: false,
        message: "Jobseeker not found"
      });
    }

    // Create notification
    await prisma.notification.create({
      data: {
        userId: jobseekerId,
        title: "Job Shared With You",
        message: `${jobPost.company.companyName} shared a job with you: ${jobPost.title}`,
        type: "JOB_SHARED",
        relatedId: jobId
      }
    });

    res.json({
      success: true,
      message: "Job shared successfully"
    });

  } catch (error) {
    console.error("Share job error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to share job",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ==========================================
// CHAT MANAGEMENT (JOB_UC_13.0)
// ==========================================

export const getChatAreas = asyncHandler(async (req, res) => {
  const userId = req.session.userId;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Not authenticated"
    });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    let chatAreas = [];

    if (user.userType === "COMPANY") {
      // Company sees all their chat areas
      chatAreas = await prisma.chatArea.findMany({
        where: { companyId: userId },
        include: {
          jobPost: {
            select: {
              title: true
            }
          },
          _count: {
            select: {
              participants: true,
              messages: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
    } else {
      // Jobseeker sees chat areas they're participants in
      chatAreas = await prisma.chatArea.findMany({
        where: {
          participants: {
            some: { userId }
          }
        },
        include: {
          company: {
            select: {
              companyName: true
            }
          },
          jobPost: {
            select: {
              title: true
            }
          },
          _count: {
            select: {
              participants: true,
              messages: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
    }

    res.json({
      success: true,
      chatAreas
    });

  } catch (error) {
    console.error("Chat areas error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch chat areas",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export const getChatMessages = asyncHandler(async (req, res) => {
  const userId = req.session.userId;
  const { chatAreaId } = req.params;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Not authenticated"
    });
  }

  try {
    // Verify user has access to chat
    const participant = await prisma.chatParticipant.findFirst({
      where: {
        chatAreaId,
        userId
      }
    });

    if (!participant) {
      return res.status(403).json({
        success: false,
        message: "Access denied to chat area"
      });
    }

    const messages = await prisma.chatMessage.findMany({
      where: { chatAreaId },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            companyName: true,
            userType: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    res.json({
      success: true,
      messages
    });

  } catch (error) {
    console.error("Chat messages error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch chat messages",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export const sendChatMessage = asyncHandler(async (req, res) => {
  const userId = req.session.userId;
  const { chatAreaId } = req.params;
  const { content } = req.body;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Not authenticated"
    });
  }

  if (!content || content.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: "Message content is required"
    });
  }

  try {
    // Verify user has access to chat
    const participant = await prisma.chatParticipant.findFirst({
      where: {
        chatAreaId,
        userId
      }
    });

    if (!participant) {
      return res.status(403).json({
        success: false,
        message: "Access denied to chat area"
      });
    }

    const message = await prisma.chatMessage.create({
      data: {
        chatAreaId,
        userId,
        content: content.trim()
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            companyName: true,
            userType: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: "Message sent successfully",
      chatMessage: message
    });

  } catch (error) {
    console.error("Send message error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send message",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});
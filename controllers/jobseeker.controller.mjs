import asyncHandler from "express-async-handler";
import prisma from "../lib/prisma.mjs";

// ==========================================
// JOBSEEKER DASHBOARD (JOB_UC_03.0)
// ==========================================

export const getJobseekerDashboard = asyncHandler(async (req, res) => {
  const userId = req.user?.id || req.session?.userId;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Not authenticated"
    });
  }

  try {
    // Get user with profile
    const user = await prisma.user.findUnique({
      where: { id: userId, userType: "JOB_SEEKER" },
      include: {
        jobSeekerProfile: true,
        applications: {
          include: {
            jobPost: {
              include: {
                company: {
                  select: {
                    companyName: true,
                    industry: true
                  }
                }
              }
            }
          },
          orderBy: { appliedAt: 'desc' },
          take: 5
        },
        jobSeekerSubscriptions: {
          include: {
            company: {
              select: {
                companyName: true,
                industry: true
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
        message: "Jobseeker not found"
      });
    }

    // Get counts with safe error handling
    let applicationsCount = 0;
    let subscriptionsCount = 0;
    let unreadNotifications = 0;

    try {
      applicationsCount = await prisma.jobApplication.count({
        where: { jobSeekerId: userId }
      });
    } catch (error) {
      console.log("⚠️ JobApplication count not available:", error.message);
    }

    try {
      subscriptionsCount = await prisma.companySubscription.count({
        where: { jobSeekerId: userId }
      });
    } catch (error) {
      console.log("⚠️ CompanySubscription count not available:", error.message);
    }

    try {
      unreadNotifications = await prisma.notification.count({
        where: { userId, isRead: false }
      });
    } catch (error) {
      console.log("⚠️ Notification count not available:", error.message);
    }

    res.json({
      success: true,
      dashboard: {
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          points: user.points
        },
        profile: user.jobSeekerProfile,
        stats: {
          applications: applicationsCount,
          subscriptions: subscriptionsCount,
          unreadNotifications
        },
        recentApplications: user.applications,
        recentSubscriptions: user.jobSeekerSubscriptions
      }
    });

  } catch (error) {
    console.error("Dashboard error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to load dashboard",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ==========================================
// VIEW COMPANIES (JOB_UC_06.0)
// ==========================================

export const getCompanies = asyncHandler(async (req, res) => {
  const userId = req.user?.id || req.session?.userId;
  const { search, industry, companySize, page = 1, limit = 10 } = req.query;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Not authenticated"
    });
  }

  try {
    const where = {
      userType: "COMPANY",
      verificationStatus: "VERIFIED"
    };

    // Add search filters
    if (search) {
      where.OR = [
        { companyName: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (industry) {
      where.industry = industry;
    }

    if (companySize) {
      where.companySize = companySize;
    }

    const companies = await prisma.user.findMany({
      where,
      select: {
        id: true,
        companyName: true,
        industry: true,
        companySize: true,
        description: true,
        establishmentYear: true,
        address: true,
        website: true,
        linkedin: true,
        companyProfile: {
          select: {
            logo: true
          }
        },
        _count: {
          select: {
            jobsPosted: {
              where: { isActive: true }
            }
          }
        }
      },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit),
      orderBy: { companyName: 'asc' }
    });

    const total = await prisma.user.count({ where });

    res.json({
      success: true,
      companies,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error("Companies error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch companies",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ==========================================
// VIEW JOB POSTS (JOB_UC_08.0)
// ==========================================

export const getJobPosts = asyncHandler(async (req, res) => {
  const userId = req.user?.id || req.session?.userId;
  const { 
    search, 
    industry, 
    jobType, 
    location, 
    experienceLevel,
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
      isActive: true,
      applicationDeadline: { gt: new Date() }
    };

    // Add filters
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { company: { companyName: { contains: search, mode: 'insensitive' } } }
      ];
    }

    if (industry) {
      where.industry = industry;
    }

    if (jobType) {
      where.jobType = jobType;
    }

    if (location) {
      where.location = { contains: location, mode: 'insensitive' };
    }

    if (experienceLevel) {
      where.experienceLevel = experienceLevel;
    }

    const jobPosts = await prisma.jobPost.findMany({
      where,
      include: {
        company: {
          select: {
            companyName: true,
            industry: true,
            companySize: true,
            address: true,
            companyProfile: {
              select: {
                logo: true
              }
            }
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

    const total = await prisma.jobPost.count({ where });

    res.json({
      success: true,
      jobPosts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error("Job posts error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch job posts",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ==========================================
// APPLY TO JOB POST (JOB_UC_08.1)
// ==========================================

export const applyToJob = asyncHandler(async (req, res) => {
  const userId = req.user?.id || req.session?.userId;
  const { jobId } = req.params;
  const { resumeId, coverLetter, customResume } = req.body;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Not authenticated"
    });
  }

  try {
    // Check if job exists and is active
    const jobPost = await prisma.jobPost.findFirst({
      where: { 
        id: jobId, 
        isActive: true,
        applicationDeadline: { gt: new Date() }
      }
    });

    if (!jobPost) {
      return res.status(404).json({
        success: false,
        message: "Job post not found or expired"
      });
    }

    // Check if already applied
    const existingApplication = await prisma.jobApplication.findFirst({
      where: {
        jobPostId: jobId,
        jobSeekerId: userId
      }
    });

    if (existingApplication) {
      return res.status(400).json({
        success: false,
        message: "You have already applied to this job"
      });
    }

    let resumeToUse = resumeId;

    // Create custom resume if provided
    if (customResume) {
      const newResume = await prisma.resume.create({
        data: {
          userId,
          title: `Custom Resume for ${jobPost.title}`,
          summary: customResume.summary,
          experience: customResume.experience,
          education: customResume.education,
          skills: customResume.skills,
          custom: true
        }
      });
      resumeToUse = newResume.id;
    }

    // Validate resume exists
    if (resumeToUse) {
      const resume = await prisma.resume.findFirst({
        where: { id: resumeToUse, userId }
      });

      if (!resume) {
        return res.status(400).json({
          success: false,
          message: "Resume not found"
        });
      }
    }

    // Create application
    const application = await prisma.jobApplication.create({
      data: {
        jobPostId: jobId,
        jobSeekerId: userId,
        resumeId: resumeToUse,
        coverLetter,
        status: "NOT_VIEWED"
      },
      include: {
        jobPost: {
          include: {
            company: {
              select: {
                companyName: true
              }
            }
          }
        },
        resume: true
      }
    });

    // Add to chat area if job has one
    if (jobPost.hasChatArea) {
      const chatArea = await prisma.chatArea.findFirst({
        where: { jobPostId: jobId }
      });

      if (chatArea) {
        await prisma.chatParticipant.create({
          data: {
            chatAreaId: chatArea.id,
            userId
          }
        });
      }
    }

    // Create notification for company
    await prisma.notification.create({
      data: {
        userId: jobPost.companyId,
        title: "New Job Application",
        message: `New application received for ${jobPost.title}`,
        type: "APPLICATION",
        relatedId: application.id
      }
    });

    res.status(201).json({
      success: true,
      message: "Application submitted successfully",
      application
    });

  } catch (error) {
    console.error("Apply job error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to apply to job",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ==========================================
// SUBSCRIBE TO COMPANY (JOB_UC_07.0)
// ==========================================

export const subscribeToCompany = asyncHandler(async (req, res) => {
  const userId = req.user?.id || req.session?.userId;
  const { companyId } = req.params;
  const { profileType } = req.body;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Not authenticated"
    });
  }

  if (!profileType || !["EMPLOYABLE", "VIRTUAL_INTERN"].includes(profileType)) {
    return res.status(400).json({
      success: false,
      message: "Valid profile type is required (EMPLOYABLE or VIRTUAL_INTERN)"
    });
  }

  try {
    // Check if company exists
    const company = await prisma.user.findFirst({
      where: { id: companyId, userType: "COMPANY" }
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found"
      });
    }

    // Check if profile exists for the type
    const profile = await prisma.jobSeekerProfile.findFirst({
      where: { userId }
    });

    if (!profile) {
      return res.status(400).json({
        success: false,
        message: "Please create your job seeker profile first"
      });
    }

    // Check for existing subscription
    const existingSubscription = await prisma.companySubscription.findFirst({
      where: {
        companyId,
        jobSeekerId: userId,
        profileType
      }
    });

    if (existingSubscription) {
      return res.status(400).json({
        success: false,
        message: `You are already subscribed to this company as ${profileType}`
      });
    }

    // Create subscription
    const subscription = await prisma.companySubscription.create({
      data: {
        companyId,
        jobSeekerId: userId,
        profileType
      },
      include: {
        company: {
          select: {
            companyName: true,
            industry: true
          }
        }
      }
    });

    // Create notification for company
    await prisma.notification.create({
      data: {
        userId: companyId,
        title: "New Subscription",
        message: `New ${profileType.toLowerCase()} subscription received`,
        type: "SUBSCRIPTION",
        relatedId: subscription.id
      }
    });

    res.status(201).json({
      success: true,
      message: `Successfully subscribed as ${profileType}`,
      subscription
    });

  } catch (error) {
    console.error("Subscribe error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to subscribe to company",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ==========================================
// RESPOND TO INVITATION (JOB_UC_10.1)
// ==========================================

export const respondToInvitation = asyncHandler(async (req, res) => {
  const userId = req.user?.id || req.session?.userId;
  const { invitationId } = req.params;
  const { action } = req.body; // 'accept' or 'decline'

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Not authenticated"
    });
  }

  if (!['accept', 'decline'].includes(action)) {
    return res.status(400).json({
      success: false,
      message: "Action must be 'accept' or 'decline'"
    });
  }

  try {
    const invitation = await prisma.invitation.findFirst({
      where: { 
        id: invitationId, 
        jobSeekerId: userId,
        status: "PENDING"
      },
      include: {
        company: {
          select: {
            companyName: true
          }
        }
      }
    });

    if (!invitation) {
      return res.status(404).json({
        success: false,
        message: "Invitation not found or already responded"
      });
    }

    if (action === 'accept') {
      // Create subscription
      await prisma.companySubscription.create({
        data: {
          companyId: invitation.companyId,
          jobSeekerId: userId,
          profileType: invitation.profileType
        }
      });

      // Update invitation status
      await prisma.invitation.update({
        where: { id: invitationId },
        data: { status: "ACCEPTED" }
      });

      res.json({
        success: true,
        message: `Invitation accepted. You are now subscribed as ${invitation.profileType}.`
      });

    } else {
      // Decline invitation
      await prisma.invitation.update({
        where: { id: invitationId },
        data: { status: "DECLINED" }
      });

      res.json({
        success: true,
        message: "Invitation declined."
      });
    }

  } catch (error) {
    console.error("Respond invitation error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to respond to invitation",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ==========================================
// TRACK APPLICATIONS (JOB_UC_09.0 - Premium)
// ==========================================

export const getApplicationTracking = asyncHandler(async (req, res) => {
  const userId = req.user?.id || req.session?.userId;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Not authenticated"
    });
  }

  try {
    // Check if user has premium access
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { subscriptionStatus: true }
    });

    if (user.subscriptionStatus !== "ACTIVE") {
      return res.status(403).json({
        success: false,
        message: "Premium feature requires active subscription"
      });
    }

    const applications = await prisma.jobApplication.findMany({
      where: { jobSeekerId: userId },
      include: {
        jobPost: {
          include: {
            company: {
              select: {
                companyName: true,
                industry: true
              }
            }
          }
        }
      },
      orderBy: { appliedAt: 'desc' }
    });

    // Application statistics
    const stats = {
      total: applications.length,
      viewed: applications.filter(app => app.status === "VIEWED").length,
      shortlisted: applications.filter(app => app.status === "SHORTLISTED").length,
      interview: applications.filter(app => app.status === "INTERVIEW_SCHEDULED").length,
      rejected: applications.filter(app => app.status === "REJECTED").length,
      accepted: applications.filter(app => app.status === "ACCEPTED").length
    };

    res.json({
      success: true,
      applications,
      stats
    });

  } catch (error) {
    console.error("Tracking error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch application tracking",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ==========================================
// GET JOBSEEKER PROFILE (NEW FUNCTION)
// ==========================================

export const getJobseekerProfile = asyncHandler(async (req, res) => {
  const userId = req.user?.id || req.session?.userId;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Not authenticated"
    });
  }

  try {
    const userProfile = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        userType: true,
        points: true,
        subscriptionStatus: true,
        verificationStatus: true,
        createdAt: true,
        updatedAt: true,
        jobSeekerProfile: true,
        applications: {
          select: {
            id: true,
            status: true,
            appliedAt: true,
            jobPost: {
              select: {
                title: true,
                company: {
                  select: {
                    companyName: true
                  }
                }
              }
            }
          },
          orderBy: {
            appliedAt: 'desc'
          },
          take: 5
        },
        jobSeekerSubscriptions: {
          select: {
            id: true,
            createdAt: true,
            profileType: true,
            company: {
              select: {
                companyName: true,
                industry: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 5
        }
      }
    });

    if (!userProfile) {
      return res.status(404).json({
        success: false,
        message: "User profile not found"
      });
    }

    res.json({
      success: true,
      message: "Profile loaded successfully",
      profile: userProfile
    });

  } catch (error) {
    console.error("Profile error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to load profile",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});
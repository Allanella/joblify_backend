import asyncHandler from "express-async-handler";
import prisma from "../lib/prisma.mjs";
import bcrypt from "bcryptjs";

// ==========================================
// REGISTRATION
// ==========================================

// Register Jobseeker - FIXED VERSION
export const registerJobseeker = asyncHandler(async (req, res) => {
  console.log("🔍 FULL REQUEST BODY:", JSON.stringify(req.body, null, 2));
  
  const {
    firstName,
    lastName,
    email,
    phoneNumber,
    password,
    confirmPassword,
    agreeToTerms
  } = req.body;

  console.log("🔍 Destructured fields:", {
    firstName, lastName, email, phoneNumber, password, confirmPassword, agreeToTerms
  });

  // ✅ Validation - Check all required fields
  if (!firstName || !lastName || !email || !phoneNumber || !password || !confirmPassword) {
    console.log("❌ Missing fields detected:", {
      firstName: !!firstName, lastName: !!lastName, email: !!email,
      phoneNumber: !!phoneNumber, password: !!password, confirmPassword: !!confirmPassword
    });
    return res.status(400).json({
      success: false,
      message: "All fields are required"
    });
  }

  if (!agreeToTerms) {
    return res.status(400).json({
      success: false,
      message: "You must agree to the terms and conditions"
    });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({
      success: false,
      message: "Passwords do not match"
    });
  }

  // Phone validation (Ugandan format)
  const phoneRegex = /^(\+?256|0)[17]\d{8}$/;
  if (!phoneRegex.test(phoneNumber)) {
    return res.status(400).json({
      success: false,
      message: "Please provide a valid Ugandan phone number"
    });
  }

  // Password strength
  if (password.length < 8 || !/\d/.test(password) || !/[a-zA-Z]/.test(password)) {
    return res.status(400).json({
      success: false,
      message: "Password must be at least 8 characters with letters and numbers"
    });
  }

  try {
    console.log("🔍 Checking for existing user...");
    
    // SIMPLIFIED: Check only by email first
    const existingUser = await prisma.user.findUnique({
      where: {
        email: email.toLowerCase()
      }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User with this email already exists"
      });
    }

    // Check if phone already exists
    const existingPhone = await prisma.user.findFirst({
      where: {
        phone: phoneNumber
      }
    });

    if (existingPhone) {
      return res.status(400).json({
        success: false,
        message: "User with this phone number already exists"
      });
    }

    // Hash password
    console.log("🔐 Hashing password...");
    const hashedPassword = await bcrypt.hash(password, 12);

    // CREATE USER WITHOUT TRANSACTION (simpler approach)
    console.log("👤 Creating user...");
    const newUser = await prisma.user.create({
      data: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.toLowerCase().trim(),
        phone: phoneNumber.trim(),
        password: hashedPassword,
        userType: "JOB_SEEKER", // Explicit enum value
        points: 0,
        subscriptionStatus: "INACTIVE",
        surveysubscriptionStatus: "INACTIVE",
        verificationStatus: "PENDING"
      }
    });

    console.log("✅ User created:", newUser.id);

    // Create job seeker profile
    await prisma.jobSeekerProfile.create({
      data: {
        userId: newUser.id,
        profileType: "EMPLOYABLE"
      }
    });

    console.log("✅ Profile created for user:", newUser.id);

    res.status(201).json({
      success: true,
      message: "Account created successfully. Please login.",
      redirectTo: "/login",
      userId: newUser.id
    });

  } catch (error) {
    console.error("❌ Registration error:", error);
    console.error("❌ Error details:", error.message);
    
    // More detailed error information
    if (error.code) {
      console.error("❌ Prisma error code:", error.code);
    }
    
    res.status(500).json({
      success: false,
      message: "Registration failed. Please try again.",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Register Company - FIXED VERSION
export const registerCompany = asyncHandler(async (req, res) => {
  console.log("🔍 COMPANY REGISTRATION BODY:", JSON.stringify(req.body, null, 2));
  
  const {
    companyName,
    email,
    password,
    confirmPassword,
    industry,
    phone,
    address,
    companySize,
    establishmentYear,
    description,
    contactPersonName,
    contactPersonPosition,
    website,
    linkedin,
    agreeToTerms
  } = req.body;

  // ✅ Validation
  const requiredFields = [
    'companyName', 'email', 'password', 'confirmPassword', 'industry',
    'phone', 'address', 'companySize', 'establishmentYear', 'description',
    'contactPersonName', 'contactPersonPosition', 'agreeToTerms'
  ];

  for (const field of requiredFields) {
    if (!req.body[field]) {
      console.log(`❌ Missing field: ${field}`);
      return res.status(400).json({
        success: false,
        message: `${field.replace(/([A-Z])/g, ' $1').toLowerCase()} is required`
      });
    }
  }

  if (password !== confirmPassword) {
    return res.status(400).json({
      success: false,
      message: "Passwords do not match"
    });
  }

  if (password.length < 8 || !/\d/.test(password) || !/[a-zA-Z]/.test(password)) {
    return res.status(400).json({
      success: false,
      message: "Password must be at least 8 characters with letters and numbers"
    });
  }

  // Phone validation
  const phoneRegex = /^(\+?256|0)[17]\d{8}$/;
  if (!phoneRegex.test(phone)) {
    return res.status(400).json({
      success: false,
      message: "Please provide a valid Ugandan phone number"
    });
  }

  try {
    // Check existing company
    const existingCompany = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (existingCompany) {
      return res.status(400).json({
        success: false,
        message: "Company with this email already exists"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    // CREATE COMPANY WITHOUT TRANSACTION
    const newCompany = await prisma.user.create({
      data: {
        companyName: companyName.trim(),
        email: email.toLowerCase().trim(),
        phone: phone.trim(),
        password: hashedPassword,
        userType: "COMPANY", // Explicit enum value
        industry,
        companySize,
        establishmentYear: parseInt(establishmentYear),
        description: description.trim(),
        address: address.trim(),
        website,
        linkedin,
        contactPersonName: contactPersonName.trim(),
        contactPersonPosition: contactPersonPosition.trim(),
        points: 0,
        subscriptionStatus: "INACTIVE",
        surveysubscriptionStatus: "INACTIVE",
        verificationStatus: "PENDING"
      }
    });

    // Create company profile
    await prisma.companyProfile.create({
      data: {
        userId: newCompany.id,
        companyName: companyName.trim(),
        industry,
        companySize,
        establishmentYear: parseInt(establishmentYear),
        description: description.trim(),
        phone: phone.trim(),
        email: email.toLowerCase().trim(),
        address: address.trim(),
        website,
        linkedin,
        contactPersonName: contactPersonName.trim(),
        contactPersonPosition: contactPersonPosition.trim()
      }
    });

    res.status(201).json({
      success: true,
      message: "Company account created successfully. Please login.",
      redirectTo: "/login",
      companyId: newCompany.id
    });

  } catch (error) {
    console.error("Company registration error:", error);
    console.error("Company error details:", error.message);
    res.status(500).json({
      success: false,
      message: "Company registration failed",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ==========================================
// LOGIN & SESSIONS (JOB_UC_02.0)
// ==========================================

// Login User
export const createLoginSession = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Email and password are required"
    });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        email: true,
        password: true,
        firstName: true,
        lastName: true,
        userType: true,
        phone: true,
        points: true,
        companyName: true,
        subscriptionStatus: true,
        verificationStatus: true
      }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    // Create login session
    await prisma.loginSession.create({
      data: {
        userId: user.id,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'] || 'Unknown'
      }
    });

    // Set user session
    req.session.userId = user.id;
    req.session.userType = user.userType;
    req.session.email = user.email;

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    // Determine redirect path
    let redirectTo = "/dashboard";
    if (user.userType === "JOB_SEEKER") {
      redirectTo = "/jobseeker/dashboard";
    } else if (user.userType === "COMPANY") {
      redirectTo = "/company/dashboard";
    }

    res.json({
      success: true,
      message: "Login successful",
      user: userWithoutPassword,
      redirectTo
    });

  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Login failed",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ==========================================
// PRIVACY & SECURITY
// ==========================================

// Get Privacy Settings
export const getPrivacySettings = asyncHandler(async (req, res) => {
  const userId = req.session.userId;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Not authenticated"
    });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        privacySettings: true,
        userType: true
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    res.status(200).json({
      success: true,
      privacySettings: user
    });

  } catch (error) {
    console.error("Privacy settings error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch privacy settings",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Update Privacy Settings
export const updatePrivacySettings = asyncHandler(async (req, res) => {
  const userId = req.session.userId;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Not authenticated"
    });
  }

  const { firstName, lastName, phone, privacySettings } = req.body;

  try {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(phone && { phone }),
        ...(privacySettings && { privacySettings })
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        privacySettings: true
      }
    });

    res.status(200).json({
      success: true,
      message: "Privacy settings updated successfully",
      privacySettings: updatedUser
    });

  } catch (error) {
    console.error("Update privacy error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update privacy settings",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ==========================================
// LOGIN ACTIVITY & SESSIONS
// ==========================================

// Get Login Activity
export const getLoginActivity = asyncHandler(async (req, res) => {
  const userId = req.session.userId;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Not authenticated"
    });
  }

  try {
    const activities = await prisma.loginSession.findMany({
      where: { userId },
      orderBy: { loginTime: 'desc' },
      take: 10
    });

    // Mark current session (simplified logic)
    const activitiesWithCurrent = activities.map(activity => ({
      id: activity.id,
      loginTime: activity.loginTime,
      ipAddress: activity.ipAddress,
      userAgent: activity.userAgent,
      isActive: activity.isActive,
      current: activity.isActive
    }));

    res.status(200).json({
      success: true,
      activities: activitiesWithCurrent
    });

  } catch (error) {
    console.error("Login activity error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch login activity",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Sign Out All Devices
export const signOutAllDevices = asyncHandler(async (req, res) => {
  const userId = req.session.userId;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Not authenticated"
    });
  }

  try {
    // Deactivate all login sessions for this user
    await prisma.loginSession.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false }
    });

    // Destroy current session
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: "Failed to sign out"
        });
      }

      res.status(200).json({
        success: true,
        message: "Signed out from all devices successfully"
      });
    });

  } catch (error) {
    console.error("Sign out error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to sign out from all devices",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ==========================================
// PROFILE MANAGEMENT (JOB_UC_05.0)
// ==========================================

// Create/Update Job Seeker Profile
export const createJobSeekerProfile = asyncHandler(async (req, res) => {
  const userId = req.session.userId;
  const {
    profileType,
    bio,
    skills,
    education,
    experience,
    certifications,
    portfolio,
    visibility
  } = req.body;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Not authenticated"
    });
  }

  // Verify user is a job seeker
  const user = await prisma.user.findUnique({
    where: { id: userId, userType: "JOB_SEEKER" }
  });

  if (!user) {
    return res.status(403).json({
      success: false,
      message: "Only job seekers can create profiles"
    });
  }

  // Validation
  if (!profileType) {
    return res.status(400).json({
      success: false,
      message: "Profile type is required"
    });
  }

  if (!bio) {
    return res.status(400).json({
      success: false,
      message: "Bio is required"
    });
  }

  if (!education) {
    return res.status(400).json({
      success: false,
      message: "Education information is required"
    });
  }

  if (!skills || skills.length === 0) {
    return res.status(400).json({
      success: false,
      message: "At least one skill is required"
    });
  }

  try {
    const profile = await prisma.jobSeekerProfile.upsert({
      where: { userId },
      update: {
        profileType,
        bio,
        skills: Array.isArray(skills) ? skills : [skills],
        education,
        experience,
        certifications,
        portfolio,
        visibility: visibility || "PRIVATE"
      },
      create: {
        userId,
        profileType,
        bio,
        skills: Array.isArray(skills) ? skills : [skills],
        education,
        experience,
        certifications,
        portfolio,
        visibility: visibility || "PRIVATE"
      }
    });

    res.json({
      success: true,
      message: "Profile saved successfully",
      profile
    });

  } catch (error) {
    console.error("Profile error:", error);
    res.status(500).json({
      success: false,
      message: "Profile update failed",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ==========================================
// JOB POSTING (JOB_UC_11.0)
// ==========================================

// Create Job Post
export const createJobPost = asyncHandler(async (req, res) => {
  const userId = req.session.userId;
  const {
    title,
    description,
    industry,
    jobType,
    location,
    salaryRange,
    requirements,
    skillsRequired,
    applicationDeadline,
    hasChatArea,
    experienceLevel,
    salaryMin,
    salaryMax,
    benefits,
    isRemote
  } = req.body;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Not authenticated"
    });
  }

  // Verify user is a company
  const user = await prisma.user.findUnique({
    where: { id: userId, userType: "COMPANY" }
  });

  if (!user) {
    return res.status(403).json({
      success: false,
      message: "Only companies can post jobs"
    });
  }

  // Validation
  if (!title || !description || !industry || !jobType || !applicationDeadline) {
    return res.status(400).json({
      success: false,
      message: "Title, description, industry, job type, and deadline are required"
    });
  }

  if (new Date(applicationDeadline) <= new Date()) {
    return res.status(400).json({
      success: false,
      message: "Application deadline must be in the future"
    });
  }

  try {
    const jobPost = await prisma.jobPost.create({
      data: {
        title,
        description,
        companyId: userId,
        industry,
        jobType,
        location,
        salaryRange,
        requirements: Array.isArray(requirements) ? requirements : [requirements],
        skillsRequired: Array.isArray(skillsRequired) ? skillsRequired : [skillsRequired],
        applicationDeadline: new Date(applicationDeadline),
        hasChatArea: hasChatArea || false,
        experienceLevel,
        salaryMin: salaryMin ? parseInt(salaryMin) : null,
        salaryMax: salaryMax ? parseInt(salaryMax) : null,
        benefits: Array.isArray(benefits) ? benefits : [benefits],
        isRemote: isRemote || false
      }
    });

    res.status(201).json({
      success: true,
      message: "Job post created successfully",
      jobPost
    });

  } catch (error) {
    console.error("Job post error:", error);
    res.status(500).json({
      success: false,
      message: "Job post creation failed",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default {
  registerJobseeker,
  registerCompany,
  createLoginSession,
  createJobSeekerProfile,
  createJobPost,
  getPrivacySettings,
  updatePrivacySettings,
  getLoginActivity,
  signOutAllDevices
};
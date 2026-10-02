import { PrismaClient, Role, ProjectStatus, TaskStatus, TaskPriority } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Clear existing data
  console.log('🗑️ Clearing existing data...');
  await prisma.chatMessage.deleteMany();
  await prisma.timeEntry.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.task.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();

  // Hash password for all users
  const hashedPassword = await bcrypt.hash('password123', 10);

  // Create Admin
  console.log('👤 Creating admin...');
  const admin = await prisma.user.create({
    data: {
      email: 'admin@company.com',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'System',
      role: Role.ADMIN,
      bio: 'System Administrator',
      isActive: true,
    },
  });

  // Create Project Managers
  console.log('👔 Creating project managers...');
  const pm1 = await prisma.user.create({
    data: {
      email: 'sarah.manager@company.com',
      password: hashedPassword,
      firstName: 'Sarah',
      lastName: 'Johnson',
      role: Role.PROJECT_MANAGER,
      bio: 'Senior Project Manager with 10+ years experience',
      isActive: true,
    },
  });

  const pm2 = await prisma.user.create({
    data: {
      email: 'michael.manager@company.com',
      password: hashedPassword,
      firstName: 'Michael',
      lastName: 'Chen',
      role: Role.PROJECT_MANAGER,
      bio: 'Agile Project Manager, Scrum Master certified',
      isActive: true,
    },
  });

  // Create Employees (Team Members)
  console.log('👥 Creating team members...');
  const employees = await Promise.all([
    prisma.user.create({
      data: {
        email: 'john.dev@company.com',
        password: hashedPassword,
        firstName: 'John',
        lastName: 'Smith',
        role: Role.TEAM_MEMBER,
        bio: 'Full Stack Developer',
        isActive: true,
      },
    }),
    prisma.user.create({
      data: {
        email: 'emily.dev@company.com',
        password: hashedPassword,
        firstName: 'Emily',
        lastName: 'Davis',
        role: Role.TEAM_MEMBER,
        bio: 'Frontend Developer specializing in Angular',
        isActive: true,
      },
    }),
    prisma.user.create({
      data: {
        email: 'david.dev@company.com',
        password: hashedPassword,
        firstName: 'David',
        lastName: 'Wilson',
        role: Role.TEAM_MEMBER,
        bio: 'Backend Developer, Node.js expert',
        isActive: true,
      },
    }),
    prisma.user.create({
      data: {
        email: 'lisa.design@company.com',
        password: hashedPassword,
        firstName: 'Lisa',
        lastName: 'Anderson',
        role: Role.TEAM_MEMBER,
        bio: 'UI/UX Designer',
        isActive: true,
      },
    }),
    prisma.user.create({
      data: {
        email: 'james.dev@company.com',
        password: hashedPassword,
        firstName: 'James',
        lastName: 'Taylor',
        role: Role.TEAM_MEMBER,
        bio: 'DevOps Engineer',
        isActive: true,
      },
    }),
    prisma.user.create({
      data: {
        email: 'sophia.qa@company.com',
        password: hashedPassword,
        firstName: 'Sophia',
        lastName: 'Martinez',
        role: Role.TEAM_MEMBER,
        bio: 'QA Engineer, automation specialist',
        isActive: true,
      },
    }),
    prisma.user.create({
      data: {
        email: 'robert.dev@company.com',
        password: hashedPassword,
        firstName: 'Robert',
        lastName: 'Brown',
        role: Role.TEAM_MEMBER,
        bio: 'Mobile Developer',
        isActive: true,
      },
    }),
    prisma.user.create({
      data: {
        email: 'olivia.dev@company.com',
        password: hashedPassword,
        firstName: 'Olivia',
        lastName: 'Garcia',
        role: Role.TEAM_MEMBER,
        bio: 'Data Analyst',
        isActive: true,
      },
    }),
  ]);

  // Create Projects
  console.log('📁 Creating projects...');
  
  // Admin is always a member of all projects
  const project1Members = [admin.id, pm1.id, employees[0].id, employees[1].id, employees[2].id, employees[5].id];
  const project1 = await prisma.project.create({
    data: {
      name: 'E-Commerce Platform Redesign',
      description: 'Complete redesign of the company e-commerce platform with modern UI/UX and improved performance',
      status: ProjectStatus.ACTIVE,
      startDate: new Date('2025-11-01'),
      endDate: new Date('2026-02-28'),
      creatorId: pm1.id,
      memberIds: project1Members,
    },
  });

  // Update users with project IDs
  await prisma.user.updateMany({
    where: { id: { in: project1Members } },
    data: { projectIds: { push: project1.id } },
  });

  const project2Members = [admin.id, pm2.id, employees[3].id, employees[4].id, employees[6].id, employees[7].id];
  const project2 = await prisma.project.create({
    data: {
      name: 'Mobile App Development',
      description: 'Native mobile application for iOS and Android with real-time synchronization',
      status: ProjectStatus.ACTIVE,
      startDate: new Date('2025-10-15'),
      endDate: new Date('2026-03-31'),
      creatorId: pm2.id,
      memberIds: project2Members,
    },
  });

  await prisma.user.updateMany({
    where: { id: { in: project2Members } },
    data: { projectIds: { push: project2.id } },
  });

  const project3Members = [admin.id, pm1.id, pm2.id, employees[0].id, employees[2].id, employees[4].id];
  const project3 = await prisma.project.create({
    data: {
      name: 'API Integration Hub',
      description: 'Centralized API gateway for third-party integrations and microservices',
      status: ProjectStatus.ACTIVE,
      startDate: new Date('2025-12-01'),
      endDate: new Date('2026-04-30'),
      creatorId: admin.id,
      memberIds: project3Members,
    },
  });

  await prisma.user.updateMany({
    where: { id: { in: project3Members } },
    data: { projectIds: { push: project3.id } },
  });

  // Create Tasks for Project 1
  console.log('📋 Creating tasks for E-Commerce Platform...');
  const project1Tasks = await Promise.all([
    prisma.task.create({
      data: {
        title: 'Design new homepage wireframes',
        description: 'Create wireframes for the new homepage layout with improved user experience',
        status: TaskStatus.DONE,
        priority: TaskPriority.HIGH,
        dueDate: new Date('2025-11-15'),
        estimatedHours: 16,
        projectId: project1.id,
        assigneeId: employees[1].id,
        creatorId: pm1.id,
      },
    }),
    prisma.task.create({
      data: {
        title: 'Implement product catalog API',
        description: 'Build RESTful API endpoints for product catalog management',
        status: TaskStatus.DONE,
        priority: TaskPriority.HIGH,
        dueDate: new Date('2025-11-30'),
        estimatedHours: 24,
        projectId: project1.id,
        assigneeId: employees[2].id,
        creatorId: pm1.id,
      },
    }),
    prisma.task.create({
      data: {
        title: 'Build shopping cart component',
        description: 'Develop reusable shopping cart component with add/remove functionality',
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.HIGH,
        dueDate: new Date('2025-12-20'),
        estimatedHours: 20,
        projectId: project1.id,
        assigneeId: employees[0].id,
        creatorId: pm1.id,
      },
    }),
    prisma.task.create({
      data: {
        title: 'Payment gateway integration',
        description: 'Integrate Stripe payment gateway for checkout process',
        status: TaskStatus.TODO,
        priority: TaskPriority.HIGH,
        dueDate: new Date('2025-12-31'),
        estimatedHours: 32,
        projectId: project1.id,
        assigneeId: employees[2].id,
        creatorId: pm1.id,
      },
    }),
    prisma.task.create({
      data: {
        title: 'User authentication system',
        description: 'Implement JWT-based authentication with social login options',
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.MEDIUM,
        dueDate: new Date('2025-12-25'),
        estimatedHours: 18,
        projectId: project1.id,
        assigneeId: employees[0].id,
        creatorId: pm1.id,
      },
    }),
    prisma.task.create({
      data: {
        title: 'Write E2E tests for checkout',
        description: 'Create comprehensive end-to-end tests for the checkout flow',
        status: TaskStatus.TODO,
        priority: TaskPriority.MEDIUM,
        dueDate: new Date('2026-01-15'),
        estimatedHours: 12,
        projectId: project1.id,
        assigneeId: employees[5].id,
        creatorId: pm1.id,
      },
    }),
  ]);

  // Create Tasks for Project 2
  console.log('📋 Creating tasks for Mobile App...');
  const project2Tasks = await Promise.all([
    prisma.task.create({
      data: {
        title: 'Setup React Native project',
        description: 'Initialize React Native project with TypeScript and required dependencies',
        status: TaskStatus.DONE,
        priority: TaskPriority.HIGH,
        dueDate: new Date('2025-10-25'),
        estimatedHours: 8,
        projectId: project2.id,
        assigneeId: employees[6].id,
        creatorId: pm2.id,
      },
    }),
    prisma.task.create({
      data: {
        title: 'Design app navigation flow',
        description: 'Create navigation architecture and screen flow diagrams',
        status: TaskStatus.DONE,
        priority: TaskPriority.HIGH,
        dueDate: new Date('2025-11-05'),
        estimatedHours: 12,
        projectId: project2.id,
        assigneeId: employees[3].id,
        creatorId: pm2.id,
      },
    }),
    prisma.task.create({
      data: {
        title: 'Implement user onboarding',
        description: 'Build onboarding screens with smooth animations',
        status: TaskStatus.DONE,
        priority: TaskPriority.MEDIUM,
        dueDate: new Date('2025-11-20'),
        estimatedHours: 16,
        projectId: project2.id,
        assigneeId: employees[6].id,
        creatorId: pm2.id,
      },
    }),
    prisma.task.create({
      data: {
        title: 'Build offline data sync',
        description: 'Implement offline-first architecture with background sync',
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.HIGH,
        dueDate: new Date('2025-12-30'),
        estimatedHours: 28,
        projectId: project2.id,
        assigneeId: employees[6].id,
        creatorId: pm2.id,
      },
    }),
    prisma.task.create({
      data: {
        title: 'Push notification setup',
        description: 'Configure Firebase Cloud Messaging for push notifications',
        status: TaskStatus.TODO,
        priority: TaskPriority.MEDIUM,
        dueDate: new Date('2026-01-10'),
        estimatedHours: 10,
        projectId: project2.id,
        assigneeId: employees[4].id,
        creatorId: pm2.id,
      },
    }),
    prisma.task.create({
      data: {
        title: 'Create analytics dashboard',
        description: 'Build in-app analytics dashboard for usage metrics',
        status: TaskStatus.TODO,
        priority: TaskPriority.LOW,
        dueDate: new Date('2026-02-01'),
        estimatedHours: 20,
        projectId: project2.id,
        assigneeId: employees[7].id,
        creatorId: pm2.id,
      },
    }),
    prisma.task.create({
      data: {
        title: 'App store submission prep',
        description: 'Prepare screenshots, descriptions and metadata for app stores',
        status: TaskStatus.TODO,
        priority: TaskPriority.LOW,
        dueDate: new Date('2026-03-15'),
        estimatedHours: 8,
        projectId: project2.id,
        assigneeId: employees[3].id,
        creatorId: pm2.id,
      },
    }),
  ]);

  // Create Tasks for Project 3
  console.log('📋 Creating tasks for API Hub...');
  const project3Tasks = await Promise.all([
    prisma.task.create({
      data: {
        title: 'API Gateway architecture design',
        description: 'Design scalable API gateway architecture with rate limiting',
        status: TaskStatus.DONE,
        priority: TaskPriority.HIGH,
        dueDate: new Date('2025-12-10'),
        estimatedHours: 16,
        projectId: project3.id,
        assigneeId: employees[4].id,
        creatorId: admin.id,
      },
    }),
    prisma.task.create({
      data: {
        title: 'Authentication middleware',
        description: 'Implement OAuth2 and API key authentication middleware',
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.HIGH,
        dueDate: new Date('2025-12-20'),
        estimatedHours: 20,
        projectId: project3.id,
        assigneeId: employees[2].id,
        creatorId: pm1.id,
      },
    }),
    prisma.task.create({
      data: {
        title: 'Rate limiting implementation',
        description: 'Add configurable rate limiting per API key/user',
        status: TaskStatus.TODO,
        priority: TaskPriority.MEDIUM,
        dueDate: new Date('2026-01-05'),
        estimatedHours: 12,
        projectId: project3.id,
        assigneeId: employees[0].id,
        creatorId: pm2.id,
      },
    }),
    prisma.task.create({
      data: {
        title: 'Logging and monitoring setup',
        description: 'Configure ELK stack for API logging and monitoring',
        status: TaskStatus.TODO,
        priority: TaskPriority.MEDIUM,
        dueDate: new Date('2026-01-20'),
        estimatedHours: 14,
        projectId: project3.id,
        assigneeId: employees[4].id,
        creatorId: pm1.id,
      },
    }),
    prisma.task.create({
      data: {
        title: 'API documentation portal',
        description: 'Build interactive API documentation with Swagger UI',
        status: TaskStatus.TODO,
        priority: TaskPriority.LOW,
        dueDate: new Date('2026-02-10'),
        estimatedHours: 18,
        projectId: project3.id,
        assigneeId: employees[0].id,
        creatorId: admin.id,
      },
    }),
  ]);

  // Create Time Entries
  console.log('⏱️ Creating time entries...');
  const allTasks = [...project1Tasks, ...project2Tasks, ...project3Tasks];
  
  // Get all team members for distributing time entries
  const allTeamMembers = [...employees, pm1, pm2];
  
  // Create time entries distributed among team members
  for (const task of allTasks) {
    if (task.status === TaskStatus.DONE || task.status === TaskStatus.IN_PROGRESS) {
      const numEntries = task.status === TaskStatus.DONE ? Math.floor(Math.random() * 3) + 2 : Math.floor(Math.random() * 2) + 1;
      
      // Get project members for this task's project
      const projectMemberIds = task.projectId === project1.id 
        ? [employees[0].id, employees[1].id, employees[2].id, employees[5].id, pm1.id]
        : task.projectId === project2.id
          ? [employees[3].id, employees[4].id, employees[6].id, employees[7].id, pm2.id]
          : [employees[0].id, employees[2].id, employees[4].id, pm1.id, pm2.id];
      
      for (let i = 0; i < numEntries; i++) {
        const date = new Date();
        date.setDate(date.getDate() - Math.floor(Math.random() * 14) - 1);
        
        const startHour = 9 + Math.floor(Math.random() * 6);
        const duration = 60 + Math.floor(Math.random() * 180); // 1-4 hours in minutes
        
        const startTime = new Date(date);
        startTime.setHours(startHour, 0, 0, 0);
        
        const endTime = new Date(startTime);
        endTime.setMinutes(endTime.getMinutes() + duration);

        // First entry goes to assignee, others are distributed among project members
        const userId = i === 0 && task.assigneeId 
          ? task.assigneeId 
          : projectMemberIds[Math.floor(Math.random() * projectMemberIds.length)];

        await prisma.timeEntry.create({
          data: {
            startTime,
            endTime,
            theoDuration: duration,
            realDuration: duration + Math.floor(Math.random() * 30) - 15,
            description: getTimeEntryDescription(task.title),
            date: date,
            taskId: task.id,
            userId: userId,
          },
        });
      }
    }
  }
  
  // Create additional time entries to ensure each team member has some
  console.log('⏱️ Creating additional time entries for all team members...');
  const tasksWithEntries = allTasks.filter(t => t.status === TaskStatus.DONE || t.status === TaskStatus.IN_PROGRESS);
  
  for (const employee of employees) {
    // Check which projects this employee is a member of
    const employeeProjects = [
      { project: project1, members: [employees[0], employees[1], employees[2], employees[5]] },
      { project: project2, members: [employees[3], employees[4], employees[6], employees[7]] },
      { project: project3, members: [employees[0], employees[2], employees[4]] },
    ].filter(p => p.members.some(m => m.id === employee.id));
    
    // Create 3-5 time entries for each employee
    const numExtraEntries = Math.floor(Math.random() * 3) + 3;
    
    for (let i = 0; i < numExtraEntries; i++) {
      // Pick a random project this employee belongs to
      const projectInfo = employeeProjects[Math.floor(Math.random() * employeeProjects.length)];
      if (!projectInfo) continue;
      
      // Pick a random task from that project
      const projectTasks = tasksWithEntries.filter(t => t.projectId === projectInfo.project.id);
      if (projectTasks.length === 0) continue;
      
      const task = projectTasks[Math.floor(Math.random() * projectTasks.length)];
      
      const date = new Date();
      date.setDate(date.getDate() - Math.floor(Math.random() * 20) - 1);
      
      const startHour = 9 + Math.floor(Math.random() * 6);
      const duration = 45 + Math.floor(Math.random() * 150);
      
      const startTime = new Date(date);
      startTime.setHours(startHour, 0, 0, 0);
      
      const endTime = new Date(startTime);
      endTime.setMinutes(endTime.getMinutes() + duration);

      await prisma.timeEntry.create({
        data: {
          startTime,
          endTime,
          theoDuration: duration,
          realDuration: duration + Math.floor(Math.random() * 20) - 10,
          description: getTimeEntryDescription(task.title),
          date: date,
          taskId: task.id,
          userId: employee.id,
        },
      });
    }
  }
  
  // Also create entries for project managers
  for (const pm of [pm1, pm2]) {
    const pmProjects = pm === pm1 ? [project1, project3] : [project2, project3];
    
    for (let i = 0; i < 4; i++) {
      const project = pmProjects[Math.floor(Math.random() * pmProjects.length)];
      const projectTasks = tasksWithEntries.filter(t => t.projectId === project.id);
      if (projectTasks.length === 0) continue;
      
      const task = projectTasks[Math.floor(Math.random() * projectTasks.length)];
      
      const date = new Date();
      date.setDate(date.getDate() - Math.floor(Math.random() * 15) - 1);
      
      const startHour = 9 + Math.floor(Math.random() * 6);
      const duration = 30 + Math.floor(Math.random() * 90);
      
      const startTime = new Date(date);
      startTime.setHours(startHour, 0, 0, 0);
      
      const endTime = new Date(startTime);
      endTime.setMinutes(endTime.getMinutes() + duration);

      await prisma.timeEntry.create({
        data: {
          startTime,
          endTime,
          theoDuration: duration,
          realDuration: duration + Math.floor(Math.random() * 15) - 5,
          description: getTimeEntryDescription(task.title),
          date: date,
          taskId: task.id,
          userId: pm.id,
        },
      });
    }
  }

  // Create Comments
  console.log('💬 Creating comments...');
  const commentTexts = [
    'Great progress on this task!',
    'I have a question about the requirements.',
    'Can we schedule a quick sync to discuss this?',
    'Updated the implementation based on feedback.',
    'This is now ready for review.',
    'Found a small bug, fixing it now.',
    'Dependencies have been updated.',
    'Tests are passing, good to go!',
    'Need clarification on the edge cases.',
    'Documentation has been added.',
  ];

  for (const task of allTasks) {
    const numComments = Math.floor(Math.random() * 4) + 1;
    const projectMembers = task.projectId === project1.id 
      ? [admin, pm1, employees[0], employees[1], employees[2], employees[5]]
      : task.projectId === project2.id
        ? [admin, pm2, employees[3], employees[4], employees[6], employees[7]]
        : [admin, pm1, pm2, employees[0], employees[2], employees[4]];

    for (let i = 0; i < numComments; i++) {
      const date = new Date();
      date.setDate(date.getDate() - Math.floor(Math.random() * 10));
      
      await prisma.comment.create({
        data: {
          content: commentTexts[Math.floor(Math.random() * commentTexts.length)],
          taskId: task.id,
          authorId: projectMembers[Math.floor(Math.random() * projectMembers.length)].id,
          createdAt: date,
        },
      });
    }
  }

  // Create Chat Messages
  console.log('📨 Creating chat messages...');
  const projects = [project1, project2, project3];
  const chatMessages = [
    'Good morning team! 👋',
    'Hey everyone, how\'s the sprint going?',
    'Just pushed the latest changes to the repo.',
    'Can someone review my PR?',
    'Meeting in 10 minutes!',
    'Great work on the demo yesterday!',
    'I\'ll be out for lunch, back in an hour.',
    'Has anyone encountered this error before?',
    'The client loved the new design!',
    'Don\'t forget to update your timesheets.',
    'Who\'s available for a quick call?',
    'Just finished the feature, testing now.',
    'The build is green! 🎉',
    'I need help with the database migration.',
    'Weekend plans anyone?',
    'The API is now live on staging.',
    'Let\'s sync up after lunch.',
    'Great teamwork everyone!',
    'The deadline has been extended.',
    'New requirements just came in.',
  ];

  for (const project of projects) {
    const projectMembers = project.id === project1.id 
      ? [admin, pm1, employees[0], employees[1], employees[2], employees[5]]
      : project.id === project2.id
        ? [admin, pm2, employees[3], employees[4], employees[6], employees[7]]
        : [admin, pm1, pm2, employees[0], employees[2], employees[4]];

    const numMessages = 8 + Math.floor(Math.random() * 8);
    
    for (let i = 0; i < numMessages; i++) {
      const date = new Date();
      date.setDate(date.getDate() - Math.floor(Math.random() * 7));
      date.setHours(9 + Math.floor(Math.random() * 9), Math.floor(Math.random() * 60));

      await prisma.chatMessage.create({
        data: {
          content: chatMessages[Math.floor(Math.random() * chatMessages.length)],
          projectId: project.id,
          senderId: projectMembers[Math.floor(Math.random() * projectMembers.length)].id,
          createdAt: date,
        },
      });
    }
  }

  console.log('✅ Database seeding completed!');
  console.log('');
  console.log('📊 Summary:');
  console.log(`   - 1 Admin`);
  console.log(`   - 2 Project Managers`);
  console.log(`   - 8 Team Members`);
  console.log(`   - 3 Projects`);
  console.log(`   - ${allTasks.length} Tasks`);
  console.log('');
  console.log('🔐 Login credentials (all users):');
  console.log('   Password: password123');
  console.log('');
  console.log('   Admin: admin@company.com');
  console.log('   PM 1: sarah.manager@company.com');
  console.log('   PM 2: michael.manager@company.com');
  console.log('   Employees: john.dev@company.com, emily.dev@company.com, etc.');
}

function getTimeEntryDescription(taskTitle: string): string {
  const descriptions = [
    `Working on ${taskTitle}`,
    'Code review and refactoring',
    'Bug fixes and testing',
    'Implementation and documentation',
    'Research and development',
    'Feature implementation',
    'Testing and debugging',
    'Code optimization',
  ];
  return descriptions[Math.floor(Math.random() * descriptions.length)];
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

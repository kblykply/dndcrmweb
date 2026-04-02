const en = {
  common: {
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    edit: "Edit",
    close: "Close",
    refresh: "Refresh",
    loading: "Loading...",
     refreshing:  "Refreshing...",
    search: "Search",
    today: "Today",
    upcoming: "Upcoming",
    noRecords: "No records.",
    openRecord: "Open Record",
    details: "Details",
    assignedTo: "Assigned to",
    previous: "Previous",
next:  "Next",
create:  "Create",

  saving:  "Saving...",
  reset: "Reset",
  deleting: "Deleting...",
  searchRefresh:  "Search / Refresh",
  open:  "Open",
  },
  nav: {
    leads: "Leads",
    customers: "Customers",
    agencies: "Agencies",
    calendar: "Calendar",
    admin: "Admin Panel",
    users: "Users",
    managerQueue: "Manager Queue",
    help: "Help & Support",
      tasks: "Tasks"

      
  },
  dashboard: {
    title: "CRM Dashboard",
    subtitle: "Lead flow, call performance, team structure and follow-up overview",
    totalLeads: "Total Leads",
    leadsLast7: "Leads Last 7 Days",
    totalCalls: "Total Calls",
    callsLast7: "Calls Last 7 Days",
    workingLead: "Working Lead",
    managerReview: "Manager Review",
    assigned: "Assigned",
    wonLost: "Won / Lost",
    overdue: "Overdue Follow-ups",
    followupsToday: "Today's Follow-ups",
    upcoming7: "Next 7 Days",
  },
  calendar: {
    label: "CRM Calendar",
    title: "Operations Calendar",
    subtitle: "Lead follow-ups, agency meetings, tasks, presentations and activities",
    allRecords: "All Records",
    leadFollowups: "Lead Follow-ups",
    leadCalls: "Lead Calls",
    agencyMeetings: "Agency Meetings",
    agencyTasks: "Agency Tasks",
    presentations: "Presentations",
    calendar: "Calendar",
    visibleRange: "Only the visible date range is loaded.",
    notes: "Note / Details",
    record: "Record",
    todayEvents: "Today",
  },
  roles: {
    ADMIN: "Admin",
    MANAGER: "Manager",
    SALES: "Sales",
    CALLCENTER: "Call Center",
  },
  eventTypes: {
    LEAD_FOLLOWUP: "Lead Follow-up",
    LEAD_CALL: "Lead Call",
    AGENCY_MEETING: "Agency Meeting",
    AGENCY_TASK: "Agency Task",
    PRESENTATION: "Presentation",
  },
  statuses: {
    INTERESTED: "Interested",
    CALL_AGAIN: "Call Again",
    NO_ANSWER: "No Answer",
    DONE: "Done",
    WON: "Won",
    LOST: "Lost",
    ACTIVE: "Active",
    PASSIVE: "Passive",
    PROSPECT: "Prospect",
    DEALING: "Dealing",
    CLOSED: "Closed",
  },




  customerTypes: {
  POTENTIAL: "Potential",
  EXISTING: "Existing",
},

customers: {
  label: "Presentation & Customer Management",
  title: "Customers",
  subtitle: "Potential and existing customers are kept here together with presentation history",
  newCustomer: "New Customer",
  createTitle: "Create New Customer",
  createCustomer: "Create Customer",
  saving: "Saving...",
  deleting: "Deleting...",
  allTypes: "All Types",
  searchAndRefresh: "Search / Refresh",
  searchPlaceholder: "Search customer, phone, email, agency...",
  noCustomers: "No customers found.",
  deleteConfirm: "Are you sure you want to delete customer \"{name}\"? This action cannot be undone.",
  fields: {
    fullName: "Full Name",
    companyName: "Company / Organization",
    phone: "Phone",
    email: "Email",
    city: "City",
    country: "Country",
    address: "Address",
    source: "Source",
    notesSummary: "Summary note",
    selectAgency: "Select agency",
    ownerSales: "Owner Sales",
    selectOwnerSales: "Select owner sales"
  },
  table: {
    customer: "CUSTOMER",
    contact: "CONTACT",
    agency: "AGENCY",
    type: "TYPE",
    presentations: "PRESENTATIONS",
    updatedAt: "UPDATED",
    actions: "ACTIONS",
        ownerSales: "Owner Sales"

  },

    limitedAccessNotice: "Contact details are hidden for customers that do not belong to you. On the detail page, you can only edit your own customers."



},


presentationStatuses: {
  SCHEDULED: "Scheduled",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  RESCHEDULED: "Rescheduled",
},

presentationOutcomes: {
  POSITIVE: "Positive",
  NEGATIVE: "Negative",
  FOLLOW_UP: "Follow Up",
  NO_DECISION: "No Decision",
  WON: "Won",
  LOST: "Lost",
},

customerDetail: {
  customerIdMissing: "Customer ID not found.",
  loadingCustomer: "Loading customer…",
  notFoundTitle: "Customer Not Found",
  notFoundText: "There is no such customer.",
  backToCustomers: "Back to Customers",
  noAgency: "No agency",

  customerInfo: "Customer Information",
  newPresentation: "Add New Presentation",
  createPresentation: "Create Presentation",
  presentationHistory: "Presentation History",
  noPresentations: "No presentation records yet.",
  presentationNotes: "Presentation Notes",
  noNotes: "No notes yet.",
  addNote: "Add Note",
  addNotePlaceholder: "Add a note to this presentation...",
  selectOutcome: "Select outcome",

  salesLabel: "Sales",
  createdByLabel: "Created by",

  stats: {
    totalPresentations: "Total Presentations",
    scheduled: "Scheduled",
    completed: "Completed",
    won: "Won",
  },

  fields: {
    phone: "Phone",
    email: "Email",
    agency: "Agency",
    city: "City",
    country: "Country",
    source: "Source",
        ownerSales: "Owner Sales"

  },

  presentationFields: {
    title: "Presentation title",
    projectName: "Project name",
    location: "Location",
    selectSales: "Select sales representative",
    summaryNote: "Presentation summary note",
  },
},



agencyStatuses: {
  ACTIVE: "Active",
  PASSIVE: "Passive",
  PROSPECT: "Prospect",
  DEALING: "Dealing",
  CLOSED: "Closed",
},

agencies: {
  label: "Agency Management",
  title: "Agencies",
  subtitle: "Agency records, notes, meetings and tasks for manager and sales teams",
  newAgency: "New Agency",
  createTitle: "Create New Agency",
  createAgency: "Create Agency",
  saving: "Saving...",
  deleting: "Deleting...",
  allStatuses: "All Statuses",
  perPage: "page",
  page: "Page",
  searchAndRefresh: "Search / Refresh",
  searchPlaceholder: "Search agency, contact, phone, city...",
  noAgencies: "No agencies found.",
  deleteConfirm: "Are you sure you want to delete agency \"{name}\"? This action cannot be undone.",
  counts: {
    notes: "Notes",
    meetings: "Meetings",
    tasks: "Tasks",
  },
  fields: {
    name: "Agency name",
    contactName: "Contact person",
    phone: "Phone",
    email: "Email",
    city: "City",
    country: "Country",
    website: "Website",
    source: "Source",
    notesSummary: "Summary note",
    selectSales: "Select sales representative",
    sales: "Sales",
        address: "Address",

  },
  table: {
    agency: "AGENCY",
    contact: "CONTACT",
    sales: "SALES",
    status: "STATUS",
    counts: "NOTES / MEETINGS / TASKS",
    updatedAt: "UPDATED",
    actions: "ACTIONS",
  },
},




taskStatuses: {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  DONE: "Done",
  CANCELLED: "Cancelled",
},

taskPriorities: {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
},

agencyDetail: {
  agencyIdMissing: "Agency ID not found.",
  loadingAgency: "Loading agency…",
  notFoundTitle: "Agency Not Found",
  notFoundText: "There is no such agency.",
  backToAgencies: "Back to Agencies",
  updatedAlert: "Agency updated.",

  managerLabel: "Manager",
  salesLabel: "Sales",

  agencyInfo: "Agency Information",
  summaryNote: "Agency summary note",
  saveAgency: "Save Agency",

  notesTitle: "Notes",
  addNote: "Add Note",
  addNotePlaceholder: "Add an agency note...",
  noNotes: "No notes yet.",

  meetingsTitle: "Meetings",
  addMeeting: "Add Meeting",
  noMeetings: "No meetings yet.",

  tasksTitle: "Tasks",
  addTask: "Add Task",
  noTasks: "No tasks yet.",
  unassigned: "Unassigned",
  noDate: "No date",

  stats: {
    notes: "Notes",
    meetings: "Meetings",
    tasks: "Tasks",
    openTasks: "Open Tasks",
  },

  meetingFields: {
    title: "Meeting title",
    notes: "Meeting notes",
  },

  taskFields: {
    title: "Task title",
    description: "Description",
  },
},




leadStatuses: {
  NEW: "New",
  WORKING: "Working",
  SALES_READY: "Sales Ready",
  MANAGER_REVIEW: "Manager Review",
  ASSIGNED: "Assigned",
  WON: "Won",
  LOST: "Lost",
},

leadOutcomes: {
  OPENED: "Opened / Connected",
  NO_ANSWER: "No answer",
  BUSY: "Busy",
  UNREACHABLE: "Unreachable",
  CALL_AGAIN: "Call again",
  INTERESTED: "Interested",
  NOT_INTERESTED: "Not interested",
  QUALIFIED: "Qualified (Ready for sales)",
  WON: "Won",
  LOST: "Lost",
  WRONG_NUMBER: "Wrong number",
},

leads: {
  label: "People",
  title: "Leads",
  leadCount: "Leads",
  newLead: "New Lead",
  createTitle: "Create Lead",
  referencePartners: "Referral Partners",
  allStatuses: "All Statuses",
  noLeads: "No leads found.",
  noFollowUp: "No follow-up",
  callSummary: "Call",
  sourceLabel: "Source",
  call: "Call",
  saving: "Saving…",
  searchPlaceholder: "Search name, phone, email or source…",
  dayShort: "d",
  fields: {
    fullName: "Full Name",
    phone: "Phone",
    source: "Source",
  },
  table: {
    name: "NAME",
    contact: "CONTACT",
    status: "STATUS",
    followUp: "FOLLOW-UP",
    callResult: "CALL RESULT",
    save: "SAVE",
  },
},


activityTypes: {
  CALL: "Call",
  NOTE: "Note",
  MEETING: "Meeting",
  WHATSAPP: "WhatsApp",
  EMAIL: "Email",
  STATUS_CHANGE: "Status Change",
  ASSIGNMENT: "Assignment",
},

leadDetail: {
  idMissing: "Page error: Lead ID not found.",
  loadingLead: "Loading lead…",
  backToActiveLeads: "Active Leads",
  lastActivity: "Last Activity",
  createdAt: "Created",
  noEmail: "no email",
  more: "More",

  tabs: {
    activity: "Activity",
    details: "Details",
    documents: "Documents",
    notes: "Notes",
  },

  recentActivities: "Recent Activities",
  noActivities: "No activities yet.",

  quickActions: "Quick Actions",
  assignments: "Assignments",
  manager: "Manager",
  sales: "Sales",
  callCenter: "Call Center",
  managerRole: "Manager",
  salesRole: "Sales",

  setWorking: "Set WORKING",
  setSalesReady: "Set SALES_READY",
  selectManager: "Select manager",
  sendToManager: "Send to Manager",
  selectSales: "Select sales rep",
  assign: "Assign",
  reassign: "Reassign",
  markWon: "Won",
  markLost: "Lost",
  leadClosed: "This lead has been closed.",

  addActivity: "Add Activity",
  callOutcome: "Call outcome",
  summary: "Summary",
  notesOptional: "Notes (optional)",
  followUpOptional: "Follow-up date (optional)",
  callPrefix: "Call",
  defaultCallSummary: "Call made",
  hourShort: "h",

  tip: "Tip: Qualified → moves to SALES_READY. Won/Lost closes the lead.",
},






admin: {
  title: "CRM Dashboard",
  subtitle: "Lead flow, call performance, team structure, and follow-up visibility",
  refresh: "Refresh Dashboard",
  loadingDashboard: "Loading dashboard…",
  unauthorizedTitle: "Unauthorized Access",
  unauthorizedText: "Only ADMIN and MANAGER users can view this page.",
  today: "Today",
  last30Days: "Last 30 days",

  cards: {
    totalLeads: "Total Leads",
    last7DaysLeads: "Leads in Last 7 Days",
    totalCalls: "Total Calls",
    last7DaysCalls: "Calls in Last 7 Days",
    wonLost: "Won / Lost",
    overdueFollowups: "Overdue Follow-ups",
    todayFollowups: "Today's Follow-ups",
    next7Days: "Next 7 Days",
  },

  charts: {
    newLeads14Days: "New Leads in Last 14 Days",
    newLeads14DaysSub: "Daily new lead trend",
    leadStatusDistribution: "Lead Status Distribution",
    leadStatusDistributionSub: "Distribution of pipeline stages",
    calls14Days: "Calls in Last 14 Days",
    calls14DaysSub: "Daily call activity trend",
    pipelineSummary: "Pipeline Summary",
    pipelineSummarySub: "Lead counts across the main sales pipeline",
  },

  stats: {
    activeUsersByRole: "Active Users by Role",
    flowSummary: "Flow Summary",
    callResultSummary: "Call Result Summary",
  },

  flow: {
    sentToManager: "Sent to Manager",
    assignedToSales: "Assigned to Sales",
  },

  callSummary: {
    answered: "Answered",
    unanswered: "Unanswered / Unreachable",
  },
},



managerQueue: {
  title: "Review Queue",
  searchPlaceholder: "Search name / phone...",
  selectSalesFirst: "Please select a sales representative first.",
  returnedToCallCenter: "Returned to Call Center",
  returnedToCallCenterDetail:
    "Manager returned the lead for more information / pre-qualification.",
  lastActivity: "Last activity",
  selectSales: "Select sales representative",
  assign: "Assign",
  sendToCallCenter: "Send to Call Center",
  noLeads: "There are no leads in MANAGER_REVIEW status.",

  table: {
    lead: "LEAD",
    phone: "PHONE",
    status: "STATUS",
    followUp: "FOLLOW-UP",
    assignToSales: "ASSIGN TO SALES",
    actions: "ACTIONS",
  },
},




adminUsers: {
  title: "User Management",
  createTitle: "Create New User",
  create: "Create",
  creating: "Creating...",
  searchPlaceholder: "Search user...",
  active: "Active",
  passive: "Inactive",
  deactivate: "Deactivate",
  noUsers: "No users found.",
  confirmDeactivate: "Do you want to deactivate this user?",
  unauthorizedText: "You must be ADMIN to view this page.",

  fields: {
    name: "Full Name",
    email: "Email",
    password: "Password",
    selectManager: "Select manager",
  },

  table: {
    name: "NAME",
    email: "EMAIL",
    role: "ROLE",
    status: "STATUS",
    createdAt: "CREATED AT",
    action: "ACTION",
  },
},



adminUserDetail: {
  loading: "Loading user…",
  notFoundTitle: "User Not Found",
  notFoundText: "There is no such user.",
  backToUsers: "Back to Users",
  createdAt: "Created At",
  userInfoTitle: "User Information",
  newPassword: "New Password",
  passwordPlaceholder: "Leave blank to keep unchanged",
  manager: "Manager",
  dangerZoneTitle: "Danger Zone",
  dangerZoneText:
    "For real users, it is recommended to use Deactivate first. Deletion is permanent.",
  deleteUser: "Delete User",
  forceDeleteTestUser: "Force Delete Test User",
  processing: "Processing...",

  alerts: {
    updated: "User updated.",
    deactivated: "User deactivated.",
    deleted: "User deleted.",
    forceDeleted: "User force deleted.",
  },

  errors: {
    missingUserId: "User ID not found.",
    cannotDeleteSelf: "You cannot delete your own account.",
    cannotForceDeleteSelf: "You cannot force delete your own account.",
    userNotFound: "User not found.",
    emailAlreadyUsed: "This email address is already used by another user.",
    passwordMin: "Password must be at least 8 characters.",
    managerNotFound: "Selected manager was not found or is inactive.",
    managerRoleInvalid: "Selected manager must have MANAGER or ADMIN role.",
    relatedRecords:
      "This user cannot be deleted because related CRM records exist. Clean related records first or deactivate the user.",
    forceDeleteOnlyTest: "Force delete is allowed only for test users.",
    unauthorized: "Your session may have expired. Please sign in again.",
  },

  confirmDeactivate: "Do you want to deactivate this user?",
  confirmDelete: "Do you want to permanently delete this user? This action cannot be undone.",
  confirmForceDelete:
    "This will force delete the test user. Related tasks, activities, audits, and assignment records may also be removed. This action cannot be undone. Do you want to continue?",

  deleteBlockers: {
    title: "This user cannot be deleted. Related records were found:",
    callcenterLeads: "Call Center Leads",
    managedLeads: "Manager Leads",
    salesLeads: "Sales Leads",
    activities: "Activities",
    tasksCreated: "Created Tasks",
    tasksAssigned: "Assigned Tasks",
    audits: "Audit Logs",
    stageChanges: "Stage Changes",
    reps: "Child Users (reps)",
    footer: "Please clean these records first or deactivate the user.",
  },
},

adminLeads: {
  title: "Lead Cleanup",
  subtitle: "You can bulk delete test leads or old unnecessary records.",
  searchPlaceholder: "Search lead...",
  deleteSelected: "Delete Selected",
  allStatuses: "All Statuses",
  noLeads: "No leads found.",
  unauthorizedText: "This page is for ADMIN users only.",

  table: {
    fullName: "FULL NAME",
    phone: "PHONE",
    email: "EMAIL",
    source: "SOURCE",
    status: "STATUS",
    lastActivity: "LAST ACTIVITY",
    createdAt: "CREATED AT",
  },

  errors: {
    selectAtLeastOne: "You must select at least one lead to delete.",
    onlyAdmin: "Only ADMIN users can perform this action.",
  },

  confirmDelete: "{{count}} leads will be permanently deleted. This action cannot be undone. Do you want to continue?",
  deletedAlert: "{{count}} leads deleted.",
},

} as const;

export default en;
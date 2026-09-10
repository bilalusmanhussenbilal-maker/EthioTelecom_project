1. System Objective
The system is designed to help Fixed/Wi-Fi Network field technicians perform service surveys, new connections, line shifts, and network verification faster, clearer, and with fewer errors.
2. Users and Roles
Field Technician:
- Search service
- View assigned jobs
- View old/new network info
- Identify Box/Port
- Check line info
- Perform survey
- Record status/capacity
- Enter remarks
- Submit
- View survey status

Supervisor:
- View assigned surveys
- Monitor technicians
- Review survey results
- Approve/reject/return
- Reports

Administrator:
- Manage users/roles/technicians
- Manage network data, boxes, ports, lines, service areas
- System configuration
3. Service Survey Workflow
Service → Old Network → Change/Shift → New Network → Survey → Verification → Completion
4. Old Network Database
The database stores existing/old network information so the technician can quickly identify the current service path.
5. New Connection Database
The database stores new connection or shift information and the proposed destination network.
6. Box and Port Management
Example:
BOX-22:
- Port 01 Occupied
- Port 02 Occupied
- Port 03 Available
- Port 04 Occupied
- Port 05 Available

The software should help identify available ports and prevent assignment of occupied/nonexistent/wrong ports.
7. Line and Route Management
Example:
LINE-05: MSAN-03 → BOX-15 → BOX-18 → BOX-22

Line records could include Line ID, line type, source, destination, connected box, cable info, capacity, used capacity, available capacity, status.
8. Service Area and Address Management
- Service Area
- Zone/sub-area
- Street/locality
- House/building
- Service Address
- Unique Service ID

Purpose: avoid confusion between similar service names/addresses.
9. Survey Form
The survey form should auto-populate existing information and only require field verification/observations.

Suggested fields:
Service info: Service ID, Service Name, Service Address, Service Area
Old network: Old Box, Old Port, Old Line
New network: New Box, New Port, New Line
Field survey: Box Status, Port Status, Line Status, Available Capacity, Technical Feasibility, Technician Remark

Do not force technician to re-enter data already in DB.
10. Technical Feasibility Check
Check:
- Box exists
- Required port available
- Required line/path available
- Required capacity available

Result:
TECHNICALLY FEASIBLE
or
NOT FEASIBLE, with reason e.g. “No Available Port” / “Line Capacity Insufficient”.
11. Removed — Photo and Evidence
Removed from core requirements.
12. GPS / Location
It is for verifying physical service location. It can collect:
- Latitude
- Longitude
- Location accuracy
- Survey location
- Survey timestamp

Potentially compare expected service location with technician’s current location and calculate distance.
13. Technician Dashboard
My Surveys: New, In Progress, Completed, Returned
Search Service
14. Supervisor Dashboard
Technician assignment/completion/pending counts
Open survey and see Old Network → New Network → Field Survey → Result
Approve/Reject/Return
15. Database Structure
- Users
- Technicians
- Services
- Old_Network
- New_Network
- Boxes
- Ports
- Lines
- Areas
- Surveys
- Survey_Assignments
- GPS_Records

Relationships:
Service ID links Service → Old Network → New Network → Survey
Box ID links Box → Ports
Line ID links network route
16. Search and Identification
- Service ID
- Customer/service name
- Box number
- Port number
- Address
- Area

Search should minimize navigation and return related network path.
17. Reports
- Completed/pending/rejected/returned surveys
- Available/occupied/faulty ports
- Box utilization
- Line capacity
- Technician performance
- Services/new connections/line shifts by area
18. Offline Field Operation
Field technicians may lose connectivity. App should cache assigned survey and relevant network data, let them fill/save locally, then sync when online.

Example:
Survey SV-001 → Saved Offline → Internet returns → Sync → Central Database

Need conflict handling if two users modify same record.
19. Synchronization
The system should synchronize locally saved field survey information with the central database when connectivity is restored.
20. Security and User Access
Role-based access:
Technician: View assigned + Survey + Submit
Supervisor: View + Review + Approve/Reject/Return
Admin: Full management

Activity log examples:
Technician 014 opened SV-001
Technician 014 submitted survey
Supervisor 003 approved SV-001

## Frontend Technology

The frontend must be built with **Next.js**.

### Required Stack
- Next.js (App Router)
- React
- TypeScript
- Tailwind CSS
- Use Server Components by default.
- Use Client Components (`"use client"`) only when client-side interactivity or browser APIs are required.
- Use Next.js route handlers/server-side functionality where appropriate.
- Keep frontend API communication separated into reusable API/service modules rather than calling APIs directly throughout UI components.

### Frontend Architecture
- Follow a clean, feature-oriented component structure.
- Keep UI components reusable and focused on presentation.
- Keep business logic out of presentational components whenever possible.
- Use TypeScript strictly; avoid `any` unless there is a clear technical reason.
- Create shared components for common UI elements such as forms, tables, status badges, dialogs, loading states, and error states.
- Use responsive, mobile-first design because field technicians may primarily use the application on mobile devices.
- Design important field workflows to remain usable with slow or unreliable network connections.

### Data and API
- The Next.js frontend communicates with the backend through well-defined API endpoints.
- Define TypeScript types/interfaces for API request and response data.
- Handle loading, empty, error, and success states explicitly.
- Do not duplicate backend business rules unnecessarily in the frontend.
- Frontend validation should improve UX, but backend validation remains authoritative.

### Offline Support
- The technician interface must be designed to support offline operation.
- Assigned surveys and required network information should be cacheable locally.
- Survey changes made while offline should be saved locally and synchronized when connectivity is restored.
- The UI must clearly indicate offline, pending-sync, syncing, synced, and sync-failed states.
- Do not silently discard locally saved survey data.

### Role-Based UI
The frontend must respect the following roles:
- Technician: assigned surveys, service search, survey entry, submission, survey status.
- Supervisor: assigned surveys, technician monitoring, review, approve/reject/return, reports.
- Administrator: user, network, service-area, and system management.

UI access restrictions must not be treated as a security boundary. The backend must enforce authorization.

### Forms and Surveys
- Survey forms should auto-populate existing database information whenever possible.
- Technicians should only enter or verify information that actually requires field input.
- Prevent invalid selections such as nonexistent boxes, occupied ports, or invalid network options when the required data is available.
- Clearly display technical feasibility and the reason when a survey is not feasible.
- Preserve entered data during validation errors, navigation, temporary connectivity loss, and offline operation.

### UX Requirements
- Prioritize fast workflows and minimal navigation for field technicians.
- Use clear status indicators for survey states:
  `New`, `In Progress`, `Completed`, `Returned`, `Rejected`, and `Pending Sync`.
- Use confirmation dialogs for destructive or irreversible actions.
- Provide clear success and error feedback.
- Avoid unnecessary animations or UI elements that slow down field workflows.
- Ensure accessibility through proper labels, keyboard navigation, focus states, semantic HTML, and sufficient contrast.

### GPS
- Use browser/device geolocation APIs when GPS verification is required.
- Store latitude, longitude, accuracy, and survey timestamp.
- Clearly handle permission denied, unavailable GPS, and low-accuracy situations.
- GPS verification is supporting survey data; backend validation remains authoritative.

### General Rule
Build the Next.js frontend around the actual field-survey workflow:

Service → Old Network → Change/Shift → New Network → Survey → Verification → Completion

Do not build unnecessary features outside the requirements defined in this document.

and also use vercel motivation like this for globalcss

:root {
  --card: oklch(1.00 0 0);
  --ring: oklch(0 0 0);
  --input: oklch(0.94 0 0);
  --muted: oklch(0.97 0 0);
  --accent: oklch(0.94 0 0);
  --border: oklch(0.92 0 0);
  --radius: 0.5rem;
  --chart-1: oklch(0.81 0.17 75.35);
  --chart-2: oklch(0.55 0.22 264.53);
  --chart-3: oklch(0.72 0 0);
  --chart-4: oklch(0.92 0 0);
  --chart-5: oklch(0.56 0 0);
  --popover: oklch(0.99 0 0);
  --primary: oklch(0 0 0);
  --sidebar: oklch(0.99 0 0);
  --font-mono: Geist Mono, monospace;
  --font-sans: Geist, sans-serif;
  --secondary: oklch(0.94 0 0);
  --background: oklch(0.99 0 0);
  --font-serif: Georgia, serif;
  --foreground: oklch(0 0 0);
  --destructive: oklch(0.63 0.19 23.03);
  --shadow-blur: 2px;
  --shadow-color: hsl(0 0% 0%);
  --sidebar-ring: oklch(0 0 0);
  --shadow-spread: 0px;
  --shadow-opacity: 0.18;
  --sidebar-accent: oklch(0.94 0 0);
  --sidebar-border: oklch(0.94 0 0);
  --card-foreground: oklch(0 0 0);
  --shadow-offset-x: 0px;
  --shadow-offset-y: 1px;
  --sidebar-primary: oklch(0 0 0);
  --muted-foreground: oklch(0.44 0 0);
  --accent-foreground: oklch(0 0 0);
  --popover-foreground: oklch(0 0 0);
  --primary-foreground: oklch(1.00 0 0);
  --sidebar-foreground: oklch(0 0 0);
  --secondary-foreground: oklch(0 0 0);
  --destructive-foreground: oklch(1.00 0 0);
  --sidebar-accent-foreground: oklch(0 0 0);
  --sidebar-primary-foreground: oklch(1.00 0 0);
}

.dark {
  --card: oklch(0.14 0 0);
  --ring: oklch(0.72 0 0);
  --input: oklch(0.32 0 0);
  --muted: oklch(0.23 0 0);
  --accent: oklch(0.32 0 0);
  --border: oklch(0.26 0 0);
  --chart-1: oklch(0.81 0.17 75.35);
  --chart-2: oklch(0.58 0.21 260.84);
  --chart-3: oklch(0.56 0 0);
  --chart-4: oklch(0.44 0 0);
  --chart-5: oklch(0.92 0 0);
  --popover: oklch(0.18 0 0);
  --primary: oklch(1.00 0 0);
  --sidebar: oklch(0.18 0 0);
  --font-mono: Geist Mono, monospace;
  --font-sans: Geist, sans-serif;
  --secondary: oklch(0.25 0 0);
  --background: oklch(0 0 0);
  --font-serif: Georgia, serif;
  --foreground: oklch(1.00 0 0);
  --destructive: oklch(0.69 0.20 23.91);
  --sidebar-ring: oklch(0.72 0 0);
  --sidebar-accent: oklch(0.32 0 0);
  --sidebar-border: oklch(0.32 0 0);
  --card-foreground: oklch(1.00 0 0);
  --sidebar-primary: oklch(1.00 0 0);
  --muted-foreground: oklch(0.72 0 0);
  --accent-foreground: oklch(1.00 0 0);
  --popover-foreground: oklch(1.00 0 0);
  --primary-foreground: oklch(0 0 0);
  --sidebar-foreground: oklch(1.00 0 0);
  --secondary-foreground: oklch(1.00 0 0);
  --destructive-foreground: oklch(0 0 0);
  --sidebar-accent-foreground: oklch(1.00 0 0);
  --sidebar-primary-foreground: oklch(0 0 0);
}

@theme inline {
  --color-card: var(--card);
  --color-ring: var(--ring);
  --color-input: var(--input);
  --color-muted: var(--muted);
  --color-accent: var(--accent);
  --color-border: var(--border);
  --color-radius: var(--radius);
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);
  --color-popover: var(--popover);
  --color-primary: var(--primary);
  --color-sidebar: var(--sidebar);
  --color-font-mono: var(--font-mono);
  --color-font-sans: var(--font-sans);
  --color-secondary: var(--secondary);
  --color-background: var(--background);
  --color-font-serif: var(--font-serif);
  --color-foreground: var(--foreground);
  --color-destructive: var(--destructive);
  --color-shadow-blur: var(--shadow-blur);
  --color-shadow-color: var(--shadow-color);
  --color-sidebar-ring: var(--sidebar-ring);
  --color-shadow-spread: var(--shadow-spread);
  --color-shadow-opacity: var(--shadow-opacity);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-border: var(--sidebar-border);
  --color-card-foreground: var(--card-foreground);
  --color-shadow-offset-x: var(--shadow-offset-x);
  --color-shadow-offset-y: var(--shadow-offset-y);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent-foreground: var(--accent-foreground);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary-foreground: var(--primary-foreground);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
}

## Backend Technology
- Node.js with Express.js
- TypeScript
- RESTful API architecture
- Use a modular structure for routes, controllers, services, models, and middleware.
- Implement authentication, role-based authorization, validation, error handling, logging, and offline-sync APIs.
- Keep business logic in services rather than route handlers.
- Backend validation and authorization are always authoritative.
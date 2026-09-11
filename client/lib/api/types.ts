export type UserRole = "TECHNICIAN" | "SUPERVISOR" | "ADMIN";

export type SurveyStatus = "NEW" | "IN_PROGRESS" | "COMPLETED" | "RETURNED" | "REJECTED";

/** Derived on the server from status + submittedAt/completedAt. */
export type ReviewState = "DRAFT" | "AWAITING_REVIEW" | "APPROVED" | "REJECTED" | "RETURNED";

export type FeasibilityStatus = "TECHNICALLY_FEASIBLE" | "NOT_FEASIBLE";

export type ServiceType =
  | "NEW_CONNECTION"
  | "LINE_SHIFT"
  | "SERVICE_SURVEY"
  | "NETWORK_VERIFICATION";

export type ServiceStatus = "ACTIVE" | "SUSPENDED" | "TERMINATED";
export type ChangeType = "NEW_CONNECTION" | "LINE_SHIFT" | "VERIFICATION";
export type BoxType = "MSAN" | "FDC" | "FDT" | "PILLAR" | "JOINT";
export type BoxStatus = "ACTIVE" | "FAULTY" | "INACTIVE";
export type PortStatus = "AVAILABLE" | "OCCUPIED" | "FAULTY";
export type LineType = "FIBER" | "COPPER" | "MICROWAVE";
export type LineStatus = "ACTIVE" | "FAULTY" | "INACTIVE";

export interface AuthenticatedUser {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  phoneNumber: string | null;
  technicianId: string | null;
  employeeCode: string | null;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface AreaSummary {
  id: string;
  code: string;
  name: string;
  zone: string | null;
}

export interface AreaDetail extends AreaSummary {
  parentId: string | null;
  parent: { id: string; code: string; name: string } | null;
  children: Array<{ id: string; code: string; name: string }>;
  _count: { services: number; boxes: number; lines: number };
}

export interface PortRecord {
  id: string;
  code: string;
  boxId: string;
  status: PortStatus;
  notes: string | null;
}

export interface PortSummary {
  total: number;
  available: number;
  occupied: number;
  faulty: number;
}

export interface BoxRecord {
  id: string;
  code: string;
  name: string | null;
  type: BoxType;
  status: BoxStatus;
  areaId: string | null;
  latitude: number | null;
  longitude: number | null;
  area: AreaSummary | null;
  ports: PortRecord[];
}

export interface BoxOption {
  id: string;
  code: string;
  name: string | null;
  type: BoxType;
  status: BoxStatus;
  areaId: string | null;
  ports: PortRecord[];
  portSummary: PortSummary;
}

export interface LineHop {
  sequence: number;
  nodeCode: string;
  boxId: string | null;
}

export interface LineRecord {
  id: string;
  code: string;
  name: string | null;
  type: LineType;
  status: LineStatus;
  capacity: number;
  usedCapacity: number;
  sourceCode: string;
  targetCode: string;
  cableInfo: string | null;
  areaId: string | null;
  area: AreaSummary | null;
  hops: LineHop[];
}

export interface LineDetail extends LineRecord {
  availableCapacity: number;
  path: string[];
}

export type LineOption = LineDetail;

export interface NetworkNode {
  box: { id: string; code: string; name: string | null; type: BoxType; status: BoxStatus } | null;
  port: { id: string; code: string; status: PortStatus } | null;
  line: {
    id: string;
    code: string;
    name: string | null;
    type: LineType;
    status: LineStatus;
    capacity: number;
    usedCapacity: number;
    sourceCode: string;
    targetCode: string;
    cableInfo: string | null;
    hops: LineHop[];
    availableCapacity?: number;
    path?: string[];
  } | null;
}

export interface ServiceRecord {
  id: string;
  serviceCode: string;
  customerName: string;
  serviceType: ServiceType;
  serviceAddress: string;
  street: string | null;
  houseNumber: string | null;
  status: ServiceStatus;
  latitude: number | null;
  longitude: number | null;
  area: AreaSummary;
  oldNetwork: NetworkNode | null;
  newNetwork: NetworkNode | null;
  surveyStatus?: SurveyStatus | null;
}
export interface SurveyTechnician {
  id: string;
  employeeCode: string;
  zone: string | null;
  user: { id: string; fullName: string; username: string; phoneNumber: string | null };
}

export interface FeasibilityReason {
  code: string;
  field: string;
  message: string;
}

export interface FeasibilityPreview {
  status: FeasibilityStatus;
  feasible: boolean;
  reasons: FeasibilityReason[];
  availableCapacity: number | null;
}

export interface GpsRecord {
  id?: string;
  surveyId?: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  capturedAt: string;
  distanceFromServiceMeters: number | null;
  isWithinServiceArea: boolean | null;
}

export interface SurveyAssignment {
  id: string;
  surveyId: string;
  technicianId: string;
  assignedAt: string;
  dueDate: string | null;
  isActive: boolean;
  note: string | null;
  technician: SurveyTechnician;
  assignedBy: { id: string; fullName: string; username: string } | null;
}

export interface ActivityEntry {
  id: string;
  action: string;
  message: string;
  metadata: unknown;
  createdAt: string;
  user: { id: string; fullName: string; username: string; role: UserRole } | null;
  survey?: { id: string; surveyCode: string; status: SurveyStatus } | null;
}

export interface SurveyListItem {
  id: string;
  surveyCode: string;
  serviceId: string;
  status: SurveyStatus;
  technicianId: string | null;
  boxStatus: BoxStatus | null;
  portStatus: PortStatus | null;
  lineStatus: LineStatus | null;
  availableCapacity: number | null;
  requiredCapacity: number | null;
  feasibilityStatus: FeasibilityStatus | null;
  technicianRemark: string | null;
  submittedAt: string | null;
  completedAt: string | null;
  reviewRemark: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  service: {
    id: string;
    serviceCode: string;
    customerName: string;
    serviceType: ServiceType;
    serviceAddress: string;
    status: ServiceStatus;
    area: AreaSummary;
    newNetwork: NetworkNode | null;
  };
  technician: SurveyTechnician | null;
  gpsRecord: { accuracy: number; capturedAt: string } | null;
}

export interface SurveyDetail {
  id: string;
  surveyCode: string;
  serviceId: string;
  status: SurveyStatus;
  technicianId: string | null;
  createdById: string | null;
  boxStatus: BoxStatus | null;
  portStatus: PortStatus | null;
  lineStatus: LineStatus | null;
  availableCapacity: number | null;
  requiredCapacity: number | null;
  feasibilityStatus: FeasibilityStatus | null;
  feasibilityReasons: FeasibilityReason[] | null;
  technicianRemark: string | null;
  submittedAt: string | null;
  completedAt: string | null;
  reviewedById: string | null;
  reviewRemark: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  reviewState: ReviewState;
  feasibility: FeasibilityPreview | null;
  service: {
    id: string;
    serviceCode: string;
    customerName: string;
    serviceType: ServiceType;
    serviceAddress: string;
    street: string | null;
    houseNumber: string | null;
    status: ServiceStatus;
    latitude: number | null;
    longitude: number | null;
    area: AreaSummary;
    oldNetwork: NetworkNode | null;
    newNetwork: NetworkNode | null;
  };
  technician: SurveyTechnician | null;
  createdBy: { id: string; fullName: string; username: string } | null;
  reviewedBy: { id: string; fullName: string; username: string } | null;
  gpsRecord: GpsRecord | null;
  assignments: SurveyAssignment[];
}

export interface SurveyFormData {
  survey: {
    id: string;
    surveyCode: string;
    status: SurveyStatus;
    reviewState: ReviewState;
    technicianRemark: string | null;
    submittedAt: string | null;
    completedAt: string | null;
    reviewedAt: string | null;
    reviewRemark: string | null;
  };
  service: SurveyDetail["service"];
  oldNetwork: NetworkNode | null;
  newNetwork: NetworkNode | null;
  changeType: ChangeType | null;
  requiredCapacity: number | null;
  fieldSurvey: {
    boxStatus: BoxStatus | null;
    portStatus: PortStatus | null;
    lineStatus: LineStatus | null;
    availableCapacity: number | null;
    requiredCapacity: number | null;
    technicianRemark: string | null;
  };
  gps: GpsRecord | null;
  feasibility: FeasibilityPreview | null;
  availablePorts: PortRecord[];
  candidateLines: LineDetail[];
}

export interface SurveyStatusCounts {
  NEW: number;
  IN_PROGRESS: number;
  COMPLETED: number;
  RETURNED: number;
  REJECTED: number;
  TOTAL: number;
  AWAITING_REVIEW: number;
  APPROVED: number;
}

export interface TechnicianDashboard {
  technician: {
    id: string;
    employeeCode: string;
    zone: string | null;
    isAvailable: boolean;
    fullName: string;
    username: string;
    phoneNumber: string | null;
  };
  counts: SurveyStatusCounts;
  recentSurveys: SurveyListItem[];
  nextDueDate: string | null;
  nextDueSurvey: { id: string; surveyCode: string; status: SurveyStatus } | null;
}

export interface TechnicianWorkload {
  id: string;
  employeeCode: string;
  zone: string | null;
  isAvailable: boolean;
  isActive: boolean;
  fullName: string;
  username: string;
  phoneNumber: string | null;
  counts: SurveyStatusCounts;
}

export interface SearchResults {
  query: string;
  totals: { services: number; boxes: number; ports: number; lines: number };
  services: ServiceRecord[];
  boxes: Array<BoxRecord & { portSummary: PortSummary; relatedServices: RelatedService[] }>;
  ports: Array<{
    id: string;
    code: string;
    status: PortStatus;
    notes: string | null;
    box: { id: string; code: string; name: string | null; status: BoxStatus } | null;
    relatedServices: RelatedService[];
  }>;
  lines: Array<LineRecord & { availableCapacity: number; path: string[]; relatedServices: RelatedService[] }>;
}

export interface RelatedService {
  id: string;
  serviceCode: string;
  customerName: string;
  serviceType: ServiceType;
  status: ServiceStatus;
}

export interface ServiceNetworkPath {
  service: {
    id: string;
    serviceCode: string;
    customerName: string;
    serviceType: ServiceType;
    serviceAddress: string;
    status: ServiceStatus;
    latitude: number | null;
    longitude: number | null;
  };
  area: AreaSummary;
  oldNetwork: NetworkNode | null;
  newNetwork: NetworkNode | null;
  changeType: ChangeType | null;
  requiredCapacity: number | null;
  surveys: Array<{
    id: string;
    surveyCode: string;
    status: SurveyStatus;
    feasibilityStatus: FeasibilityStatus | null;
    submittedAt: string | null;
    completedAt: string | null;
    technician: { id: string; employeeCode: string; fullName: string } | null;
  }>;
}

export type ReportKey =
  | "survey-summary"
  | "port-availability"
  | "box-utilization"
  | "line-capacity"
  | "technician-performance"
  | "services-by-area";

export type ReportCell = string | number | boolean | null;

export interface ReportTable {
  key: ReportKey;
  title: string;
  description: string;
  generatedAt: string;
  columns: Array<{ key: string; header: string }>;
  rows: Array<Record<string, ReportCell>>;
}

export interface ManagedUser {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  phoneNumber: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  technician: { id: string; employeeCode: string; zone: string | null; isAvailable: boolean } | null;
  _count?: { activityLogs: number };
}

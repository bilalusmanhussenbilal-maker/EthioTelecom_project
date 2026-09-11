export type PortAvailability = "AVAILABLE" | "OCCUPIED" | "FAULTY";
export type BoxCondition = "ACTIVE" | "FAULTY" | "INACTIVE";
export type LineCondition = "ACTIVE" | "FAULTY" | "INACTIVE";

export type FeasibilityStatus = "TECHNICALLY_FEASIBLE" | "NOT_FEASIBLE";

export type FeasibilityReasonCode =
  | "BOX_NOT_FOUND"
  | "BOX_NOT_ACTIVE"
  | "PORT_NOT_FOUND"
  | "PORT_BOX_MISMATCH"
  | "PORT_OCCUPIED"
  | "PORT_FAULTY"
  | "LINE_NOT_FOUND"
  | "LINE_NOT_ACTIVE"
  | "LINE_ROUTE_DISCONNECTED"
  | "LINE_CAPACITY_INSUFFICIENT";

export type FeasibilityField = "newBoxId" | "newPortId" | "newLineId" | "requiredCapacity";

export interface PortSnapshot {
  id: string;
  code: string;
  status: PortAvailability;
  boxId: string;
}

export interface BoxSnapshot {
  id: string;
  code: string;
  status: BoxCondition;
}

export interface LineSnapshot {
  id: string;
  code: string;
  status: LineCondition;
  capacity: number;
  usedCapacity: number;
  path: string[];
}

export interface FeasibilityIssue {
  code: FeasibilityReasonCode;
  field: FeasibilityField;
  message: string;
}

export interface FeasibilityRequest {
  targetBox: BoxSnapshot | null;
  targetPort: PortSnapshot | null;
  targetLine: LineSnapshot | null;
  requiredCapacity?: number | null;
}

export interface TechnicalFeasibility {
  status: FeasibilityStatus;
  feasible: boolean;
  reasons: FeasibilityIssue[];
  availableCapacity: number | null;
}

export function calculateAvailableCapacity(line: Pick<LineSnapshot, "capacity" | "usedCapacity">): number {
  return line.capacity - line.usedCapacity;
}

export function checkTechnicalFeasibility(request: FeasibilityRequest): TechnicalFeasibility {
  const { targetBox, targetPort, targetLine } = request;
  const requiredCapacity = request.requiredCapacity ?? 0;
  const reasons: FeasibilityIssue[] = [];

  if (!targetBox) {
    reasons.push({
      code: "BOX_NOT_FOUND",
      field: "newBoxId",
      message: "The selected box does not exist",
    });
  } else if (targetBox.status !== "ACTIVE") {
    reasons.push({
      code: "BOX_NOT_ACTIVE",
      field: "newBoxId",
      message: `Box ${targetBox.code} is ${targetBox.status.toLowerCase()} and cannot accept new services`,
    });
  }

  if (!targetPort) {
    reasons.push({
      code: "PORT_NOT_FOUND",
      field: "newPortId",
      message: "The selected port does not exist in this box",
    });
  } else {
    if (targetBox && targetPort.boxId !== targetBox.id) {
      reasons.push({
        code: "PORT_BOX_MISMATCH",
        field: "newPortId",
        message: `Port ${targetPort.code} does not belong to box ${targetBox.code}`,
      });
    }

    if (targetPort.status === "OCCUPIED") {
      reasons.push({
        code: "PORT_OCCUPIED",
        field: "newPortId",
        message: `Port ${targetPort.code} is already occupied`,
      });
    }

    if (targetPort.status === "FAULTY") {
      reasons.push({
        code: "PORT_FAULTY",
        field: "newPortId",
        message: `Port ${targetPort.code} is faulty`,
      });
    }
  }

  let availableCapacity: number | null = null;

  if (!targetLine) {
    reasons.push({
      code: "LINE_NOT_FOUND",
      field: "newLineId",
      message: "The selected line does not exist",
    });
  } else {
    availableCapacity = calculateAvailableCapacity(targetLine);

    if (targetLine.status !== "ACTIVE") {
      reasons.push({
        code: "LINE_NOT_ACTIVE",
        field: "newLineId",
        message: `Line ${targetLine.code} is ${targetLine.status.toLowerCase()} and cannot carry a new service`,
      });
    }

    if (targetBox && !targetLine.path.includes(targetBox.code)) {
      reasons.push({
        code: "LINE_ROUTE_DISCONNECTED",
        field: "newLineId",
        message: `Line ${targetLine.code} does not reach box ${targetBox.code}`,
      });
    }

    if (requiredCapacity > 0 && availableCapacity < requiredCapacity) {
      reasons.push({
        code: "LINE_CAPACITY_INSUFFICIENT",
        field: "requiredCapacity",
        message: `Line ${targetLine.code} has ${availableCapacity} of ${targetLine.capacity} capacity available but ${requiredCapacity} is required`,
      });
    }
  }

  const feasible = reasons.length === 0;

  return {
    status: feasible ? "TECHNICALLY_FEASIBLE" : "NOT_FEASIBLE",
    feasible,
    reasons,
    availableCapacity,
  };
}
